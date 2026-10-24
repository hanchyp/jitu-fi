import assert from "node:assert/strict";
import test from "node:test";
import { getPreset } from "@/mocks/table";
import { createDemo, gameScores, OUTCOMES } from "./demo-engine";
import { finalOutcome, rankOf } from "./result-outcome";

test("outcome maps rank to title, medal and particles", () => {
  const win = finalOutcome({ you: 9, a: 4, b: 2, c: 0 });
  assert.deepEqual([win.rank, win.shared, win.title, win.medal, win.particles], [1, false, "Victory!", "/assets/stats/medal-1.webp", 14]);
  const tie = finalOutcome({ you: 9, a: 9, b: 2, c: 0 });
  assert.deepEqual([tie.rank, tie.shared, tie.title, tie.medal, tie.particles], [1, true, "Shared victory", "/assets/stats/medal-1.webp", 14]);
  for (const [you, rank] of [[3, 2], [1, 3]] as const) {
    const placed = finalOutcome({ you, a: 4, b: 2, c: 0 });
    assert.deepEqual([placed.rank, placed.title, placed.medal, placed.particles], [rank, "Well played", `/assets/stats/medal-${rank}.webp`, 10]);
  }
  const last = finalOutcome({ you: -3, a: 4, b: 2, c: 0 });
  assert.deepEqual([last.rank, last.title, last.medal, last.particles], [4, "Good game", null, 0]);
  assert.ok(last.tip);
  assert.equal(win.tip, undefined);
  assert.equal(rankOf({ you: 2, a: 4, b: 2, c: 0 }, "b"), 2);
});

test("outcome previews land on the requested rank", () => {
  const expected = { win: [1, false], tie: [1, true], second: [2, false], third: [3, false], last: [4, false] };
  for (const outcome of OUTCOMES) {
    const state = createDemo(getPreset("quick"), "finished", "default", outcome);
    const result = finalOutcome(gameScores(state));
    assert.deepEqual([result.rank, result.shared], expected[outcome], outcome);
    assert.equal(state.earned.length, state.history.filter((round) => round.winners.includes("you")).slice(0, 2).length);
  }
});

import { recordLines } from "./result-outcome";
test("recordLines maps history credit and status", () => {
  assert.equal(recordLines(undefined, 5).credit, "Recording your result on-chain…");
  const base = { recordTxHash: "0xabc" as string | null };
  const counted = { kind: "counted" as const, gameNumber: 2, points: 120 };
  assert.equal(recordLines({ ...base, recordStatus: "sent", credit: counted }, 5).credit, "Recording your result on-chain…");
  const done = recordLines({ ...base, recordStatus: "recorded", credit: counted }, 5);
  assert.deepEqual([done.credit, done.txUrl, done.done], ["+120 season points · Game 2/5", "https://testnet.monadexplorer.com/tx/0xabc", true]);
  assert.equal(recordLines({ recordTxHash: null, recordStatus: "pending", credit: { kind: "outside-k" } }, 5).credit, "Outside your first 5 games: no points");
  const ended = recordLines({ recordTxHash: null, recordStatus: "skipped", credit: { kind: "after-end" } }, 5);
  assert.deepEqual([ended.credit, ended.note, ended.txUrl], ["Season ended: no points", "Result not recorded on-chain.", null]);
  assert.match(recordLines({ recordTxHash: null, recordStatus: "failed", credit: counted }, 5).note!, /failed/);
});
