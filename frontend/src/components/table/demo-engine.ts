import { botPicks, COINS, LIVE_SECONDS, PLAYERS, type CommitSkill, type GamePreset, type Phase, type Pick, type Scenario } from "@/mocks/table";

import type { CoinSymbol } from "@/components/table-scene/types";
import type { SkillName, SkillPick, SkillTarget } from "@/components/skills/types";
import type { IncomingSkill } from "@/components/skills/IncomingSkillToast";

export type LiveSkill = Exclude<SkillName, CommitSkill>;
type LiveCast = { skill: LiveSkill; by: string; progress: number; originalSymbol: string; originalDirection: Pick["direction"]; swapSymbol?: string };
export type DemoPick = Pick & { live?: LiveCast };
const ATTACKS: readonly SkillName[] = ["FREEZE", "FLIP", "SWAP"];
const REWARDS: readonly SkillName[] = ["INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE", "BOOST"];

export type RoundResult = { scores: Record<string, number>; winners: string[]; forfeited: string[] };
export type DemoState = {
  preset: GamePreset; phase: Phase; round: number; scenario: Scenario;
  remaining: number; deadline: number; marketTick: number; picks: Pick[]; locked: boolean; lockingUntil: number;
  hand: SkillName[]; effects: Record<string, LiveCast>; usedSkills: string[]; incoming: IncomingSkill | null; history: RoundResult[]; earned: SkillName[]; toast: string; error: string; paused: boolean;
};
/** Preview only: where your final rank lands. */
export type Outcome = "win" | "tie" | "second" | "third" | "last";
export const OUTCOMES: Outcome[] = ["win", "tie", "second", "third", "last"];
export type DemoAction =
  | { type: "tick"; now: number }
  | { type: "select"; symbol: string }
  | { type: "direction"; symbol: string; direction: Pick["direction"] }
  | { type: "skill"; symbol: string; skill?: CommitSkill }
  | { type: "cast"; skill: LiveSkill; target: SkillTarget; now: number }
  | { type: "dismiss-incoming" }
  | { type: "lock"; now: number }
  | { type: "advance"; now: number; preview?: boolean }
  | { type: "pause"; now: number }
  | { type: "preview"; phase: Phase; scenario: Scenario; outcome?: Outcome; now: number };

export function phaseSeconds(phase: Phase, round: number) {
  return phase === "commit" ? 20 : phase === "reveal" ? 10 : phase === "live" ? LIVE_SECONDS[round] : phase === "results" ? 8 : 0;
}

export function createDemo(preset: GamePreset, phase: Phase = "commit", scenario: Scenario = "default", outcome?: Outcome): DemoState {
  const preview = phase !== "commit";
  const state: DemoState = {
    preset, phase, scenario, round: 0, remaining: phaseSeconds(phase, 0), deadline: 0, marketTick: 0,
    picks: preview && scenario !== "forfeit" ? [{ symbol: "BTC", direction: "Buy", ...(scenario === "insured-pick" ? { skill: "INSURANCE" as const } : {}) }] : [],
    locked: preview && scenario !== "forfeit", lockingUntil: 0,
    hand: phase === "live" ? ["LOCK", "FLIP", "SWAP"] : [scenario === "insured-pick" ? "INSURANCE" : "BOOST"], effects: {}, usedSkills: [], incoming: null, history: [], earned: [], toast: "", error: "", paused: preview,
  };
  if (phase === "results") return settle(state);
  if (phase === "finished") {
    const played = preset.caps.map((_, round) => roundResult({ ...state, round }));
    const history = outcome ? forceOutcome(played, preset.caps, outcome) : played;
    const earned = history.flatMap((result, round) => result.winners.includes("you") ? [REWARDS[round % REWARDS.length]] : []).slice(0, 2);
    return { ...state, round: preset.caps.length - 1, history, earned };
  }
  return state;
}

export function coinMove(symbol: string, round: number, progress: number, scenario: Scenario) {
  if (scenario === "void") return 0;
  const index = COINS.findIndex((coin) => coin.symbol === symbol);
  if (index < 0) return 0;
  const target = COINS[index].moveBps * (round % 2 ? -0.8 : 1) + (round % 3) * 3;
  const wave = Math.sin(progress * Math.PI * 4 + index) * Math.sin(progress * Math.PI) * 9;
  return Math.round(target * progress + wave);
}

