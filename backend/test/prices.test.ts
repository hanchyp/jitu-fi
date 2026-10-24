import { pino } from "pino";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PriceBook, type PriceTick } from "../src/prices/book.js";
import { coinForFeedId, FEED_IDS } from "../src/prices/feeds.js";
import { HermesSource, parseHermesUpdate } from "../src/prices/hermes.js";
import { MockSource } from "../src/prices/mock.js";
import { SseParser } from "../src/prices/sse.js";

const log = pino({ level: "silent" });
const tick = (publishTime: number, price = 100n): PriceTick => ({ coin: "BTC", price, expo: -8, publishTime });

/** A Hermes-shaped update (parsed format from the Hermes v2 API). */
function hermesEvent(coin: keyof typeof FEED_IDS, price: string, publishTime: number) {
  return JSON.stringify({
    binary: { encoding: "hex", data: ["00"] },
    parsed: [{ id: FEED_IDS[coin].slice(2), price: { price, conf: "1", expo: -8, publish_time: publishTime } }],
  });
}

function streamResponse(chunks: string[], status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status });
}

describe("PriceBook", () => {
  it("keeps the latest tick and ignores stale or duplicate ones", () => {
    const book = new PriceBook();
    expect(book.push(tick(10))).toBe(true);
    expect(book.push(tick(10, 999n))).toBe(false);
    expect(book.push(tick(9))).toBe(false);
    expect(book.latest("BTC")!.price).toBe(100n);
  });

  it("fresh() enforces the max age", () => {
    const book = new PriceBook();
    book.push(tick(100));
    expect(book.fresh("BTC", 105, 5)).toBeDefined();
    expect(book.fresh("BTC", 106, 5)).toBeUndefined();
    expect(book.fresh("ETH", 100, 5)).toBeUndefined();
  });

  it("atOrBefore() returns the last good price before a deadline", () => {
    const book = new PriceBook();
    for (const t of [10, 20, 30]) book.push(tick(t, BigInt(t)));
    expect(book.atOrBefore("BTC", 25)!.price).toBe(20n);
    expect(book.atOrBefore("BTC", 30)!.price).toBe(30n);
    expect(book.atOrBefore("BTC", 9)).toBeUndefined();
  });

  it("caps history and notifies listeners", () => {
    const book = new PriceBook(2);
    const seen: number[] = [];
    const off = book.onTick((t) => seen.push(t.publishTime));
    for (const t of [1, 2, 3]) book.push(tick(t));
    off();
    book.push(tick(4));
    expect(seen).toEqual([1, 2, 3]);
    expect(book.atOrBefore("BTC", 1)).toBeUndefined();
  });
});

describe("SseParser", () => {
  it("joins events split across chunks and CRLF lines", () => {
    const events: string[] = [];
    const parser = new SseParser((d) => events.push(d));
    parser.push("data: {\"a\"");
    parser.push(":1}\r\n\r\n: comment\n\ndata:x\n");
    expect(events).toEqual(['{"a":1}']);
    parser.push("\n");
    expect(events).toEqual(['{"a":1}', "x"]);
  });
});

describe("Hermes", () => {
  afterEach(() => vi.useRealTimers());

  it("maps feed ids with or without 0x", () => {
    expect(coinForFeedId(FEED_IDS.MON)).toBe("MON");
    expect(coinForFeedId(FEED_IDS.MON.slice(2).toUpperCase())).toBe("MON");
    expect(coinForFeedId("0xdead")).toBeUndefined();
  });

  it("parses updates and drops non-positive prices", () => {
    expect(parseHermesUpdate(hermesEvent("ETH", "350000000000", 7))).toEqual([
      { coin: "ETH", price: 350_000_000_000n, expo: -8, publishTime: 7 },
    ]);
    expect(parseHermesUpdate(hermesEvent("ETH", "0", 7))).toEqual([]);
  });

  it("streams ticks into the book with a Bearer key", async () => {
    const book = new PriceBook();
    const fetch = vi.fn(async (_url: string | URL | Request, _init?: RequestInit) =>
      streamResponse([`data: ${hermesEvent("BTC", "100", 1)}\n\n`, `data: ${hermesEvent("BTC", "101", 2)}\n\n`]),
    );
    const source = new HermesSource({ baseUrl: "https://h.test/", apiKey: "k", coins: ["BTC"], book, log, fetch });
    const got = new Promise<void>((resolve) => book.onTick((t) => t.publishTime === 2 && resolve()));
    source.start();
    await got;
    source.stop();

    const [url, init] = fetch.mock.calls[0]!;
    expect(String(url)).toBe(`https://h.test/v2/updates/price/stream?ids[]=${FEED_IDS.BTC}&parsed=true`);
    expect((init!.headers as Record<string, string>).Authorization).toBe("Bearer k");
    expect(book.latest("BTC")!.price).toBe(101n);
  });

  it("reconnects after a failed connection", async () => {
    vi.useFakeTimers();
    const book = new PriceBook();
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }))
      .mockImplementation(async () => streamResponse([`data: ${hermesEvent("SOL", "5", 3)}\n\n`]));
    const source = new HermesSource({ baseUrl: "https://h.test", apiKey: "k", coins: ["SOL"], book, log, fetch, reconnectMs: 500 });
    source.start();
    await vi.advanceTimersByTimeAsync(499);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(book.latest("SOL")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(1);
    source.stop();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(book.latest("SOL")?.price).toBe(5n);
  });

  it("fetchLatest() reports auth failures", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("unauthorized", { status: 401 }));
    const source = new HermesSource({ baseUrl: "https://h.test", apiKey: "bad", coins: ["BTC"], book: new PriceBook(), log, fetch });
    await expect(source.fetchLatest()).rejects.toThrow("401 unauthorized");
  });
});

describe("MockSource", () => {
  it("is deterministic for a seed and stays positive", () => {
    const run = () => {
      const book = new PriceBook();
      let now = 0;
      const mock = new MockSource({ coins: ["BTC", "DOGE"], book, seed: 42, nowSeconds: () => ++now });
      for (let i = 0; i < 200; i++) mock.tick();
      return [book.latest("BTC")!, book.latest("DOGE")!];
    };
    const [a, b] = [run(), run()];
    expect(a).toEqual(b);
    expect(a[0]!.price > 0n && a[1]!.price > 0n).toBe(true);
    expect(a[0]!.publishTime).toBe(200); // one clock read per tick, shared by all coins
  });

  it("ticks on an interval once started", () => {
    vi.useFakeTimers();
    const book = new PriceBook();
    let now = 0;
    const mock = new MockSource({ coins: ["ETH"], book, nowSeconds: () => ++now, tickMs: 1_000 });
    mock.start();
    vi.advanceTimersByTime(3_000);
    mock.stop();
    vi.advanceTimersByTime(3_000);
    expect(book.latest("ETH")!.publishTime).toBe(4);
  });
});
