// Official token logos from @web3icons/core (MIT), "background" variant: logo on its brand color.
import AVAX from "@web3icons/core/svgs/tokens/background/AVAX.svg.js";
import BNB from "@web3icons/core/svgs/tokens/background/BNB.svg.js";
import BTC from "@web3icons/core/svgs/tokens/background/BTC.svg.js";
import DOGE from "@web3icons/core/svgs/tokens/background/DOGE.svg.js";
import ETH from "@web3icons/core/svgs/tokens/background/ETH.svg.js";
import SOL from "@web3icons/core/svgs/tokens/background/SOL.svg.js";
import XRP from "@web3icons/core/svgs/tokens/background/XRP.svg.js";
import MON from "@web3icons/core/svgs/networks/background/monad.svg.js";

export type Coin = { symbol: string; name: string; svg: string; rim: string };

export const COIN = {
  BTC: { symbol: "BTC", name: "Bitcoin", svg: BTC, rim: "#F7931A" },
  ETH: { symbol: "ETH", name: "Ethereum", svg: ETH, rim: "#627EEA" },
  SOL: { symbol: "SOL", name: "Solana", svg: SOL, rim: "#9945FF" },
  DOGE: { symbol: "DOGE", name: "Dogecoin", svg: DOGE, rim: "#C2A633" },
  BNB: { symbol: "BNB", name: "BNB", svg: BNB, rim: "#F3BA2F" },
  XRP: { symbol: "XRP", name: "XRP", svg: XRP, rim: "#23292F" },
  AVAX: { symbol: "AVAX", name: "Avalanche", svg: AVAX, rim: "#E84142" },
  MON: { symbol: "MON", name: "Monad", svg: MON, rim: "#836EF9" },
} as const satisfies Record<string, Coin>;

/** Coins orbiting the 3D arena crystal. */
export const ARENA_COINS: Coin[] = [COIN.BTC, COIN.ETH, COIN.SOL, COIN.DOGE, COIN.BNB, COIN.MON];

/** The 8 coins dealt onto an example table in the tutorial. */
export const TABLE_COINS: Coin[] = [
  COIN.BTC, COIN.ETH, COIN.SOL, COIN.DOGE, COIN.BNB, COIN.XRP, COIN.AVAX, COIN.MON,
];

export function coinDataUrl(coin: Coin) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(coin.svg)}`;
}