/** Signed return before insurance. Each post-cast price-relative segment truncates separately. */
export function rawPickReturn(pick: DemoPick, round: number, progress: number, scenario: Scenario) {
  const cast = pick.live;
  if (!cast) return coinMove(pick.symbol, round, progress, scenario) * (pick.direction === "Buy" ? 1 : -1);
  const sign = cast.originalDirection === "Buy" ? 1 : -1;
  const first = coinMove(cast.originalSymbol, round, Math.min(progress, cast.progress), scenario) * sign;
  if (progress <= cast.progress || cast.skill === "LOCK" || cast.skill === "FREEZE") return first;
  const symbol = cast.swapSymbol ?? cast.originalSymbol;
  const start = coinMove(symbol, round, cast.progress, scenario);
  const end = coinMove(symbol, round, progress, scenario);
  const second = Math.trunc((end - start) * 10_000 / (10_000 + start)) * sign;
  return first + second * (cast.skill === "FLIP" ? -1 : 1);
}

export function pickReturn(pick: DemoPick, round: number, progress: number, scenario: Scenario) {
  const signed = rawPickReturn(pick, round, progress, scenario);
  return pick.skill === "INSURANCE" ? Math.max(0, signed) : signed;
}

export function pickIsVoid(pick: DemoPick, round: number, progress: number, scenario: Scenario) {
  // A cast holds its first segment even when the underlying market later returns to zero.
  return Math.abs(pick.live ? rawPickReturn(pick, round, progress, scenario) : coinMove(pick.symbol, round, progress, scenario)) < 1;
}

export function scorePicks(picks: DemoPick[], cap: number, round: number, progress: number, scenario: Scenario) {
  const valid = picks.filter((pick) => !pickIsVoid(pick, round, progress, scenario));
  const weight = valid.reduce((total, pick) => total + (pick.skill === "BOOST" ? 2 : 1), 0);
  if (!weight) return 0;
  return Math.trunc(cap * valid.reduce((total, pick) => total + pickReturn(pick, round, progress, scenario) * (pick.skill === "BOOST" ? 2 : 1), 0) / weight);
}

export function playerPicks(state: DemoState): Record<string, DemoPick[]> {
  const base = { you: state.locked ? state.picks : [], ...botPicks(state.round, state.preset.caps[state.round], state.scenario) };
  return Object.fromEntries(Object.entries(base).map(([owner, picks]) => [owner, picks.map((pick, index) => {
    const live = state.effects[`${owner}:${index}`];
    return live ? { ...pick, live, symbol: live.swapSymbol ?? pick.symbol, direction: live.skill === "FLIP" ? pick.direction === "Buy" ? "Sell" as const : "Buy" as const : pick.direction } : pick;
  })]));
}

/** Stable slot ids survive a SWAP; Commit never exposes opponents to the picker. */
export function skillPicks(state: DemoState): SkillPick[] {
  const all = playerPicks(state);
  if (state.phase === "commit") all.you = state.picks;
  return PLAYERS.flatMap((owner) => state.phase === "commit" && !owner.human ? [] : all[owner.id].map((pick, index) => ({
    id: `${owner.id}:${index}`, ownerId: owner.id, ownerName: owner.name, symbol: pick.symbol as CoinSymbol,
    side: pick.direction, effect: pick.live?.skill ?? pick.skill,
    returnBps: state.phase === "commit" ? undefined : pickReturn(pick, state.round, liveProgress(state), state.scenario),
    pickedSymbols: all[owner.id].map((p) => (p.live?.originalSymbol ?? p.symbol) as CoinSymbol),
  })));
}

/** Same validation for humans and bots; invalid casts leave state untouched. */
export function castLiveSkill(state: DemoState, caster: string, skill: LiveSkill, target: SkillTarget, now: number): DemoState {
  if (state.phase !== "live" || state.remaining <= 0 || (!state.paused && state.deadline > 0 && now >= state.deadline)) return state;
  const all = playerPicks(state);
  if (!all[caster]?.length || state.usedSkills.includes(caster) || all[caster].some((pick) => pick.skill)) return state;
  if (caster === "you" && !state.hand.includes(skill)) return state;
  const chosen = skillPicks(state).find((pick) => pick.id === target.pickId);
  if (!chosen || state.effects[target.pickId]) return state;
  const attack = ATTACKS.includes(skill);
  if (attack ? chosen.ownerId === caster : chosen.ownerId !== caster) return state;
  if (attack && Object.entries(state.effects).some(([id, effect]) => id.startsWith(`${chosen.ownerId}:`) && ATTACKS.includes(effect.skill))) return state;
  if (skill === "SWAP" && (!target.swapTo || !COINS.some((coin) => coin.symbol === target.swapTo!.symbol) || chosen.pickedSymbols?.includes(target.swapTo.symbol) || all[chosen.ownerId].some((pick) => pick.symbol === target.swapTo!.symbol))) return state;
  const pick = all[chosen.ownerId][Number(target.pickId.split(":")[1])];
  const effect: LiveCast = { skill, by: caster, progress: liveProgress(state), originalSymbol: pick.symbol, originalDirection: pick.direction, ...(skill === "SWAP" ? { swapSymbol: target.swapTo!.symbol } : {}) };
  return { ...state, effects: { ...state.effects, [target.pickId]: effect }, usedSkills: [...state.usedSkills, caster],
    hand: caster === "you" ? state.hand.filter((_, index) => index !== state.hand.indexOf(skill)) : state.hand,
    incoming: attack && chosen.ownerId === "you" ? { skill: skill as "FREEZE" | "FLIP" | "SWAP", casterName: PLAYERS.find((p) => p.id === caster)!.name, symbol: pick.symbol as CoinSymbol, heldBps: pickReturn(pick, state.round, liveProgress(state), state.scenario), swapSymbol: target.swapTo?.symbol } : state.incoming,
  };
}

