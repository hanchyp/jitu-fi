// Maps Jeki's demo table state (components/table/demo-engine) to <TableScene> props, so the
// 3D scene and the 2D table draw the same game. Pure: no timers, no React.

import { COINS, PLAYERS, type Phase } from "@/mocks/table";
import { coinMove, gameScores, liveProgress, playerPicks, pickReturn, pickIsVoid, roundResult, type DemoState } from "@/components/table/demo-engine";
import type { CoinSymbol, PriceSeries, ScenePlayer, TablePhase, TableSceneProps } from "./types";

const PHASE: Record<Phase, TablePhase> = { commit: "commit", reveal: "reveal", live: "live", results: "result", finished: "result" };
/** Price points per ridge, open price included. */
const SAMPLES = 33;

export type DemoSceneProps = Pick<TableSceneProps, "players" | "prices" | "phase" | "winnerIds" | "celebrate">;

export function fromDemoState(state: DemoState, opts: { samples?: number } = {}): DemoSceneProps {
  const samples = opts.samples ?? SAMPLES;
  const phase = PHASE[state.phase];
  const progress = liveProgress(state);
  const settled = state.phase === "results" || state.phase === "finished";
  // Same move the engine scores with; flat until Live starts.
  const move = (symbol: string) => coinMove(symbol, state.round, progress, state.scenario);

  const picks = playerPicks(state);
  // Commit: opponents' picks stay secret. Your own selection shows even before it is sealed.
  if (state.phase === "commit") for (const p of PLAYERS) picks[p.id] = p.human ? state.picks : [];

  const result = state.phase === "results" ? state.history.at(-1) ?? roundResult(state) : roundResult(state, progress);
  const scores = state.phase === "finished" ? gameScores(state) : result.scores;
  const best = Math.max(...Object.values(scores));
  const winnerIds = state.phase === "finished" ? Object.keys(scores).filter((id) => scores[id] === best) : result.winners;

  const players: ScenePlayer[] = PLAYERS.map((p) => ({
    id: p.id,
    name: p.name,
    color: p.color,
    isYou: p.human,
    picks: picks[p.id].map((pick) => {
      const signed = pickReturn(pick, state.round, progress, state.scenario);
      const returnBps = pick.live ? signed * (pick.direction === "Buy" ? 1 : -1) : move(pick.symbol);
      return {
        symbol: pick.symbol as CoinSymbol,
        side: pick.direction,
        returnBps,
        // Void only means something once prices move.
        void: (state.phase === "live" || settled) && pickIsVoid(pick, state.round, progress, state.scenario),
        effect: pick.live?.skill ?? pick.skill,
        effectBy: pick.live && pick.live.by !== p.id ? PLAYERS.find((player) => player.id === pick.live!.by)?.name : undefined,
        swappedFrom: pick.live?.swapSymbol ? pick.live.originalSymbol as CoinSymbol : undefined,
      };
    }),
    score: settled ? scores[p.id] : undefined,
    // An unsealed hand at the commit deadline forfeits the round.
    forfeit: state.phase !== "commit" && result.forfeited.includes(p.id),
  }));

  const symbols = new Set(players.flatMap((p) => p.picks.map((pick) => pick.symbol)));
  const prices: PriceSeries = {};
  for (const symbol of symbols) {
    const open = COINS.find((coin) => coin.symbol === symbol)!.priceMicros / 1_000_000;
    prices[symbol] = Array.from({ length: samples }, (_, i) =>
      open * (1 + coinMove(symbol, state.round, (progress * i) / (samples - 1), state.scenario) / 10_000));
  }

  return { players, prices, phase, winnerIds: settled ? winnerIds : undefined, celebrate: state.phase === "finished" };
}
