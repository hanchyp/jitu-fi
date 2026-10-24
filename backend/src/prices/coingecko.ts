import type { Logger } from "../logger.js";
import type { PriceBook, PriceSource } from "./book.js";
import type { CoinSymbol } from "./feeds.js";

export const COINGECKO_IDS: Record<CoinSymbol, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana", DOGE: "dogecoin",
  BNB: "binancecoin", XRP: "ripple", AVAX: "avalanche-2", MON: "monad",
};

/** Exact decimal scaling, truncating sub-satoshi digits without floating point. */
export function decimalToPrice(value: string): bigint {
  const match = /^(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match) throw new Error("Invalid USD price");
  const fraction = match[2] ?? "";
  const shift = 8 + Number(match[3] ?? 0) - fraction.length;
  if (!Number.isSafeInteger(shift) || Math.abs(shift) > 1000) throw new Error("USD exponent out of range");
  const digits = BigInt(match[1]! + fraction);
  return shift >= 0 ? digits * 10n ** BigInt(shift) : digits / 10n ** BigInt(-shift);
}

export type CoinGeckoOptions = {
  coins: ReadonlySet<CoinSymbol>;
  book: PriceBook;
  log: Logger;
  fetch?: typeof fetch;
  pollMs?: number;
  nowSeconds?: () => number;
};

export class CoinGeckoSource implements PriceSource {
  private controller?: AbortController;
  private pollTimer?: ReturnType<typeof setTimeout>;
  private stampTimer?: ReturnType<typeof setInterval>;
  private readonly prices = new Map<CoinSymbol, bigint>();
  private backoff = 0;

  constructor(private readonly options: CoinGeckoOptions) {}

  /** Latest known fetched price, re-stamped each second for live-skill freshness.
   * publishTime is observation time, not evidence of a new upstream quote. */
  restamp() {
    const publishTime = (this.options.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
    for (const coin of this.options.coins) {
      const price = this.prices.get(coin);
      if (price) this.options.book.push({ coin, price, expo: -8, publishTime, source: "coingecko" });
    }
  }

  async poll(signal?: AbortSignal): Promise<number> {
    const base = this.options.pollMs ?? 10_000;
    const coins = [...this.options.coins];
    if (!coins.length) return base;
    const ids = coins.map((coin) => COINGECKO_IDS[coin]).join(",");
    try {
      const response = await (this.options.fetch ?? globalThis.fetch)(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&precision=full`, { signal },
      );
      if (!response.ok) {
        if (response.status === 429 || response.status >= 500) this.backoff = Math.min(this.backoff ? this.backoff * 2 : base * 2, Math.max(base, 300_000));
        throw new Error(`CoinGecko failed: ${response.status}`);
      }
      // Preserve JSON number lexemes before JSON.parse can round them through Number.
      const body = (await response.text()).replace(/("usd"\s*:\s*)(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/g, '$1"$2"');
      const data = JSON.parse(body) as Record<string, { usd?: string }>;
      for (const coin of coins) {
        const value = data[COINGECKO_IDS[coin]]?.usd;
        if (typeof value !== "string") continue;
        try {
          const price = decimalToPrice(value);
          if (price > 0n) this.prices.set(coin, price);
        } catch { /* An invalid quote must not replace the last good price. */ }
      }
      this.backoff = 0;
      if (!signal?.aborted) this.restamp();
    } catch (err) {
      if (!signal?.aborted) this.options.log.warn({ err: (err as Error).message }, "coingecko poll failed");
    }
    return this.backoff || base;
  }

  start() {
    if (this.controller) return;
    const controller = this.controller = new AbortController();
    const run = async () => {
      const delay = await this.poll(controller.signal);
      if (!controller.signal.aborted) this.pollTimer = setTimeout(run, delay);
    };
    void run();
    this.stampTimer = setInterval(() => this.restamp(), 1000);
  }

  stop() {
    this.controller?.abort();
    this.controller = undefined;
    clearTimeout(this.pollTimer);
    clearInterval(this.stampTimer);
  }
}
