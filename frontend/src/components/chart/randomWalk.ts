// Dummy prices for the UI-first phase: a deterministic, seeded random walk per coin.
// The same symbol and seed always produce the same series, so server and client render
// identical history; ticking only starts after mount.
import { useEffect, useState } from "react";

export type PricePoint = { t: number; price: number };

/** Starting prices per coin symbol (dummy, USD). */
export const START_PRICES: Record<string, number> = {
  BTC: 64_250,
  ETH: 3_120,
  SOL: 148.6,
  DOGE: 0.1234,
  BNB: 585.4,
  XRP: 0.5231,
  AVAX: 27.85,
  MON: 1.25,
};

/** Default volatility per step in bps (one standard deviation of the log return). */
export const VOLATILITY_BPS: Record<string, number> = {
  BTC: 4,
  ETH: 5,
  SOL: 8,
  DOGE: 10,
  BNB: 5,
  XRP: 8,
  AVAX: 9,
  MON: 12,
};

const DEFAULT_PRICE = 100;
const DEFAULT_VOLATILITY_BPS = 6;

export type WalkOptions = {
  /** Mixed into the per-symbol seed; change it for a different series. */
  seed?: number;
  /** Per-step volatility in bps. Defaults to VOLATILITY_BPS[symbol]. */
  volatilityBps?: number;
  /** Defaults to START_PRICES[symbol]. */
  startPrice?: number;
};

/** FNV-1a hash of the symbol, xored with an optional seed. */
export function seedFor(symbol: string, seed = 0): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < symbol.length; i++) {
    h ^= symbol.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h ^ seed) >>> 0;
}

// Stateless uniform in [0, 1) for (seed, step, lane): mulberry32's output mix.
function uniform(seed: number, step: number, lane: number): number {
  let t = (seed ^ Math.imul(step + 1, 0x9e3779b1) ^ Math.imul(lane + 1, 0x85ebca6b)) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Standard normal draw (Box-Muller) for one step.
function gaussian(seed: number, step: number): number {
  const u1 = Math.max(uniform(seed, step, 0), 1e-12);
  const u2 = uniform(seed, step, 1);
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/** Price after step `step`, from the previous price. Pure: same inputs, same output. */
export function stepPrice(price: number, seed: number, step: number, volatilityBps: number): number {
  return price * Math.exp((volatilityBps / 10_000) * gaussian(seed, step));
}

function volatilityOf(symbol: string, volatilityBps?: number) {
  return volatilityBps ?? VOLATILITY_BPS[symbol] ?? DEFAULT_VOLATILITY_BPS;
}

/**
 * Pure random walk of `steps` points for a symbol, the last one at `endTime` (ms),
 * spaced `intervalMs` apart.
 */
export function randomWalk(
  symbol: string,
  { steps, intervalMs = 1_000, endTime = 0, seed, volatilityBps, startPrice }: WalkOptions & {
    steps: number;
    intervalMs?: number;
    endTime?: number;
  },
): PricePoint[] {
  const s = seedFor(symbol, seed);
  const vol = volatilityOf(symbol, volatilityBps);
  const points: PricePoint[] = [];
  let price = startPrice ?? START_PRICES[symbol] ?? DEFAULT_PRICE;
  for (let i = 0; i < steps; i++) {
    if (i > 0) price = stepPrice(price, s, i, vol);
    points.push({ t: endTime - (steps - 1 - i) * intervalMs, price });
  }
  return points;
}

type WalkState = {
  key: string;
  series: Record<string, PricePoint[]>;
  /** Index of the next step to draw. */
  step: number;
  /** False until the first client tick moves the timestamps onto the wall clock. */
  anchored: boolean;
};

type HookOptions = {
  /** Points kept per symbol. */
  history?: number;
  intervalMs?: number;
  seed?: number;
  volatilityBps?: number;
};

function initWalks(key: string, symbols: readonly string[], history: number, intervalMs: number, seed?: number, volatilityBps?: number): WalkState {
  const series: Record<string, PricePoint[]> = {};
  for (const symbol of symbols) series[symbol] = randomWalk(symbol, { steps: history, intervalMs, seed, volatilityBps });
  return { key, series, step: history, anchored: false };
}

function advance(state: WalkState, now: number, history: number, intervalMs: number, seed?: number, volatilityBps?: number): WalkState {
  const series: Record<string, PricePoint[]> = {};
  for (const [symbol, points] of Object.entries(state.series)) {
    const last = points[points.length - 1];
    const shift = state.anchored ? 0 : now - intervalMs - last.t;
    const kept = (shift ? points.map((p) => ({ t: p.t + shift, price: p.price })) : points).slice(-(history - 1));
    const price = stepPrice(last.price, seedFor(symbol, seed), state.step, volatilityOf(symbol, volatilityBps));
    series[symbol] = [...kept, { t: now, price }];
  }
  return { ...state, series, step: state.step + 1, anchored: true };
}

/**
 * Live dummy prices for several symbols, ticking every `intervalMs` on the client.
 * The first render (server and client) shows deterministic history with timestamps
 * ending at 0; the first tick after mount moves them onto the wall clock.
 */
export function useRandomWalks(
  symbols: readonly string[],
  { history = 90, intervalMs = 1_000, seed, volatilityBps }: HookOptions = {},
): Record<string, PricePoint[]> {
  const key = `${symbols.join(",")}|${history}|${intervalMs}|${seed}|${volatilityBps}`;
  const [state, setState] = useState(() => initWalks(key, symbols, history, intervalMs, seed, volatilityBps));
  let current = state;
  if (state.key !== key) {
    current = initWalks(key, symbols, history, intervalMs, seed, volatilityBps);
    setState(current);
  }

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      setState((s) => advance(s, now, history, intervalMs, seed, volatilityBps));
    };
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, intervalMs);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [key, history, intervalMs, seed, volatilityBps]);

  return current.series;
}

/** Live dummy prices for one symbol. See useRandomWalks. */
export function useRandomWalk(symbol: string, options?: HookOptions): PricePoint[] {
  return useRandomWalks([symbol], options)[symbol];
}
