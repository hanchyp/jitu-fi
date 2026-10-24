// Official Pyth feed IDs (Crypto.<X>/USD), read from the Hermes /v2/price_feeds API on 2026-10-24.
export const COINS = ["BTC", "ETH", "SOL", "DOGE", "BNB", "XRP", "AVAX", "MON"] as const;
export type CoinSymbol = (typeof COINS)[number];

export const FEED_IDS: Record<CoinSymbol, `0x${string}`> = {
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  ETH: "0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace",
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  DOGE: "0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c",
  BNB: "0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f",
  XRP: "0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8",
  AVAX: "0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7",
  MON: "0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1",
};

const COIN_BY_FEED = new Map(Object.entries(FEED_IDS).map(([coin, id]) => [id.slice(2).toLowerCase(), coin as CoinSymbol]));

/** Hermes returns ids without the 0x prefix; accepts either form. */
export function coinForFeedId(id: string): CoinSymbol | undefined {
  return COIN_BY_FEED.get(id.replace(/^0x/, "").toLowerCase());
}
