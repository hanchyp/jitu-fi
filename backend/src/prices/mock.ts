import type { PriceBook, PriceSource } from "./book.js";
import type { CoinSymbol } from "./feeds.js";

const EXPO = -8;
/** Rough real-world starting points, so the UI shows sensible numbers locally. */
const START_USD: Record<CoinSymbol, number> = {
  BTC: 100_000, ETH: 3_500, SOL: 180, DOGE: 0.2, BNB: 650, XRP: 2.5, AVAX: 35, MON: 0.05,
};

export type MockOptions = {
  coins: readonly CoinSymbol[];
  book: PriceBook;
  seed?: number;
  tickMs?: number;
  /** Largest move per tick, in bps. */
  maxStepBps?: number;
  nowSeconds?: () => number;
};

/** Deterministic PRNG (mulberry32), so tests and demos can replay a price path. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

/** Random-walk prices for local runs (PRICE_SOURCE=mock). Never used on testnet by default. */
export class MockSource implements PriceSource {
  private timer?: ReturnType<typeof setInterval>;
  private readonly random: () => number;
  private readonly prices = new Map<CoinSymbol, bigint>();
  private readonly now: () => number;

  constructor(private readonly options: MockOptions) {
    this.random = mulberry32(options.seed ?? 1);
    this.now = options.nowSeconds ?? (() => Math.floor(Date.now() / 1000));
    for (const coin of options.coins) this.prices.set(coin, BigInt(Math.round(START_USD[coin] * 1e8)));
  }

  /** Advances every coin one step and publishes it. */
  tick() {
    const maxStep = this.options.maxStepBps ?? 15;
    const publishTime = this.now();
    for (const coin of this.options.coins) {
      const step = BigInt(Math.round((this.random() * 2 - 1) * maxStep));
      const prev = this.prices.get(coin)!;
      const next = prev + (prev * step) / 10_000n;
      const price = next > 0n ? next : prev;
      this.prices.set(coin, price);
      this.options.book.push({ coin, price, expo: EXPO, source: "mock", publishTime });
    }
  }

  start() {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), this.options.tickMs ?? 1_000);
  }

  stop() {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
