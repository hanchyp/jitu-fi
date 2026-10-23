// Skill copy, timing and targeting rules (DECISIONS.md "Skills"), plus the art paths.

import type { SkillName } from "./types";

export type SkillTiming = "commit" | "live";
/** own: one of your picks. swap: your pick, then a new coin and its side. opponent: an opponent's pick. */
export type SkillTargetKind = "own" | "swap" | "opponent";

export type SkillInfo = {
  /** One line on the card: what the skill does. */
  effect: string;
  timing: SkillTiming;
  target: SkillTargetKind;
  /** Past-tense verb for status lines: "Flipped your ETH". */
  done: string;
};

export const SKILLS: Record<SkillName, SkillInfo> = {
  BOOST: { effect: "Doubles one pick's weight.", timing: "commit", target: "own", done: "Boosted" },
  INSURANCE: { effect: "A losing pick scores 0 instead.", timing: "commit", target: "own", done: "Insured" },
  LOCK: { effect: "Seals one pick's return at the current price.", timing: "live", target: "own", done: "Locked" },
  FLIP: { effect: "Reverses one pick's call from now on.", timing: "live", target: "own", done: "Flipped" },
  SWAP: { effect: "Trades one pick for a new coin and call.", timing: "live", target: "swap", done: "Swapped" },
  FREEZE: { effect: "Stops one rival pick's return where it is.", timing: "live", target: "opponent", done: "Froze" },
};

export const SKILL_ORDER: readonly SkillName[] = ["BOOST", "INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE"];

export const skillArt = (skill: SkillName) => `/assets/skills/${skill.toLowerCase()}.webp`;
export const CARD_FRAME = "/assets/skills/card-frame.webp";
export const CARD_BACK = "/assets/skills/card-back.webp";
