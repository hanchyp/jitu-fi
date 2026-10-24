// View models for the vault screens. Pages map backend-shaped data (src/mocks, later the API) into
// these, so components never import mocks. Amounts are bigint in 6-decimal mUSD units.

export type Tenor = "week" | "month";

export type VaultRules = {
  minDeposit: bigint;
  weightCap: bigint;
  faucetAmount: bigint;
  faucetCooldownSeconds: number;
  /** K: the first K games of a season earn points. */
  countedGames: number;
};

export type TenorOption = {
  tenor: Tenor;
  seasonId: number;
  /** "1 week" */
  label: string;
  /** Season length in the demo, in minutes. */
  demoMinutes: number;
  /** Seconds until enrollment closes; 0 once the season has started. */
  enrollSecondsLeft: number;
  bonusPot: bigint;
  sponsorFunds: bigint;
  /** Seconds from now to maturity. */
  maturitySeconds: number;
};

export type PositionView = {
  seasonId: number;
  tenor: Tenor;
  tenorLabel: string;
  /** "enrolling" until the season starts; games count only once it is "active". */
  status: "enrolling" | "active";
  principal: bigint;
  /** Estimated at maturity (previewClaim). */
  baseYield: bigint;
  bonus: bigint;
  secondsToStart: number;
  secondsToMaturity: number;
  gamesCounted: number;
  countedGames: number;
};

export type WalletView = {
  balance: bigint;
  /** Seconds left on the faucet cooldown; 0 means it can be claimed now. */
  faucetSecondsLeft: number;
};
