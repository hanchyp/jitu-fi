// JSON mirror of backend engine/types.ts and engine.view(). Keep transport prices as strings.
import type { SkillEffect } from "./types";

export type ServerPhase = "Commit" | "Reveal" | "Live" | "Settled" | "Finished";
export type ServerPrice = { price: string; expo: number; publishTime: number };
export type ServerTick = ServerPrice & { coin: string };
export type ServerPick = { coin: string; side: "Buy" | "Sell"; boosted?: boolean; insured?: boolean };
export type ServerSkill = {
  seat: number;
  skill: "LOCK" | "FLIP" | "SWAP" | "FREEZE";
  targetSeat: number;
  targetCoin: string;
  swapTo?: string;
  swapPrice?: string;
  price: string;
  atMs: number;
};
export type ServerSeatResult = {
  seat: number;
  score: number;
  forfeit: boolean;
  picks: { coin: string; side: "Buy" | "Sell"; raw: number; ret: number; void: boolean }[];
};
export type ServerRound = {
  n: number;
  cap: number;
  coins: string[];
  liveDuration: number;
  commitDeadlineMs: number;
  revealDeadlineMs?: number;
  liveStartMs?: number;
  liveEndMs?: number;
  startPrices?: Record<string, ServerPrice>;
  endPrices?: Record<string, ServerPrice>;
  picks: Record<string, ServerPick[]>;
  submitted?: number[];
  skills: ServerSkill[];
  results?: ServerSeatResult[];
  winners?: number[];
  awarded?: { seat: number; skill: SkillEffect }[];
};
export type ServerTableState = {
  id: number;
  preset: "quick" | "standard" | "long" | "marathon";
  seasonId: number;
  createdAtMs: number;
  phase: ServerPhase;
  phaseDeadlineMs: number | null;
  round: number;
  seats: { seat: number; address: string; isBot: boolean; hand?: SkillEffect[]; handSize?: number }[];
  rounds: ServerRound[];
  gameScores?: number[];
  finishedAtMs?: number;
};
