import assert from "node:assert/strict";
import test from "node:test";
import { getPreset } from "../../mocks/table";
import { coinMove, createDemo, demoReducer, gameScores, liveProgress, marketMove, roundResult, scorePicks } from "./demo-engine";

const quick = getPreset("quick");

test("commit enforces the cap, allows removal, and keeps only one skill", () => {
  let state = createDemo(quick);
  state = demoReducer(state, { type: "select", symbol: "BTC" });
  state = demoReducer(state, { type: "select", symbol: "ETH" });
  assert.equal(state.picks.length, 1);
  assert.match(state.error, /Remove a pick/);
  state = demoReducer(state, { type: "select", symbol: "BTC" });
  assert.equal(state.picks.length, 0);
  state = { ...state, round: 1, hand: ["BOOST", "INSURANCE"] };
  state = demoReducer(state, { type: "select", symbol: "BTC" });
  state = demoReducer(state, { type: "select", symbol: "ETH" });
  state = demoReducer(state, { type: "skill", symbol: "BTC", skill: "BOOST" });
  state = demoReducer(state, { type: "skill", symbol: "ETH", skill: "INSURANCE" });
  assert.equal(state.picks[0].skill, undefined);
  assert.equal(state.picks[1].skill, "INSURANCE");
});

test("Quick plays all three rounds through pending, reveal, live, results and finish", () => {
  let now = 1_000;
  let state = demoReducer(createDemo(quick), { type: "tick", now });
  for (let round = 0; round < 3; round++) {
    assert.equal(state.round, round);
    assert.equal(state.phase, "commit");
    assert.equal(state.picks.length, 0);
    state = demoReducer(state, { type: "select", symbol: "BTC" });
    state = demoReducer(state, { type: "lock", now });
    assert.equal(state.locked, false);
    assert.ok(state.lockingUntil > now);
    now += 700;
    state = demoReducer(state, { type: "tick", now });
    assert.equal(state.locked, true);
    for (const phase of ["reveal", "live", "results"] as const) {
      now = state.deadline;
      state = demoReducer(state, { type: "tick", now });
      assert.equal(state.phase, phase);
    }
    assert.equal(state.history.length, round + 1);
    state = demoReducer(state, { type: "advance", now });
    assert.equal(state.paused, false, "normal Next round keeps the demo running");
  }
  assert.equal(state.phase, "finished");
  assert.equal(state.history.length, 3);
  assert.ok(Number.isInteger(gameScores(state).you));
  assert.equal(demoReducer(state, { type: "tick", now: now + 60_000 }).history.length, 3);
});

test("late pending requests forfeit and hidden tabs catch up without duplicating results", () => {
  let state = demoReducer(createDemo(quick), { type: "tick", now: 1_000 });
  state = demoReducer(state, { type: "select", symbol: "BTC" });
  state = demoReducer(state, { type: "tick", now: 20_800 });
  state = demoReducer(state, { type: "lock", now: 20_800 });
  state = demoReducer(state, { type: "tick", now: 21_500 });
  assert.equal(state.phase, "reveal");
  assert.equal(state.locked, false);
  assert.ok(roundResult(state).forfeited.includes("you"));
  state = demoReducer(state, { type: "tick", now: 1_000_000 });
  assert.equal(state.phase, "finished");
  assert.equal(state.history.length, 3);
  assert.ok(state.history.every((result) => result.scores.you === 0));
});

test("ties include every eligible player; forfeit excludes the human; void scores zero", () => {
  assert.equal(roundResult(createDemo(quick, "results", "tie")).winners.length, 4);
  const forfeit = roundResult(createDemo(quick, "results", "forfeit"));
  assert.equal(forfeit.scores.you, 0);
  assert.ok(!forfeit.winners.includes("you"));
  const voidResult = roundResult(createDemo(quick, "results", "void"));
  assert.ok(Object.values(voidResult.scores).every((score) => score === 0));
});

test("scoring truncates toward zero, applies BOOST weights, and floors INSURANCE last", () => {
  assert.equal(scorePicks([{ symbol: "BTC", direction: "Buy" }, { symbol: "SOL", direction: "Sell" }], 1, 0, 1, "default"), -7);
  assert.equal(scorePicks([{ symbol: "BTC", direction: "Buy", skill: "BOOST" }, { symbol: "ETH", direction: "Buy" }], 3, 0, 1, "default"), 48);
  assert.equal(scorePicks([{ symbol: "ETH", direction: "Buy", skill: "INSURANCE" }], 1, 0, 1, "default"), 0);
});

test("pause freezes countdown and dev stepping stays paused", () => {
  let state = demoReducer(createDemo(quick), { type: "tick", now: 1_000 });
  state = demoReducer(state, { type: "pause", now: 2_000 });
  assert.equal(demoReducer(state, { type: "tick", now: 90_000 }).remaining, state.remaining);
  state = demoReducer(state, { type: "pause", now: 90_000 });
  assert.equal(state.deadline, 110_000);
  state = demoReducer(state, { type: "advance", now: 91_000, preview: true });
  assert.equal(state.phase, "reveal");
  assert.equal(state.paused, true);
});

test("table and chart share a ticking quote, and Live quotes follow the score path", () => {
  let state = demoReducer(createDemo(quick), { type: "tick", now: 1_000 });
  const before = marketMove(state, "BTC");
  state = demoReducer(state, { type: "tick", now: 2_000 });
  assert.equal(state.marketTick, 2);
  assert.notEqual(marketMove(state, "BTC"), before);
  const live = { ...state, phase: "live" as const, remaining: 40 };
  assert.equal(marketMove(live, "BTC"), coinMove("BTC", live.round, liveProgress(live), live.scenario));
});
