import { gameManagerAbi, getDeployment, mockUSDAbi, seasonVaultAbi } from "@jitu-fi/shared";
import { eq } from "drizzle-orm";
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeFunctionData,
  encodeAbiParameters,
  encodeErrorResult,
  encodeEventTopics,
  getAddress,
  keccak256,
  type Abi,
  type Address,
  type Hash,
  type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { beforeEach, describe, expect, it } from "vitest";
import { loadConfig } from "../src/config.js";
import { createDb, migrateDb } from "../src/db/client.js";
import { tables } from "../src/db/schema.js";
import { createLogger } from "../src/logger.js";
import { resetNonceQueues, type KeyedWallet } from "../src/chain/sendTx.js";
import { createKeeperContext, DEMO_BONUS, DEMO_ENROLL_SECONDS, DEMO_TENORS, gameIdFor, tickRecords, tickSeasons, type KeeperContext } from "../src/keeper/keeper.js";

const SALT = ("0x" + "ab".repeat(32)) as Hex;
const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const dep = getDeployment(10143);
const PLAYER = "0x00000000000000000000000000000000000000a1" as Address;
const STATUS = { None: 0, Enrollment: 1, Active: 2, Finalized: 3 } as const;

interface FakeSeason {
  enrollStart: bigint;
  start: bigint;
  end: bigint;
  status: number;
  sponsorFunds: bigint;
}

function revert(abi: Abi, errorName: string) {
  const data = encodeErrorResult({ abi, errorName } as never);
  return new BaseError("execution reverted", { cause: new ContractFunctionRevertedError({ abi, data, functionName: "x" }) });
}

/** A tiny in-memory SeasonVault/GameManager/MockUSD that applies decoded calls. */
function fakeChain() {
  const seasons = new Map<bigint, FakeSeason>();
  const recorded = new Set<Hex>();
  const calls: { fn: string; args: readonly unknown[] }[] = [];
  const receipts = new Map<Hash, { status: "success" | "reverted"; logs: unknown[] }>();
  const chain = {
    seasons,
    recorded,
    calls,
    balance: 0n,
    allowance: 0n,
    /** recordGame outcome forced by the test. */
    recordRevert: undefined as string | undefined,
    recordSkips: false,
    nonce: 0,
  };
  const abiFor = (address: Address): Abi =>
    address === dep.SeasonVault ? (seasonVaultAbi as Abi) : address === dep.GameManager ? (gameManagerAbi as Abi) : (mockUSDAbi as Abi);

  const publicClient = {
    async readContract({ functionName, args = [] }: { functionName: string; args?: readonly unknown[] }) {
      switch (functionName) {
        case "seasonCount":
          return BigInt(seasons.size);
        case "getSeason": {
          const s = seasons.get(args[0] as bigint);
          if (!s) return { enrollStart: 0n, start: 0n, end: 0n, status: 0, sponsorFunds: 0n };
          return { ...s, shortfall: false, depositors: 0, claims: 0, totalPrincipal: 0n, returnedPrincipal: 0n, fee: 0n, baseYield: 0n, bonusPot: 0n, totalWeightedPoints: 0n, paidOut: 0n };
        }
        case "balanceOf":
          return chain.balance;
        case "allowance":
          return chain.allowance;
        case "recorded":
          return recorded.has(args[0] as Hex);
        default:
          throw new Error(`unexpected read ${functionName}`);
      }
    },
    async estimateContractGas({ functionName, args }: { functionName: string; args: readonly unknown[] }) {
      if (functionName === "recordGame") {
        if (recorded.has(args[0] as Hex)) throw revert(gameManagerAbi as Abi, "AlreadyRecorded");
        if (chain.recordRevert) throw revert(gameManagerAbi as Abi, chain.recordRevert);
      }
      return 90_000n;
    },
    async getTransactionCount() {
      return chain.nonce;
    },
    async waitForTransactionReceipt({ hash }: { hash: Hash }) {
      return receipts.get(hash)!;
    },
  };

  const wallet = {
    account,
    chain: { id: 10143 },
    async sendTransaction({ to, data, nonce, gas }: { to: Address; data: Hex; nonce: number; gas: bigint }) {
      expect(gas).toBe(103_500n);
      const { functionName, args = [] } = decodeFunctionData({ abi: abiFor(to), data });
      calls.push({ fn: functionName, args });
      const hash = keccak256(encodeAbiParameters([{ type: "uint256" }], [BigInt(nonce)]));
      chain.nonce = nonce + 1;
      const logs: unknown[] = [];
      const id = args[0] as bigint;
      switch (functionName) {
        case "createSeason": {
          const [enrollStart, start, end] = args as [bigint, bigint, bigint];
          seasons.set(BigInt(seasons.size + 1), { enrollStart, start, end, status: STATUS.Enrollment, sponsorFunds: 0n });
          break;
        }
        case "activate":
          seasons.get(id)!.status = STATUS.Active;
          break;
        case "finalize":
          seasons.get(id)!.status = STATUS.Finalized;
          break;
        case "fundBonus":
          seasons.get(id)!.sponsorFunds += args[1] as bigint;
          chain.balance -= args[1] as bigint;
          break;
        case "mint":
          chain.balance += args[1] as bigint;
          break;
        case "approve":
          chain.allowance = args[1] as bigint;
          break;
        case "recordGame": {
          const [gameId, player, gameScore] = args as [Hex, Address, bigint];
          recorded.add(gameId);
          if (chain.recordSkips) {
            const topics = encodeEventTopics({ abi: gameManagerAbi, eventName: "PointsSkipped", args: { gameId, player, seasonId: 1n } });
            logs.push({ address: dep.GameManager, topics, data: encodeAbiParameters([{ type: "int256" }], [gameScore]), blockNumber: 1n, logIndex: 0, transactionHash: hash, transactionIndex: 0, blockHash: hash, removed: false });
          }
          break;
        }
      }
      receipts.set(hash, { status: "success", logs });
      return hash;
    },
  };
  return { chain, publicClient, wallet };
}

