import test from "node:test";
import assert from "node:assert/strict";
import { tableReducer } from "./reducer";
import { toDemoState } from "./toDemoState";
import { getAuthToken } from "./session";
import { gameScores, playerPicks, roundResult, pickReturn, marketPrice } from "@/components/table/demo-engine";
import type { EngineEvent, TableState } from "./types";
const coins = ["BTC", "ETH", "SOL", "DOGE", "BNB", "XRP", "AVAX", "MON"];
const fixture = (): TableState => ({ id: 7, preset: "quick", seasonId: 1, createdAtMs: 1000, phase: "Commit", phaseDeadlineMs: 21000, round: 1, seats: [0,1,2,3].map((seat) => ({ seat, address: `seat${seat}`, isBot: seat > 0, ...(seat === 0 ? { hand: ["BOOST" as const, "LOCK" as const] } : { handSize: 1 }) })), rounds: [{ n: 1, cap: 1, coins, liveDuration: 60, commitDeadlineMs: 21000, picks: {}, skills: [] }] });
const price = (value: string) => ({ price: value, expo: -8, publishTime: 1 });

test("backend event sequence preserves privacy, deadlines, hands and authoritative results", () => {
  let state = fixture();
  state = tableReducer(state, { type: "picksSubmitted", round: 1, seat: 1 });
  assert.deepEqual(state.rounds[0].picks, {});
  assert.deepEqual(playerPicks(toDemoState(state, 1000)).bruno, []);
  const events: EngineEvent[] = [
    { type: "revealed", round: 1, picks: { 0: [{ coin: "BTC", side: "Buy", boosted: true }], 1: [{ coin: "ETH", side: "Sell" }] }, revealDeadlineMs: 31000 },
    { type: "liveStarted", round: 1, startPrices: { BTC: price("10000000000"), ETH: price("20000000000") }, liveStartMs: 31000, liveEndMs: 91000 },
    { type: "skillUsed", round: 1, skill: { seat: 1, skill: "FREEZE", targetSeat: 0, targetCoin: "BTC", price: "10100000000", atMs: 40000 } },
    { type: "roundSettled", round: 1, results: [{ seat: 0, score: 100, forfeit: false, picks: [{ coin: "BTC", side: "Buy", raw: 100, ret: 100, void: false }] }, { seat: 1, score: -50, forfeit: false, picks: [] }, { seat: 2, score: 0, forfeit: true, picks: [] }, { seat: 3, score: 0, forfeit: true, picks: [] }], winners: [0], awarded: [{ seat: 0, skill: "SWAP" }] },
  ];
  for (const event of events) state = tableReducer(state, event);
  assert.deepEqual(state.seats[0].hand, ["LOCK", "SWAP"]);
  assert.equal(state.phaseDeadlineMs, 91000);
  const mapped = toDemoState(state, 91000);
  assert.equal(mapped.phase, "results");
  assert.equal(roundResult(mapped).scores.you, 100);
  assert.deepEqual(roundResult(mapped).winners, ["you"]);
  assert.equal(pickReturn(playerPicks(mapped).you[0], 0, 1, "default"), 100);
  assert.equal(tableReducer(state, events[3]), state);
  state = tableReducer(state, { type: "roundStarted", round: 2, cap: 2, coins, liveDuration: 70, commitDeadlineMs: 111000 });
  assert.deepEqual(state.rounds[1].picks, {});
  assert.equal(toDemoState(state, 100000).remaining, 11);
  state = tableReducer(state, { type: "gameFinished", gameScores: [123, -50, 0, 0] });
  assert.equal(gameScores(toDemoState(state, 111000)).you, 123);
  assert.equal(state.phaseDeadlineMs, null);
});

test("live mapper uses bigint shared scoring and actual quotes", () => {
  const state = fixture(); state.phase = "Live";
  state.rounds[0].picks = { 0: [{ coin: "BTC", side: "Buy" }], 1: [{ coin: "ETH", side: "Sell" }] };
  state.rounds[0].startPrices = { BTC: price("100000000000000000000"), ETH: price("20000000000") };
  const mapped = toDemoState(state, 1000, { BTC: price("101000000000000000000"), ETH: price("19800000000") });
  assert.equal(roundResult(mapped).scores.you, 100);
  assert.equal(roundResult(mapped).scores.bruno, 100);
  assert.equal(marketPrice(mapped, "BTC"), "$1,010,000,000,000.00");
  assert.equal(marketPrice(mapped, "MON"), "—");
});

test("session handles absent, expired, malformed and denied storage", () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    for (const value of [null, "bad", JSON.stringify({ token: "expired", expiresAt: 1 })]) {
      Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => value } });
      assert.equal(getAuthToken(), null);
    }
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify({ token: "valid", expiresAt: Math.floor(Date.now()/1000) + 60 }) } });
    assert.equal(getAuthToken(), "valid");
    Object.defineProperty(globalThis, "localStorage", { configurable: true, get: () => { throw new Error("denied"); } });
    assert.equal(getAuthToken(), null);
  } finally { if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage"); }
});

test("API sends bearer picks and preserves actionable HTTP errors", async () => {
  const { fetchTable, postPicks, ApiError } = await import("./api");
  const originalFetch = globalThis.fetch;
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  try {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify({ token: "fixture-token", expiresAt: Math.floor(Date.now()/1000) + 60 }) } });
    globalThis.fetch = async (_url, options) => {
      assert.equal((options?.headers as Record<string,string>).Authorization, "Bearer fixture-token");
      assert.equal(options?.body, JSON.stringify({ picks: [{ coin: "BTC", side: "Buy", boosted: true }] }));
      return new Response(JSON.stringify({ ok: true }));
    };
    await postPicks(7, [{ coin: "BTC", side: "Buy", boosted: true }]);
    for (const status of [401, 404, 409]) {
      globalThis.fetch = async () => new Response(JSON.stringify({ error: "FIXTURE_ERROR", message: "fixture failure", tableId: 7 }), { status });
      await assert.rejects(fetchTable(7), (err: unknown) => err instanceof ApiError && err.status === status && err.tableId === 7 && err.message === (status === 401 ? "Sign in to play" : "fixture failure"));
    }
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    await assert.rejects(fetchTable(7), (err: unknown) => err instanceof ApiError && err.code === "NETWORK");
  } finally {
    globalThis.fetch = originalFetch;
    if (descriptor) Object.defineProperty(globalThis, "localStorage", descriptor); else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
