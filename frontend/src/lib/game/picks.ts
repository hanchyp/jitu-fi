import type { Pick } from "@/mocks/table";

// Mirrors the backend rules in @jitu-fi/shared (checkPicks); shared is not a frontend dependency yet.
export type Skill = "BOOST" | "INSURANCE" | "LOCK" | "FLIP" | "SWAP" | "FREEZE";
export type PickError =
  | "WRONG_PHASE"
  | "NO_PICKS"
  | "OVER_CAP"
  | "DUPLICATE_COIN"
  | "COIN_NOT_ON_TABLE"
  | "TWO_COMMIT_SKILLS"
  | "NOT_IN_HAND";
export type PickSubmission = { coin: string; side: "Buy" | "Sell"; boosted?: boolean; insured?: boolean };
export type PickValidation = { ok: true } | { ok: false; code: PickError | "EMPTY"; message: string };

const MESSAGES: Record<string, string> = {
  WRONG_PHASE: "Picks are only accepted during the commit phase.",
  NO_PICKS: "Pick at least one coin before you lock in.",
  OVER_CAP: "You picked more coins than this round allows.",
  DUPLICATE_COIN: "Each coin can be picked only once per round.",
  COIN_NOT_ON_TABLE: "One of your coins is not on this table.",
  TWO_COMMIT_SKILLS: "Use only one of Boost or Insurance per round.",
  NOT_IN_HAND: "You don't have that skill in your hand.",
  UNAUTHORIZED: "Your session expired. Sign in again to continue.",
};

export function toPickSubmissions(picks: Pick[]): PickSubmission[] {
  return picks.map((p) => ({
    coin: p.symbol,
    side: p.direction,
    ...(p.skill === "BOOST" ? { boosted: true } : {}),
    ...(p.skill === "INSURANCE" ? { insured: true } : {}),
  }));
}

export function validatePicks(
  picks: Pick[],
  opts: { cap: number; coins: readonly string[]; hand: readonly Skill[] },
): PickValidation {
  const fail = (code: PickError | "EMPTY"): PickValidation => ({
    ok: false,
    code,
    message: MESSAGES[code === "EMPTY" ? "NO_PICKS" : code],
  });
  if (picks.length === 0) return fail("EMPTY");
  if (picks.length > opts.cap) return fail("OVER_CAP");
  if (new Set(picks.map((p) => p.symbol)).size !== picks.length) return fail("DUPLICATE_COIN");
  if (picks.some((p) => !opts.coins.includes(p.symbol))) return fail("COIN_NOT_ON_TABLE");
  const skills = picks.filter((p) => p.skill);
  if (skills.length > 1) return fail("TWO_COMMIT_SKILLS");
  if (skills[0]?.skill && !opts.hand.includes(skills[0].skill)) return fail("NOT_IN_HAND");
  return { ok: true };
}

/** Friendly text for a failed submit. Accepts `{ error }` bodies, Errors, or strings; never echoes raw JSON. */
export function commitErrorMessage(err: unknown): string {
  let code: string | undefined;
  if (typeof err === "string") code = err;
  else if (err && typeof err === "object") {
    const o = err as { error?: unknown; code?: unknown; message?: unknown };
    for (const v of [o.error, o.code, o.message]) {
      if (typeof v === "string" && MESSAGES[v]) { code = v; break; }
    }
    if (!code && err instanceof TypeError) return "Network problem. Check your connection and try again.";
  }
  if (code && MESSAGES[code]) return MESSAGES[code];
  return "Could not submit your picks. Please try again.";
}
