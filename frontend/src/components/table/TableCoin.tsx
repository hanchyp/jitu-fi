"use client";

import { coinDataUrl } from "@/lib/coins";
import { COINS } from "@/mocks/table";
import { marketPrice, type DemoState } from "./demo-engine";
import { CoinToken3D } from "./CoinToken3D";

// The central token stays on the table when a copy is dealt into a seat's hand.
export function TableCoin({ state, onInspect, symbol }: { state: DemoState; onInspect: (symbol: string) => void; symbol: string }) {
  const coin = COINS.find((coin) => coin.symbol === symbol)!;
  const pick = state.picks.find((pick) => pick.symbol === symbol);
  return <div className="jitu-table-coin" data-selected={Boolean(pick)} data-direction={pick?.direction}>
    <button type="button" className="jitu-table-token" data-market-coin={symbol} aria-label={`View ${symbol} chart${pick ? `, picked ${pick.direction}` : ""}`} aria-haspopup="dialog" onClick={() => onInspect(symbol)}>
      <CoinToken3D symbol={symbol} frontSrc={coinDataUrl(coin)} />
      <strong>{symbol}{pick && <span aria-hidden="true"> ✓</span>}</strong>
      <span>{marketPrice(state, symbol)}</span>
      {pick && <span className="jitu-table-call" data-direction={pick.direction}>{pick.direction}</span>}
    </button>
  </div>;
}
