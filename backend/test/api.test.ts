import { pino } from "pino";
import { privateKeyToAccount } from "viem/accounts";
import { createSiweMessage } from "viem/siwe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { Auth } from "../src/api/auth.js";
import type { ChainReads, SeasonInfo } from "../src/api/chain.js";
import { buildServer } from "../src/api/server.js";
import { createDb, migrateDb } from "../src/db/client.js";
import { GameEngine } from "../src/engine/engine.js";
import { Matchmaker } from "../src/engine/matchmaker.js";
import type { EngineEvent } from "../src/engine/types.js";
import { PriceBook } from "../src/prices/book.js";
import { COINS } from "../src/prices/feeds.js";

const log = pino({ level: "silent" });
// Anvil dev key #1 (public test key).
const account = privateKeyToAccount("0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d");
const DOMAIN = "localhost:3000";
const now = () => Math.floor(Date.now() / 1000);

function fakeChain(season: Partial<SeasonInfo> = {}, eligible = true, activeSeason = 1): ChainReads {
  const s: SeasonInfo = {
    seasonId: 1, enrollStart: now() - 300, start: now() - 60, end: now() + 3_600, status: "Active",
    shortfall: false, totalPrincipal: 500_000_000n, sponsorFunds: 1_000_000_000n, bonusPot: 1_000_000_000n, ...season,
  };
  return {
    demoMode: true,
    seasonCount: async () => 1,
    getSeason: async (id) => {
      if (id === 0) throw new Error("getSeason(0)");
      return s;
    },
    activeSeasonOf: async () => activeSeason,
    isEligible: async () => eligible,
    principalOf: async () => 500_000_000n,
    weightOf: async () => 500_000_000n,
    previewClaim: async () => ({ principal: 500_000_000n, baseYield: 1n, bonus: 2n }),
    seasonPoints: async () => 0n,
    gamesCounted: async () => 0,
    pointsK: async () => 2,
  };
}

type Admin = NonNullable<Parameters<typeof buildServer>[0]["admin"]>;

async function setup(chain = fakeChain(), admin?: Admin) {
  const db = createDb(":memory:");
  await migrateDb(db);
  const book = new PriceBook();
  for (const coin of COINS) book.push({ coin, price: 100_000_000n, expo: -8, publishTime: now() });
  const listeners: ((id: number, e: EngineEvent) => void)[] = [];
  const engine = new GameEngine({ db, book, log, onEvent: (id, e) => listeners.forEach((l) => l(id, e)) });
  const matchmaker = new Matchmaker({ db, engine, chain });
  const auth = new Auth(db, DOMAIN, 10143);
  const server = await buildServer({ db, engine, matchmaker, chain, auth, book, log, corsOrigin: "http://localhost:3000", priceTickMs: 0, admin });
  listeners.push(server.onEngineEvent);
  return { ...server, engine };
}

async function signIn(app: Awaited<ReturnType<typeof setup>>["app"]) {
  const { nonce } = (await app.inject({ method: "POST", url: "/auth/nonce" })).json();
  const message = createSiweMessage({ address: account.address, chainId: 10143, domain: DOMAIN, nonce, uri: "http://localhost:3000", version: "1" });
  const signature = await account.signMessage({ message });
  const res = await app.inject({ method: "POST", url: "/auth/verify", payload: { message, signature } });
  return { res, message, signature };
}

let ctx: Awaited<ReturnType<typeof setup>>;
beforeEach(async () => (ctx = await setup()));
afterEach(async () => {
  ctx.engine.stop();
  await ctx.app.close();
});

