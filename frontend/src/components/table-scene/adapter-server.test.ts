import assert from "node:assert/strict";
import test from "node:test";
import { fromTableState } from "./adapter-server";
import { serverFixture, SERVER_TICKS } from "./fixture-server";
import type { ServerPhase, ServerSkill } from "./server-types";

const PHASES = { Commit: "commit", Reveal: "reveal", Live: "live", Settled: "result", Finished: "result" } as const;
test("server phases, four named seats, celebration", () => {
  for (const phase of Object.keys(PHASES) as ServerPhase[]) {
    const scene = fromTableState(serverFixture(phase));
    assert.equal(scene.phase, PHASES[phase]);
    assert.equal(scene.celebrate, phase === "Finished");
    assert.deepEqual(scene.players.map((p) => p.name), ["You", "Bruno", "Bera", "Dex"]);
    assert.deepEqual(scene.players.map((p) => p.color), ["#DAAE4B", "#7BE35A", "#5AA9FF", "#FF6B5E"]);
  }
});
test("Commit hides even accidentally supplied opponent picks; Reveal discloses", () => {
  const state = serverFixture("Reveal");
  state.phase = "Commit";
  const scene = fromTableState(state);
  assert.equal(scene.players[0].picks.length, 1);
  assert.ok(scene.players.slice(1).every((p) => p.picks.length === 0));
  assert.deepEqual(Object.keys(scene.prices), ["BTC"]);
  assert.equal(fromTableState(serverFixture("Reveal")).players[1].picks[0].side, "Sell");
});
test("bigint returns truncate toward zero, normalize expo, void under 1 bps", () => {
  const state = serverFixture("Live");
  state.rounds[0].startPrices!.BTC = { price: "100000000000000000000", expo: -8, publishTime: 1030 };
  const run = (price: string, expo = -8) => fromTableState(state, { ticks: [{ coin: "BTC", price, expo, publishTime: 1060 }] }).players[0].picks[0];
  assert.equal(run("100009999999999999999").void, true);
  assert.equal(run("99990000000000000001").returnBps, 0);
  assert.equal(run("100019000000000000000").returnBps, 1);
  assert.equal(run("99981000000000000000").returnBps, -1);
  assert.equal(run("10001000000000000000", -7).returnBps, 1);
});
test("settlement trusts raw return, keeps Buy/Sell, commit skills, void and ties", () => {
  const scene = fromTableState(serverFixture("Settled"));
  assert.deepEqual(scene.players.slice(0, 2).map((p) => p.picks[0].effect), ["BOOST", "INSURANCE"]);
  assert.equal(scene.players[1].picks[0].returnBps, -10);
  assert.equal(scene.players[2].picks[0].void, true);
  assert.equal(scene.players[3].forfeit, true);
  assert.deepEqual(scene.winnerIds, ["you", "bruno"]);
  assert.deepEqual(scene.players.map((p) => p.score), [10, 10, 0, 0]);
});
test("LOCK/FREEZE hold, FLIP reverses second segment, SWAP changes coin; caster named", () => {
  for (const skill of ["LOCK", "FREEZE", "FLIP", "SWAP"] as const) {
    const state = serverFixture("Live");
    const round = state.rounds[0];
    round.startPrices!.BTC.price = "10000";
    round.startPrices!.ETH.price = "20000";
    const used: ServerSkill = { seat: skill === "LOCK" ? 0 : 1, skill, targetSeat: 0, targetCoin: "BTC", price: "10100", atMs: 1060000 };
    if (skill === "SWAP") Object.assign(used, { swapTo: "ETH", swapPrice: "20000" });
    round.skills.push(used);
    const scene = fromTableState(state, { ticks: [
      { coin: "BTC", price: "10200", expo: -8, publishTime: 1080 },
      { coin: "ETH", price: "20400", expo: -8, publishTime: 1080 },
    ] });
    const pick = scene.players[0].picks[0];
    assert.equal(pick.effect, skill);
    assert.equal(pick.effectBy, skill === "LOCK" ? undefined : "Bruno");
    assert.equal(pick.returnBps, skill === "FLIP" ? 1 : skill === "SWAP" ? 300 : 100);
    assert.equal(pick.symbol, skill === "SWAP" ? "ETH" : "BTC");
    assert.equal(pick.swappedFrom, skill === "SWAP" ? "BTC" : undefined);
  }
});
test("forfeit starts after Commit; derived winners exclude forfeits even at zero", () => {
  const state = serverFixture("Settled");
  const round = state.rounds[0];
  delete round.winners;
  round.results!.forEach((r) => { r.score = 0; });
  assert.deepEqual(fromTableState(state).winnerIds, ["you", "bruno", "bera"]);
  round.results!.forEach((r) => { r.forfeit = true; });
  assert.deepEqual(fromTableState(state).winnerIds, []);
  assert.equal(fromTableState(serverFixture("Commit")).players[3].forfeit, false);
  assert.equal(fromTableState(serverFixture("Reveal")).players[3].forfeit, true);
});
test("Finished uses game winners, including ties, rather than last round winners", () => {
  const state = serverFixture("Finished");
  state.gameScores = [1, 2, 3, 3];
  const scene = fromTableState(state);
  assert.deepEqual(scene.winnerIds, ["bera", "dex"]);
  assert.deepEqual(scene.players.map((p) => p.score), [1, 2, 3, 3]);
});
test("ridge includes opening, live ticks, authoritative close; old and late ticks ignored", () => {
  const state = serverFixture("Settled");
  const before = JSON.stringify(state);
  const scene = fromTableState(state, { ticks: [...SERVER_TICKS,
    { coin: "BTC", price: "1", expo: -8, publishTime: 1029 },
    { coin: "BTC", price: "1", expo: -8, publishTime: 1091 },
  ] });
  assert.deepEqual(scene.prices.BTC, [60000, 60030, 60060]);
  assert.equal(JSON.stringify(state), before);
  assert.equal(fromTableState(serverFixture("Live"), { ticks: SERVER_TICKS }).players[0].picks[0].returnBps, 5);
});
test("empty pre-round snapshots remain renderable", () => {
  const state = serverFixture("Commit");
  state.rounds = [];
  assert.ok(fromTableState(state).players.every((p) => p.picks.length === 0));
});
test("SWAP without a new quote retains cast price, matching backend fallback", () => {
  const state = serverFixture("Live");
  const round = state.rounds[0];
  round.skills = [{ seat: 1, skill: "SWAP", targetSeat: 0, targetCoin: "BTC", price: "6003000000000", swapTo: "ETH", swapPrice: "301000000000", atMs: 1060000 }];
  const pick = fromTableState(state).players[0].picks[0];
  assert.equal(pick.returnBps, 5);
});
