import { HOUSE_BOTS } from "@/lib/bots";
import type { ServerPrice, ServerTableState, ServerTick } from "./server-types";
import type { CoinSymbol, ScenePlayer, TablePhase, TableSceneProps } from "./types";

const PHASE: Record<ServerTableState["phase"], TablePhase> = {
  Commit: "commit", Reveal: "reveal", Live: "live", Settled: "result", Finished: "result",
};
const IDS = ["you", "bruno", "bera", "dex"];
const ZERO = BigInt(0);
const BPS = BigInt(10_000);

// @jitu-fi/shared is not installed in frontend. Mirror scoring.ts's truncated segment math.
// Normalize exponents before division; Number is used only after integer bps are computed.
function move(start: ServerPrice | undefined, end: ServerPrice | undefined): bigint {
  if (!start || !end || BigInt(start.price) <= ZERO) return ZERO;
  const expo = Math.min(start.expo, end.expo);
  const a = BigInt(start.price) * BigInt(10) ** BigInt(start.expo - expo);
  const b = BigInt(end.price) * BigInt(10) ** BigInt(end.expo - expo);
  return ((b - a) * BPS) / a;
}

export type ServerSceneOptions = {
  /** Current round's received price history, oldest first (WebSocket prices.ticks). */
  ticks?: readonly ServerTick[];
};

export function fromTableState(state: ServerTableState, opts: ServerSceneOptions = {}): TableSceneProps {
  const round = state.rounds.find((r) => r.n === state.round);
  const settled = state.phase === "Settled" || state.phase === "Finished";
  const moving = state.phase === "Live" || settled;
  const ticks = (opts.ticks ?? []).filter((tick) =>
    (!round?.liveStartMs || tick.publishTime * 1000 >= round.liveStartMs) &&
    (!round?.liveEndMs || tick.publishTime * 1000 <= round.liveEndMs));
  const latest = Object.fromEntries(ticks.map((tick) => [tick.coin, tick]));
  const end = (coin: string) => settled
    ? round?.endPrices?.[coin] ?? round?.startPrices?.[coin]
    : latest[coin] ?? round?.startPrices?.[coin];

  const players: ScenePlayer[] = IDS.map((id, seat) => {
    const bot = HOUSE_BOTS[seat - 1];
    const result = round?.results?.find((r) => r.seat === seat);
    const picks = round?.picks[seat] ?? [];
    return {
      id, name: seat === 0 ? "You" : bot.short,
      color: seat === 0 ? "#DAAE4B" : bot.color, isYou: seat === 0,
      forfeit: state.phase !== "Commit" && (result?.forfeit ?? picks.length === 0),
      score: state.phase === "Finished" ? state.gameScores?.[seat] : settled ? result?.score : undefined,
      picks: (state.phase === "Commit" && seat !== 0 ? [] : picks).map((pick, index) => {
        const used = round?.skills.find((s) => s.targetSeat === seat && s.targetCoin === pick.coin);
        const start = round?.startPrices?.[pick.coin];
        const cast = start && used ? { ...start, price: used.price } : undefined;
        let raw = moving ? move(start, end(pick.coin)) : ZERO;
        if (moving && used) {
          const first = move(start, cast);
          if (used.skill === "FLIP") raw = first - move(cast, end(pick.coin));
          else if (used.skill === "SWAP") {
            const swapStart = round?.startPrices?.[used.swapTo!];
            const swapOpen = swapStart && { ...swapStart, price: used.swapPrice! };
            const swapEnd = settled ? round?.endPrices?.[used.swapTo!] : latest[used.swapTo!];
            raw = first + move(swapOpen, swapEnd ?? swapOpen);
          } else raw = first;
        }
        // Authoritative raw is side-adjusted. Scene applies the side itself.
        const recorded = settled ? result?.picks[index] : undefined;
        const returnBps = recorded ? recorded.raw * (pick.side === "Buy" ? 1 : -1) : Number(raw);
        return {
          symbol: (used?.skill === "SWAP" ? used.swapTo : pick.coin) as CoinSymbol,
          side: pick.side, returnBps,
          void: moving && (recorded?.void ?? raw === ZERO),
          effect: used?.skill ?? (pick.boosted ? "BOOST" : pick.insured ? "INSURANCE" : undefined),
          effectBy: used && used.seat !== seat ? (used.seat === 0 ? "You" : HOUSE_BOTS[used.seat - 1]?.short) : undefined,
          swappedFrom: used?.skill === "SWAP" ? pick.coin as CoinSymbol : undefined,
        };
      }),
    };
  });
  let winnerIds: string[] | undefined;
  if (settled) {
    if (state.phase === "Finished" && state.gameScores) {
      const best = Math.max(...state.gameScores);
      winnerIds = IDS.filter((_, seat) => state.gameScores![seat] === best);
    } else {
      const eligible = round?.results?.filter((r) => !r.forfeit) ?? [];
      const best = Math.max(...eligible.map((r) => r.score));
      const winners = round?.winners ?? eligible.filter((r) => r.score === best).map((r) => r.seat);
      winnerIds = winners.filter((seat) => !players[seat]?.forfeit).map((seat) => IDS[seat]);
    }
  }
  const prices: TableSceneProps["prices"] = {};
  for (const symbol of new Set(players.flatMap((p) => p.picks.map((pick) => pick.symbol)))) {
    const start = round?.startPrices?.[symbol];
    if (!start) continue;
    const points: ServerPrice[] = [start];
    if (moving) points.push(...ticks.filter((tick) => tick.coin === symbol));
    const close = moving ? end(symbol) : start;
    if (close) points.push(close);
    // Floats are rendering coordinates only, never scoring inputs.
    prices[symbol] = points.map((point) => Number(point.price) * 10 ** point.expo);
  }
  return { players, prices, phase: PHASE[state.phase], winnerIds, celebrate: state.phase === "Finished" };
}