function botAttack(state: DemoState): DemoState {
  if (state.phase !== "live" || liveProgress(state) < .4 || state.scenario === "tie" || state.scenario === "void") return state;
  const skill = (["FREEZE", "FLIP", "SWAP"] as const)[state.round % 3];
  const target = skillPicks(state).find((pick) => pick.ownerId === "you" && !state.effects[pick.id]);
  if (!target) return state;
  const symbol = COINS.find((coin) => !target.pickedSymbols?.includes(coin.symbol as CoinSymbol))?.symbol as CoinSymbol | undefined;
  const caster = PLAYERS.find((player) => !player.human && !state.usedSkills.includes(player.id) && !playerPicks(state)[player.id].some((pick) => pick.skill));
  if (!caster) return state;
  // Deterministic demo cast at 40% of Live, including catch-up after a background tab.
  const atCast = { ...state, remaining: LIVE_SECONDS[state.round] * .6 };
  const next = castLiveSkill(atCast, caster.id, skill, { pickId: target.id, swapTo: symbol ? { symbol, side: target.side } : undefined }, state.deadline - atCast.remaining * 1000);
  return next === atCast ? state : { ...next, remaining: state.remaining };
}

export function liveProgress(state: DemoState) {
  if (state.phase === "results" || state.phase === "finished") return 1;
  if (state.phase !== "live") return 0;
  return Math.max(0, Math.min(1, 1 - state.remaining / LIVE_SECONDS[state.round]));
}

// One quote source for the table tokens and their chart dialog. Preview moves do
// not affect scoring; Live quotes use the exact round path used by settlement.
export function marketMove(state: DemoState, symbol: string) {
  if (state.phase === "live" || state.phase === "results" || state.phase === "finished") return coinMove(symbol, state.round, liveProgress(state), state.scenario);
  if (state.scenario === "void") return 0;
  return Math.round(Math.sin(state.marketTick * .65 + COINS.findIndex((coin) => coin.symbol === symbol)) * 3);
}

export function roundResult(state: DemoState, progress = 1): RoundResult {
  const picks = playerPicks(state);
  const scores = Object.fromEntries(PLAYERS.map((player) => [player.id, scorePicks(picks[player.id], state.preset.caps[state.round], state.round, progress, state.scenario)]));
  const forfeited = state.locked ? [] : ["you"];
  const eligible = PLAYERS.filter((player) => !forfeited.includes(player.id));
  const best = Math.max(...eligible.map((player) => scores[player.id]));
  return { scores, forfeited, winners: eligible.filter((player) => scores[player.id] === best).map((player) => player.id) };
}

export function gameScores(state: DemoState): Record<string, number> {
  const caps = state.preset.caps.reduce((total, cap) => total + cap, 0);
  return Object.fromEntries(PLAYERS.map((player) => [player.id, Math.trunc(state.history.reduce((total, result) => total + result.scores[player.id], 0) / caps)]));
}

/** Preview only: sets your round scores to target × cap, so your game score is exactly the target. */
function forceOutcome(history: RoundResult[], caps: readonly number[], outcome: Outcome): RoundResult[] {
  const total = caps.reduce((sum, cap) => sum + cap, 0);
  const [s1, s2, s3] = PLAYERS.filter((player) => !player.human).map((player) => Math.trunc(history.reduce((sum, result) => sum + result.scores[player.id], 0) / total)).sort((a, b) => b - a);
  const target = { win: s1 + 6, tie: s1, second: Math.max(s2, s1 - 1), third: Math.max(s3, s2 - 1), last: s3 - 4 }[outcome];
  return history.map((result, round) => {
    const scores: Record<string, number> = { ...result.scores, you: target * caps[round] };
    const eligible = PLAYERS.filter((player) => !result.forfeited.includes(player.id));
    const best = Math.max(...eligible.map((player) => scores[player.id]));
    return { ...result, scores, winners: eligible.filter((player) => scores[player.id] === best).map((player) => player.id) };
  });
}

