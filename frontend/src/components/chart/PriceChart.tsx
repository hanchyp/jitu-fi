"use client";

import { useEffect, useId, useState } from "react";
import { COIN, coinDataUrl } from "@/lib/coins";
import { formatBps as formatBpsPercent } from "@/lib/format";
import { formatBps, formatPrice, returnBps } from "./format";
import type { PricePoint } from "./randomWalk";

export type Side = "Buy" | "Sell";

type Props = {
  symbol: string;
  points: PricePoint[];
  /** Draws a dashed entry line; the change is then measured from it. */
  entryPrice?: number;
  /** The player's pick. Shows a side chip and the side-adjusted return. */
  side?: Side;
  /** End of the live phase (ms). The x axis reaches it, and a countdown shows until then. */
  liveUntil?: number;
  className?: string;
};

/** Moves under 1 bps are void (DECISIONS.md). */
const VOID_BPS = 1;

// Wall clock for the countdown, null until mounted so server and client render the same.
function useNow(enabled: boolean) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 250);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [enabled]);
  return now;
}

/** Line/area price chart for one coin, with entry line, live countdown and return in bps. */
export function PriceChart({ symbol, points, entryPrice, side, liveUntil, className = "" }: Props) {
  const gradientId = useId();
  const now = useNow(liveUntil !== undefined);
  const coin = COIN[symbol as keyof typeof COIN];

  const last = points[points.length - 1];
  const first = points[0];
  const reference = entryPrice ?? first?.price;
  const moveBps = last && reference ? returnBps(reference, last.price) : 0;
  const up = moveBps >= 0;
  const color = up ? "var(--color-naik)" : "var(--color-turun)";
  const pickBps = side === "Sell" ? -moveBps : moveBps;
  const isVoid = Math.abs(moveBps) < VOID_BPS;

  const secondsLeft = liveUntil !== undefined && now !== null ? Math.max(0, Math.ceil((liveUntil - now) / 1_000)) : null;
  const live = secondsLeft !== null && secondsLeft > 0;

  // Plot in a 100×100 box stretched to the panel; overlays use the same percentages.
  let line = "";
  let dot: { x: number; y: number } | null = null;
  let entryY: number | null = null;
  let hi = 0;
  let lo = 0;
  if (points.length >= 2) {
    hi = -Infinity;
    lo = Infinity;
    for (const p of points) {
      hi = Math.max(hi, p.price);
      lo = Math.min(lo, p.price);
    }
    if (entryPrice !== undefined) {
      hi = Math.max(hi, entryPrice);
      lo = Math.min(lo, entryPrice);
    }
    const pad = (hi - lo || hi * 0.001 || 1) * 0.12;
    const top = hi + pad;
    const bottom = lo - pad;
    const t0 = first.t;
    const t1 = Math.max(last.t, liveUntil ?? last.t);
    const xOf = (t: number) => (t1 === t0 ? 100 : ((t - t0) / (t1 - t0)) * 100);
    const yOf = (price: number) => ((top - price) / (top - bottom)) * 100;
    line = points.map((p, i) => `${i ? "L" : "M"}${xOf(p.t).toFixed(3)} ${yOf(p.price).toFixed(3)}`).join("");
    dot = { x: xOf(last.t), y: yOf(last.price) };
    if (entryPrice !== undefined) entryY = yOf(entryPrice);
  }

  const summary = last
    ? `${symbol} price ${formatPrice(last.price)}, ${formatBps(moveBps)} ${entryPrice !== undefined ? "since entry" : "in view"}`
    : `${symbol} price chart, waiting for prices`;

  return (
    <section className={`rounded-2xl border-[3px] border-garis bg-dasar shadow-[0_5px_0_0_#040B10] ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 px-4 pt-3 sm:px-5 sm:pt-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {coin && (
              // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL
              <img src={coinDataUrl(coin)} alt="" className="size-6 rounded-full border-2 border-garis" />
            )}
            <span className="font-display text-lg text-gading">{symbol}</span>
            {side && (
              <span
                className={`rounded-md border-2 border-garis px-1.5 text-xs font-extrabold uppercase tracking-wide text-garis ${
                  side === "Buy" ? "bg-naik" : "bg-turun"
                }`}
              >
                {side}
              </span>
            )}
          </div>
          <p className="mt-1 font-display text-2xl tabular-nums text-white sm:text-3xl">
            {last ? formatPrice(last.price) : "—"}
          </p>
          <p className="text-sm font-bold tabular-nums" style={{ color }}>
            {formatBps(moveBps)} <span className="text-white/55">·</span> {formatBpsPercent(Math.round(moveBps))}
            <span className="ml-1.5 font-semibold text-white/55">{entryPrice !== undefined ? "since entry" : "in view"}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-1 text-right">
          {liveUntil !== undefined && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border-2 border-garis px-2 py-0.5 text-xs font-extrabold tabular-nums ${
                live ? "bg-malam text-white" : "bg-papan text-white/70"
              }`}
            >
              {live && <span className="size-2 rounded-full bg-naik motion-safe:animate-pulse" aria-hidden />}
              {secondsLeft === null ? "Live" : live ? `Live ${secondsLeft}s` : "Settled"}
            </span>
          )}
          {side && entryPrice !== undefined && (
            <div className="text-xs font-bold text-white/70">
              Your return{" "}
              {isVoid ? (
                <span className="text-white/55">void (&lt;1 bps)</span>
              ) : (
                <span className="tabular-nums" style={{ color: pickBps >= 0 ? "var(--color-naik)" : "var(--color-turun)" }}>
                  {formatBps(pickBps)}
                </span>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="relative mx-3 mb-3 mt-2 h-44 sm:mx-4 sm:mb-4 sm:h-60" role="img" aria-label={summary}>
        {/* Grid */}
        <div className="absolute inset-0 rounded-lg border border-white/10" aria-hidden>
          {[25, 50, 75].map((y) => (
            <div key={y} className="absolute inset-x-0 border-t border-white/[0.06]" style={{ top: `${y}%` }} />
          ))}
        </div>

        {line ? (
          <>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={color} stopOpacity="0.32" />
                  <stop offset="1" stopColor={color} stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d={`${line}L${dot!.x.toFixed(3)} 100L0 100Z`} fill={`url(#${gradientId})`} />
              <path
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {entryY !== null && (
              <div className="pointer-events-none absolute inset-x-0" style={{ top: `${entryY}%` }} aria-hidden>
                <div className="border-t-2 border-dashed border-gading/70" />
                <span className="absolute left-1 -translate-y-1/2 rounded-md border-2 border-garis bg-gading px-1.5 text-[11px] font-extrabold tabular-nums text-garis">
                  Entry {formatPrice(entryPrice!)}
                </span>
              </div>
            )}

            <span className="absolute right-1 top-1 text-[11px] font-bold tabular-nums text-white/55" aria-hidden>
              {formatPrice(hi)}
            </span>
            <span className="absolute bottom-1 right-1 text-[11px] font-bold tabular-nums text-white/55" aria-hidden>
              {formatPrice(lo)}
            </span>

            <span
              className="absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-garis"
              style={{ left: `${dot!.x}%`, top: `${dot!.y}%`, background: color }}
              aria-hidden
            >
              {live && <span className="absolute inset-0 rounded-full motion-safe:animate-ping" style={{ background: color }} />}
            </span>
          </>
        ) : (
          <p className="absolute inset-0 grid place-items-center text-sm font-bold text-white/55">Waiting for prices…</p>
        )}
      </div>
    </section>
  );
}
