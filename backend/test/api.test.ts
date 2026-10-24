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

function fakeChain(season: Partial<SeasonInfo> = {}, eligible = true): ChainReads {
  const s: SeasonInfo = {
    seasonId: 1, enrollStart: now() - 300, start: now() - 60, end: now() + 3_600, status: "Active",
    shortfall: false, totalPrincipal: 500_000_000n, sponsorFunds: 1_000_000_000n, bonusPot: 1_000_000_000n, ...season,
  };
  return {
    demoMode: true,
    seasonCount: async () => 1,
    getSeason: async () => s,
    activeSeasonOf: async () => 1,
    isEligible: async () => eligible,
    principalOf: async () => 500_000_000n,
    weightOf: async () => 500_000_000n,
    previewClaim: async () => ({ principal: 500_000_000n, baseYield: 1n, bonus: 2n }),
    seasonPoints: async () => 0n,
    gamesCounted: async () => 0,
    pointsK: async () => 2,
  };
}

async function setup(chain = fakeChain()) {
  const db = createDb(":memory:");
  await migrateDb(db);
  const book = new PriceBook();
  for (const coin of COINS) book.push({ coin, price: 100_000_000n, expo: -8, publishTime: now() });
  const listeners: ((id: number, e: EngineEvent) => void)[] = [];
  const engine = new GameEngine({ db, book, log, onEvent: (id, e) => listeners.forEach((l) => l(id, e)) });
  const matchmaker = new Matchmaker({ db, engine, chain });
  const auth = new Auth(db, DOMAIN, 10143);
  const server = await buildServer({ db, engine, matchmaker, chain, auth, book, log, corsOrigin: "http://localhost:3000", priceTickMs: 0 });
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

  it("refuses a table that cannot finish before the season ends", async () => {
    await ctx.app.close();
    ctx = await setup(fakeChain({ end: now() + 7 * 60 }));
    const token = (await signIn(ctx.app)).res.json().token;
    const res = await ctx.app.inject({ method: "POST", url: "/play", headers: { authorization: `Bearer ${token}` }, payload: { preset: "quick" } });
    expect(res.json().error).toBe("SEASON_CLOSING");
  });

  it("refuses play during enrollment and for ineligible players", async () => {
    await ctx.app.close();
    ctx = await setup(fakeChain({ status: "Enrollment", start: now() + 60 }));
    let token = (await signIn(ctx.app)).res.json().token;
    let res = await ctx.app.inject({ method: "POST", url: "/play", headers: { authorization: `Bearer ${token}` }, payload: { preset: "quick" } });
    expect(res.json().error).toBe("SEASON_NOT_ACTIVE");

    await ctx.app.close();
    ctx = await setup(fakeChain({}, false));
    token = (await signIn(ctx.app)).res.json().token;
    res = await ctx.app.inject({ method: "POST", url: "/play", headers: { authorization: `Bearer ${token}` }, payload: { preset: "quick" } });
    expect(res.json().error).toBe("NOT_ELIGIBLE");
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
});
