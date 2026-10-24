import type { SkillError } from "../../../../packages/shared/dist/skills";

const MESSAGES: Record<SkillError | "NETWORK" | "UNAUTHORIZED" | "PRICE_STALE" | "LIVE_DEADLINE_PASSED" | "TABLE_NOT_RUNNING" | "NOT_SEATED", string> = {
  WRONG_PHASE: "Live skills can only be used before the Live deadline.",
  NOT_IN_HAND: "You no longer have that skill. Refresh your hand and try again.",
  ALREADY_USED_SKILL: "You've already used your one skill this round.",
  OWN_PICK_ONLY: "LOCK can only protect your own pick.",
  NO_SELF_ATTACK: "Choose a rival's pick for this attack.",
  NO_SUCH_PICK: "That pick is no longer available. Choose another target.",
  PICK_HAS_EFFECT: "That pick already has a Live effect. Choose another pick.",
  TARGET_ALREADY_ATTACKED: "That rival was already attacked this round.",
  BAD_SWAP_COIN: "Choose a table coin that your rival hasn't picked.",
  NETWORK: "Network problem. Check your connection and try again.",
  UNAUTHORIZED: "Your session expired. Sign in again to continue.",
  LIVE_DEADLINE_PASSED: "The Live deadline passed. Your hand opens again next round.",
  TABLE_NOT_RUNNING: "This table has finished. Open a running table to play.",
  NOT_SEATED: "Sign in with the wallet seated at this table.",
  PRICE_STALE: "Prices are updating. Try again in a moment.",
};

export function skillErrorMessage(error: unknown): string {
  const values = typeof error === "string" ? [error] : error && typeof error === "object"
    ? [(error as { code?: unknown }).code, (error as { error?: unknown }).error, (error as { message?: unknown }).message] : [];
  for (const value of values) {
    if (typeof value === "string" && Object.hasOwn(MESSAGES, value)) return MESSAGES[value as keyof typeof MESSAGES];
  }
  if (error instanceof TypeError) return MESSAGES.NETWORK;
  return "Could not use that skill. Check the target and try again.";
}
