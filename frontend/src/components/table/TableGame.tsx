"use client";

import { useEffect, useReducer } from "react";
import { LIVE_SECONDS, PHASES, SCENARIOS, type GamePreset, type Phase, type Scenario } from "@/mocks/table";
import { ArenaTable } from "./ArenaTable";
import { createDemo, demoReducer, gameScores, roundResult } from "./demo-engine";
import { TableDock } from "./TableDock";
import styles from "./game-styles";

export function TableGame({ preset, initialPhase = "commit", initialScenario = "default", preview = false }: {
  preset: GamePreset; initialPhase?: Phase; initialScenario?: Scenario; preview?: boolean;
}) {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => ({ ...createDemo(preset, initialPhase, initialScenario), paused: preview || initialPhase !== "commit" }));
  useEffect(() => {
    dispatch({ type: "tick", now: Date.now() });
    const timer = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 200);
    return () => clearInterval(timer);
  }, []);
  const cap = state.preset.caps[state.round];
  const finished = state.phase === "finished";
  const result = state.phase === "results" ? state.history[state.history.length - 1] : roundResult(state);
  const finalScores = finished ? gameScores(state) : null;
  const arenaWinners = finalScores ? Object.keys(finalScores).filter((id) => finalScores[id] === Math.max(...Object.values(finalScores))) : result.winners;
  return <div className="jitu-table-app">
    <header className={styles.tableHeader}>
      <div><h1 className={styles.heading}>{finished ? `${preset.name} · Game complete` : `${preset.name} · Round ${state.round + 1}/${preset.caps.length}`}</h1>
        <div className={styles.headerMeta}><span className={styles.phase} aria-live="polite">{state.phase === "results" ? "Round results" : state.phase}</span>{!finished && <><span>Pick up to {cap}</span><span>Live {LIVE_SECONDS[state.round]}s</span></>}<span>Demo table</span></div>
      </div>
      {!finished && <div className={styles.clock}><div><span className={styles.small}>{state.paused ? "Demo paused" : "Phase countdown"}</span><div className={styles.phaseTrack} aria-hidden="true">{PHASES.slice(0, 4).map((phase) => <span key={phase} data-active={phase === state.phase} />)}</div></div><span className={styles.clockValue} data-urgent={state.remaining <= 5} aria-label={`${state.remaining} seconds remaining`}>{state.remaining}s</span></div>}
    </header>
    <div className="jitu-table-session">
    <ArenaTable state={state} dispatch={dispatch} winners={arenaWinners} />
    <TableDock key={`${state.phase}-${state.round}`} state={state} dispatch={dispatch} />
    </div>
    <p className={styles.footer}>Simulated game · No wallet prompts · House bots never earn season points</p>
    <details className={styles.preview} open={preview}>
      <summary>Demo controls</summary>
      <div className={styles.previewControls}>
        <label>Phase <select value={state.phase} onChange={(event) => dispatch({ type: "preview", phase: event.target.value as Phase, scenario: state.scenario, now: Date.now() })}>{PHASES.map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></label>
        <label>Scenario <select value={state.scenario} onChange={(event) => dispatch({ type: "preview", phase: state.phase === "commit" ? "reveal" : state.phase, scenario: event.target.value as Scenario, now: Date.now() })}>{SCENARIOS.map((scenario) => <option key={scenario} value={scenario}>{scenario}</option>)}</select></label>
        <button disabled={finished} onClick={() => dispatch({ type: "pause", now: Date.now() })}>{state.paused ? "Resume timer" : "Pause timer"}</button>
        <button disabled={finished || Boolean(state.lockingUntil)} onClick={() => dispatch({ type: "advance", now: Date.now(), preview: true })}>Next phase</button>
        <span>Phase/scenario previews reset the demo and pause the timer.</span>
      </div>
    </details>
  </div>;
}