function settle(state: DemoState): DemoState {
  const result = roundResult(state);
  const won = result.winners.includes("you");
  const skill = REWARDS[state.round % REWARDS.length];
  const hasRoom = state.hand.length < 3;
  return {
    ...state, history: [...state.history, result],
    hand: won && hasRoom ? [...state.hand, skill] : state.hand,
    earned: won && hasRoom ? [...state.earned, skill] : state.earned,
    toast: won ? hasRoom ? `Round won! You earned ${skill}.` : "Round won! Your skill hand is full." : "",
  };
}

function nextPhase(state: DemoState, now: number): DemoState {
  if (state.phase === "finished") return state;
  let next: DemoState;
  if (state.phase === "commit") {
    next = { ...state, phase: "reveal", lockingUntil: 0, error: "" };
  } else if (state.phase === "reveal") next = { ...state, phase: "live" };
  else if (state.phase === "live") next = settle({ ...botAttack({ ...state, remaining: 0 }), phase: "results" });
  else if (state.round === state.preset.caps.length - 1) next = { ...state, phase: "finished", toast: "" };
  else next = { ...state, phase: "commit", round: state.round + 1, locked: false, lockingUntil: 0, picks: [], effects: {}, usedSkills: [], incoming: null, toast: "", error: "" };
  const remaining = phaseSeconds(next.phase, next.round);
  return { ...next, remaining, deadline: now + remaining * 1000 };
}

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "dismiss-incoming") return { ...state, incoming: null };
  if (action.type === "cast") return castLiveSkill(state, "you", action.skill, action.target, action.now);
  if (action.type === "preview") {
    const next = createDemo(state.preset, action.phase, action.scenario, action.outcome);
    return { ...next, deadline: action.now + next.remaining * 1000, paused: true };
  }
  if (action.type === "pause") return { ...state, paused: !state.paused, deadline: action.now + state.remaining * 1000 };
  if (action.type === "advance") return nextPhase({ ...state, paused: action.preview ? true : state.paused }, action.now);
  if (action.type === "tick") {
    const marketTick = Math.floor(action.now / 1000);
    if (!state.deadline) return { ...state, deadline: action.now + state.remaining * 1000, marketTick };
    if (state.paused || state.phase === "finished") return state;
    let next = state;
    // Complete the simulated request only if it finished before the commit deadline.
    if (next.lockingUntil && action.now >= next.lockingUntil && next.lockingUntil <= next.deadline) {
      const used = next.picks.find((pick) => pick.skill)?.skill;
      const index = used ? next.hand.indexOf(used) : -1;
      next = { ...next, locked: true, lockingUntil: 0, hand: next.hand.filter((_, i) => i !== index) };
    }
    // Catch up after a hidden tab; each phase keeps its real deadline.
    while (action.now >= next.deadline && next.phase !== "finished") next = nextPhase(next, next.deadline);
    const remaining = next.phase === "finished" ? 0 : Math.max(0, Math.ceil((next.deadline - action.now) / 1000));
    next = remaining === next.remaining && marketTick === next.marketTick ? next : { ...next, remaining, marketTick };
    return botAttack(next);
  }
  if (state.phase !== "commit" || state.locked || state.lockingUntil) return state;
  if (action.type === "lock") {
    if (action.now >= state.deadline && state.deadline) return state;
    if (!state.picks.length) return { ...state, error: "Choose at least one coin before locking." };
    // Pending remains observable even when a dev preview is paused.
    return { ...state, paused: false, deadline: state.paused || !state.deadline ? action.now + state.remaining * 1000 : state.deadline, lockingUntil: action.now + 650, error: "" };
  }
  if (action.type === "select") {
    if (!COINS.some((coin) => coin.symbol === action.symbol)) return state;
    if (state.picks.some((pick) => pick.symbol === action.symbol)) return { ...state, picks: state.picks.filter((pick) => pick.symbol !== action.symbol), error: "" };
    if (state.picks.length >= state.preset.caps[state.round]) return { ...state, error: `This round allows ${state.preset.caps[state.round]} coin${state.preset.caps[state.round] === 1 ? "" : "s"}. Remove a pick first.` };
    return { ...state, picks: [...state.picks, { symbol: action.symbol, direction: "Buy" }], error: "" };
  }
  if (action.type === "direction") return { ...state, picks: state.picks.map((pick) => pick.symbol === action.symbol ? { ...pick, direction: action.direction } : pick) };
  if (action.type === "skill") {
    if (action.skill && !state.hand.includes(action.skill)) return state;
    return { ...state, picks: state.picks.map((pick) => ({ ...pick, skill: pick.symbol === action.symbol ? action.skill : undefined })) };
  }
  return state;
}

export function bps(value: number) {
  return `${value > 0 ? "+" : ""}${(value / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

export function price(micros: number) {
  return (micros / 1_000_000).toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: micros < 1_000_000 ? 4 : 2, maximumFractionDigits: micros < 1_000_000 ? 4 : 2 });
}