async function setup(opts: { demo?: boolean; now?: bigint } = {}) {
  resetNonceQueues();
  const db = createDb(":memory:");
  await migrateDb(db);
  const fake = fakeChain();
  let now = opts.now ?? 1_000_000n;
  const config = loadConfig({ CHAIN_ID: "10143", RPC_URL: "http://localhost:8545", DEMO_MODE: String(opts.demo ?? false), GAME_ID_SALT: SALT });
  const ctx: KeeperContext = createKeeperContext({
    config,
    db,
    logger: createLogger("silent"),
    publicClient: fake.publicClient as never,
    wallet: fake.wallet as unknown as KeyedWallet,
    nowSec: () => now,
  });
  return { ...fake, db, ctx, setNow: (t: bigint) => (now = t) };
}

const fns = (calls: { fn: string }[]) => calls.map((c) => c.fn);

describe("tickSeasons", () => {
  it("activates a due season once and leaves an early one alone", async () => {
    const { chain, ctx, setNow } = await setup();
    chain.seasons.set(1n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Enrollment, sponsorFunds: 1n });
    setNow(50n);
    await tickSeasons(ctx);
    expect(chain.calls).toEqual([]);
    setNow(100n);
    await tickSeasons(ctx);
    await tickSeasons(ctx);
    expect(chain.calls).toEqual([{ fn: "activate", args: [1n] }]);
  });

  it("finalizes an ended season (Active or still Enrollment) and then stops tracking it", async () => {
    const { chain, ctx, setNow } = await setup();
    chain.seasons.set(1n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Active, sponsorFunds: 1n });
    chain.seasons.set(2n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Enrollment, sponsorFunds: 1n });
    chain.seasons.set(3n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Finalized, sponsorFunds: 1n });
    setNow(1000n);
    await tickSeasons(ctx);
    expect(chain.calls).toEqual([
      { fn: "finalize", args: [1n] },
      { fn: "finalize", args: [2n] },
    ]);
    expect(ctx.tracked.size).toBe(0);
    await tickSeasons(ctx);
    expect(chain.calls).toHaveLength(2);
  });

  it("DEMO_MODE: renews each tenor once its season leaves Enrollment, then funds the new seasons", async () => {
    const { chain, ctx, setNow } = await setup({ demo: true });
    // Deployment seasons 1 (week) and 2 (month), both still enrolling and funded.
    chain.seasons.set(1n, { enrollStart: 0n, start: 100n, end: 100n + DEMO_TENORS.week, status: STATUS.Enrollment, sponsorFunds: 1n });
    chain.seasons.set(2n, { enrollStart: 0n, start: 200n, end: 200n + DEMO_TENORS.month, status: STATUS.Enrollment, sponsorFunds: 1n });
    setNow(50n);
    await tickSeasons(ctx);
    expect(chain.calls).toEqual([]);

    // Week starts: activate it and open the next week season.
    setNow(150n);
    await tickSeasons(ctx);
    expect(chain.calls).toEqual([
      { fn: "activate", args: [1n] },
      { fn: "createSeason", args: [150n, 150n + DEMO_ENROLL_SECONDS, 150n + DEMO_ENROLL_SECONDS + DEMO_TENORS.week] },
    ]);

    // Next tick: season 3 is new, unfunded and enrolling, so mint + approve + fund it and create nothing.
    chain.calls.length = 0;
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["mint", "approve", "fundBonus"]);
    expect(chain.seasons.get(3n)!.sponsorFunds).toBe(DEMO_BONUS);

    // Month starts: one createSeason classed as a month by its length, funded from the minted batch.
    chain.calls.length = 0;
    setNow(200n);
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["activate", "createSeason"]);
    const s4 = chain.seasons.get(4n)!;
    expect(s4.end - s4.start).toBe(DEMO_TENORS.month);
    chain.calls.length = 0;
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["fundBonus"]);
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["fundBonus"]);
  });

  it("DEMO_MODE on a fresh restart with only expired seasons: finalizes them and opens both tenors", async () => {
    const { chain, ctx } = await setup({ demo: true, now: 10_000n });
    chain.seasons.set(1n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Active, sponsorFunds: 1n });
    chain.seasons.set(2n, { enrollStart: 0n, start: 100n, end: 2000n, status: STATUS.Enrollment, sponsorFunds: 0n });
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["finalize", "finalize", "createSeason", "createSeason"]);
    expect(chain.seasons.get(3n)!.end - chain.seasons.get(3n)!.start).toBe(DEMO_TENORS.week);
    expect(chain.seasons.get(4n)!.end - chain.seasons.get(4n)!.start).toBe(DEMO_TENORS.month);
  });

  it("outside DEMO_MODE never creates or funds seasons", async () => {
    const { chain, ctx } = await setup({ demo: false, now: 150n });
    chain.seasons.set(1n, { enrollStart: 0n, start: 100n, end: 1000n, status: STATUS.Enrollment, sponsorFunds: 0n });
    await tickSeasons(ctx);
    expect(fns(chain.calls)).toEqual(["activate"]);
  });
});

