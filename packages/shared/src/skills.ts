// Skill and pick rules (pure state checks). Timing rules (the Live deadline, the 5 s price age)
// are enforced by the engine, which owns the clock and the price book.
import { MAX_SKILLS_IN_HAND } from "./config.js";
import type { Side } from "./scoring.js";

export const SKILLS = ["BOOST", "INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE"] as const;
export type Skill = (typeof SKILLS)[number];

export const COMMIT_SKILLS: readonly Skill[] = ["BOOST", "INSURANCE"];
export const ATTACK_SKILLS: readonly Skill[] = ["FREEZE", "FLIP", "SWAP"];
export type LiveSkill = "LOCK" | "FREEZE" | "FLIP" | "SWAP";

export type SkillError =
  | "WRONG_PHASE"
  | "NOT_IN_HAND"
  | "ALREADY_USED_SKILL"
  | "OWN_PICK_ONLY"
  | "NO_SELF_ATTACK"
  | "NO_SUCH_PICK"
  | "PICK_HAS_EFFECT"
  | "TARGET_ALREADY_ATTACKED"
  | "BAD_SWAP_COIN";

export type PickError =
  | "WRONG_PHASE"
  | "NO_PICKS"
  | "OVER_CAP"
  | "DUPLICATE_COIN"
  | "COIN_NOT_ON_TABLE"
  | "TWO_COMMIT_SKILLS"
  | "NOT_IN_HAND";

export type SeatState = {
  hand: readonly Skill[];
  /** A skill (commit-time or live) was already used this round. */
  usedSkill: boolean;
  /** Hit by FREEZE, FLIP or SWAP this round. */
  attacked: boolean;
  /** This round's picks; `effect` is the pick's one live effect, if any. */
  picks: readonly { coin: string; effect?: LiveSkill }[];
};

export type RoundState = {
  phase: "Commit" | "Reveal" | "Live" | "Settled";
  coins: readonly string[];
  seats: Readonly<Record<number, SeatState>>;
};

export type LiveSkillRequest = { seat: number; skill: LiveSkill; targetSeat: number; targetCoin: string; swapTo?: string };

/** Returns why a live skill is not allowed, or null if it is. */
export function checkLiveSkill(state: RoundState, req: LiveSkillRequest): SkillError | null {
  if (state.phase !== "Live") return "WRONG_PHASE";
  const user = state.seats[req.seat];
  const target = state.seats[req.targetSeat];
  if (!user || !target) return "NO_SUCH_PICK";
  if (user.usedSkill) return "ALREADY_USED_SKILL";
  if (!user.hand.includes(req.skill)) return "NOT_IN_HAND";

  const isAttack = req.skill !== "LOCK";
  if (!isAttack && req.targetSeat !== req.seat) return "OWN_PICK_ONLY";
  if (isAttack && req.targetSeat === req.seat) return "NO_SELF_ATTACK";

  const pick = target.picks.find((p) => p.coin === req.targetCoin);
  if (!pick) return "NO_SUCH_PICK";
  // One live effect per pick: a locked pick is immune to attacks.
  if (pick.effect) return "PICK_HAS_EFFECT";
  if (isAttack && target.attacked) return "TARGET_ALREADY_ATTACKED";

  if (req.skill === "SWAP") {
    const to = req.swapTo;
    if (!to || !state.coins.includes(to) || target.picks.some((p) => p.coin === to)) return "BAD_SWAP_COIN";
  }
  return null;
}

export type PickSubmission = { coin: string; side: Side; boosted?: boolean; insured?: boolean };

/** Checks a Commit-phase submission: 1..cap distinct table coins, at most one BOOST or INSURANCE, held in hand. */
export function checkPicks(
  phase: RoundState["phase"],
  coins: readonly string[],
  cap: number,
  hand: readonly Skill[],
  picks: readonly PickSubmission[],
): PickError | null {
  if (phase !== "Commit") return "WRONG_PHASE";
  if (picks.length === 0) return "NO_PICKS";
  if (picks.length > cap) return "OVER_CAP";
  if (new Set(picks.map((p) => p.coin)).size !== picks.length) return "DUPLICATE_COIN";
  if (picks.some((p) => !coins.includes(p.coin))) return "COIN_NOT_ON_TABLE";
  const boosts = picks.filter((p) => p.boosted).length;
  const insures = picks.filter((p) => p.insured).length;
  // BOOST and INSURANCE count as the round's one skill.
  if (boosts + insures > 1) return "TWO_COMMIT_SKILLS";
  if (boosts && !hand.includes("BOOST")) return "NOT_IN_HAND";
  if (insures && !hand.includes("INSURANCE")) return "NOT_IN_HAND";
  return null;
}

/** A round winner gains one skill if their hand has room. */
export function awardSkill(hand: readonly Skill[], skill: Skill): Skill[] {
  return hand.length < MAX_SKILLS_IN_HAND ? [...hand, skill] : [...hand];
}

/** Removes one copy of a used skill from the hand. */
export function spendSkill(hand: readonly Skill[], skill: Skill): Skill[] {
  const i = hand.indexOf(skill);
  if (i === -1) throw new Error(`${skill} not in hand`);
  return [...hand.slice(0, i), ...hand.slice(i + 1)];
}
