"use client";

import { useCallback, useRef, useState, useSyncExternalStore, type Dispatch } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import Image from "next/image";
import { COINS, PLAYERS, type Player } from "@/mocks/table";
import { gameScores, liveProgress, roundResult, type DemoAction, type DemoState } from "./demo-engine";
import { PlayerSeat } from "./PlayerPanels";
import { TableCoin } from "./TableCoin";
import { CoinDialog } from "./CoinDialog";
import { StoneTableArt } from "./StoneTableArt";
import { SeatHand } from "./SeatHand";
import { seatHandView } from "./seat-hand";
import { useHandMotion } from "./useHandMotion";
import { LivePicks } from "./LivePicks";
import { NetworkIcon } from "@/components/ui/icons";

const CoinModels = dynamic(() => import("./CoinModelLayer"), { ssr: false });
const subscribe = () => () => {};
let modelSupported: boolean | undefined;
function canRenderCoins() {
  if (modelSupported !== undefined) return modelSupported;
  try {
    const context = document.createElement("canvas").getContext("webgl2");
    modelSupported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { modelSupported = false; }
  return modelSupported;
}

export type ArenaTableProps = { state: DemoState; dispatch: Dispatch<DemoAction>; winners: string[] };
export type ArenaTableViewProps = ArenaTableProps & { onInspect: (symbol: string) => void };
function StaticTable({ state, onInspect }: ArenaTableViewProps) {
  return <div className="jitu-table-static" data-testid="static-game-table">
    <div className="jitu-table-stone"><StoneTableArt /><div className="jitu-table-crystal" aria-hidden="true"><NetworkIcon className="" /></div>
      {state.phase === "live" ? <LivePicks state={state} onInspect={onInspect} /> : <div className="jitu-table-market" role="group" aria-label="Eight coins on the arena table">{COINS.map((coin) => <TableCoin key={coin.symbol} symbol={coin.symbol} state={state} onInspect={onInspect} />)}</div>}
    </div>
    {PLAYERS.map((player) => <CompactSeat key={player.id} player={player} state={state} onInspect={onInspect} />)}
  </div>;
}

function CompactSeat({ state, player, onInspect }: { state: DemoState; player: Player; onInspect: (symbol: string) => void }) {
  const details = useRef<HTMLDetailsElement>(null);
  const result = roundResult(state, liveProgress(state));
  const hidden = state.phase === "commit";
  const hand = seatHandView(state, player.id);
  const finalScores = state.phase === "finished" ? gameScores(state) : null;
  const rank = finalScores ? 1 + Object.values(finalScores).filter((score) => score > finalScores[player.id]).length : 0;
  const winner = finalScores ? rank === 1 : state.phase === "results" && result.winners.includes(player.id);
  return <div className="jitu-table-staticSeat" data-seat={player.id} data-winner={winner}>
    {state.phase !== "finished" && <SeatHand state={state} player={player} onInspect={onInspect} />}
    <details ref={details}>
    <summary aria-label={`Inspect ${player.name}'s seat`}>
      <Image src={player.portrait} alt="" width={36} height={36} /><strong>{player.name}</strong>
      <b>{finalScores ? finalScores[player.id] : hidden || state.phase === "reveal" ? "—" : result.scores[player.id]}</b>
      <span>{finalScores ? `Rank #${rank}` : hidden ? `${hand.count} pick${hand.count === 1 ? "" : "s"} · ${player.human ? state.locked ? "Locked" : "Your seat" : "Hidden"}` : result.forfeited.includes(player.id) ? "Forfeit" : winner ? "Round winner" : `${hand.count} revealed picks`}</span>
    </summary>
    <div className="jitu-table-seatDetail"><PlayerSeat player={player} state={state} /><button type="button" onClick={() => { if (details.current) details.current.open = false; }}>Close seat details</button></div>
    </details>
  </div>;
}

export function ArenaTable(props: ArenaTableProps) {
  const [inspected, setInspected] = useState<string | null>(null);
  const stage = useRef<HTMLElement>(null);
  const [modelHost, setModelHost] = useState<HTMLElement | null>(null);
  const bindStage = useCallback((node: HTMLElement | null) => { stage.current = node; setModelHost(node); }, []);
  const webgl = useSyncExternalStore(subscribe, canRenderCoins, () => false);
  const reduced = useReducedMotion();
  useHandMotion(stage, props.state);
  return <section ref={bindStage} className="jitu-table-stage" aria-label="Arena game table" data-renderer="2d" data-phase={props.state.phase}>
    <p className="jitu-table-instruction">{props.state.phase === "commit" ? props.state.locked ? "Picks sealed on your podium. Waiting for reveal." : `Tap a coin, read the chart, then choose Buy or Sell. Pick up to ${props.state.preset.caps[props.state.round]}.` : props.state.phase === "reveal" ? "The four seats reveal their calls." : props.state.phase === "live" ? "Your calls are live. Tap a coin to follow its chart." : props.state.phase === "results" ? "The winning seats take the light." : "Final scores at every seat."}</p>
    <StaticTable {...props} onInspect={setInspected} />
    <p className="jitu-table-crystalLabel"><NetworkIcon className="" />Principal Crystal · Always protected</p>
    {modelHost && webgl && <CoinModels host={modelHost} still={Boolean(reduced)} />}
    {inspected && <CoinDialog key={inspected} symbol={inspected} state={props.state} dispatch={props.dispatch} onClose={() => setInspected(null)} />}
  </section>;
}
