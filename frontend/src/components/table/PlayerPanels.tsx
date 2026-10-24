import Image from "next/image";
import type { CSSProperties } from "react";
import { COINS, PLAYERS, type Player } from "@/mocks/table";
import { coinDataUrl } from "@/lib/coins";
import { bps, pickIsVoid, gameScores, liveProgress, pickReturn, playerPicks, roundResult, type DemoState } from "./demo-engine";
import styles from "./game-styles";

export function PlayerPanels({ state }: { state: DemoState }) {
  return <section className={styles.players} aria-label="Four player panels">
    {PLAYERS.map((player, index) => <PlayerSeat key={player.id} state={state} player={player} index={index} />)}
  </section>;
}

export function PlayerSeat({ state, player, index = 0 }: { state: DemoState; player: Player; index?: number }) {
  const progress = liveProgress(state);
  const result = roundResult(state, progress);
  const allPicks = playerPicks(state);
  const hidden = state.phase === "commit";
  const showScore = state.phase === "live" || state.phase === "results" || state.phase === "finished";
      const forfeited = !hidden && result.forfeited.includes(player.id);
      const finalScores = state.phase === "finished" ? gameScores(state) : null;
      const rank = finalScores ? 1 + Object.values(finalScores).filter((score) => score > finalScores[player.id]).length : 0;
      const winner = finalScores ? rank === 1 : state.phase === "results" && result.winners.includes(player.id);
      return <article className={styles.player} data-player={player.id} data-winner={winner} style={{ "--seat": player.color } as CSSProperties} aria-label={`${player.name}'s seat`}>
        <div className={styles.playerTop}><Image src={player.portrait} alt="" width={36} height={36} className={styles.avatar} /><div><p className={styles.playerName}>{player.name}</p><p className={styles.small}>{finalScores ? `Final rank #${rank}` : winner ? "Round winner" : player.human ? "Challenger" : "House bot"}</p></div><span className={styles.playerScore}>{finalScores ? finalScores[player.id] : showScore ? result.scores[player.id] : "—"}</span></div>
        <div className={styles.playerPicks}>
          {finalScores ? <span className={styles.small}>Game points · {player.human ? "Your final score" : "No season points"}</span> : hidden ? <span className={styles.small}>{player.human ? state.lockingUntil ? "Sealing picks…" : state.locked ? "Picks locked" : "Choosing picks…" : "Picks hidden"}</span> : forfeited ? <span className={styles.sell}>Forfeit · No sealed picks · 0 pts</span> : allPicks[player.id].map((pick, pickIndex) => {
            const isVoid = showScore && pickIsVoid(pick, state.round, progress, state.scenario);
            return <div key={pick.symbol} className={state.phase === "reveal" ? styles.revealPick : ""} style={{ animationDelay: `${index * .12 + pickIndex * .07}s` }}>
              <div className={styles.pickLine}><span className="jitu-table-seatPick"><Image src={coinDataUrl(COINS.find((coin) => coin.symbol === pick.symbol)!)} alt="" width={16} height={16} unoptimized /><span className={pick.direction === "Buy" ? styles.buy : styles.sell}>{pick.direction}</span> {pick.symbol} {pick.skill && <span className={styles.skillLabel}>{pick.skill}</span>}{pick.live && <span className={styles.skillLabel}>{pick.live.skill}{pick.live.by !== player.id ? ` by ${PLAYERS.find((p) => p.id === pick.live!.by)?.name}` : ""}</span>}</span><span>{showScore ? isVoid ? "Void <1 bps" : bps(pickReturn(pick, state.round, progress, state.scenario)) : "Sealed ✓"}</span></div>
            </div>;
          })}
        </div>
      </article>;
}
