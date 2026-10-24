"use client";

import { useEffect, useId, useRef, useState, type Dispatch } from "react";
import Image from "next/image";
import { coinDataUrl } from "@/lib/coins";
import { COINS, type Pick } from "@/mocks/table";
import { bps, marketMove, marketPrice, price, type DemoAction, type DemoState } from "./demo-engine";

export function CoinDialog({ symbol, state, dispatch, onClose }: { symbol: string; state: DemoState; dispatch: Dispatch<DemoAction>; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const gradientId = useId().replaceAll(":", "");
  const [range, setRange] = useState(1);
  const [hovered, setHovered] = useState<number | null>(null);
  const coin = COINS.find((item) => item.symbol === symbol)!;
  const pick = state.picks.find((item) => item.symbol === symbol);
  const cap = state.preset.caps[state.round];
  const editable = state.phase === "commit" && !state.locked && !state.lockingUntil;
  const full = !pick && state.picks.length >= cap;
  const movement = marketMove(state, symbol);
  const quote = Math.round(coin.priceMicros * (10_000 + movement) / 10_000);
  const samples = Array.from({ length: 41 }, (_, index) => {
    if (state.server) return movement;
    if (index === 40) return quote;
    const distance = (40 - index) / 40;
    const drift = -coin.moveBps * distance * Math.sqrt(range);
    const wave = (Math.sin((index + state.marketTick) * .52 + COINS.indexOf(coin)) * 6 + Math.cos(index * .83) * 3) * Math.sin(distance * Math.PI / 2);
    return Math.round(coin.priceMicros * (10_000 + movement + drift + wave) / 10_000);
  });
  const low = Math.min(...samples);
  const high = Math.max(...samples);
  const span = Math.max(1, high - low);
  const x = (index: number) => 12 + index * 456 / 40;
  const y = (value: number) => 160 - (value - low) / span * 138;
  const points = samples.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const current = hovered === null ? quote : samples[hovered];
  const last = samples.length - 1;

  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);

  function choose(direction: Pick["direction"]) {
    if (!editable || full) return;
    if (!pick) dispatch({ type: "select", symbol });
    dispatch({ type: "direction", symbol, direction });
    onClose();
  }

  return <dialog ref={dialog} className="jitu-coin-dialog" aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === dialog.current) onClose(); }}>
    <div className="jitu-coin-dialogBody">
      <header className="jitu-coin-dialogHeader"><div className="jitu-coin-identity"><Image src={coinDataUrl(coin)} alt="" width={44} height={44} unoptimized /><div><h2 id={titleId}>{coin.name} <span>{symbol}</span></h2><p><i /> {state.server ? "Server market feed" : "Simulated market · Updates every second"}</p></div></div><button type="button" className="jitu-coin-close" aria-label="Close coin chart" onClick={onClose} autoFocus>×</button></header>
      <div className="jitu-coin-quote"><div><span>{hovered === null ? "Current price" : "Chart price"}</span><strong>{state.server ? marketPrice(state, symbol) : price(current)}</strong></div><div><b data-positive={movement >= 0}>{bps(movement)}</b><span>{state.phase === "commit" ? `${state.remaining}s to lock` : state.phase === "live" ? `${state.remaining}s live` : state.phase === "reveal" ? "Revealing" : "Round settled"}</span></div></div>
      {state.server ? <p className="jitu-coin-chartTime">Historical chart unavailable. Latest server quote shown above.</p> : <><div className="jitu-coin-chartHeader"><strong>Live chart <span>· {state.server ? "server feed" : "simulated"}</span></strong><div role="group" aria-label="Chart time range">{[1, 5, 15].map((value) => <button key={value} type="button" aria-pressed={range === value} onClick={() => { setRange(value); setHovered(null); }}>{value}m</button>)}</div></div>
      <div className="jitu-coin-chart">
        <svg viewBox="0 0 480 180" role="img" aria-label={`${coin.name} simulated price chart over ${range} minute${range === 1 ? "" : "s"}`} onPointerMove={(event) => { const rect = event.currentTarget.getBoundingClientRect(); setHovered(Math.max(0, Math.min(40, Math.round(((event.clientX - rect.left) / rect.width * 480 - 12) / 456 * 40)))); }} onPointerLeave={() => setHovered(null)}>
          <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#daae4b" stopOpacity=".26" /><stop offset="100%" stopColor="#daae4b" stopOpacity="0" /></linearGradient></defs>
          {[24, 68, 112, 158].map((line) => <line key={line} x1="12" x2="468" y1={line} y2={line} stroke="#2e6a8e" strokeDasharray="3 6" />)}
          <polygon points={`12,175 ${points} 468,175`} fill={`url(#${gradientId})`} />
          <polyline points={points} stroke="#daae4b" fill="none" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {hovered !== null && <line x1={x(hovered)} x2={x(hovered)} y1="12" y2="175" stroke="#f2ede1" opacity=".5" strokeDasharray="3 3" />}
          <circle cx={x(hovered ?? last)} cy={y(samples[hovered ?? last])} r="4" fill="#f2ede1" stroke="#daae4b" strokeWidth="2" />
        </svg>
        <div className="jitu-coin-chartScale"><span>{state.server ? "Latest server quote" : price(high)}</span><span>{state.server ? "History unavailable" : price(low)}</span></div>
      </div>
      <div className="jitu-coin-chartTime"><span>{range}m ago</span><span>Now</span></div></>}
      <div className="jitu-coin-pickHelp"><p>{editable ? full ? `All ${cap} pick slots are filled. Remove a pick to choose ${symbol}.` : pick ? `Your call: ${pick.direction} ${symbol}. Choose again to change it.` : `Choose your call for ${symbol}. It joins your podium, then locks with your other picks.` : pick ? `Your ${pick.direction} ${symbol} call is ${state.locked ? "sealed" : "from this round"}. You can keep following the chart.` : "Read-only chart. Picks can only be changed during Commit."}</p><span>{state.picks.length}/{cap} picks</span></div>
      <div className="jitu-coin-tradeActions"><button type="button" data-direction="Buy" disabled={!editable || full} onClick={() => choose("Buy")}><strong>Buy {symbol}</strong><span>Call a price rise</span></button><button type="button" data-direction="Sell" disabled={!editable || full} onClick={() => choose("Sell")}><strong>Sell {symbol}</strong><span>Call a price fall</span></button></div>
      <div className="jitu-coin-dialogFooter">{pick && editable ? <button type="button" onClick={() => { dispatch({ type: "select", symbol }); onClose(); }}>Remove this pick</button> : <span>Game calls only · Your principal stays safe</span>}<button type="button" onClick={onClose}>Back to table</button></div>
    </div>
  </dialog>;
}
