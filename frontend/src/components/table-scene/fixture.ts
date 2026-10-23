// Dummy round for previewing <TableScene>: you plus the three house bots, and a client-side
// random-walk price ticker. Only the dev preview uses this; the table page feeds its own data.

import { useEffect, useMemo, useState } from "react";
import { HOUSE_BOTS } from "@/lib/bots";
import { PLAYER_COLORS, rng } from "@/components/world/toon";
import { isVoid, signedBps } from "./model";
import type { CoinSymbol, PriceSeries, ScenePick, ScenePlayer, SkillEffect, TablePhase } from "./types";

const CAP = 3;
const TICK_MS = 500;
const MAX_POINTS = 240;
/** Ticks already played when the preview opens straight into Live or Result. */
const PLAYED = { commit: 0, reveal: 0, live: 50, result: 140 } as const satisfies Record<TablePhase, number>;

// Open price and per-tick volatility in bps. XRP stays flat so the void look is always on show.
const MARKET: Partial<Record<CoinSymbol, { open: number; vol: number }>> = {
  BTC: { open: 67_250, vol: 1.6 },
  ETH: { open: 3_480, vol: 2.2 },
  SOL: { open: 152.4, vol: 3 },
  DOGE: { open: 0.1612, vol: 3.6 },
  BNB: { open: 585, vol: 1.8 },
  XRP: { open: 0.52, vol: 0 },
  AVAX: { open: 27.1, vol: 3.2 },
  MON: { open: 0.42, vol: 4 },
};

export type FixturePick = Pick<ScenePick, "symbol" | "side" | "effect" | "effectBy" | "swappedFrom"> & {
  /** LOCK or FREEZE: the coin's raw return when the skill landed. The pick stops following the price. */
  heldBps?: number;
};

export type FixtureSeat = { id: string; name: string; color: string; isYou?: boolean; forfeit?: boolean; picks: FixturePick[] };

const bot = (short: string) => HOUSE_BOTS.find((b) => b.short === short)!;

const seed = (symbol: CoinSymbol, side: ScenePick["side"], effect?: SkillEffect): FixturePick => ({ symbol, side, effect });

export const FIXTURE_SEATS: FixtureSeat[] = [
  { id: "you", name: "You", color: PLAYER_COLORS[0], isYou: true, picks: [seed("ETH", "Buy", "BOOST"), seed("SOL", "Sell"), seed("MON", "Buy")] },
  { id: "bruno", name: "Bruno", color: bot("Bruno").color, picks: [seed("BTC", "Buy"), seed("DOGE", "Buy", "INSURANCE")] },
  { id: "bera", name: "Bera", color: bot("Bera").color, picks: [seed("XRP", "Sell"), seed("ETH", "Sell")] },
  { id: "dex", name: "Dex", color: bot("Dex").color, picks: [seed("AVAX", "Buy"), seed("BNB", "Sell"), seed("DOGE", "Sell")] },
];

/** Every board coin ticks, so a SWAP can move to any of them. */
export const FIXTURE_COINS = Object.keys(MARKET) as CoinSymbol[];
const SYMBOLS = FIXTURE_COINS;

function step(price: number, vol: number, rand: () => number) {
  // Sum of uniforms: a cheap bell curve with unit variance.
  const n = (rand() + rand() + rand() - 1.5) * 2;
  return price * (1 + (vol * n) / 10_000);
}

function initialPrices(phase: TablePhase): PriceSeries {
  const rand = rng(17);
  const out: PriceSeries = {};
  for (const sym of SYMBOLS) {
    const { open, vol } = MARKET[sym]!;
    const series = [open];
    for (let i = 0; i < PLAYED[phase]; i++) series.push(step(series[series.length - 1], vol, rand));
    out[sym] = series;
  }
  return out;
}

/** The coin's raw return since the round opened, in bps (one decimal). */
export function returnBps(series: readonly number[] | undefined) {
  if (!series || series.length < 2) return 0;
  return Math.round((series[series.length - 1] / series[0] - 1) * 100_000) / 10;
}

// Dummy round score: cap × weighted average signed return of the non-void picks. BOOST doubles
// a pick's weight, INSURANCE floors it at 0. The real formula lives in packages/shared later.
function roundScore(picks: ScenePick[]) {
  let sum = 0;
  let weight = 0;
  for (const p of picks) {
    if (isVoid(p)) continue;
    const w = p.effect === "BOOST" ? 2 : 1;
    const r = p.effect === "INSURANCE" ? Math.max(0, signedBps(p)) : signedBps(p);
    sum += w * r;
    weight += w;
  }
  return weight ? Math.round((CAP * sum) / weight) : 0;
}

/**
 * The fixture round at `phase`, for `seats` (default FIXTURE_SEATS). During Live every price takes a
 * random-walk step each tick. Remount (change `key`) to restart the round.
 */
export function useFixtureTable(phase: TablePhase, seats: readonly FixtureSeat[] = FIXTURE_SEATS) {
  const [prices, setPrices] = useState(() => initialPrices(phase));

  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => {
      setPrices((prev) => {
        const next: PriceSeries = {};
        for (const sym of SYMBOLS) {
          const series = prev[sym] ?? [MARKET[sym]!.open];
          const p = step(series[series.length - 1], MARKET[sym]!.vol, Math.random);
          next[sym] = [...series, p].slice(-MAX_POINTS);
        }
        return next;
      });
    }, TICK_MS);
    return () => clearInterval(id);
  }, [phase]);

  return useMemo(() => {
    const players: ScenePlayer[] = seats.map(({ picks, ...seat }) => {
      const scenePicks = picks.map(({ heldBps, ...pick }): ScenePick => {
        const r = heldBps ?? returnBps(prices[pick.symbol]);
        return { ...pick, returnBps: r, void: Math.abs(r) < 1 };
      });
      // A forfeit scores 0 and cannot win the round (DECISIONS.md).
      return { ...seat, picks: scenePicks, score: seat.forfeit ? 0 : roundScore(scenePicks) };
    });
    const best = Math.max(...players.filter((p) => !p.forfeit).map((p) => p.score ?? 0));
    const winnerIds = players.filter((p) => !p.forfeit && p.score === best).map((p) => p.id);
    return { players, prices, winnerIds };
  }, [prices, seats]);
}
