"use client";

import { useState } from "react";
import Image from "next/image";
import { COINS } from "@/mocks/table";
import { coinDataUrl } from "@/lib/coins";
import { bps, coinMove, liveProgress, marketMove, marketPrice, pickIsVoid, pickReturn, playerPicks, price, type DemoState } from "./demo-engine";
import { SkillCoin } from "@/components/skills/SkillEffect2D";
import type { CoinSymbol } from "@/components/table-scene/types";
import { CoinToken3D } from "./CoinToken3D";

export function LivePicks({ state, onInspect }: { state: DemoState; onInspect: (symbol: string) => void }) {
  const [selected, setSelected] = useState("");
  const picks = playerPicks(state).you;
  const pick = picks.find((item) => item.symbol === selected) ?? picks[0];
  if (!pick) return <section className="jitu-live-focus jitu-live-empty" aria-label="Your live picks"><h2>No sealed picks this round</h2><p>You forfeited this round. Take your seat again when the next round starts.</p></section>;
  const coin = COINS.find((item) => item.symbol === pick.symbol)!;
  const progress = liveProgress(state);
  const move = marketMove(state, pick.symbol);
  const quote = Math.round(coin.priceMicros * (10_000 + move) / 10_000);
  const ret = pickReturn(pick, state.round, progress, state.scenario);
  const isVoid = pickIsVoid(pick, state.round, progress, state.scenario);
  const values = state.server ? [0, move] : Array.from({ length: 33 }, (_, index) => coinMove(pick.symbol, state.round, progress * index / 32, state.scenario));
  const low = Math.min(-1, ...values);
  const high = Math.max(1, ...values);
  const plotY = (value: number) => 62 - (value - low) / (high - low) * 52;
  const points = values.map((value, index) => `${8 + index * 224 / (values.length - 1)},${plotY(value)}`).join(" ");
  return <section className="jitu-live-focus" aria-label="Your live picks">
    <header><h2>Your live picks</h2><span>{state.server ? "Server prices" : "Simulated prices"}</span><select className="jitu-live-select" aria-label="Follow a live pick" value={pick.symbol} onChange={(event) => setSelected(event.target.value)}>{picks.map((item) => <option key={item.symbol} value={item.symbol}>{item.direction} {item.symbol}</option>)}</select></header>
    <div className="jitu-live-tabs" role="group" aria-label="Choose a live pick">{picks.map((item) => <button key={item.symbol} type="button" aria-pressed={pick.symbol === item.symbol} aria-label={`Follow your ${item.direction} ${item.symbol} pick`} onClick={() => setSelected(item.symbol)}><Image src={coinDataUrl(COINS.find((asset) => asset.symbol === item.symbol)!)} alt="" width={18} height={18} unoptimized /><strong>{item.symbol}</strong><span data-direction={item.direction}>{item.direction}</span></button>)}</div>
    <div className="jitu-live-detail">
      <button className="jitu-live-token" type="button" aria-label={`Open ${coin.symbol} full chart`} onClick={() => onInspect(coin.symbol)}>{pick.live || pick.skill ? <SkillCoin symbol={coin.symbol as CoinSymbol} effect={pick.live?.skill ?? pick.skill} swappedFrom={pick.live?.swapSymbol ? pick.live.originalSymbol as CoinSymbol : undefined} className="jitu-live-spellCoin" /> : <CoinToken3D symbol={coin.symbol} frontSrc={coinDataUrl(coin)} />}<strong>{coin.name}</strong><span data-direction={pick.direction}>{pick.direction} {coin.symbol}</span></button>
      <div className="jitu-live-quote"><div><span>Current price</span><strong>{state.server ? marketPrice(state, pick.symbol) : price(quote)}</strong><b data-positive={ret >= 0}>{isVoid ? "Void <1 bps" : `${bps(ret)} return`}</b></div>
        <svg viewBox="0 0 240 72" role="img" aria-label={state.server ? `${coin.symbol} round open and latest price change` : `${coin.symbol} live simulated price path`}><line x1="8" x2="232" y1={plotY(0)} y2={plotY(0)} stroke="#53728a" strokeDasharray="3 5" /><polyline points={points} fill="none" stroke="#daae4b" strokeWidth="2.5" strokeLinejoin="round" /><circle cx="232" cy={plotY(values.at(-1)!)} r="3" fill="#f2ede1" /></svg>
        <p>Round start {state.server ? "Server feed" : price(coin.priceMicros)}{pick.live || pick.skill ? ` · ${pick.live?.skill ?? pick.skill}` : ""}</p>
      </div>
    </div>
  </section>;
}
