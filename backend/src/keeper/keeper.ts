// Keeper loop (BACKEND_PLAN §6). Every tick reads chain state before each tx, so a restart or a second
// tick never double-acts: activate due seasons, finalize ended ones, keep one open season per tenor in
// DEMO_MODE (created and funded by the keeper), and post finished games with recordGame.
import { gameManagerAbi, getDeployment, mockUSDAbi, seasonVaultAbi } from "@jitu-fi/shared";
import { eq, inArray } from "drizzle-orm";
import {
  encodeAbiParameters,
  formatEther,
  keccak256,
  maxUint256,
  parseEther,
  parseEventLogs,
  zeroHash,
  type Address,
  type Hex,
  type PublicClient,
} from "viem";
import { requireConfig, type Config } from "../config.js";
import { createClients, createKeeperWallet } from "../chain/clients.js";
import { createChainReader, resolveAddresses, type ChainReader, type Season } from "../chain/contracts.js";
import { createTxSender, revertName, type KeyedWallet, type TxSender } from "../chain/sendTx.js";
import type { Db } from "../db/client.js";
import { tables } from "../db/schema.js";
import type { Logger } from "../logger.js";

export const KEEPER_INTERVAL_MS = 5_000;
/** DEMO_MODE season lengths: a 15-minute "week" and a 30-minute "month". */
export const DEMO_TENORS = { week: 15n * 60n, month: 30n * 60n } as const;
export type Tenor = keyof typeof DEMO_TENORS;
export const DEMO_ENROLL_SECONDS = 120n;
export const DEMO_BONUS = 1_000n * 10n ** 6n;
/** An EOA under 10 MON is throttled to one tx per 3 blocks (Monad reserve balance). */
const MIN_KEEPER_BALANCE = parseEther("10");
const RECORD_BATCH = 25;

export function gameIdFor(salt: Hex, tableId: number | bigint): Hex {
  return keccak256(encodeAbiParameters([{ type: "bytes32" }, { type: "uint256" }], [salt, BigInt(tableId)]));
}

export interface KeeperContext {
  db: Db;
  logger: Logger;
  reader: ChainReader;
  sender: TxSender;
  demoMode: boolean;
  salt: Hex;
  nowSec: () => bigint;
  /** Deployment-time tenor of the initial seasons; later ones are classed by length. */
  knownTenors: Map<bigint, Tenor>;
  /** Seasons not yet seen Finalized. */
  tracked: Set<bigint>;
  /** Highest season id already added to `tracked`. */
  scannedUpTo: bigint;
}

export function createKeeperContext(args: {
  config: Config;
  db: Db;
  logger: Logger;
  publicClient: Pick<PublicClient, "readContract" | "estimateContractGas" | "getTransactionCount" | "waitForTransactionReceipt">;
  wallet: KeyedWallet;
  nowSec?: () => bigint;
}): KeeperContext {
  const { config } = args;
  const d = getDeployment(config.CHAIN_ID);
  return {
    db: args.db,
    logger: args.logger,
    reader: createChainReader(args.publicClient, resolveAddresses(config), { ttlMs: 0 }),
    sender: createTxSender(args.publicClient, args.wallet),
    demoMode: config.DEMO_MODE,
    salt: requireConfig(config, "GAME_ID_SALT") as Hex,
    nowSec: args.nowSec ?? (() => BigInt(Math.floor(Date.now() / 1000))),
    knownTenors: new Map([
      [BigInt(d.weekSeasonId), "week"],
      [BigInt(d.monthSeasonId), "month"],
    ]),
    tracked: new Set(),
    scannedUpTo: 0n,
  };
}

function tenorOf(ctx: KeeperContext, s: Season): Tenor {
  const known = ctx.knownTenors.get(s.id);
  if (known) return known;
  const len = s.end - s.start;
  const dist = (t: bigint) => (len > t ? len - t : t - len);
  return dist(DEMO_TENORS.week) <= dist(DEMO_TENORS.month) ? "week" : "month";
}

async function mustSucceed(sender: TxSender, call: Parameters<TxSender["sendAndWait"]>[0], what: string) {
  const { hash, receipt } = await sender.sendAndWait(call);
  if (receipt.status !== "success") throw new Error(`${what} reverted (${hash})`);
  return hash;
}

// ---------------------------------------------------------------- seasons