describe("tickRecords", () => {
  async function insertTable(db: Awaited<ReturnType<typeof setup>>["db"], overrides: Partial<typeof tables.$inferInsert> = {}) {
    const [row] = await db
      .insert(tables)
      .values({
        preset: "Quick",
        status: "Finished",
        humanAddress: PLAYER,
        seasonId: 1,
        phase: "Finished",
        createdAtMs: 0,
        state: "{}",
        gameScore: 420,
        logHash: "0x" + "cd".repeat(32),
        recordStatus: "pending",
        ...overrides,
      })
      .returning();
    return row!;
  }
  const rowOf = async (db: Awaited<ReturnType<typeof setup>>["db"], id: number) => (await db.select().from(tables).where(eq(tables.id, id)))[0]!;

  it("derives gameId from the salt and table id", () => {
    const expected = keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [SALT, 7n]));
    expect(gameIdFor(SALT, 7)).toBe(expected);
    expect(gameIdFor(SALT, 7)).not.toBe(gameIdFor(SALT, 8));
  });

  it("records a pending game and stores the tx hash", async () => {
    const { chain, ctx, db } = await setup();
    const t = await insertTable(db);
    await tickRecords(ctx);
    expect(chain.calls).toEqual([{ fn: "recordGame", args: [gameIdFor(SALT, t.id), getAddress(PLAYER), 420n, "0x" + "cd".repeat(32)] }]);
    const row = await rowOf(db, t.id);
    expect(row.recordStatus).toBe("recorded");
    expect(row.recordTxHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(row.gameId).toBe(gameIdFor(SALT, t.id));
    // Final: a second tick sends nothing.
    await tickRecords(ctx);
    expect(chain.calls).toHaveLength(1);
  });

  it("marks PointsSkipped as skipped", async () => {
    const { chain, ctx, db } = await setup();
    chain.recordSkips = true;
    const t = await insertTable(db);
    await tickRecords(ctx);
    expect((await rowOf(db, t.id)).recordStatus).toBe("skipped");
  });

  it("treats AlreadyRecorded as recorded without sending", async () => {
    const { chain, ctx, db } = await setup();
    const t = await insertTable(db);
    chain.recorded.add(gameIdFor(SALT, t.id));
    await tickRecords(ctx);
    expect(chain.calls).toEqual([]);
    expect((await rowOf(db, t.id)).recordStatus).toBe("recorded");
  });

  it("marks SeasonNotActive as failed and keeps the error; never retries", async () => {
    const { chain, ctx, db } = await setup();
    chain.recordRevert = "SeasonNotActive";
    const t = await insertTable(db);
    await tickRecords(ctx);
    chain.recordRevert = undefined;
    await tickRecords(ctx);
    const row = await rowOf(db, t.id);
    expect(row.recordStatus).toBe("failed");
    expect(row.recordError).toBe("SeasonNotActive");
    expect(chain.calls).toEqual([]);
  });

  it("retries RPC errors on the next tick", async () => {
    const { chain, ctx, db, publicClient } = await setup();
    const t = await insertTable(db);
    const real = publicClient.estimateContractGas;
    publicClient.estimateContractGas = async () => {
      throw new Error("fetch failed");
    };
    await tickRecords(ctx);
    expect((await rowOf(db, t.id)).recordStatus).toBe("pending");
    publicClient.estimateContractGas = real;
    await tickRecords(ctx);
    expect((await rowOf(db, t.id)).recordStatus).toBe("recorded");
    expect(chain.calls).toHaveLength(1);
  });

  it("after a restart, a 'sent' row that already landed is marked recorded without resending", async () => {
    const { chain, ctx, db } = await setup();
    const t = await insertTable(db, { recordStatus: "sent", recordTxHash: "0xfeed" });
    chain.recorded.add(gameIdFor(SALT, t.id));
    await tickRecords(ctx);
    const row = await rowOf(db, t.id);
    expect(row.recordStatus).toBe("recorded");
    expect(row.recordTxHash).toBe("0xfeed");
    expect(chain.calls).toEqual([]);
  });

  it("ignores tables that are not queued", async () => {
    const { chain, ctx, db } = await setup();
    await insertTable(db, { recordStatus: "none" });
    await insertTable(db, { recordStatus: "failed" });
    await tickRecords(ctx);
    expect(chain.calls).toEqual([]);
  });
});

beforeEach(() => resetNonceQueues());
