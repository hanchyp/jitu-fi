import type { CoinSymbol, PickSide, SkillEffect, TablePhase } from "@/components/table-scene/types";

export type SkillName = SkillEffect;

/** One card in a player's hand (max 3). */
export type SkillCard = {
  id: string;
  skill: SkillName;
};

/** A pick on the table as the skill picker sees it: yours or an opponent's. */
export type SkillPick = {
  /** Stable id the table page uses for this pick, passed back in `SkillTarget.pickId`. */
  id: string;
  ownerId: string;
  /** "You", "Bruno", "Bera", "Dex". */
  ownerName: string;
  symbol: CoinSymbol;
  side: PickSide;
  /** Signed return so far in bps, from the owner's side. Omitted before Live. */
  returnBps?: number;
  /** A pick carries one live effect; commit skills may coexist with an attack. */
  effect?: SkillName;
  /** Original round picks, retained after a SWAP. */
  pickedSymbols?: readonly CoinSymbol[];
};

/** What a cast skill acts on. SWAP carries the new coin; side mirrors the victim. */
export type SkillTarget = {
  pickId: string;
  swapTo?: { symbol: CoinSymbol; side: PickSide };
};

export type SkillHandProps = {
  /** Up to 3 cards. An empty array shows the empty hand. */
  cards: readonly SkillCard[];
  phase: TablePhase;
  /** Live skills are blocked after the live deadline, even while the round waits to settle. */
  liveDeadlinePassed?: boolean;
  /** Max 1 skill per player per round; BOOST or INSURANCE at commit counts too. */
  usedThisRound?: boolean;
  /** Your picks this round (during commit: the picks drafted so far). */
  ownPicks: readonly SkillPick[];
  /** The bots' revealed picks, for FREEZE, FLIP and SWAP. */
  opponentPicks?: readonly SkillPick[];
  /** The table's coins, for SWAP. Coins the victim picked are left out. */
  boardCoins?: readonly CoinSymbol[];
  /**
   * Called on confirm. Return a promise to keep the hand in its pending state until it settles;
   * a rejection shows the error message. Dummy for now: no transaction.
   */
  onUse?: (card: SkillCard, target: SkillTarget) => void | Promise<void>;
  className?: string;
  /** Compact dock cards; the target picker opens in the shared modal. */
  compact?: boolean;
};