describe("API", () => {
  it("returns 400 for a bad address", async () => {
    const res = await ctx.app.inject({ method: "GET", url: "/users/not-an-address/position" });
    expect(res.statusCode).toBe(400);
  });

  it("serves the current seasons with bigint amounts as strings", async () => {
    const body = (await ctx.app.inject({ method: "GET", url: "/seasons/current" })).json();
    expect(body.seasons[0]).toMatchObject({ seasonId: 1, status: "Active", bonusPot: "1000000000", demoMode: true, tenor: "week" });
  });

  it("signs in with SIWE once per nonce", async () => {
    const { res, message, signature } = await signIn(ctx.app);
    expect(res.statusCode).toBe(200);
    expect(res.json().address).toBe(account.address.toLowerCase());
    const replay = await ctx.app.inject({ method: "POST", url: "/auth/verify", payload: { message, signature } });
    expect(replay.statusCode).toBe(401);
  });

  it("requires a session to play", async () => {
    const res = await ctx.app.inject({ method: "POST", url: "/play", payload: { preset: "quick" } });
    expect(res.statusCode).toBe(401);
  });

  it("creates one table per player and accepts hidden picks", async () => {
    const token = (await signIn(ctx.app)).res.json().token;
    const auth = { authorization: `Bearer ${token}` };
    const play = await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset: "quick" } });
    expect(play.statusCode).toBe(200);
    const { tableId } = play.json();

    const again = await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset: "quick" } });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ error: "ALREADY_AT_TABLE", tableId });

    const picks = await ctx.app.inject({ method: "POST", url: `/tables/${tableId}/picks`, headers: auth, payload: { picks: [{ coin: "BTC", side: "Buy" }] } });
    expect(picks.statusCode).toBe(200);
    const over = await ctx.app.inject({ method: "POST", url: `/tables/${tableId}/picks`, headers: auth, payload: { picks: [{ coin: "BTC", side: "Buy" }, { coin: "ETH", side: "Buy" }] } });
    expect(over.json().error).toBe("OVER_CAP");

    const mine = (await ctx.app.inject({ method: "GET", url: `/tables/${tableId}`, headers: auth })).json();
    expect(mine.rounds[0].picks["0"]).toEqual([{ coin: "BTC", side: "Buy" }]);
    const anon = (await ctx.app.inject({ method: "GET", url: `/tables/${tableId}` })).json();
    expect(anon.rounds[0].picks).toEqual({});
  });

  async function playAs(chain: ChainReads, preset = "quick") {
    await ctx.app.close();
    ctx.engine.stop();
    ctx = await setup(chain);
    const auth = { authorization: `Bearer ${(await signIn(ctx.app)).res.json().token}` };
    const res = await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset } });
    expect(res.statusCode).toBe(200);
    return { auth, tableId: res.json().tableId as number, state: ctx.engine.get(res.json().tableId)! };
  }

  it("starts a counted season game for an eligible player", async () => {
    const { state } = await playAs(fakeChain());
    expect(state.seasonId).toBe(1);
    expect(state.practice).toBeUndefined();
  });

  it.each([
    ["no position", fakeChain({}, true, 0), "quick"],
    ["enrollment", fakeChain({ status: "Enrollment", start: now() + 60 }), "quick"],
    ["expired season", fakeChain({ start: now() - 7_200, end: now() - 60 }), "quick"],
    ["finalized season", fakeChain({ status: "Finalized" }), "quick"],
    ["not eligible", fakeChain({}, false), "quick"],
    ["not enough time left", fakeChain({ end: now() + 7 * 60 }), "quick"],
    ["long preset past season end", fakeChain({ end: now() + 20 * 60 }), "marathon"],
  ])("starts a practice game immediately: %s", async (_name, chain, preset) => {
    const { auth, tableId, state } = await playAs(chain, preset);
    expect(state.seasonId).toBe(0);
    expect(state.practice).toBe(true);
    // Still one running table per wallet, and resume finds it.
    const again = await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset: "quick" } });
    expect(again.json()).toMatchObject({ error: "ALREADY_AT_TABLE", tableId });
    const running = (await ctx.app.inject({ method: "GET", url: `/users/${account.address}/table` })).json();
    expect(running).toEqual({ tableId });
  });

  it("keeps practice out of season counts, even after the player deposits", async () => {
    const chain = fakeChain({}, true, 0);
    const finish = async (tableId: number) => {
      for (let round = 1; round <= 3; round++) for (const phase of ["Commit", "Reveal", "Live"] as const) await ctx.engine.skipPhase(tableId, { phase, round });
      expect(ctx.engine.get(tableId)!.phase).toBe("Finished");
    };
    const { auth, tableId: practice } = await playAs(chain);
    await finish(practice);
    // Deposits after practice: the next game counts, the practice one never does.
    chain.activeSeasonOf = async () => 1;
    const counted = (await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset: "quick" } })).json().tableId;
    await finish(counted);
    const body = (await ctx.app.inject({ method: "GET", url: `/users/${account.address}/history` })).json();
    expect(body.games).toMatchObject([
      { tableId: counted, seasonId: 1, tenor: "week", credit: { kind: "counted", gameNumber: 1 }, recordStatus: "pending" },
      { tableId: practice, seasonId: 0, tenor: null, credit: { kind: "practice" }, recordStatus: "none" },
    ]);
  });

  it("broadcasts table events to the table room", async () => {
    await ctx.app.ready();
    const ws = await ctx.app.injectWS("/ws");
    const received: { room: string; type: string }[] = [];
    ws.on("message", (d: Buffer) => received.push(JSON.parse(d.toString())));
    ws.send(JSON.stringify({ subscribe: "table:1" }));
    await new Promise((r) => setTimeout(r, 50));

    const token = (await signIn(ctx.app)).res.json().token;
    await ctx.app.inject({ method: "POST", url: "/play", headers: { authorization: `Bearer ${token}` }, payload: { preset: "quick" } });
    await ctx.app.inject({ method: "POST", url: "/tables/1/picks", headers: { authorization: `Bearer ${token}` }, payload: { picks: [{ coin: "SOL", side: "Sell" }] } });
    await new Promise((r) => setTimeout(r, 50));
    ws.terminate();

    expect(received.map((m) => m.type)).toEqual(["subscribed", "roundStarted", "picksSubmitted"]);
    expect(received.every((m) => m.room === "table:1")).toBe(true);
  });

  describe("admin controls", () => {
    const manager = (overrides: Partial<Admin> = {}): Admin => ({
      isSeasonManager: async (user) => user === account.address.toLowerCase(),
      createSeason: async () => ({ seasonId: 7n, hash: "0xabc" }),
      ...overrides,
    });
    async function adminSetup(admin?: Admin) {
      await ctx.app.close();
      ctx = await setup(fakeChain(), admin);
      return { authorization: `Bearer ${(await signIn(ctx.app)).res.json().token}` };
    }
    const newSeason = (headers?: Record<string, string>) => ctx.app.inject({ method: "POST", url: "/admin/seasons", headers, payload: { tenor: "week" } });

    it("refuses without a session, off testnet (no admin deps) and for wallets without SEASON_MANAGER_ROLE", async () => {
      expect((await newSeason()).statusCode).toBe(401);
      let auth = await adminSetup(undefined);
      expect((await newSeason(auth)).json().error).toBe("ADMIN_DISABLED");
      auth = await adminSetup(manager({ isSeasonManager: async () => false }));
      const res = await newSeason(auth);
      expect(res.statusCode).toBe(403);
      expect(res.json().error).toBe("NOT_SEASON_MANAGER");
      const skip = await ctx.app.inject({ method: "POST", url: "/tables/1/advance", headers: auth, payload: { phase: "Commit", round: 1 } });
      expect(skip.json().error).toBe("NOT_SEASON_MANAGER");
    });

    it("creates a season for a manager, reports keeper-off and refuses a duplicate in flight", async () => {
      let release!: () => void;
      const calls: string[] = [];
      const auth = await adminSetup(manager({
        createSeason: async (tenor) => {
          calls.push(tenor);
          await new Promise<void>((r) => (release = r));
          return { seasonId: 7n, hash: "0xabc" };
        },
      }));
      const first = newSeason(auth);
      await new Promise((r) => setTimeout(r, 20));
      const second = await newSeason(auth);
      expect(second.statusCode).toBe(409);
      expect(second.json().error).toBe("SEASON_CREATE_PENDING");
      release();
      expect((await first).json()).toEqual({ seasonId: 7, hash: "0xabc", tenor: "week" });
      expect(calls).toEqual(["week"]);

      const failing = await adminSetup(manager({ createSeason: async () => { throw new Error("rpc down"); } }));
      expect((await newSeason(failing)).json().error).toBe("SEASON_CREATE_FAILED");
      const off = await adminSetup(manager({ createSeason: undefined }));
      expect((await newSeason(off)).json().error).toBe("KEEPER_UNAVAILABLE");
    });

    it("skips exactly one phase of the manager's own table and ignores stale or repeated requests", async () => {
      const auth = await adminSetup(manager());
      const { tableId } = (await ctx.app.inject({ method: "POST", url: "/play", headers: auth, payload: { preset: "quick" } })).json();
      const skip = (phase: string, round: number) => ctx.app.inject({ method: "POST", url: `/tables/${tableId}/advance`, headers: auth, payload: { phase, round } });

      expect((await skip("Commit", 1)).json()).toEqual({ advanced: true });
      expect(ctx.engine.get(tableId)!.phase).toBe("Reveal");
      expect((await skip("Commit", 1)).json()).toEqual({ advanced: false });
      expect((await skip("Reveal", 1)).json()).toEqual({ advanced: true });
      expect((await skip("Live", 1)).json()).toEqual({ advanced: true });
      const state = ctx.engine.get(tableId)!;
      expect(state.rounds[0]!.results).toHaveLength(4);
      expect([state.phase, state.round]).toEqual(["Commit", 2]);
      expect((await ctx.app.inject({ method: "POST", url: "/tables/999/advance", headers: auth, payload: { phase: "Commit", round: 1 } })).statusCode).toBe(404);
    });

    it("refuses to skip another player's table", async () => {
      const other = privateKeyToAccount("0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a");
      const auth = await adminSetup(manager({ isSeasonManager: async () => true }));
      const table = await ctx.engine.createTable({ human: other.address, bots: ["0x01", "0x02", "0x03"], seasonId: 1, preset: "quick" });
      const res = await ctx.app.inject({ method: "POST", url: `/tables/${table.id}/advance`, headers: auth, payload: { phase: "Commit", round: 1 } });
      expect(res.json().error).toBe("NOT_YOUR_TABLE");
      expect(ctx.engine.get(table.id)!.phase).toBe("Commit");
    });
  });
});