export async function tickSeasons(ctx: KeeperContext): Promise<void> {
  const { reader, sender, logger } = ctx;
  const vault = reader.addresses.vault;

  const count = await reader.seasonCount();
  for (let id = ctx.scannedUpTo + 1n; id <= count; id++) ctx.tracked.add(id);
  ctx.scannedUpTo = count;

  const now = ctx.nowSec();
  const open = new Set<Tenor>();

  for (const id of [...ctx.tracked].sort((a, b) => (a < b ? -1 : 1))) {
    try {
      const s = await reader.getSeason(id);
      if (s.status === "Finalized" || s.status === "None") {
        ctx.tracked.delete(id);
        continue;
      }
      if (now >= s.end) {
        // finalize activates an Enrollment season itself.
        const hash = await mustSucceed(sender, { address: vault, abi: seasonVaultAbi, functionName: "finalize", args: [id] }, `finalize(${id})`);
        logger.info({ seasonId: id.toString(), hash }, "season finalized");
        ctx.tracked.delete(id);
        continue;
      }
      if (s.status === "Enrollment" && now >= s.start) {
        const hash = await mustSucceed(sender, { address: vault, abi: seasonVaultAbi, functionName: "activate", args: [id] }, `activate(${id})`);
        logger.info({ seasonId: id.toString(), hash }, "season activated");
      } else if (s.status === "Enrollment") {
        open.add(tenorOf(ctx, s));
      }
      if (ctx.demoMode && s.sponsorFunds === 0n) await fundSeason(ctx, id);
    } catch (err) {
      logger.warn({ err, seasonId: id.toString() }, "season step failed; retrying next tick");
    }
  }

  if (!ctx.demoMode) return;
  for (const tenor of Object.keys(DEMO_TENORS) as Tenor[]) {
    if (open.has(tenor)) continue;
    try {
      await createDemoSeason(ctx, tenor);
    } catch (err) {
      logger.warn({ err, tenor }, "createSeason failed; retrying next tick");
    }
  }
}

/** Opens one DEMO_MODE season now (normal enrollment window). The next tick's seasonCount scan tracks and funds it. */
export async function createDemoSeason(ctx: KeeperContext, tenor: Tenor): Promise<{ seasonId: bigint; hash: Hex }> {
  const enrollStart = ctx.nowSec();
  const start = enrollStart + DEMO_ENROLL_SECONDS;
  const end = start + DEMO_TENORS[tenor];
  const { hash, receipt } = await ctx.sender.sendAndWait({
    address: ctx.reader.addresses.vault,
    abi: seasonVaultAbi,
    functionName: "createSeason",
    args: [enrollStart, start, end],
  });
  if (receipt.status !== "success") throw new Error(`createSeason(${tenor}) reverted (${hash})`);
  const [created] = parseEventLogs({ abi: seasonVaultAbi, logs: receipt.logs, eventName: "SeasonCreated" });
  if (!created) throw new Error(`createSeason(${tenor}) emitted no SeasonCreated (${hash})`);
  const seasonId = created.args.seasonId;
  ctx.logger.info({ tenor, seasonId: seasonId.toString(), start: start.toString(), end: end.toString(), hash }, "demo season created");
  return { seasonId, hash };
}

async function fundSeason(ctx: KeeperContext, id: bigint) {
  const { reader, sender, logger } = ctx;
  const { vault, token } = reader.addresses;
  const me = sender.address;
  if ((await reader.balanceOf(me)) < DEMO_BONUS) {
    // Mint a batch so most seasons need only the fundBonus tx.
    await mustSucceed(sender, { address: token, abi: mockUSDAbi, functionName: "mint", args: [me, DEMO_BONUS * 10n] }, "mint");
  }
  if ((await reader.allowance(me, vault)) < DEMO_BONUS) {
    await mustSucceed(sender, { address: token, abi: mockUSDAbi, functionName: "approve", args: [vault, maxUint256] }, "approve");
  }
  const hash = await mustSucceed(sender, { address: vault, abi: seasonVaultAbi, functionName: "fundBonus", args: [id, DEMO_BONUS] }, `fundBonus(${id})`);
  logger.info({ seasonId: id.toString(), amount: DEMO_BONUS.toString(), hash }, "season bonus funded");
}

// ---------------------------------------------------------------- recordGame queue

type TableRow = typeof tables.$inferSelect;

export async function tickRecords(ctx: KeeperContext): Promise<void> {
  const rows = await ctx.db
    .select()
    .from(tables)
    .where(inArray(tables.recordStatus, ["pending", "sent"]))
    .orderBy(tables.id)
    .limit(RECORD_BATCH);
  for (const row of rows) {
    try {
      await recordOne(ctx, row);
    } catch (err) {
      // Only RPC, nonce and gas errors land here; the row stays queued for the next tick.
      ctx.logger.warn({ err, tableId: row.id }, "recordGame failed; retrying next tick");
    }
  }
}

