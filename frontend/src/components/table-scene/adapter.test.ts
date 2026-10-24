import assert from "node:assert/strict";
import test from "node:test";
import { getPreset } from "@/mocks/table";
import { createDemo, demoReducer, gameScores } from "@/components/table/demo-engine";
import { fromDemoState } from "./adapter";

const quick = getPreset("quick");
const seat = (props: ReturnType<typeof fromDemoState>, id: string) => props.players.find((p) => p.id === id)!;

test("maps every demo phase to a scene phase, celebrating only when finished", () => {
  const expected = { commit: "commit", reveal: "reveal", live: "live", results: "result", finished: "result" } as const;
  for (const [phase, scene] of Object.entries(expected)) {
    const props = fromDemoState(createDemo(quick, phase as keyof typeof expected));
    assert.equal(props.phase, scene, phase);
    assert.equal(props.celebrate, phase === "finished", phase);
  }
});

test("seats you plus the three bots with their podium colors", () => {
  const props = fromDemoState(createDemo(quick, "live"));
  assert.deepEqual(props.players.map((p) => [p.name, p.color]), [["You", "#DAAE4B"], ["Bruno", "#7BE35A"], ["Bera", "#5AA9FF"], ["Dex", "#FF6B5E"]]);
  assert.equal(seat(props, "you").isYou, true);
});

test("commit hides opponents' picks but keeps your selection", () => {
  const state = demoReducer(createDemo(quick), { type: "select", symbol: "ETH" });
  const props = fromDemoState(state);
  assert.deepEqual(seat(props, "you").picks.map((p) => [p.symbol, p.side]), [["ETH", "Buy"]]);
  for (const id of ["bruno", "bera", "dex"]) assert.deepEqual(seat(props, id).picks, []);
  assert.ok(fromDemoState(createDemo(quick, "reveal")).players.every((p) => p.picks.length > 0));
});

test("live returns follow the scoring path and carry skills", () => {
  const state = { ...createDemo(quick, "live", "insured-pick"), remaining: 30 };
  const props = fromDemoState(state);
  const pick = seat(props, "you").picks[0];
  assert.equal(pick.effect, "INSURANCE");
  assert.notEqual(pick.returnBps, 0);
  assert.equal(pick.void, false);
  assert.equal(seat(props, "bruno").picks[0].effect, "BOOST");
  const series = props.prices.BTC!;
  assert.equal(series.length, 33);
  assert.ok(Math.abs((series.at(-1)! / series[0] - 1) * 10_000 - pick.returnBps) < 0.01);
});

test("moves under 1 bps are void", () => {
  const props = fromDemoState({ ...createDemo(quick, "live", "void"), remaining: 30 });
  assert.ok(props.players.flatMap((p) => p.picks).every((p) => p.void && p.returnBps === 0));
});

test("ties give several winners", () => {
  const props = fromDemoState(createDemo(quick, "results", "tie"));
  assert.deepEqual(props.winnerIds, ["you", "bruno", "bera", "dex"]);
  assert.ok(props.players.every((p) => p.score === props.players[0].score));
});

test("an unsealed hand forfeits from Reveal on and cannot win", () => {
  const props = fromDemoState(createDemo(quick, "results", "forfeit"));
  assert.equal(seat(props, "you").forfeit, true);
  assert.deepEqual(seat(props, "you").picks, []);
  assert.ok(!props.winnerIds!.includes("you"));
  assert.equal(seat(fromDemoState(createDemo(quick)), "you").forfeit, false);
});

test("finished shows game scores and the game winners", () => {
  const state = createDemo(quick, "finished");
  const props = fromDemoState(state);
  const scores = gameScores(state);
  assert.deepEqual(props.players.map((p) => p.score), props.players.map((p) => scores[p.id]));
  const best = Math.max(...Object.values(scores));
  assert.deepEqual(props.winnerIds, Object.keys(scores).filter((id) => scores[id] === best));
});
