// Dummy data for the claim screen: a finalized season and the player's position in it, with the payout
// computed the way the vault's finalize/claim would (integer math, truncating). Amounts are bigint in
// 6-decimal mUSD units; timestamps are unix seconds. Shapes reuse season.ts and position.ts.
import { MOCK_NOW, type SeasonSummary } from "./season";
import { POSITION_ACTIVE_WEEK, type PositionResponse } from "./position";

export type ClaimPayout = { principal: bigint; baseYield: bigint; bonus: bigint };

export type ClaimSnapshot = {
  season: SeasonSummary;
  position: PositionResponse;
  /** What the player gets from claim (finalized) or the current estimate (not mature yet). */
  payout: ClaimPayout;
  /** Set when the strategy returned less than total principal: what it did return. */
  shortfall: { returned: bigint } | null;
};

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);
const BPS = BigInt(10_000);
const FEE_BPS = BigInt(1_500);
const TWO = BigInt(2);

const SEASON_ID = 3;
const TOTAL_PRINCIPAL = musd(18_450);
const SPONSOR_FUNDS = musd(1_500);
/** Σ season points × weight over every human in the season, snapshotted at finalize (mUSD units × points). */
const TOTAL_WEIGHTED_POINTS = musd(4_635_000);

const PRINCIPAL = musd(250);
const WEIGHT = PRINCIPAL; // under the 1,000 mUSD cap
const SEASON_POINTS = 312; // two counted games: 184 + 128

/** The vault's finalize split, then this position's claim. */
function settle(returned: bigint): { bonusPot: bigint; payout: ClaimPayout } {
  const weightedPoints = WEIGHT * BigInt(SEASON_POINTS);
  if (returned < TOTAL_PRINCIPAL) {
    // Shortfall: no fee, no base yield; principal repaid pro-rata; only sponsor funds stay in the bonus pot.
    return {
      bonusPot: SPONSOR_FUNDS,
      payout: {
        principal: (PRINCIPAL * returned) / TOTAL_PRINCIPAL,
        baseYield: BigInt(0),
        bonus: (SPONSOR_FUNDS * weightedPoints) / TOTAL_WEIGHTED_POINTS,
      },
    };
  }
  const yieldEarned = returned - TOTAL_PRINCIPAL;
  const net = yieldEarned - (yieldEarned * FEE_BPS) / BPS;
  const baseTotal = net / TWO;
  const bonusPot = net - baseTotal + SPONSOR_FUNDS;
  return {
    bonusPot,
    payout: {
      principal: PRINCIPAL,
      baseYield: (baseTotal * PRINCIPAL) / TOTAL_PRINCIPAL,
      bonus: (bonusPot * weightedPoints) / TOTAL_WEIGHTED_POINTS,
    },
  };
}

function finalized(returned: bigint): ClaimSnapshot {
  const { bonusPot, payout } = settle(returned);
  const end = MOCK_NOW - 5 * 60;
  const start = end - 15 * 60;
  return {
    season: {
      seasonId: SEASON_ID,
      tenor: "week",
      status: "Finalized",
      enrollStart: start - 120,
      start,
      end,
      totalPrincipal: TOTAL_PRINCIPAL,
      bonusPot,
      sponsorFunds: SPONSOR_FUNDS,
      demoMode: true,
    },
    position: {
      address: POSITION_ACTIVE_WEEK.address,
      seasonId: SEASON_ID,
      tenor: "week",
      seasonStatus: "Finalized",
      start,
      end,
      principal: PRINCIPAL,
      weight: WEIGHT,
      seasonPoints: SEASON_POINTS,
      gamesCounted: 2,
      countedGames: 2,
      previewClaim: payout,
    },
    payout,
    shortfall: returned < TOTAL_PRINCIPAL ? { returned } : null,
  };
}

/** The 1-week season #3 matured with 5% simulated yield (922.5 mUSD) and was finalized. */
export const CLAIM_READY: ClaimSnapshot = finalized(musd(19_372, 500_000));

/** The same season, but the strategy returned only 99% of principal. */
export const CLAIM_SHORTFALL: ClaimSnapshot = finalized(musd(18_265, 500_000));

/** Still live: the position in the 1-week season #4, 9 minutes before maturity, with its estimate. */
export const CLAIM_NOT_MATURE: ClaimSnapshot = {
  season: {
    seasonId: POSITION_ACTIVE_WEEK.seasonId,
    tenor: "week",
    status: "Active",
    enrollStart: POSITION_ACTIVE_WEEK.start - 120,
    start: POSITION_ACTIVE_WEEK.start,
    end: POSITION_ACTIVE_WEEK.end,
    totalPrincipal: musd(18_450),
    bonusPot: musd(1_842, 500_000),
    sponsorFunds: musd(1_500),
    demoMode: true,
  },
  position: POSITION_ACTIVE_WEEK,
  payout: POSITION_ACTIVE_WEEK.previewClaim,
  shortfall: null,
};
