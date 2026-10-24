import { PriceBook, type PriceSource } from "./book.js";
import { CoinGeckoSource } from "./coingecko.js";
import { HermesSource, type HermesOptions } from "./hermes.js";
import type { CoinSymbol } from "./feeds.js";

/** Pyth owns every delivered coin; rejected or initially missing coins use CoinGecko. */
export class HybridSource implements PriceSource {
  private readonly fallback = new Set<CoinSymbol>();
  private readonly pythBook = new PriceBook();
  private readonly hermes: HermesSource;
  private readonly coingecko: CoinGeckoSource;
  private timer?: ReturnType<typeof setTimeout>;
  private running = false;

  constructor(private readonly options: HermesOptions & { pollMs?: number; fallbackMs?: number }) {
    this.hermes = new HermesSource({ ...options, book: this.pythBook, onUnentitled: (coin) => this.fallback.add(coin) });
    this.coingecko = new CoinGeckoSource({ ...options, coins: this.fallback });
    this.pythBook.onTick((tick) => {
      this.fallback.delete(tick.coin);
      options.book.push(tick);
    });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.hermes.start();
    this.timer = setTimeout(() => {
      for (const coin of this.options.coins) if (!this.pythBook.latest(coin)) this.fallback.add(coin);
    }, this.options.fallbackMs ?? 15_000);
    this.coingecko.start();
  }

  stop() {
    this.running = false;
    clearTimeout(this.timer);
    this.hermes.stop();
    this.coingecko.stop();
  }
}
