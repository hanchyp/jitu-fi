"use client";

import type { Dispatch } from "react";
import { coinDataUrl } from "@/lib/coins";
import { COINS } from "@/mocks/table";
import { coinMove, liveProgress, price, marketMove, marketPrice, usingLivePrices, type DemoAction, type DemoState } from "./demo-engine";
import styles from "./game-styles";

export function CoinBoard({ state, dispatch }: { state: DemoState; dispatch: Dispatch<DemoAction> }) {
  const editable = state.phase === "commit" && !state.locked && !state.lockingUntil;
  return <section aria-labelledby="coin-board-title">
    <div className={styles.sectionTitle}><h2 id="coin-board-title" className={styles.heading}>{editable ? "Draft your coins" : "The coin board"}</h2><span className={styles.small}>8 coins · {usingLivePrices(state) ? "Live prices" : "Simulated prices"}</span></div>
    <div className={styles.coinGrid}>
      {COINS.map((coin) => {
        const pick = state.picks.find((pick) => pick.symbol === coin.symbol);
        const move = usingLivePrices(state) ? marketMove(state, coin.symbol) : coinMove(coin.symbol, state.round, liveProgress(state), state.scenario);
        const values = usingLivePrices(state) ? (state.feed!.history[coin.symbol] ?? []).map((sample) => Number(sample.price) * 10 ** sample.expo) : [...coin.history, 30 + move * .4];
        const min = Math.min(...values) - 2;
        const max = Math.max(...values) + 2;
        const points = values.map((value, index) => `${index * 100 / Math.max(1, values.length - 1)},${27 - (value - min) / (max - min) * 24}`).join(" ");
        return <article key={coin.symbol} className={styles.coin} data-selected={Boolean(pick)}>
          <button className={styles.coinSelect} disabled={!editable} aria-label={`${pick ? "Remove" : "Select"} ${coin.symbol}`} aria-pressed={Boolean(pick)} onClick={() => dispatch({ type: "select", symbol: coin.symbol })}>
            <span className={styles.coinTitle}>
              {/* Official inline token artwork, no image optimizer needed. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={coinDataUrl(coin)} alt="" width={26} height={26} className={styles.coinLogo} />
              {coin.symbol}<span className={styles.coinCheck} aria-hidden="true">{pick ? "✓" : "+"}</span>
            </span>
            <span className={styles.coinPrice}>{usingLivePrices(state) ? marketPrice(state, coin.symbol) : price(Math.round(coin.priceMicros * (1 + move / 10_000)))}</span>
            <svg viewBox="0 0 100 30" preserveAspectRatio="none" className={styles.sparkline} aria-hidden="true"><polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" /></svg>
          </button>
          {pick && <div className={styles.directions} role="group" aria-label={`${coin.symbol} direction`}>{(["Buy", "Sell"] as const).map((direction) => <button key={direction} data-direction={direction} aria-pressed={pick.direction === direction} disabled={!editable} onClick={() => dispatch({ type: "direction", symbol: coin.symbol, direction })}>{direction}</button>)}</div>}
        </article>;
      })}
    </div>
  </section>;
}
