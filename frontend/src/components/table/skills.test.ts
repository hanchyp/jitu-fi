import assert from "node:assert/strict";
import test from "node:test";
import { getPreset, LIVE_SECONDS } from "../../mocks/table";
import { castLiveSkill, coinMove, createDemo, demoReducer, pickReturn, playerPicks, rawPickReturn, skillPicks, type DemoState, type LiveSkill } from "./demo-engine";
import { fromDemoState } from "../table-scene/adapter";
import { cardBlock, swapCoins, targetBlock, targetsFor } from "../skills/rules";
import type { SkillHandProps } from "../skills/types";

function live(progress = .5): DemoState {
  return { ...createDemo(getPreset("quick"), "live"), round: 1, hand: ["LOCK", "FLIP", "SWAP"], paused: false, deadline: 100_000, remaining: LIVE_SECONDS[1] * (1 - progress) };
}
const target = { pickId: "bera:0" };

test("Live cast enforces held cards, deadline, phase, ownership, one use and reset", () => {
  const state = live();
  assert.equal(castLiveSkill(state, "you", "FREEZE", target, 1), state);
  assert.equal(castLiveSkill(state, "you", "FLIP", target, state.deadline), state);
  assert.equal(castLiveSkill({ ...state, phase: "reveal" }, "you", "FLIP", target, 1).effects[target.pickId], undefined);
  assert.equal(castLiveSkill(state, "you", "FLIP", { pickId: "you:0" }, 1), state);
  assert.equal(castLiveSkill(state, "you", "LOCK", target, 1), state);
  const cast = castLiveSkill(state, "you", "FLIP", target, 1);
  assert.equal(cast.effects[target.pickId].skill, "FLIP");
  assert.deepEqual(cast.hand, ["LOCK", "SWAP"]);
  assert.equal(castLiveSkill(cast, "you", "LOCK", { pickId: "you:0" }, 1), cast);
  const results = demoReducer(cast, { type: "advance", now: 2 });
  const next = demoReducer(results, { type: "advance", now: 3 });
  assert.deepEqual(next.effects, {});
  assert.deepEqual(next.usedSkills, []);
  assert.equal(next.incoming, null);
});

test("one attack per victim, LOCK immunity, commit skills coexist with attacks", () => {
  const state = live();
  const attacked = castLiveSkill(state, "you", "FLIP", target, 1);
  assert.equal(castLiveSkill(attacked, "bruno", "FREEZE", { pickId: "bera:1" }, 1), attacked);
  const locked = castLiveSkill(state, "you", "LOCK", { pickId: "you:0" }, 1);
  assert.equal(castLiveSkill(locked, "bera", "FREEZE", { pickId: "you:0" }, 1), locked);
  const insured = { ...state, picks: [{ symbol: "BTC", direction: "Buy" as const, skill: "INSURANCE" as const }] };
  assert.equal(castLiveSkill(insured, "you", "LOCK", { pickId: "you:0" }, 1), insured);
  const hit = castLiveSkill(insured, "bera", "FLIP", { pickId: "you:0" }, 1);
  const pick = playerPicks(hit).you[0];
  assert.equal(pick.skill, "INSURANCE");
  assert.equal(pick.live?.skill, "FLIP");
  assert.equal(pickReturn(pick, 1, 1, "default"), Math.max(0, rawPickReturn(pick, 1, 1, "default")));
});

test("LOCK and FREEZE hold return; FLIP truncates the two segments separately", () => {
  const state = live();
  const locked = castLiveSkill(state, "you", "LOCK", { pickId: "you:0" }, 1);
  const held = coinMove("BTC", 1, .5, "default");
  assert.equal(pickReturn(playerPicks(locked).you[0], 1, 1, "default"), held);
  const frozen = castLiveSkill(state, "bera", "FREEZE", { pickId: "you:0" }, 1);
  assert.equal(pickReturn(playerPicks(frozen).you[0], 1, 1, "default"), held);
  const flipped = castLiveSkill(state, "bera", "FLIP", { pickId: "you:0" }, 1);
  const end = coinMove("BTC", 1, 1, "default");
  assert.equal(playerPicks(flipped).you[0].direction, "Sell");
  assert.equal(rawPickReturn(playerPicks(flipped).you[0], 1, 1, "default"), held - Math.trunc((end - held) * 10_000 / (10_000 + held)));
  assert.equal(rawPickReturn(playerPicks(flipped).you[0], 1, .5, "default"), held);
});

