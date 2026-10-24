import Image from "next/image";
import type { CSSProperties, Dispatch } from "react";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { DEMO_SEASON, PLAYERS } from "@/mocks/table";
import { gameScores, type DemoAction, type DemoState } from "./demo-engine";
import styles from "./game-styles";

export function RoundResults({ state, dispatch }: { state: DemoState; dispatch: Dispatch<DemoAction> }) {
  const result = state.history[state.history.length - 1];
  const names = result.winners.map((id) => PLAYERS.find((player) => player.id === id)!.name);
  const last = state.round === state.preset.caps.length - 1;
  return <section className={styles.phasePanel} aria-labelledby="round-result-title">
    {state.toast && <div role="status" className={styles.toast}>{state.toast}</div>}
    <h2 id="round-result-title" className={styles.heading}>{names.join(" & ")}{names.length > 1 ? " tie for the round!" : " wins the round!"}</h2>
    <p className={styles.muted}>Round {state.round + 1} settled. Scores are in points; the round cap multiplies each weighted average return in bps.</p>
    <div className={styles.resultGrid}>{PLAYERS.map((player) => <div key={player.id} className={styles.resultItem} style={{ "--seat": player.color } as CSSProperties}><span>{player.name}</span><strong>{result.scores[player.id]}</strong><span className={styles.small}>{result.forfeited.includes(player.id) ? "Forfeit" : result.winners.includes(player.id) ? "Round winner" : "Round score"}</span></div>)}</div>
    <GameActionButton onClick={() => dispatch({ type: "advance", now: Date.now() })}>{last ? "See final podium" : `Next round · ${state.round + 2}`}</GameActionButton>
    <p className={styles.small} style={{ marginTop: 12 }}>{state.paused ? "Demo paused. Continue when you’re ready." : `Continuing in ${state.remaining}s.`}</p>
  </section>;
}

export function GameResults({ state, onArena = false }: { state: DemoState; onArena?: boolean }) {
  const scores = gameScores(state);
  const ranking = [...PLAYERS].sort((a, b) => scores[b.id] - scores[a.id]);
  const ranks = Object.fromEntries(ranking.map((player) => [player.id, 1 + ranking.filter((other) => scores[other.id] > scores[player.id]).length]));
  const display = [ranking[1], ranking[0], ranking[2], ranking[3]];
  const credited = state.scenario === "outside-k" || state.scenario === "season-cutoff" ? 0 : Math.max(0, scores.you);
  return <section className={styles.phasePanel} aria-labelledby="game-result-title">
    <h2 id="game-result-title" className={styles.heading}>The arena has its champions.</h2>
    <p className={styles.muted}>{state.preset.name} complete · {state.preset.caps.length} rounds · Game score = total round scores ÷ total caps.</p>
    {!onArena && <div className={styles.podium} aria-label="Final game ranking">{display.map((player) => <div key={player.id} className={styles.podiumSeat} style={{ "--seat": player.color } as CSSProperties}>
      <Image src={player.portrait} alt="" width={48} height={48} className={styles.avatar} /><p className={styles.playerName}>{player.name}</p>
      <div className={styles.podiumBlock} style={{ height: `${150 - (ranks[player.id] - 1) * 26}px` }}><span>#{ranks[player.id]}</span><strong>{scores[player.id]}</strong><span>game points</span></div>
    </div>)}</div>}
    <div className={styles.finishedActions}>
      <div><strong>+{credited} season points</strong><p className={styles.small}>{state.scenario === "outside-k" ? `Outside your first ${DEMO_SEASON.countedGames} games. This game was for practice.` : state.scenario === "season-cutoff" ? "Finished after the season cutoff. No points credited." : `Counted game ${DEMO_SEASON.gamesPlayed + 1}/${DEMO_SEASON.countedGames}. Negative game scores add zero season points.`}</p><p className={styles.small}>Demo result only. Your principal stays safe.</p></div>
      <GameButton href="/play">Play again</GameButton>
    </div>
    <details className={styles.history}><summary>Round-by-round scores</summary><table><caption className="sr-only">Final scores for each round</caption><thead><tr><th scope="col">Round</th>{PLAYERS.map((player) => <th key={player.id} scope="col">{player.name}</th>)}</tr></thead><tbody>{state.history.map((result, index) => <tr key={index}><th scope="row">{index + 1}</th>{PLAYERS.map((player) => <td key={player.id}>{result.scores[player.id]}</td>)}</tr>)}</tbody></table></details>
  </section>;
}
