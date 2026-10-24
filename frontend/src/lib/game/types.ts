// Engine state. JSON-safe (bigint prices as decimal strings): it is persisted as the table's
// snapshot after every change, restored after a restart, and hashed into the on-chain logHash.
export type { LiveSkill, PickSubmission, Skill } from "../../../../packages/shared/dist/skills";
export type { PresetId } from "../../../../packages/shared/dist/config";
import type { LiveSkill, PickSubmission, Skill } from "../../../../packages/shared/dist/skills";
import type { PresetId } from "../../../../packages/shared/dist/config";

export type Phase = "Commit" | "Reveal" | "Live" | "Finished";

export type PriceJson = { price: string; expo: number; publishTime: number };

export type SeatState = { seat: number; address: string; isBot: boolean; hand?: Skill[]; handSize?: number };

export type UsedSkill = {
  seat: number;
  skill: LiveSkill;
  targetSeat: number;
  targetCoin: string;
  /** SWAP only: the coin the pick moved to, and its price at the swap. */
  swapTo?: string;
  swapPrice?: string;
  /** Backend price of the target coin when the skill was used. */
  price: string;
  atMs: number;
};

export type PickResultJson = { coin: string; side: "Buy" | "Sell"; raw: number; ret: number; void: boolean };

export type SeatResult = { seat: number; score: number; forfeit: boolean; picks: PickResultJson[] };

export type RoundJson = {
  n: number;
  cap: number;
  coins: string[];
  liveDuration: number;
  commitDeadlineMs: number;
  revealDeadlineMs?: number;
  liveStartMs?: number;
  liveEndMs?: number;
  startPrices?: Record<string, PriceJson>;
  endPrices?: Record<string, PriceJson>;
  /** Keyed by seat. Hidden from other seats until Reveal. */
  picks: Record<string, PickSubmission[]>;
  skills: UsedSkill[];
  submitted?: number[];
  results?: SeatResult[];
  winners?: number[];
  awarded?: { seat: number; skill: Skill }[];
};

export type TableState = {
  id: number;
  preset: PresetId;
  seasonId: number;
  createdAtMs: number;
  phase: Phase;
  phaseDeadlineMs: number | null;
  /** 1-based index of the current round. */
  round: number;
  seats: SeatState[];
  rounds: RoundJson[];
  /** Per seat, once Finished. */
  gameScores?: number[];
  finishedAtMs?: number;
};

export type EngineEvent =
  | { type: "roundStarted"; round: number; cap: number; coins: string[]; liveDuration: number; commitDeadlineMs: number }
  | { type: "picksSubmitted"; round: number; seat: number }
  | { type: "revealed"; round: number; picks: Record<string, PickSubmission[]>; revealDeadlineMs: number }
  | { type: "liveStarted"; round: number; startPrices: Record<string, PriceJson>; liveStartMs: number; liveEndMs: number }
  | { type: "liveShortened"; round: number; liveEndMs: number }
  | { type: "skillUsed"; round: number; skill: UsedSkill }
  | { type: "roundSettled"; round: number; results: SeatResult[]; winners: number[]; awarded: { seat: number; skill: Skill }[] }
  | { type: "gameFinished"; gameScores: number[] };

