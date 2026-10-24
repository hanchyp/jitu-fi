// Dummy data shaped like GET /users/:addr/position (backend-data-api spec), including previewClaim,
// plus the wallet's on-chain mUSD balance and faucet cooldown. Amounts are bigint in 6-decimal units.
import { MOCK_NOW, type SeasonStatus, type SeasonTenor } from "./season";

export type PositionResponse = {
  address: string;
  seasonId: number;
  tenor: SeasonTenor;
  seasonStatus: SeasonStatus;
  /** Season start and maturity, unix seconds. */
  start: number;
  end: number;
  principal: bigint;
  /** min(principal, 1,000 mUSD). */
  weight: bigint;
  /** Season points so far, in bps of game score. */
  seasonPoints: number;
  /** Games that earned points so far, out of `countedGames` (K). */
  gamesCounted: number;
  countedGames: number;
  /** Estimated payout at maturity. Yield is simulated in demo mode. */
  previewClaim: { principal: bigint; baseYield: bigint; bonus: bigint };
};

export type WalletMock = {
  balance: bigint;
  /** Last faucet claim, unix seconds; null if never claimed. */
  faucetLastClaim: number | null;
};

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);
const ADDRESS = "0x1234567890abcdef1234567890abcdef123456ab";

export const WALLET: WalletMock = { balance: musd(1_250, 750_000), faucetLastClaim: null };

/** Faucet used 20 minutes ago: about 40 minutes left on the one-hour cooldown. */
export const WALLET_FAUCET_USED: WalletMock = { balance: musd(1_250, 750_000), faucetLastClaim: MOCK_NOW - 20 * 60 };

/** Not enough mUSD for the amount typed. */
export const WALLET_LOW: WalletMock = { balance: musd(120), faucetLastClaim: null };

/** In the 1-week season, which is live: one of two counted games played. */
export const POSITION_ACTIVE_WEEK: PositionResponse = {
  address: ADDRESS,
  seasonId: 4,
  tenor: "week",
  seasonStatus: "Active",
  start: MOCK_NOW - 6 * 60,
  end: MOCK_NOW + 9 * 60,
  principal: musd(250),
  weight: musd(250),
  seasonPoints: 184,
  gamesCounted: 1,
  countedGames: 2,
  previewClaim: { principal: musd(250), baseYield: musd(5, 312_500), bonus: musd(31, 840_000) },
};

/** In the 1-month season, still enrolling: nothing earned yet. */
export const POSITION_ENROLLING_MONTH: PositionResponse = {
  address: ADDRESS,
  seasonId: 5,
  tenor: "month",
  seasonStatus: "Enrollment",
  start: MOCK_NOW + 112,
  end: MOCK_NOW + 112 + 30 * 60,
  principal: musd(400),
  weight: musd(400),
  seasonPoints: 0,
  gamesCounted: 0,
  countedGames: 2,
  previewClaim: { principal: musd(400), baseYield: BigInt(0), bonus: BigInt(0) },
};
