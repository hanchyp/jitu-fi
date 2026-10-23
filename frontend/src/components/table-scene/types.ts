// Props for <TableScene>. The scene only draws what it is given: the table page (or a fixture)
// owns the data, the timers and the scoring.

import type { ReactNode } from "react";
import type { COIN } from "@/lib/coins";

export type CoinSymbol = keyof typeof COIN;

export type TablePhase = "commit" | "reveal" | "live" | "result";

export type PickSide = "Buy" | "Sell";

/** The six skills (DECISIONS.md). The scene does not animate them yet; see `renderEffect`. */
export type SkillEffect = "BOOST" | "INSURANCE" | "LOCK" | "FLIP" | "SWAP" | "FREEZE";

export type ScenePick = {
  symbol: CoinSymbol;
  side: PickSide;
  /**
   * The coin's price change since the round opened, in bps, NOT adjusted for the side.
   * The scene signs it: a Buy spirit rises when this is positive, a Sell spirit when negative.
   */
  returnBps: number;
  /** Moved less than 1 bps. Defaults to |returnBps| < 1 when omitted. */
  void?: boolean;
  /** Skill currently on this pick. Drawn by `renderEffect` (3D) and as a badge (2D). */
  effect?: SkillEffect;
};

export type ScenePlayer = {
  id: string;
  /** Short display name: "You", "Bruno", "Bera", "Dex". */
  name: string;
  /**
   * Podium color. A player sits on the podium of the same color (PLAYER_COLORS in world/toon;
   * the bots' colors in lib/bots match them); otherwise seats follow array order.
   */
  color: string;
  isYou?: boolean;
  /** Up to the round cap (max 5). Hidden during commit whatever is passed. */
  picks: ScenePick[];
  /** Round score, shown on the podium label in the result phase. */
  score?: number;
};

/** Price series per picked coin, oldest first. The first point is the round's open price. */
export type PriceSeries = Partial<Record<CoinSymbol, readonly number[]>>;

export type SpiritEffectContext = { pick: ScenePick; player: ScenePlayer; index: number };

export type TableSceneProps = {
  /** The four seats: you plus the three house bots. Extra entries are ignored. */
  players: ScenePlayer[];
  prices: PriceSeries;
  phase: TablePhase;
  /** Round winners in the result phase (more than one on a tie). */
  winnerIds?: string[];
  /**
   * Skill effect slot. Called for every pick that has an `effect`; whatever it returns is
   * rendered inside that spirit's group, centered on the coin (unit coin, radius 0.5).
   */
  renderEffect?: (ctx: SpiritEffectContext) => ReactNode;
  /** "auto" picks 3D unless WebGL is missing or the user prefers reduced motion. */
  view?: "auto" | "3d" | "2d";
  className?: string;
};
