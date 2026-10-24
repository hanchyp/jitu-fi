"use client";

import { useEffect, useReducer, useState } from "react";
import Image from "next/image";
import { LIVE_SECONDS, PHASES, SCENARIOS, type GamePreset, type Phase, type Scenario } from "@/mocks/table";
import { TableView3D } from "@/components/table-scene";
import { ArenaTable } from "./ArenaTable";
import { createDemo, demoReducer, gameScores, OUTCOMES, roundResult, type DemoState, type Outcome } from "./demo-engine";
import { ResultPopup } from "./ResultPopup";
import { TableDock } from "./TableDock";
import styles from "./game-styles";

const PHASE_ART: Record<Phase, string> = { commit: "commit", reveal: "reveal", live: "live", results: "result", finished: "result" };

export function TableGame({ preset, initialPhase = "commit", initialScenario = "default", initialOutcome, preview = false }: {
  preset: GamePreset; initialPhase?: Phase; initialScenario?: Scenario; initialOutcome?: Outcome; preview?: boolean;
}) {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => ({ ...createDemo(preset, initialPhase, initialScenario, initialOutcome), paused: preview || initialPhase !== "commit" }));
  // Each finish builds a new history, so a dismissed result reopens on the next game.
  const [dismissed, setDismissed] = useState<DemoState["history"] | null>(null);
  useEffect(() => {
    dispatch({ type: "tick", now: Date.now() });
    const timer = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 200);
    return () => clearInterval(timer);
  }, []);
  const [view3d, setView3d] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const show3d = view3d && state.phase !== "commit";
  const cap = state.preset.caps[state.round];
  const finished = state.phase === "finished";
  const result = state.phase === "results" ? state.history[state.history.length - 1] : roundResult(state);
  const finalScores = finished ? gameScores(state) : null;
  const arenaWinners = finalScores ? Object.keys(finalScores).filter((id) => finalScores[id] === Math.max(...Object.values(finalScores))) : result.winners;
  const arena = <ArenaTable state={state} dispatch={dispatch} winners={arenaWinners} />;
  return <div className="jitu-table-app">
    <header className={styles.tableHeader}>
      <div><h1 className={styles.heading}>{finished ? `${preset.name} · Game complete` : `${preset.name} · Round ${state.round + 1}/${preset.caps.length}`}</h1>
        <div className={styles.headerMeta}><Image className="jitu-table-phaseArt" src={`/assets/table-fx/phase-${PHASE_ART[state.phase]}.webp`} alt="" width={24} height={24} /><span className={styles.phase} aria-live="polite">{state.phase === "results" ? "Round results" : state.phase}</span>{!finished && <><span>Pick up to {cap}</span><span>Live {LIVE_SECONDS[state.round]}s</span></>}<span>Demo table</span></div>
      </div>
      <div className="jitu-table-hudEnd">
      <div className="jitu-table-viewToggle" role="group" aria-label="Table view">{(["2D", "3D"] as const).map((view) => <button key={view} type="button" aria-pressed={view3d === (view === "3D")} onClick={() => { setView3d(view === "3D"); if (view === "3D") setSceneLoaded(true); }}>{view}</button>)}</div>
      {!finished && <div className={styles.clock}><div><span className={styles.small}>{state.paused ? "Demo paused" : "Phase countdown"}</span><div className={styles.phaseTrack} aria-hidden="true">{PHASES.slice(0, 4).map((phase) => <span key={phase} data-active={phase === state.phase} />)}</div></div><span className={styles.clockValue} data-urgent={state.remaining <= 5} aria-label={`${state.remaining} seconds remaining`}>{state.remaining}s</span></div>}
      </div>
    </header>
    <div className="jitu-table-session">
    {/* Coin picking lives on the 2D market, so Commit always uses the 2D board. */}
    <div className="jitu-table-board">
      {sceneLoaded && <div className="jitu-table-stage3d" data-visible={show3d} aria-hidden={!show3d} inert={!show3d}><TableView3D state={state} fallback={arena} /></div>}
      {!show3d && arena}
    </div>
    <TableDock key={`${state.phase}-${state.round}`} state={state} dispatch={dispatch} onShowResult={() => setDismissed(null)} />
    {finished && dismissed !== state.history && <ResultPopup state={state} onClose={() => setDismissed(state.history)} />}
    </div>
    <p className={styles.footer}>Simulated game · No wallet prompts · House bots never earn season points</p>
    <details className={styles.preview} open={preview}>
      <summary>Demo controls</summary>
      <div className={styles.previewControls}>
        <label>Phase <select value={state.phase} onChange={(event) => dispatch({ type: "preview", phase: event.target.value as Phase, scenario: state.scenario, now: Date.now() })}>{PHASES.map((phase) => <option key={phase} value={phase}>{phase}</option>)}</select></label>
        <label>Scenario <select value={state.scenario} onChange={(event) => dispatch({ type: "preview", phase: state.phase === "commit" ? "reveal" : state.phase, scenario: event.target.value as Scenario, now: Date.now() })}>{SCENARIOS.map((scenario) => <option key={scenario} value={scenario}>{scenario}</option>)}</select></label>
        {finished && <label>Outcome <select defaultValue="" onChange={(event) => dispatch({ type: "preview", phase: "finished", scenario: state.scenario, outcome: (event.target.value || undefined) as Outcome | undefined, now: Date.now() })}><option value="">as played</option>{OUTCOMES.map((outcome) => <option key={outcome} value={outcome}>{outcome}</option>)}</select></label>}
        <button disabled={finished} onClick={() => dispatch({ type: "pause", now: Date.now() })}>{state.paused ? "Resume timer" : "Pause timer"}</button>
        <button disabled={finished || Boolean(state.lockingUntil)} onClick={() => dispatch({ type: "advance", now: Date.now(), preview: true })}>Next phase</button>
        <span>Phase/scenario previews reset the demo and pause the timer.</span>
      </div>
    </details>
  </div>;
}
