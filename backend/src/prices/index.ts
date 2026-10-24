import { requireConfig, type Config } from "../config.js";
import type { Logger } from "../logger.js";
import { PriceBook, type PriceSource } from "./book.js";
import { COINS } from "./feeds.js";
import { HermesSource } from "./hermes.js";
import { MockSource } from "./mock.js";

export { LIVE_SKILL_MAX_AGE_SECONDS, PriceBook, type PriceSource, type PriceTick } from "./book.js";
export { COINS, FEED_IDS, type CoinSymbol } from "./feeds.js";

export function createPriceSource(config: Config, log: Logger): { book: PriceBook; source: PriceSource } {
  const book = new PriceBook();
  if (config.PRICE_SOURCE === "mock") return { book, source: new MockSource({ coins: COINS, book }) };
  const source = new HermesSource({
    baseUrl: config.PYTH_HERMES_URL,
    apiKey: requireConfig(config, "PYTH_API_KEY"),
    coins: COINS,
    book,
    log: log.child({ module: "prices" }),
  });
  return { book, source };
}
