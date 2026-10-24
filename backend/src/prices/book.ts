import type { CoinSymbol } from "./feeds.js";

/** One price observation: `price × 10^expo` USD, published at `publishTime` (unix seconds). */
export type PriceTick = { coin: CoinSymbol; price: bigint; expo: number; publishTime: number };

export type TickListener = (tick: PriceTick) => void;

/** Live skills need a price no older than this (DECISIONS 2026-10-23). */
export const LIVE_SKILL_MAX_AGE_SECONDS = 5;

/**
 * Latest price per coin plus a short history, so a round can settle at the newest tick at or
 * before its deadline even if the settle timer fires late (owner decision: last good price).
 */
export class PriceBook {
  private readonly history = new Map<CoinSymbol, PriceTick[]>();
  private readonly listeners = new Set<TickListener>();

  constructor(private readonly historySize = 600) {}

  /** Stores a tick. Returns false for a tick that is not newer than the last one for its coin. */
  push(tick: PriceTick): boolean {
    let ticks = this.history.get(tick.coin);
    if (!ticks) this.history.set(tick.coin, (ticks = []));
    const last = ticks.at(-1);
    if (last && tick.publishTime <= last.publishTime) return false;
    ticks.push(tick);
    if (ticks.length > this.historySize) ticks.splice(0, ticks.length - this.historySize);
    for (const listener of this.listeners) listener(tick);
    return true;
  }

  latest(coin: CoinSymbol): PriceTick | undefined {
    return this.history.get(coin)?.at(-1);
  }

  /** The latest tick if it is at most `maxAgeSeconds` old at `nowSeconds`. */
  fresh(coin: CoinSymbol, nowSeconds: number, maxAgeSeconds: number): PriceTick | undefined {
    const tick = this.latest(coin);
    return tick && nowSeconds - tick.publishTime <= maxAgeSeconds ? tick : undefined;
  }

  /** The newest tick published at or before `timeSeconds`. */
  atOrBefore(coin: CoinSymbol, timeSeconds: number): PriceTick | undefined {
    const ticks = this.history.get(coin) ?? [];
    for (let i = ticks.length - 1; i >= 0; i--) if (ticks[i]!.publishTime <= timeSeconds) return ticks[i];
    return undefined;
  }

  onTick(listener: TickListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export interface PriceSource {
  start(): void;
  stop(): void;
}
