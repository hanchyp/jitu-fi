import test from "node:test";
import assert from "node:assert/strict";
import { skillErrorMessage } from "./skills";
import { ApiError } from "./api";
import { toDemoState } from "./toDemoState";
import { tableReducer } from "./reducer";
import { skillPicks } from "@/components/table/demo-engine";
import { serverFixture } from "@/components/table-scene/fixture-server";
import type { TableState } from "./types";

const fixture = (): TableState => ({ ...serverFixture("Live"), phase: "Live" });

test("every backend skill error becomes friendly text, including API errors", () => {
  for (const code of ["WRONG_PHASE", "NOT_IN_HAND", "ALREADY_USED_SKILL", "OWN_PICK_ONLY", "NO_SELF_ATTACK", "NO_SUCH_PICK", "PICK_HAS_EFFECT", "TARGET_ALREADY_ATTACKED", "BAD_SWAP_COIN", "PRICE_STALE", "LIVE_DEADLINE_PASSED", "TABLE_NOT_RUNNING", "NOT_SEATED"]) {
    const message = skillErrorMessage(code);
    assert.notEqual(message, code);
    assert.doesNotMatch(message, /Could not/);
    assert.equal(skillErrorMessage(new ApiError(code, "private details")), message);
    assert.equal(skillErrorMessage({ error: code }), message);
  }
  assert.match(skillErrorMessage(new TypeError("offline")), /Network/);
  assert.match(skillErrorMessage("unknown private details"), /Could not use/);
});

test("server hand, commit usage, bot attack and award survive event mapping", () => {
  let state = fixture();
  state.seats[0].hand = ["LOCK", "FLIP", "SWAP"];
  assert.deepEqual(toDemoState(state, 1060000).hand, ["LOCK", "FLIP", "SWAP"]);
  assert.ok(toDemoState(state, 1060000).usedSkills.includes("you"));
  state = tableReducer(state, { type: "skillUsed", round: 1, skill: { seat: 1, skill: "SWAP", targetSeat: 0, targetCoin: "BTC", swapTo: "MON", swapPrice: "2000000", price: "6003000000000", atMs: 1060000 } });
  const mapped = toDemoState(state, 1060000);
  assert.equal(mapped.incoming?.skill, "SWAP");
  assert.equal(mapped.incoming?.casterName, "Bruno");
  assert.equal(mapped.incoming?.symbol, "BTC");
  assert.equal(mapped.incoming?.swapSymbol, "MON");
  assert.equal(skillPicks(mapped).find((p) => p.id === "you:0")?.effect, "SWAP");
  state = fixture();
  state.seats[0].hand = ["LOCK", "FLIP", "SWAP"];
  delete state.rounds[0].picks[0][0].boosted;
  state = tableReducer(state, { type: "skillUsed", round: 1, skill: { seat: 0, skill: "LOCK", targetSeat: 0, targetCoin: "BTC", price: "6003000000000", atMs: 1060001 } });
  assert.deepEqual(toDemoState(state, 1060001).hand, ["FLIP", "SWAP"]);
  assert.ok(toDemoState(state, 1060001).usedSkills.includes("you"));
  state = tableReducer(state, { type: "roundSettled", round: 1, results: [], winners: [0], awarded: [{ seat: 0, skill: "FREEZE" }] });
  assert.deepEqual(toDemoState(state, 1090000).hand, ["FLIP", "SWAP", "FREEZE"]);
  assert.match(toDemoState(state, 1090000).toast, /FREEZE/);
  assert.deepEqual(toDemoState(state, 1090000).earned, ["FREEZE"]);
  state = tableReducer(state, { type: "roundStarted", round: 2, cap: 2, coins: ["BTC", "ETH"], liveDuration: 60, commitDeadlineMs: 1110000 });
  assert.deepEqual(toDemoState(state, 1090000).usedSkills, []);
  assert.equal(toDemoState(state, 1090000).incoming, null);
});
