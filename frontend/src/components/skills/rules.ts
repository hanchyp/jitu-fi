// Which cards and targets are playable right now (DECISIONS.md "Skills"). Pure, so the table page
// can reuse it for bots or tests later.

import { SKILLS } from "./info";
import type { SkillCard, SkillHandProps, SkillPick } from "./types";

type Table = Pick<SkillHandProps, "phase" | "liveDeadlinePassed" | "usedThisRound" | "ownPicks" | "opponentPicks" | "boardCoins">;

/** Why a target can't take this skill, or null when it can. */
export function targetBlock(card: SkillCard, pick: SkillPick, table: Table): string | null {
  if (pick.effect) return `Has ${pick.effect}`;
  if (SKILLS[card.skill].target === "opponent") {
    // A player can be frozen at most once per round.
    const frozen = table.opponentPicks?.some((p) => p.ownerId === pick.ownerId && p.effect === "FREEZE");
    if (frozen) return `${pick.ownerName} is already frozen`;
  }
  return null;
}

/** The picks this card may target, playable or not. */
export function targetsFor(card: SkillCard, table: Table): readonly SkillPick[] {
  return SKILLS[card.skill].target === "opponent" ? (table.opponentPicks ?? []) : table.ownPicks;
}

/** Coins SWAP can move to: on the board and not picked by you this round. */
export function swapCoins(table: Table) {
  const mine = new Set(table.ownPicks.map((p) => p.symbol));
  return (table.boardCoins ?? []).filter((c) => !mine.has(c));
}

/** Why this card can't be played right now, or null when it can. */
export function cardBlock(card: SkillCard, table: Table): string | null {
  const { timing, target } = SKILLS[card.skill];
  if (table.usedThisRound) return "Already used a skill this round";
  if (timing === "commit") {
    if (table.phase !== "commit") return "Only at commit";
    if (table.ownPicks.length === 0) return "Choose a coin first";
  } else {
    if (table.phase === "commit" || table.phase === "reveal") return "Opens in Live";
    if (table.phase === "result") return "Live is over";
    if (table.liveDeadlinePassed) return "Live deadline passed";
  }
  if (!targetsFor(card, table).some((p) => !targetBlock(card, p, table))) {
    return target === "opponent" ? "No rival pick to freeze" : "Every pick already has an effect";
  }
  if (target === "swap" && swapCoins(table).length === 0) return "No free coin to swap to";
  return null;
}
