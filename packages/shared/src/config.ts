// Constants mirrored from the contracts and the game rules (DECISIONS.md, 2026-10-23 and 2026-10-24).
// Money is integer base units: mUSD has 6 decimals. Returns and scores are in bps.

export const MUSD_DECIMALS = 6;
export const MUSD_UNIT = 1_000_000n;

// SeasonVault
export const MIN_DEPOSIT = 10n * MUSD_UNIT;
export const WEIGHT_CAP = 1_000n * MUSD_UNIT;
export const FEE_BPS = 1_500n;
export const BPS = 10_000n;

// MockUSD faucet
export const FAUCET_AMOUNT = 1_000n * MUSD_UNIT;
export const FAUCET_COOLDOWN_SECONDS = 3_600;

// GameManager
export const MAX_GAME_SCORE = 10_000;
export const POINTS_K = 5;
export const POINTS_K_DEMO = 2;

// MockYieldStrategy demo APR: about 10% per 30 minutes, labelled "simulated" in the UI.
export const DEMO_APR_BPS = 17_520_000n;

// Game presets: rounds and the pick cap of each round.
export const PRESETS = {
  quick: { name: "Quick", caps: [1, 2, 3] },
  standard: { name: "Standard", caps: [1, 1, 2, 2, 3] },
  long: { name: "Long", caps: [1, 1, 2, 2, 3, 3, 4] },
  marathon: { name: "Marathon", caps: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5] },
} as const satisfies Record<string, { name: string; caps: readonly number[] }>;

export type PresetId = keyof typeof PRESETS;

export const capSum = (preset: PresetId): number => PRESETS[preset].caps.reduce((a, b) => a + b, 0);

// Round phases, in seconds.
export const COMMIT_SECONDS = 20;
export const REVEAL_SECONDS = 10;
export const LIVE_MIN_SECONDS = 60;
export const LIVE_MAX_SECONDS = 120;
export const COINS_PER_ROUND = 8;
export const SEATS_PER_TABLE = 4;
export const MAX_SKILLS_IN_HAND = 3;

/** Longest a preset can run: every round at the maximum live window, plus settle slack. */
export const presetMaxDurationSeconds = (preset: PresetId, settleSlackSeconds = 5): number =>
  PRESETS[preset].caps.length * (COMMIT_SECONDS + REVEAL_SECONDS + LIVE_MAX_SECONDS + settleSlackSeconds);
