// Dummy data shaped like GET /seasons/:id/leaderboard (backend-data-api spec): human players only
// (house bots never earn points), ranked by season points, with counted games n/K, weight and the
// estimated bonus. Amounts are bigint in 6-decimal mUSD units; points are integer game-score bps.
// The estimate is computed the way finalize/claim would split the pot (truncating bigint math), so the
// rows always add up to no more than the pot.
import { CURRENT_SEASONS_WEEK_STARTED, VAULT_RULES, type SeasonTenor } from "./season";
import { POSITION_ACTIVE_WEEK } from "./position";

export type LeaderboardEntry = {
  rank: number;
  address: string;
  seasonPoints: number;
  /** Games that earned points so far, out of the season's K. */
  gamesCounted: number;
  /** min(principal, 1,000 mUSD). */
  weight: bigint;
  /** bonusPot × points × weight ÷ Σ(points × weight), if the season ended now. Simulated in demo mode. */
  estimatedBonus: bigint;
};

export type LeaderboardResponse = {
  seasonId: number;
  tenor: SeasonTenor;
  /** K: the first K games of the season earn points. */
  countedGames: number;
  /** Current bonus pot, sponsor funds included. */
  bonusPot: bigint;
  entries: LeaderboardEntry[];
};

/** The connected dummy wallet; matches the position mock. */
export const YOU = POSITION_ACTIVE_WEEK.address;

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);
const ZERO = BigInt(0);

type Player = { address: string; seasonPoints: number; gamesCounted: number; principal: bigint };

/** Ranks players with points (0-point players are not on the board) and estimates each bonus share. */
function board(seasonId: number, tenor: SeasonTenor, bonusPot: bigint, players: Player[]): LeaderboardResponse {
  const ranked = players
    .filter((p) => p.seasonPoints > 0)
    .map((p) => ({ ...p, weight: p.principal < VAULT_RULES.weightCap ? p.principal : VAULT_RULES.weightCap }))
    .sort((a, b) => b.seasonPoints - a.seasonPoints);
  const total = ranked.reduce((sum, p) => sum + p.weight * BigInt(p.seasonPoints), ZERO);
  return {
    seasonId,
    tenor,
    countedGames: VAULT_RULES.countedGames,
    bonusPot,
    entries: ranked.map((p, i) => ({
      rank: i + 1,
      address: p.address,
      seasonPoints: p.seasonPoints,
      gamesCounted: p.gamesCounted,
      weight: p.weight,
      estimatedBonus: total === ZERO ? ZERO : (bonusPot * p.weight * BigInt(p.seasonPoints)) / total,
    })),
  };
}

const [weekSeason, monthSeason] = CURRENT_SEASONS_WEEK_STARTED.seasons;

const WEEK_PLAYERS: Player[] = [
  { address: "0x9f3c1e7a52b04d8e6a1f2c3b4d5e6f708192a3b4", seasonPoints: 341, gamesCounted: 2, principal: musd(1_000) },
  { address: "0x4a7d2b9c0e1f3a5b7c9d1e2f3a4b5c6d7e8f90c1", seasonPoints: 296, gamesCounted: 2, principal: musd(2_500) },
  { address: "0xd21e8f4a6b3c5d7e9f0a1b2c3d4e5f6a7b8c9d0e", seasonPoints: 228, gamesCounted: 2, principal: musd(640) },
  { address: YOU, seasonPoints: 184, gamesCounted: 1, principal: POSITION_ACTIVE_WEEK.principal },
  { address: "0x7b6a5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b", seasonPoints: 152, gamesCounted: 2, principal: musd(300) },
  { address: "0x0c9e8d7f6a5b4c3d2e1f0a9b8c7d6e5f4a3b2c1d", seasonPoints: 97, gamesCounted: 1, principal: musd(1_200) },
  { address: "0x5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f", seasonPoints: 41, gamesCounted: 2, principal: musd(75) },
  { address: "0xb3a2c1d0e9f8a7b6c5d4e3f2a1b0c9d8e7f6a5b4", seasonPoints: 12, gamesCounted: 1, principal: musd(10) },
];

const MONTH_PLAYERS: Player[] = [
  { address: "0x2d4f6a8c0e1b3d5f7a9c1e3b5d7f9a1c3e5b7d9f", seasonPoints: 263, gamesCounted: 2, principal: musd(5_000) },
  { address: "0x8e6c4a2f0d1b3e5c7a9f1d3b5e7c9a1f3d5b7e9c", seasonPoints: 205, gamesCounted: 1, principal: musd(900) },
  { address: "0x1f3e5d7c9b0a2f4e6d8c0b1a3f5e7d9c1b3a5f7e", seasonPoints: 118, gamesCounted: 2, principal: musd(450) },
  { address: "0x6a8c0e2b4d6f8a0c2e4b6d8f0a2c4e6b8d0f2a4c", seasonPoints: 64, gamesCounted: 1, principal: musd(1_000) },
];

/** Both live boards; you are 4th in the 1-week season and have no position in the 1-month one. */
export const LEADERBOARDS: readonly LeaderboardResponse[] = [
  board(weekSeason.seasonId, "week", weekSeason.bonusPot, WEEK_PLAYERS),
  board(monthSeason.seasonId, "month", monthSeason.bonusPot, MONTH_PLAYERS),
];

/** You hold a 1-week position but haven't finished a game yet, so you have no points to rank. */
export const LEADERBOARDS_YOU_UNRANKED: readonly LeaderboardResponse[] = [
  board(weekSeason.seasonId, "week", weekSeason.bonusPot, WEEK_PLAYERS.filter((p) => p.address !== YOU)),
  LEADERBOARDS[1],
];

/** No one has scored yet in either season. */
export const LEADERBOARDS_EMPTY: readonly LeaderboardResponse[] = [
  board(weekSeason.seasonId, "week", weekSeason.bonusPot, []),
  board(monthSeason.seasonId, "month", monthSeason.bonusPot, []),
];
