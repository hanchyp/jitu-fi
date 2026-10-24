// Crypto Draft scoring, shared by the backend engine, the house bots and the UI's live scores.
// Integer math only (bigint), truncating toward zero like Solidity. Rules: DECISIONS.md
// (2026-10-23 redesign, 2026-10-24 FLIP/SWAP attacks) and the game-table / game-skills specs.

export type Side = "Buy" | "Sell";
export type Preset = "Quick" | "Standard" | "Long" | "Marathon";

/** Per-round pick caps; their sum divides the game score. */
export const PRESET_CAPS: Record<Preset, readonly number[]> = {
  Quick: [1, 2, 3],
  Standard: [1, 1, 2, 2, 3],
  Long: [1, 1, 2, 2, 3, 3, 4],
  Marathon: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
};

export const GAME = {
  playersPerTable: 4,
  coinsPerTable: 8,
  commitSeconds: 20,
  revealSeconds: 10,
  liveMinSeconds: 60,
  liveMaxSeconds: 120,
  liveSkillMaxAgeSeconds: 5,
  maxHand: 3,
  boostWeight: 2,
  /** GameManager.MAX_GAME_SCORE: recordGame reverts above this. */
  maxGameScore: 10_000,
} as const;

/**
 * A live effect on a pick. Prices are raw Pyth integers; a pick's segments only ever divide prices
 * of the same coin, so the exponent cancels out.
 * - LOCK (own pick) and FREEZE (attack): the pick ends at `price`.
 * - FLIP (attack): start → price in the old direction, then price → end reversed.
 * - SWAP (attack): old coin start → price, then the new coin `newStart` → `newEnd`, same direction.
 */
export type PickEffect =
  | { kind: "LOCK" | "FREEZE"; price: bigint }
  | { kind: "FLIP"; price: bigint }
  | { kind: "SWAP"; price: bigint; newCoin: string; newStart: bigint; newEnd: bigint };

export type PickInput = {
  coin: string;
  side: Side;
  boosted?: boolean;
  insured?: boolean;
  /** Coin price at Live start. */
  start: bigint;
  /** Coin price at the Live deadline (last good price). */
  end: bigint;
  effect?: PickEffect;
};

export type PickResult = {
  /** Return in bps before the INSURANCE floor. */
  raw: number;
  /** Return in bps used for scoring (INSURANCE floor applied). */
  ret: number;
  /** Raw return of 0: moved less than 1 bps, excluded from the round average. */
  void: boolean;
};

const BPS = 10_000n;
const opposite = (side: Side): Side => (side === "Buy" ? "Sell" : "Buy");

/** (end − start) × 10000 / start, truncated toward zero, sign flipped for Sell. */
export function retBps(start: bigint, end: bigint, side: Side): bigint {
  if (start <= 0n) throw new Error("start price must be positive");
  const ret = ((end - start) * BPS) / start;
  return side === "Buy" ? ret : -ret;
}

export function pickReturn(pick: PickInput): PickResult {
  const { start, end, side, effect } = pick;
  let raw: bigint;
  switch (effect?.kind) {
    case undefined:
      raw = retBps(start, end, side);
      break;
    case "LOCK":
    case "FREEZE":
      raw = retBps(start, effect.price, side);
      break;
    case "FLIP":
      raw = retBps(start, effect.price, side) + retBps(effect.price, end, opposite(side));
      break;
    case "SWAP":
      raw = retBps(start, effect.price, side) + retBps(effect.newStart, effect.newEnd, side);
      break;
  }
  const ret = pick.insured && raw < 0n ? 0n : raw;
  return { raw: Number(raw), ret: Number(ret), void: raw === 0n };
}

/** cap × Σ(wᵢ × retᵢ) / Σwᵢ over non-void picks, truncated toward zero. Forfeit or all-void scores 0. */
export function roundScore(cap: number, picks: readonly PickInput[], forfeit = false): number {
  if (forfeit || picks.length === 0) return 0;
  let weighted = 0n;
  let weights = 0n;
  for (const pick of picks) {
    const result = pickReturn(pick);
    if (result.void) continue;
    const w = pick.boosted ? BigInt(GAME.boostWeight) : 1n;
    weighted += w * BigInt(result.ret);
    weights += w;
  }
  if (weights === 0n) return 0;
  return Number((BigInt(cap) * weighted) / weights);
}

export type SeatScore = { seat: number; score: number; forfeit: boolean };

/** Highest-scoring non-forfeit seats; ties all win. Empty if everyone forfeited. */
export function roundWinners(scores: readonly SeatScore[]): number[] {
  const live = scores.filter((s) => !s.forfeit);
  if (live.length === 0) return [];
  const best = Math.max(...live.map((s) => s.score));
  return live.filter((s) => s.score === best).map((s) => s.seat);
}

/** Σ round scores / Σ caps, truncated toward zero. */
export function gameScore(roundScores: readonly number[], caps: readonly number[]): number {
  if (roundScores.length !== caps.length) throw new Error("one score per round");
  const total = roundScores.reduce((a, s) => a + BigInt(s), 0n);
  const capSum = caps.reduce((a, c) => a + BigInt(c), 0n);
  return Number(total / capSum);
}

/** The score sent to recordGame: capped at MAX_GAME_SCORE (unbounded below, as on-chain). */
export function clampGameScore(score: number): number {
  return Math.min(score, GAME.maxGameScore);
}

/** Season points per game: max(0, score) for the first K games in order; later games earn 0. */
export function seasonCredits(gameScores: readonly number[], k: number): { credited: number; counted: boolean }[] {
  return gameScores.map((score, i) => ({ credited: i < k ? Math.max(0, score) : 0, counted: i < k }));
}
