// View math shared by the 3D scene and the 2D fallback, so both show the same thing.

import { PLAYER_COLORS } from "@/components/world/toon";
import type { ScenePick, ScenePlayer } from "./types";

export const VOID_BPS = 1;

/** Table game-feel art in public/assets/table-fx/. */
export const tableFxUrl = (name: string) => `/assets/table-fx/${name}.webp`;
/** A signed return of this size lifts a spirit about 3/4 of the way to the top. */
const LIFT_BPS = 25;
/** Ridges never zoom in further than ±this, so noise of a few bps stays a gentle line. */
const RIDGE_MIN_RANGE_BPS = 12;

export function isVoid(pick: ScenePick) {
  return pick.void ?? Math.abs(pick.returnBps) < VOID_BPS;
}

/** The pick's return from its owner's side: positive means the call is right. */
export function signedBps(pick: ScenePick) {
  return pick.side === "Buy" ? pick.returnBps : -pick.returnBps;
}

/** Spirit height in -1..1, soft-clamped. Void picks rest at 0. */
export function lift(pick: ScenePick) {
  return isVoid(pick) ? 0 : Math.tanh(signedBps(pick) / LIFT_BPS);
}

/** The first four players, each placed on the podium of its color when there is one. */
export function seatPlayers(players: ScenePlayer[]) {
  const seats: (ScenePlayer | null)[] = [null, null, null, null];
  const rest: ScenePlayer[] = [];
  for (const p of players.slice(0, 4)) {
    const i = PLAYER_COLORS.findIndex((c) => c.toLowerCase() === p.color.toLowerCase());
    if (i >= 0 && !seats[i]) seats[i] = p;
    else rest.push(p);
  }
  return seats.map((s) => s ?? rest.shift() ?? null);
}

/**
 * Resamples a price series to `samples` heights in 0..1, centered on the open price (0.5).
 * Too few points give a flat line.
 */
export function ridgeHeights(series: readonly number[] | undefined, samples = 40) {
  if (!series || series.length < 2) return Array.from({ length: samples }, () => 0.5);
  const open = series[0];
  const bps = series.map((p) => (p / open - 1) * 10_000);
  const range = Math.max(RIDGE_MIN_RANGE_BPS, ...bps.map(Math.abs));
  return Array.from({ length: samples }, (_, i) => {
    const t = (i / (samples - 1)) * (bps.length - 1);
    const a = Math.floor(t);
    const b = Math.min(bps.length - 1, a + 1);
    const v = bps[a] + (bps[b] - bps[a]) * (t - a);
    return 0.5 + (v / range) * 0.45;
  });
}

const BPS = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1, signDisplay: "exceptZero" });

export function formatBps(bps: number) {
  return `${BPS.format(bps)} bps`;
}

const SCORE = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0, signDisplay: "exceptZero" });

export function formatScore(score: number) {
  return SCORE.format(score);
}
