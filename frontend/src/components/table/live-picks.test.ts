import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { COINS, PLAYERS, getPreset } from "../../mocks/table";
import { bps, createDemo, marketMove, pickReturn, liveProgress, price, playerPicks } from "./demo-engine";
import { LivePickDetail, LivePicks } from "./LivePicks";
import { initialLiveSelection, livePlayerView, liveSelectionReducer } from "./live-picks";

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
  assert.match(markup, /Previous player&#x27;s live picks/);
  assert.match(markup, /Next player&#x27;s live picks/);
});

test("players cycle in existing order, wrapping in both directions", () => {
  let selection = initialLiveSelection;
  assert.equal(PLAYERS[selection.playerIndex].name, "You");
  for (const name of ["Bruno", "Bera", "Dex", "You"]) {
    selection = liveSelectionReducer(selection, { type: "player", direction: 1 });
    assert.equal(PLAYERS[selection.playerIndex].name, name);
    assert.equal(selection.direction, 1);
  }
  for (const name of ["Dex", "Bera", "Bruno", "You"]) {
    selection = liveSelectionReducer(selection, { type: "player", direction: -1 });
    assert.equal(PLAYERS[selection.playerIndex].name, name);
    assert.equal(selection.direction, -1);
  }
});

test("each owner uses their picks, quote, direction, skill and return, including opposite calls on BTC", () => {
  const state = { ...createDemo(getPreset("quick"), "live"), remaining: 40, picks: [{ symbol: "BTC", direction: "Sell" as const }] };
  let selection = initialLiveSelection;
  const own = livePlayerView(state, selection).pick!;
  for (let index = 0; index < PLAYERS.length; index++) {
    const view = livePlayerView(state, selection);
    assert.deepEqual(view.picks, playerPicks(state)[PLAYERS[index].id]);
    const pick = view.pick!;
    const coin = COINS.find((item) => item.symbol === pick.symbol)!;
    const markup = renderToStaticMarkup(createElement(LivePickDetail, { state, pick, onInspect: () => {} }));
    assert.ok(markup.includes(price(Math.round(coin.priceMicros * (10_000 + marketMove(state, pick.symbol)) / 10_000))));
    assert.ok(markup.includes(bps(pickReturn(pick, state.round, liveProgress(state), state.scenario))));
    assert.ok(markup.includes(`${pick.direction} ${pick.symbol}`));
    if (pick.skill) assert.ok(markup.includes(pick.skill));
    if (index === 1) {
      assert.equal(pick.symbol, own.symbol);
      assert.equal(pick.direction, "Buy");
      assert.equal(pickReturn(pick, 0, liveProgress(state), state.scenario), -pickReturn(own, 0, liveProgress(state), state.scenario));
    }
    selection = liveSelectionReducer(selection, { type: "player", direction: 1 });
  }
});

test("forfeit keeps opponents available and Commit never exposes any owner's picks", () => {
  const state = createDemo(getPreset("quick"), "live", "forfeit");
  assert.equal(livePlayerView(state, initialLiveSelection).pick, undefined);
  let selection = initialLiveSelection;
  for (let index = 0; index < PLAYERS.length; index++) {
    assert.deepEqual(livePlayerView({ ...state, phase: "commit", locked: true, picks: [{ symbol: "BTC", direction: "Buy" }] }, selection).picks, []);
    selection = liveSelectionReducer(selection, { type: "player", direction: 1 });
    if (selection.playerIndex) assert.ok(livePlayerView(state, selection).pick);
  }
  const markup = renderToStaticMarkup(createElement(LivePicks, { state: { ...state, phase: "commit", locked: true, picks: [{ symbol: "BTC", direction: "Buy" }] }, onInspect: () => {} }));
  assert.doesNotMatch(markup, /data-coin-symbol|Follow your/);
});

test("coin tabs persist per owner through ticks and safely fall back across rounds and changed picks", () => {
  const state = { ...createDemo(getPreset("quick"), "live"), round: 2 };
  let selection = liveSelectionReducer(initialLiveSelection, { type: "player", direction: 1 });
  const picks = livePlayerView(state, selection).picks;
  selection = liveSelectionReducer(selection, { type: "coin", round: state.round, symbol: picks[1].symbol });
  const next = liveSelectionReducer(selection, { type: "player", direction: 1 });
  assert.equal(livePlayerView(state, next).pick?.symbol, livePlayerView(state, next).picks[0].symbol);
  selection = liveSelectionReducer(next, { type: "player", direction: -1 });
  assert.equal(livePlayerView({ ...state, remaining: 20, marketTick: 10 }, selection).pick?.symbol, picks[1].symbol);
  const newRound = { ...state, round: 0 };
  assert.equal(livePlayerView(newRound, selection).pick?.symbol, playerPicks(newRound).bruno[0].symbol);
  selection = liveSelectionReducer(selection, { type: "coin", round: state.round, symbol: "missing" });
  assert.equal(livePlayerView(state, selection).pick?.symbol, picks[0].symbol);
});

test("void and insurance retain the existing display and SSR is deterministic", () => {
  for (const scenario of ["void", "insured-pick"] as const) {
    const state = createDemo(getPreset("quick"), "live", scenario);
    const render = () => renderToStaticMarkup(createElement(LivePicks, { state, onInspect: () => {} }));
    assert.equal(render(), render());
    assert.match(render(), scenario === "void" ? /Void &lt;1 bps/ : /INSURANCE/);
    assert.match(render(), /opacity:0;transform:none/);
  }
});
