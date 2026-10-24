"use client";

import { useState, type Dispatch } from "react";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { DEMO_SEASON, PLAYERS } from "@/mocks/table";
import { gameScores, type DemoAction, type DemoState } from "./demo-engine";

export function TableDock({ state, dispatch }: { state: DemoState; dispatch: Dispatch<DemoAction> }) {
  const [inspectedSymbol, setInspectedSymbol] = useState("");
  const [historyRound, setHistoryRound] = useState(0);
  const pick = state.picks.find((item) => item.symbol === inspectedSymbol) ?? state.picks[0];
  const editable = state.phase === "commit" && !state.locked && !state.lockingUntil;
  const cap = state.preset.caps[state.round];
  const finished = state.phase === "finished";
  const result = state.phase === "results" ? state.history.at(-1) : null;
  const scores = finished ? gameScores(state) : null;
  const credited = scores && state.scenario !== "outside-k" && state.scenario !== "season-cutoff" ? Math.max(0, scores.you) : 0;
  const names = result?.winners.map((id) => PLAYERS.find((player) => player.id === id)!.name).join(" & ");
  const explanation = state.scenario === "outside-k" ? `Outside your first ${DEMO_SEASON.countedGames} games. Practice only.` : state.scenario === "season-cutoff" ? "Finished after the season cutoff. No points credited." : `Counted game ${DEMO_SEASON.gamesPlayed + 1}/${DEMO_SEASON.countedGames}. Your principal stays safe.`;
  return <section className="jitu-table-dock" aria-label="Table actions">
    {state.toast && state.phase === "results" && <p className="jitu-table-winToast" role="status">{state.toast}</p>}
    <div className="jitu-table-dockBody">
      <div className="jitu-table-dockTitle"><h2>{finished ? "Game complete" : result ? `${names} ${result.winners.length > 1 ? "tie" : "wins"} the round!` : state.phase === "commit" ? state.locked ? "Picks sealed" : "Your move" : state.phase === "reveal" ? "Picks revealed" : "Round live"}</h2>
        <p>{finished ? explanation : result ? `Round ${state.round + 1} settled. ${state.paused ? "Demo paused." : `Continuing in ${state.remaining}s.`}` : state.phase === "commit" ? `${state.picks.length}/${cap} picks${state.picks.length > 0 && state.picks.length < cap ? " · Confidence play" : ""}. Choose Buy or Sell on the table.` : !state.locked ? "Forfeit: no sealed picks. You can play the next round." : state.phase === "reveal" ? "Every seat opens its picks. Commit skills are now visible." : "Scores follow your calls. Moves under 1 bps are void."}</p>
      </div>
      {state.phase === "commit" && <div className="jitu-table-skillControls">
        <label><span>Skill target</span><select aria-label="Skill target pick" value={pick?.symbol ?? ""} disabled={!editable || !pick} onChange={(event) => setInspectedSymbol(event.target.value)}>{!pick && <option value="">Select a coin</option>}{state.picks.map((item) => <option key={item.symbol} value={item.symbol}>{item.direction} {item.symbol}</option>)}</select></label>
        <div className="jitu-table-skillButtons">{(["BOOST", "INSURANCE"] as const).map((skill) => <button key={skill} type="button" disabled={!editable || !pick || !state.hand.includes(skill)} aria-pressed={pick?.skill === skill} title={!state.hand.includes(skill) ? "Not in your hand" : skill === "BOOST" ? "Double this pick’s weight" : "Floor this pick’s return at zero"} onClick={() => dispatch({ type: "skill", symbol: pick.symbol, skill: pick.skill === skill ? undefined : skill })}>{skill}</button>)}</div>
      </div>}
      {result && <div className="jitu-table-resultScores">{PLAYERS.map((player) => <span key={player.id}>{player.name}<strong>{result.scores[player.id]}</strong></span>)}</div>}
      {finished ? <div className="jitu-table-replay"><strong>+{credited} season points</strong><GameButton href="/play" size="sm">Play again</GameButton></div> : result ? <GameActionButton size="sm" onClick={() => dispatch({ type: "advance", now: Date.now() })}>{state.round === state.preset.caps.length - 1 ? "Final scores" : "Next round"}</GameActionButton> : state.phase === "commit" ? <GameActionButton size="sm" disabled={!editable || !state.picks.length} onClick={() => dispatch({ type: "lock", now: Date.now() })}>{state.lockingUntil ? "Locking…" : state.locked ? "Locked ✓" : "Lock picks"}</GameActionButton> : <span className="jitu-table-wait">{state.phase === "reveal" ? "Revealing…" : "Live"}</span>}
    </div>
    {state.phase === "commit" && <p className="jitu-table-hand">One skill per round · Hand: {state.hand.length ? state.hand.join(", ") : "empty"} ({state.hand.length}/3){pick?.skill && ` · ${pick.skill} on ${pick.symbol}`}</p>}
    {state.error && <p role="alert" className="jitu-table-error">{state.error}</p>}
    {finished && <details className="jitu-table-history"><summary>Round scores</summary><div><label>Round <select aria-label="View round scores" value={historyRound} onChange={(event) => setHistoryRound(Number(event.target.value))}>{state.history.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label><div className="jitu-table-resultScores">{PLAYERS.map((player) => <span key={player.id}>{player.name}<strong>{state.history[historyRound]?.scores[player.id] ?? 0}</strong></span>)}</div></div></details>}
  </section>;
}
