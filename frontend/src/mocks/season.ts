// Dummy data shaped like GET /seasons/current (backend-data-api spec): every open season, one per
// tenor, with its status, timestamps, total principal and bonus pot including sponsor funds.
// Amounts are bigint in 6-decimal mUSD units; timestamps are unix seconds.

export type SeasonTenor = "week" | "month";
export type SeasonStatus = "Enrollment" | "Active" | "Finalized";

export type SeasonSummary = {
  seasonId: number;
  tenor: SeasonTenor;
  status: SeasonStatus;
  enrollStart: number;
  /** Enrollment closes and the season starts at this moment. */
  start: number;
  /** Maturity. */
  end: number;
  totalPrincipal: bigint;
  /** Current bonus pot, sponsor funds included. */
  bonusPot: bigint;
  /** The part of bonusPot that sponsors added through fundBonus. */
  sponsorFunds: bigint;
  demoMode: boolean;
};

export type CurrentSeasonsResponse = { seasons: SeasonSummary[] };

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);

/** The dummy clock: every mock timestamp is relative to this moment. */
export const MOCK_NOW = 1_792_742_400;

/** Vault rules the deposit screen shows (contracts-season-vault and contracts-test-assets specs). */
export const VAULT_RULES = {
  minDeposit: musd(10),
  weightCap: musd(1_000),
  faucetAmount: musd(1_000),
  faucetCooldownSeconds: 3_600,
  /** K: the first K games of a season earn points (5, or 2 in the demo). */
  countedGames: 2,
  /** Real tenor length next to its demo length. */
  tenorLengths: {
    week: { label: "1 week", demoMinutes: 15 },
    month: { label: "1 month", demoMinutes: 30 },
  },
} as const;

const ENROLLMENT = 120;

const week = (enrollLeft: number): SeasonSummary => {
  const start = MOCK_NOW + enrollLeft;
  return {
    seasonId: 4,
    tenor: "week",
    status: enrollLeft > 0 ? "Enrollment" : "Active",
    enrollStart: start - ENROLLMENT,
    start,
    end: start + 15 * 60,
    totalPrincipal: musd(18_450),
    bonusPot: musd(1_842, 500_000),
    sponsorFunds: musd(1_500),
    demoMode: true,
  };
};

const month = (enrollLeft: number): SeasonSummary => {
  const start = MOCK_NOW + enrollLeft;
  return {
    seasonId: 5,
    tenor: "month",
    status: "Enrollment",
    enrollStart: start - ENROLLMENT,
    start,
    end: start + 30 * 60,
    totalPrincipal: musd(42_300),
    bonusPot: musd(3_615, 250_000),
    sponsorFunds: musd(3_000),
    demoMode: true,
  };
};

/** Both tenors still enrolling. */
export const CURRENT_SEASONS: CurrentSeasonsResponse = { seasons: [week(84), month(112)] };

/** The 1-week season started 6 minutes ago (enrollment closed); the 1-month one still enrolls. */
export const CURRENT_SEASONS_WEEK_STARTED: CurrentSeasonsResponse = { seasons: [week(-6 * 60), month(112)] };
