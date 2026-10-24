"use client";

import { useEffect, useReducer } from "react";
import { motion, useAnimationControls, useReducedMotion } from "motion/react";
import Image from "next/image";
import { COINS, PLAYERS, type Pick } from "@/mocks/table";
import { GameActionButton } from "@/components/ui/GameButton";
import { ChevronIcon } from "@/components/stats/icons";
import { coinDataUrl } from "@/lib/coins";
import { bps, coinMove, liveProgress, marketMove, pickReturn, price, type DemoState } from "./demo-engine";
import { CoinToken3D } from "./CoinToken3D";
import { initialLiveSelection, livePlayerView, liveSelectionReducer } from "./live-picks";

export function LivePicks({ state, onInspect }: { state: DemoState; onInspect: (symbol: string) => void }) {
  const [selection, dispatch] = useReducer(liveSelectionReducer, initialLiveSelection);
  const { player, picks, pick } = livePlayerView(state, selection);
  const controls = useAnimationControls();
  const reducedMotion = useReducedMotion();
  useEffect(() => {
    controls.set({ opacity: 0, x: selection.direction * 24 });
    void controls.start({ opacity: 1, x: 0, transition: { duration: reducedMotion ? 0 : .25, ease: "easeOut" } });
  }, [selection.step, selection.direction, reducedMotion, controls]);
  const cycle = (direction: -1 | 1) => dispatch({ type: "player", direction });
  return <section className="jitu-live-focus" aria-label="Live picks by player" tabIndex={0} onKeyDown={(event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || (event.target as HTMLElement).closest("input, select, textarea, [contenteditable], [role='textbox'], [role='slider']")) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); cycle(event.key === "ArrowLeft" ? -1 : 1); }
  }}>
    <GameActionButton className="jitu-live-arrow jitu-live-previous" variant="night" size="icon" aria-label="Previous player's live picks" onClick={() => cycle(-1)}><ChevronIcon /></GameActionButton>
    <GameActionButton className="jitu-live-arrow jitu-live-next" variant="night" size="icon" aria-label="Next player's live picks" onClick={() => cycle(1)}><ChevronIcon /></GameActionButton>
    <header><h2 aria-live="polite" aria-atomic="true">{player.human ? "Your live picks" : `${player.name}'s live picks`} <small>{selection.playerIndex + 1}/{PLAYERS.length}</small></h2><span>Simulated prices</span></header>
    {/* One persistent subtree: no exiting duplicate anchors or shared canvas remount. */}
    <div className="jitu-live-viewport"><motion.div className="jitu-live-content" initial={{ opacity: 0, x: 0 }} animate={controls}>
      {pick ? <>
        <div className="jitu-live-tabs" role="group" aria-label={`Choose ${player.name}'s live pick`}>{picks.map((item) => <button key={item.symbol} type="button" aria-pressed={pick.symbol === item.symbol} aria-label={`Follow ${player.human ? "your" : `${player.name}'s`} ${item.direction} ${item.symbol} pick`} onClick={() => dispatch({ type: "coin", round: state.round, symbol: item.symbol })}><Image src={coinDataUrl(COINS.find((asset) => asset.symbol === item.symbol)!)} alt="" width={18} height={18} unoptimized /><strong>{item.symbol}</strong><span data-direction={item.direction}>{item.direction}</span></button>)}</div>
        <LivePickDetail state={state} pick={pick} onInspect={onInspect} />
      </> : <div className="jitu-live-empty"><h3>No sealed picks this round</h3><p>{state.phase !== "live" ? "Player picks open in Live." : player.human ? "You forfeited this round. Take your seat again when the next round starts." : `${player.name} has no sealed picks this round.`}</p></div>}
    </motion.div></div>
  </section>;
}

export function LivePickDetail({ state, pick, onInspect }: { state: DemoState; pick: Pick; onInspect: (symbol: string) => void }) {
  const coin = COINS.find((item) => item.symbol === pick.symbol)!;
  const progress = liveProgress(state);
  const move = marketMove(state, pick.symbol);
  const quote = Math.round(coin.priceMicros * (10_000 + move) / 10_000);
  const ret = pickReturn(pick, state.round, progress, state.scenario);
  const isVoid = Math.abs(move) < 1;
  const values = Array.from({ length: 33 }, (_, index) => coinMove(pick.symbol, state.round, progress * index / 32, state.scenario));
  const low = Math.min(-1, ...values);
  const high = Math.max(1, ...values);
  const plotY = (value: number) => 62 - (value - low) / (high - low) * 52;
  const points = values.map((value, index) => `${8 + index * 224 / 32},${plotY(value)}`).join(" ");
  return <div className="jitu-live-detail">
      <button className="jitu-live-token" type="button" aria-label={`Open ${coin.symbol} full chart`} onClick={() => onInspect(coin.symbol)}><CoinToken3D symbol={coin.symbol} frontSrc={coinDataUrl(coin)} /><strong>{coin.name}</strong><span data-direction={pick.direction}>{pick.direction} {coin.symbol}</span></button>
      <div className="jitu-live-quote"><div><span>Current price</span><strong>{price(quote)}</strong><b data-positive={ret >= 0}>{isVoid ? "Void <1 bps" : `${bps(ret)} return`}</b></div>
        <svg viewBox="0 0 240 72" role="img" aria-label={`${coin.symbol} live simulated price path`}><line x1="8" x2="232" y1={plotY(0)} y2={plotY(0)} stroke="#53728a" strokeDasharray="3 5" /><polyline points={points} fill="none" stroke="#daae4b" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="232" cy={plotY(values.at(-1)!)} r="3" fill="#f2ede1" /></svg>
        <p>Round start {price(coin.priceMicros)}{pick.skill ? ` · ${pick.skill}` : ""}</p>
      </div>
    </div>;
}
