import type { Logger } from "../logger.js";
import type { PriceBook, PriceSource, PriceTick } from "./book.js";
import { coinForFeedId, FEED_IDS, type CoinSymbol } from "./feeds.js";
import { SseParser } from "./sse.js";

type HermesPrice = { price: string; conf: string; expo: number; publish_time: number };
type HermesUpdate = { parsed?: { id: string; price: HermesPrice }[] };

export type HermesOptions = {
  baseUrl: string;
  /** Required by Pyth since the 2026-08-26 Core upgrade; sent as a Bearer token. */
  apiKey: string;
  coins: readonly CoinSymbol[];
  book: PriceBook;
  log: Logger;
  fetch?: typeof fetch;
  /** Delay before reconnecting; doubles per failure up to 30 s. */
  reconnectMs?: number;
  onUnentitled?: (coin: CoinSymbol) => void;
};

export function parseHermesUpdate(json: string): PriceTick[] {
  const update = JSON.parse(json) as HermesUpdate;
  const ticks: PriceTick[] = [];
  for (const feed of update.parsed ?? []) {
    const coin = coinForFeedId(feed.id);
    if (!coin) continue;
    const price = BigInt(feed.price.price);
    if (price <= 0n) continue; // never score against a non-positive price
    ticks.push({ coin, price, expo: feed.price.expo, publishTime: feed.price.publish_time });
  }
  return ticks;
}

/** Streams Pyth prices from Hermes (SSE) into the book, reconnecting with backoff. */
export class HermesSource implements PriceSource {
  readonly unentitled = new Set<CoinSymbol>();
  private controller?: AbortController;
  private readonly fetch: typeof fetch;

  constructor(private readonly options: HermesOptions) {
    this.fetch = options.fetch ?? globalThis.fetch;
  }

  private url(path: string) {
    const ids = this.options.coins.filter((c) => !this.unentitled.has(c)).map((c) => `ids[]=${FEED_IDS[c]}`).join("&");
    return `${this.options.baseUrl.replace(/\/$/, "")}${path}?${ids}&parsed=true`;
  }

  private get headers() {
    return { Authorization: `Bearer ${this.options.apiKey}`, Accept: "text/event-stream" };
  }

  /** One-shot snapshot, used at boot so the book is never empty while the stream connects. */
  async fetchLatest(): Promise<void> {
    while (this.unentitled.size < this.options.coins.length) {
      const res = await this.fetch(this.url("/v2/updates/price/latest"), { headers: this.headers });
      if (!res.ok) {
        const body = await res.text();
        if (this.dropUnentitled(res.status, body)) continue;
        throw new Error(`Hermes latest failed: ${res.status} ${body}`);
      }
      for (const tick of parseHermesUpdate(await res.text())) this.options.book.push({ ...tick, source: "pyth" });
      return;
    }
  }

  private dropUnentitled(status: number, body: string): boolean {
    if (status !== 403) return false;
    const id = /Not entitled: feed (?:0x)?([a-f0-9]{64})\b/i.exec(body)?.[1];
    const coin = id && coinForFeedId(id);
    if (!coin || !this.options.coins.includes(coin) || this.unentitled.has(coin)) return false;
    this.unentitled.add(coin);
    this.options.log.warn({ coin }, "Pyth feed not entitled; dropping from stream");
    this.options.onUnentitled?.(coin);
    return true;
  }

  start() {
    if (this.controller) return;
    this.controller = new AbortController();
    void this.loop(this.controller.signal);
  }

  stop() {
    this.controller?.abort();
    this.controller = undefined;
  }

  private async loop(signal: AbortSignal) {
    const base = this.options.reconnectMs ?? 1_000;
    let delay = base;
    while (!signal.aborted && this.unentitled.size < this.options.coins.length) {
      try {
        await this.stream(signal);
        // A clean end (Hermes closes streams after 24 h) reconnects after the base delay.
        delay = base;
        await sleep(delay, signal);
      } catch (err) {
        if (signal.aborted) return;
        this.options.log.warn({ err: (err as Error).message, retryInMs: delay }, "hermes stream failed");
        await sleep(delay, signal);
        delay = Math.min(delay * 2, 30_000);
      }
    }
  }

  private async stream(signal: AbortSignal) {
    const res = await this.fetch(this.url("/v2/updates/price/stream"), { headers: this.headers, signal });
    if (!res.ok) {
      const body = await res.text();
      if (this.dropUnentitled(res.status, body)) return;
      throw new Error(`Hermes stream failed: ${res.status}`);
    }
    if (!res.body) throw new Error("Hermes stream has no body");
    const parser = new SseParser((data) => {
      try {
        for (const tick of parseHermesUpdate(data)) this.options.book.push({ ...tick, source: "pyth" });
      } catch (err) {
        this.options.log.warn({ err: (err as Error).message }, "bad hermes event");
      }
    });
    const decoder = new TextDecoder();
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      parser.push(decoder.decode(chunk, { stream: true }));
    }
  }
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const done = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
    if (signal.aborted) done();
  });
}
