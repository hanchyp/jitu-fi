// Which cards and targets are playable right now (DECISIONS.md "Skills"). Pure, so the table page
// can reuse it for bots or tests later.

import { SKILLS } from "./info";
import type { SkillCard, SkillHandProps, SkillPick } from "./types";

type Table = Pick<SkillHandProps, "phase" | "liveDeadlinePassed" | "usedThisRound" | "ownPicks" | "opponentPicks" | "boardCoins">;

/** Why a target can't take this skill, or null when it can. */
export function targetBlock(card: SkillCard, pick: SkillPick, table: Table): string | null {
  const liveEffect = pick.effect && !["BOOST", "INSURANCE"].includes(pick.effect);
  if (pick.effect && (SKILLS[card.skill].timing === "commit" || liveEffect)) return `Has ${pick.effect}`;
  if (SKILLS[card.skill].target !== "own") {
    const attacked = table.opponentPicks?.some((p) => p.ownerId === pick.ownerId && ["FREEZE", "FLIP", "SWAP"].includes(p.effect ?? ""));
    if (attacked) return `${pick.ownerName} was already attacked this round`;
  }
  if (card.skill === "SWAP" && swapCoins(table, pick).length === 0) return "No free coin to swap to";
  return null;
}

/** The picks this card may target, playable or not. */
export function targetsFor(card: SkillCard, table: Table): readonly SkillPick[] {
  return SKILLS[card.skill].target !== "own" ? (table.opponentPicks ?? []) : table.ownPicks;
}

/** Coins SWAP can move to: on the board, absent from the victim’s original and current picks. */
export function swapCoins(table: Table, pick?: SkillPick) {
  const mine = new Set(pick ? [...(pick.pickedSymbols ?? []), ...(table.opponentPicks ?? []).filter((p) => p.ownerId === pick.ownerId).map((p) => p.symbol)] : table.ownPicks.map((p) => p.symbol));
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
    return target !== "own" ? "No rival pick can take this attack" : "Every pick already has an effect";
  }
  return null;
}