async function setRecord(ctx: KeeperContext, id: number, patch: Partial<Pick<TableRow, "recordStatus" | "recordTxHash" | "recordError" | "gameId">>) {
  await ctx.db.update(tables).set(patch).where(eq(tables.id, id));
}

async function recordOne(ctx: KeeperContext, row: TableRow): Promise<void> {
  const { reader, sender, logger } = ctx;
  const gameId = gameIdFor(ctx.salt, row.id);

  if (row.gameScore === null) {
    await setRecord(ctx, row.id, { recordStatus: "failed", recordError: "missing gameScore", gameId });
    return;
  }
  // A tx sent before a restart may have landed: don't send a second one.
  if (row.recordStatus === "sent" && (await reader.isRecorded(gameId))) {
    await setRecord(ctx, row.id, { recordStatus: "recorded", gameId });
    return;
  }

  let hash: Hex;
  try {
    hash = await sender.send({
      address: reader.addresses.game,
      abi: gameManagerAbi,
      functionName: "recordGame",
      args: [gameId, row.humanAddress as Address, BigInt(row.gameScore), (row.logHash ?? zeroHash) as Hex],
    });
  } catch (err) {
    const reason = revertName(err);
    if (reason === undefined) throw err;
    if (reason === "AlreadyRecorded") {
      await setRecord(ctx, row.id, { recordStatus: "recorded", gameId });
    } else {
      // SeasonNotActive, NoPosition, ScoreTooHigh: final, never retried.
      await setRecord(ctx, row.id, { recordStatus: "failed", recordError: reason, gameId });
      logger.warn({ tableId: row.id, reason }, "recordGame rejected");
    }
    return;
  }

  await setRecord(ctx, row.id, { recordStatus: "sent", recordTxHash: hash, gameId });
  const receipt = await sender.wait(hash);
  if (receipt.status !== "success") {
    const landed = await reader.isRecorded(gameId);
    await setRecord(ctx, row.id, landed ? { recordStatus: "recorded" } : { recordStatus: "failed", recordError: `reverted on-chain (${hash})` });
    return;
  }
  const skipped = parseEventLogs({ abi: gameManagerAbi, logs: receipt.logs, eventName: "PointsSkipped" }).length > 0;
  await setRecord(ctx, row.id, { recordStatus: skipped ? "skipped" : "recorded" });
  logger.info({ tableId: row.id, gameId, hash, skipped }, "game recorded");
}

// ---------------------------------------------------------------- loop

export interface KeeperDeps {
  config: Config;
  db: Db;
  logger: Logger;
  publicClient?: PublicClient;
  wallet?: KeyedWallet;
  intervalMs?: number;
}

export interface Keeper {
  /** Resolves once any running tick has finished. */
  stop(): Promise<void>;
  /** createDemoSeason, run between ticks so a tick never sees a half-created season. */
  createDemoSeason(tenor: Tenor): Promise<{ seasonId: bigint; hash: Hex }>;
}

/** Starts the keeper loop. */
export function startKeeper(deps: KeeperDeps): Keeper {
  const publicClient = deps.publicClient ?? createClients(deps.config).publicClient;
  const wallet = deps.wallet ?? (createKeeperWallet(deps.config) as KeyedWallet);
  const ctx = createKeeperContext({ ...deps, publicClient, wallet });
  const logger = deps.logger.child({ module: "keeper" });
  ctx.logger = logger;
  const intervalMs = deps.intervalMs ?? KEEPER_INTERVAL_MS;

  publicClient
    .getBalance({ address: wallet.account.address })
    .then((bal) => {
      const level = bal < MIN_KEEPER_BALANCE ? "warn" : "info";
      logger[level]({ address: wallet.account.address, balance: formatEther(bal) }, "keeper balance (needs > 10 MON)");
    })
    .catch(() => undefined);

  let stopped = false;
  let timer: NodeJS.Timeout | undefined;
  // Ticks and manual season creates share one chain, so they never interleave.
  let running: Promise<unknown> = Promise.resolve();
  const exclusive = <T>(fn: () => Promise<T>): Promise<T> => {
    const next = running.catch(() => undefined).then(fn);
    running = next.catch(() => undefined);
    return next;
  };

  const tick = async () => {
    try {
      await tickSeasons(ctx);
    } catch (err) {
      logger.warn({ err }, "season tick failed");
    }
    try {
      await tickRecords(ctx);
    } catch (err) {
      logger.warn({ err }, "record tick failed");
    }
  };
  const loop = () => {
    if (stopped) return;
    void exclusive(tick).finally(() => {
      if (!stopped) timer = setTimeout(loop, intervalMs);
    });
  };
  loop();

  return {
    async stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      await running;
    },
    createDemoSeason: (tenor) => exclusive(() => createDemoSeason(ctx, tenor)),
  };
}