test("SWAP excludes victim's original/current coins and preserves side, boost and earned segment", () => {
  const state = live();
  const old = playerPicks(state).bera[0];
  assert.equal(castLiveSkill(state, "you", "SWAP", { ...target, swapTo: { symbol: old.symbol as "BTC", side: "Buy" } }, 1), state);
  const swapped = castLiveSkill(state, "you", "SWAP", { ...target, swapTo: { symbol: "BTC", side: old.direction === "Buy" ? "Sell" : "Buy" } }, 1);
  const pick = playerPicks(swapped).bera[0];
  assert.equal(pick.symbol, "BTC");
  assert.equal(pick.direction, old.direction);
  const sign = old.direction === "Buy" ? 1 : -1;
  const first = coinMove(old.symbol, 1, .5, "default") * sign;
  const start = coinMove("BTC", 1, .5, "default");
  const last = coinMove("BTC", 1, 1, "default");
  assert.equal(rawPickReturn(pick, 1, 1, "default"), first + Math.trunc((last - start) * 10_000 / (10_000 + start)) * sign);
  const boosted = { ...state, picks: [{ symbol: "BTC", direction: "Buy" as const, skill: "BOOST" as const }] };
  const hit = castLiveSkill(boosted, "bera", "SWAP", { pickId: "you:0", swapTo: { symbol: "ETH", side: "Sell" } }, 1);
  assert.equal(playerPicks(hit).you[0].skill, "BOOST");
  assert.equal(playerPicks(hit).you[0].direction, "Buy");
});

test("bot attacks rotate FREEZE/FLIP/SWAP and incoming identifies caster; scene matches scoring", () => {
  for (let round = 0; round < 3; round++) {
    const state = { ...live(.2), round, remaining: LIVE_SECONDS[round] * .8 };
    const now = state.deadline - Math.floor(LIVE_SECONDS[round] * .5) * 1000;
    const hit = demoReducer(state, { type: "tick", now });
    const expected = (["FREEZE", "FLIP", "SWAP"] as const)[round];
    assert.equal(hit.incoming?.skill, expected);
    assert.ok(hit.incoming?.casterName);
    const pick = playerPicks(hit).you[0];
    assert.equal(pick.live?.skill, expected);
    const scenePick = fromDemoState(hit).players.find((player) => player.id === "you")!.picks[0];
    assert.equal(scenePick.effect, expected);
    assert.equal(scenePick.effectBy, hit.incoming!.casterName);
    assert.equal(scenePick.returnBps * (scenePick.side === "Buy" ? 1 : -1), pickReturn(pick, round, 1 - hit.remaining / LIVE_SECONDS[round], "default"));
    assert.equal(demoReducer(hit, { type: "dismiss-incoming" }).incoming, null);
  }
});

test("picker uses rival FLIP/SWAP targets, victim SWAP exclusions, and attack guard", () => {
  const state = live();
  const picks = skillPicks(state);
  const table: SkillHandProps = { cards: [], phase: "live", ownPicks: picks.filter((p) => p.ownerId === "you"), opponentPicks: picks.filter((p) => p.ownerId !== "you"), boardCoins: ["BTC", "ETH", "SOL", "MON", "BNB", "XRP", "AVAX", "DOGE"] };
  for (const skill of ["FLIP", "SWAP", "FREEZE"] as LiveSkill[]) {
    assert.ok(targetsFor({ id: skill, skill }, table).every((p) => p.ownerId !== "you"));
  }
  const victim = table.opponentPicks!.find((p) => p.id === target.pickId)!;
  assert.ok(swapCoins(table, victim).every((symbol) => !victim.pickedSymbols?.includes(symbol)));
  const attacked = { ...table, opponentPicks: table.opponentPicks!.map((p) => p.id === target.pickId ? { ...p, effect: "FLIP" as const } : p) };
  const sibling = attacked.opponentPicks.find((p) => p.ownerId === victim.ownerId && p.id !== victim.id)!;
  assert.match(targetBlock({ id: "freeze", skill: "FREEZE" }, sibling, attacked)!, /already attacked/);
  assert.equal(targetBlock({ id: "lock", skill: "LOCK" }, { ...table.ownPicks[0], effect: "INSURANCE" }, table), null);
  assert.equal(cardBlock({ id: "flip", skill: "FLIP" }, { ...table, usedThisRound: true }), "Already used a skill this round");
});

test("normal games start with one card; commit consumption blocks Live and awards stay capped", () => {
  let state = demoReducer(createDemo(getPreset("quick")), { type: "tick", now: 1_000 });
  assert.deepEqual(state.hand, ["BOOST"]);
  state = { ...state, hand: ["BOOST", "FREEZE"] };
  state = demoReducer(state, { type: "select", symbol: "BTC" });
  state = demoReducer(state, { type: "skill", symbol: "BTC", skill: "BOOST" });
  state = demoReducer(state, { type: "lock", now: 1_000 });
  state = demoReducer(state, { type: "tick", now: 1_700 });
  assert.deepEqual(state.hand, ["FREEZE"]);
  state = demoReducer(state, { type: "advance", now: 2_000 });
  state = demoReducer(state, { type: "advance", now: 3_000 });
  assert.equal(castLiveSkill(state, "you", "FREEZE", target, 3_000), state);
  const full = demoReducer({ ...createDemo(getPreset("quick"), "live", "tie"), hand: ["LOCK", "FLIP", "SWAP"] }, { type: "advance", now: 1 });
  assert.equal(full.hand.length, 3);
  assert.match(full.toast, /hand is full/);
});
