// Props for <TableScene>. The scene only draws what it is given: the table page (or a fixture)
// owns the data, the timers and the scoring.

import type { ReactNode } from "react";
import type { Group, Texture } from "three";
import type { COIN } from "@/lib/coins";

export type CoinSymbol = keyof typeof COIN;

export type TablePhase = "commit" | "reveal" | "live" | "result";

export type PickSide = "Buy" | "Sell";

/** The six skills (DECISIONS.md). Drawn by the skill effects in components/skills; see `renderEffect`. */
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
  /** Skill currently on this pick. Animated when it first appears, then held as a still mark. */
  effect?: SkillEffect;
  /** Display name of whoever cast `effect` on this pick when it was not its owner (a FREEZE). */
  effectBy?: string;
  /** SWAP only: the coin this pick traded away, so the effect can show the two spirits trading places. */
  swappedFrom?: CoinSymbol;
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
  /** Missed commit or reveal: from Reveal on, the podium shows a broken seal instead of spirits. */
  forfeit?: boolean;
};

/** Price series per picked coin, oldest first. The first point is the round's open price. */
export type PriceSeries = Partial<Record<CoinSymbol, readonly number[]>>;

export type SpiritEffectContext = {
  pick: ScenePick;
  player: ScenePlayer;
  index: number;
  /**
   * The group holding the coin mesh, for effects that move the coin itself (FLIP, BOOST, SWAP).
   * Null for the first render. The scene never transforms it, so an effect may.
   */
  coin: Group | null;
  /** The scene's toon gradient map. */
  gradient: Texture;
};

export type TableSceneProps = {
  /** The four seats: you plus the three house bots. Extra entries are ignored. */
  players: ScenePlayer[];
  prices: PriceSeries;
  phase: TablePhase;
  /** Round winners in the result phase (more than one on a tie). */
  winnerIds?: string[];
  /**
   * 3D skill effect slot. Called for every pick that has an `effect`; whatever it returns is
   * rendered inside that spirit's group, centered on the coin (unit coin, radius 0.5). Defaults to
   * the six skill spells from components/skills; pass `() => null` to draw none. The 2D view
   * always draws the matching flat effects.
   */
  renderEffect?: (ctx: SpiritEffectContext) => ReactNode;
  /** Final podium: the 3D winner podiums play a one-shot rising halo and coin spiral (none under reduced motion). */
  celebrate?: boolean;
  /** "auto" picks 3D unless WebGL is missing or the user prefers reduced motion. */
  view?: "auto" | "3d" | "2d";
  /** Drawn instead of the built-in 2D view whenever the 3D scene is off (null draws nothing). */
  fallback?: ReactNode;
  className?: string;
};
