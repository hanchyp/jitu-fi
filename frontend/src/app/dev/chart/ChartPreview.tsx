"use client";

import { useEffect, useState } from "react";
import { PriceChart, type Side } from "@/components/chart/PriceChart";
import { Sparkline } from "@/components/chart/Sparkline";
import { formatBps, formatPrice, returnBps } from "@/components/chart/format";
import { randomWalk, useRandomWalks } from "@/components/chart/randomWalk";
import { TABLE_COINS, coinDataUrl } from "@/lib/coins";

const SYMBOLS = TABLE_COINS.map((c) => c.symbol);
const HISTORY = 120;
const SPARK_POINTS = 40;
// Fixed entries from the deterministic history, so the line holds still while prices move.
const historicEntry = (symbol: string, back: number) => randomWalk(symbol, { steps: HISTORY })[HISTORY - back].price;
const SOL_ENTRY = historicEntry("SOL", 20);

type Round = { entry: number; liveUntil: number };

// A fake live round: entry at the given price, live for a random 60–120 s.
function newRound(entry: number): Round {
  return { entry, liveUntil: Date.now() + (60 + Math.floor(Math.random() * 61)) * 1_000 };
}

export function ChartPreview() {
  const series = useRandomWalks(SYMBOLS, { history: HISTORY });
  const [symbol, setSymbol] = useState("BTC");
  const [side, setSide] = useState<Side | undefined>("Buy");
  const [showEntry, setShowEntry] = useState(true);
  const [round, setRound] = useState<Round | null>(null);
  const points = series[symbol];

  const startRound = (sym = symbol) => {
    const pts = series[sym];
    setRound(newRound(pts[pts.length - 1].price));
  };
  const pick = (sym: string) => {
    setSymbol(sym);
    startRound(sym);
  };

  // Start the first round after mount, once timestamps are on the wall clock.
  useEffect(() => {
    const id = setTimeout(() => {
      const round = newRound(historicEntry("BTC", 1));
      setRound((r) => r ?? round);
    }, 1_100);
    return () => clearTimeout(id);
  }, []);

  // Before the first round, show an entry from the deterministic history.
  const entry = round?.entry ?? historicEntry(symbol, 30);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emas">Dev preview</p>
      <h1 className="title-outline font-display text-3xl text-gading sm:text-4xl">Price chart</h1>
      <p className="mt-1 text-sm text-white/70">Seeded random-walk dummy prices, one tick per second. Tap a coin to chart it.</p>

      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TABLE_COINS.map((coin) => {
          const pts = series[coin.symbol];
          const spark = pts.slice(-SPARK_POINTS);
          const bps = returnBps(spark[0].price, spark[spark.length - 1].price);
          const active = coin.symbol === symbol;
          return (
            <li key={coin.symbol}>
              <button
                type="button"
                onClick={() => pick(coin.symbol)}
                aria-pressed={active}
                className={`w-full rounded-xl border-[3px] p-3 text-left transition-colors ${
                  active ? "border-emas bg-papan-terang" : "border-garis bg-papan hover:bg-papan-terang"
                }`}
              >
                <div className="flex items-center gap-2">
                  {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL */}
                  <img src={coinDataUrl(coin)} alt="" className="size-6 rounded-full border-2 border-garis" />
                  <span className="font-display text-gading">{coin.symbol}</span>
                  <span className={`ml-auto text-xs font-extrabold tabular-nums ${bps >= 0 ? "text-naik" : "text-turun"}`}>
                    {formatBps(bps)}
                  </span>
                </div>
                <div className="mt-2 flex items-end justify-between gap-2">
                  <span className="text-sm font-bold tabular-nums text-white">{formatPrice(spark[spark.length - 1].price)}</span>
                  <Sparkline points={spark} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-bold">
        {(["Buy", "Sell", undefined] as const).map((s) => (
          <button
            key={s ?? "none"}
            type="button"
            onClick={() => setSide(s)}
            aria-pressed={side === s}
            className={`rounded-lg border-2 border-garis px-3 py-1 ${
              side === s ? (s === "Buy" ? "bg-naik text-garis" : s === "Sell" ? "bg-turun text-garis" : "bg-gading text-garis") : "bg-papan text-white"
            }`}
          >
            {s ?? "No side"}
          </button>
        ))}
        <label className="ml-1 inline-flex items-center gap-2 text-white/80">
          <input type="checkbox" checked={showEntry} onChange={(e) => setShowEntry(e.target.checked)} className="accent-emas" />
          Entry line
        </label>
        <button type="button" onClick={() => startRound()} className="ml-auto rounded-lg border-2 border-garis bg-emas px-3 py-1 text-garis">
          Restart round
        </button>
      </div>

      <PriceChart
        className="mt-3"
        symbol={symbol}
        points={points}
        entryPrice={showEntry ? entry : undefined}
        side={side}
        liveUntil={round?.liveUntil}
      />

      <h2 className="mt-10 font-display text-xl text-gading">At 375 px</h2>
      <div className="mt-3 w-full max-w-[343px]">
        <PriceChart symbol="SOL" points={series.SOL} side="Sell" entryPrice={SOL_ENTRY} />
      </div>
    </main>
  );
}
