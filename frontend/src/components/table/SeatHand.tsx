"use client";

import type { CSSProperties } from "react";
import { coinDataUrl } from "@/lib/coins";
import { COINS, PLAYERS, type Player } from "@/mocks/table";
import type { DemoState } from "./demo-engine";
import { seatHandView } from "./seat-hand";
import { CoinToken3D } from "./CoinToken3D";

export function SeatHand({ state, player, onInspect }: { state: DemoState; player: Player; onInspect: (symbol: string) => void }) {
  const hand = seatHandView(state, player.id);
  return <div className="jitu-seat-hand" data-hand-owner={player.id} aria-label={`${player.name}'s hand: ${hand.count} ${hand.concealed ? "hidden " : ""}pick${hand.count === 1 ? "" : "s"}`}>
    {hand.concealed ? Array.from({ length: hand.count }, (_, index) => <span key={index} className="jitu-seat-card jitu-seat-cardBack" aria-label="Hidden pick" data-hidden-card="true"><CoinToken3D concealed /></span>) : hand.picks.map((pick, index) => <button key={pick.symbol} type="button" className={`jitu-seat-card ${state.phase === "reveal" && !player.human ? "jitu-seat-cardRevealed" : ""}`} data-hand-coin={pick.symbol} data-hand-direction={pick.direction} style={{ "--deal-delay": `${Math.max(0, PLAYERS.findIndex((item) => item.id === player.id) - 1) * 140 + index * 100}ms` } as CSSProperties} aria-label={`${player.name}: ${pick.direction} ${pick.symbol}${pick.skill ? ` with ${pick.skill}` : ""}`} onClick={() => onInspect(pick.symbol)}>
      <CoinToken3D symbol={pick.symbol} frontSrc={coinDataUrl(COINS.find((coin) => coin.symbol === pick.symbol)!)} reveal={state.phase === "reveal" && !player.human} /><strong>{pick.symbol}</strong><span data-direction={pick.direction}>{pick.direction}</span>{pick.skill && <i title={pick.skill}>{pick.skill === "BOOST" ? "×2" : "◇"}</i>}
    </button>)}
  </div>;
}
