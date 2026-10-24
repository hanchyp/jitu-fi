import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COINS, getPreset } from "../../mocks/table";
import { bps, createDemo, marketMove, pickReturn, liveProgress, price } from "./demo-engine";
import { LivePicks } from "./LivePicks";

test("Live shows your sealed picks and uses the same quote and return as the game", () => {
  const state = { ...createDemo(getPreset("quick"), "live"), round: 1, remaining: 40, picks: [{ symbol: "ETH", direction: "Sell" as const }, { symbol: "BTC", direction: "Buy" as const }] };
  const coin = COINS.find((item) => item.symbol === "ETH")!;
  const markup = renderToStaticMarkup(createElement(LivePicks, { state, onInspect: () => {} }));
  assert.match(markup, /Your live picks/);
  assert.match(markup, /Follow your Sell ETH pick/);
  assert.match(markup, /Follow your Buy BTC pick/);
  assert.ok(markup.includes(price(Math.round(coin.priceMicros * (10_000 + marketMove(state, "ETH")) / 10_000))));
  assert.ok(markup.includes(bps(pickReturn(state.picks[0], state.round, liveProgress(state), state.scenario))));
  assert.match(markup, /data-coin-symbol="ETH"/);
});

test("unsealed selections never appear as active live picks", () => {
  const state = { ...createDemo(getPreset("quick"), "live"), locked: false, picks: [{ symbol: "BTC", direction: "Buy" as const }] };
  const markup = renderToStaticMarkup(createElement(LivePicks, { state, onInspect: () => {} }));
  assert.match(markup, /No sealed picks this round/);
  assert.doesNotMatch(markup, /data-coin-symbol|Follow your/);
});
