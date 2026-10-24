import assert from "node:assert/strict";
import { test } from "node:test";
import { COINS, PRESETS } from "@/mocks/table";
import { priceMicros, priceMove, priceNumber, type LivePrices } from "@/lib/game/livePrices";
import { createDemo, demoReducer, marketPrice, pickIsVoid, pickReturn, playerPicks, usingLivePrices, castLiveSkill } from "./demo-engine";

const feed = (btc = "10000000000", connected = true): LivePrices => ({ connected, history: {}, prices: Object.fromEntries(COINS.map((coin) => [coin.symbol, { coin: coin.symbol, price: btc, expo: -8, publishTime: 1 }])) });
const preset = Object.values(PRESETS)[0];
const update = (state: ReturnType<typeof createDemo>, prices: LivePrices) => demoReducer(state, { type: "prices", feed: prices });
const returns = (state: ReturnType<typeof createDemo>) => pickReturn(playerPicks(state).you[0], state.round, .5, state.scenario);

test("decimal integer conversion and bps truncate exactly across exponents", () => {
  const tick = feed().prices.BTC;
  assert.equal(priceNumber(tick), 100);
  assert.equal(priceMicros(tick), BigInt(100000000));
  assert.equal(priceMove(tick, { ...tick, price: "10001999999" }), 1);
  assert.equal(priceMove(tick, { ...tick, price: "9998000001" }), -1);
  assert.equal(priceMove(tick, { ...tick, price: "101", expo: 0 }), 100);
});

test("Live boundary snapshots feed, later ticks drive Buy/Sell/void", () => {
  let state = update(createDemo(preset, "reveal"), feed());
  state = demoReducer(state, { type: "advance", now: 1000 });
  const start = state.liveStart;
  assert.equal(start?.BTC.price, "10000000000");
  state = update(state, feed("10100000000"));
  assert.equal(state.liveStart, start);
  assert.equal(returns(state), 100);
  assert.equal(marketPrice(state, "BTC"), "$101.00");
  state = { ...state, picks: [{ symbol: "BTC", direction: "Sell" }] };
  assert.equal(returns(state), -100);
  state = update(state, feed("10000999999"));
  assert.equal(Math.abs(returns(state)), 0);
  assert.equal(pickIsVoid(playerPicks(state).you[0], 0, .5, "default"), true);
});

test("disconnected or incomplete provider retains deterministic simulation", () => {
  const baseline = createDemo(preset, "live");
  const offline = update(baseline, feed("20000000000", false));
  assert.equal(usingLivePrices(offline), false);
  assert.equal(returns(offline), returns(baseline));
  assert.equal(marketPrice(offline, "BTC"), marketPrice(baseline, "BTC"));
  const partial = feed(); delete partial.prices.MON;
  assert.equal(usingLivePrices(update(baseline, partial)), false);
});

test("live LOCK holds cast price, FLIP sums integer price-relative segments", () => {
  let state = update(createDemo(preset, "live"), feed());
  state = update(state, feed("10100000000"));
  const locked = castLiveSkill(state, "you", "LOCK", { pickId: "you:0" }, 0);
  assert.equal(returns(update(locked, feed("10200000000"))), 100);
  const pick = playerPicks(state).you[0];
  const moved = { ...pick, livePrices: { start: feed().prices, current: feed("10200000000").prices }, live: { skill: "FLIP" as const, by: "bot", progress: .5, originalSymbol: "BTC", originalDirection: "Buy" as const, prices: feed("10100000000").prices } };
  assert.equal(pickReturn(moved, 0, 1, "default"), 1);
});
