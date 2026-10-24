import { afterEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../logger.js";
import { PriceBook } from "./book.js";
import { CoinGeckoSource, decimalToPrice } from "./coingecko.js";
import { FEED_IDS } from "./feeds.js";
import { HermesSource } from "./hermes.js";
import { HybridSource } from "./hybrid.js";

const log = createLogger("silent");
const denied = (coin: "AVAX" | "MON") => new Response(`Not entitled: feed ${FEED_IDS[coin].slice(2)} (no grant)`, { status: 403 });
afterEach(() => vi.useRealTimers());

describe("hybrid prices", () => {
  it("scales decimal and scientific USD values exactly", () => {
    expect(decimalToPrice("80758.12345678")).toBe(8075812345678n);
    expect(decimalToPrice("0.02120816")).toBe(2120816n);
    expect(decimalToPrice("1e-7")).toBe(10n);
    expect(decimalToPrice("1.234567899e2")).toBe(12345678990n);
    expect(decimalToPrice("0.000000009")).toBe(0n);
    expect(() => decimalToPrice("NaN")).toThrow();
  });

  it("drops successive rejected feeds from latest requests, warning once", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(denied("AVAX")).mockResolvedValueOnce(denied("MON")).mockResolvedValueOnce(new Response('{"parsed":[]}'));
    const warn = vi.spyOn(log, "warn");
    const source = new HermesSource({ baseUrl: "https://example.test", apiKey: "test", coins: ["BTC", "AVAX", "MON"], book: new PriceBook(), log, fetch: fetcher });
    await source.fetchLatest();
    expect([...source.unentitled]).toEqual(["AVAX", "MON"]);
    expect(fetcher.mock.calls[1]![0]).not.toContain(FEED_IDS.AVAX);
    expect(fetcher.mock.calls[2]![0]).not.toContain(FEED_IDS.MON);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });

  it("does not drop feeds for unrelated errors", async () => {
    const source = new HermesSource({ baseUrl: "https://example.test", apiKey: "test", coins: ["AVAX"], book: new PriceBook(), log, fetch: vi.fn<typeof fetch>().mockResolvedValue(new Response("Forbidden", { status: 403 })) });
    await expect(source.fetchLatest()).rejects.toThrow("403");
    expect(source.unentitled.size).toBe(0);
  });

  it("preserves number lexemes, re-stamps last good prices and backs off", async () => {
    vi.useFakeTimers();
    let now = 100;
    const book = new PriceBook();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValueOnce(new Response('{"bitcoin":{"usd":80758.123456789999999},"monad":{"usd":1e-7}}')).mockResolvedValueOnce(new Response("", { status: 429 })).mockResolvedValueOnce(new Response("", { status: 503 })).mockResolvedValueOnce(new Response('{"bitcoin":{"usd":2}}'));
    const source = new CoinGeckoSource({ coins: new Set(["BTC", "MON"]), book, log, fetch: fetcher, nowSeconds: () => now });
    source.start();
    await vi.advanceTimersByTimeAsync(0);
    expect(book.latest("BTC")?.price).toBe(8075812345678n);
    expect(book.latest("MON")?.price).toBe(10n);
    now++;
    await vi.advanceTimersByTimeAsync(1000);
    expect(book.latest("BTC")?.publishTime).toBe(101);
    expect(await source.poll()).toBe(20_000);
    expect(await source.poll()).toBe(40_000);
    expect(book.latest("BTC")?.price).toBe(8075812345678n);
    now++;
    expect(await source.poll()).toBe(10_000);
    expect(book.latest("BTC")?.price).toBe(200000000n);
    source.stop();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("reconnects stream without rejected coin and falls back for missing coins", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(100_000);
    const book = new PriceBook();
    const fetcher = vi.fn<typeof fetch>(async (url) => {
      const value = String(url);
      if (value.includes("coingecko")) return new Response('{"monad":{"usd":0.02120816},"avalanche-2":{"usd":25}}');
      if (value.includes(FEED_IDS.AVAX)) return denied("AVAX");
      return new Response(new ReadableStream({ start(controller) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ parsed: [{ id: FEED_IDS.BTC, price: { price: "8000000000000", expo: -8, publish_time: 100 } }] })}\n\n`));
        controller.close();
      } }));
    });
    const source = new HybridSource({ baseUrl: "https://example.test", apiKey: "test", coins: ["BTC", "AVAX", "MON"], book, log, fetch: fetcher, reconnectMs: 1000, pollMs: 1000 });
    source.start();
    await vi.advanceTimersByTimeAsync(2000);
    expect(book.latest("BTC")?.source).toBe("pyth");
    expect(book.latest("AVAX")?.source).toBe("coingecko");
    expect(book.latest("MON")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(14_000);
    expect(book.latest("MON")?.source).toBe("coingecko");
    expect(book.latest("MON")?.price).toBe(2120816n);
    expect(fetcher.mock.calls.filter(([url]) => String(url).includes("example.test")).slice(1).every(([url]) => !String(url).includes(FEED_IDS.AVAX))).toBe(true);
    source.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
