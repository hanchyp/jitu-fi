"use client";

import { useEffect, useReducer, useState } from "react";
import { useLivePrices } from "@/lib/game/livePrices";
import type { GamePreset } from "@/mocks/table";
import { TableView3D } from "@/components/table-scene";
import { ArenaTable } from "./ArenaTable";
import { createDemo, demoReducer, gameScores, roundResult, usingLivePrices } from "./demo-engine";
import { isNextPhaseKey } from "./demo-shortcut";
import { ResultPopup } from "./ResultPopup";
import { TableDock } from "./TableDock";
import styles from "./game-styles";

// Development-only local simulation for /play?demo=1. Nothing is sent to the backend or chain.
export function DemoTableGame({ preset }: { preset: GamePreset }) {
  const [state, dispatch] = useReducer(demoReducer, preset, (value) => createDemo(value));
  const feed = useLivePrices();
  useEffect(() => { dispatch({ type: "prices", feed }); }, [feed]);
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    dispatch({ type: "tick", now: Date.now() });
    const timer = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 200);
    const onKey = (event: KeyboardEvent) => {
      if (!isNextPhaseKey(event, document)) return;
      event.preventDefault();
      dispatch({ type: "advance", now: Date.now() });
    };
    window.addEventListener("keydown", onKey);
    return () => { clearInterval(timer); window.removeEventListener("keydown", onKey); };
  }, []);
  const [view3d, setView3d] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  const show3d = view3d && state.phase !== "commit";
  const finished = state.phase === "finished";
  const finalScores = finished ? gameScores(state) : null;
  const winners = finalScores ? Object.keys(finalScores).filter((id) => finalScores[id] === Math.max(...Object.values(finalScores))) : state.phase === "results" ? state.history[state.history.length - 1].winners : roundResult(state).winners;
  const arena = <ArenaTable state={state} dispatch={dispatch} winners={winners} />;
  return <div className="jitu-table-app">
    <header className={styles.tableHeader}>
      <div><h1 className={styles.heading}>{preset.name} · {finished ? "Game complete" : `Round ${state.round + 1}/${preset.caps.length}`}</h1>
        <div className={styles.headerMeta}><span aria-live="polite">{state.phase === "results" ? "Round results" : state.phase}</span><span>Demo simulation</span><span><kbd>N</kbd>: next phase</span><small>{usingLivePrices(state) ? "Live prices" : "Simulated prices"}</small></div>
      </div>
      <div className="jitu-table-hudEnd">
        <div className="jitu-table-viewToggle" role="group" aria-label="Table view">{(["2D", "3D"] as const).map((view) => <button key={view} type="button" aria-pressed={view3d === (view === "3D")} onClick={() => { setView3d(view === "3D"); if (view === "3D") setSceneLoaded(true); }}>{view}</button>)}</div>
        {!finished && <span className={styles.clockValue} data-urgent={state.remaining <= 5} aria-label={`${state.remaining} seconds remaining`}>{state.remaining}s</span>}
      </div>
    </header>
    <div className="jitu-table-session">
      <div className="jitu-table-board">
        {sceneLoaded && <div className="jitu-table-stage3d" data-visible={show3d} aria-hidden={!show3d} inert={!show3d}><TableView3D state={state} fallback={arena} /></div>}
        {!show3d && arena}
      </div>
      <TableDock key={`${state.phase}-${state.round}`} state={state} dispatch={dispatch} onShowResult={() => setDismissed(false)} />
      {finished && !dismissed && <ResultPopup state={state} onClose={() => setDismissed(true)} />}
    </div>
    <p className={styles.footer}>Demo simulation · Not saved · No wallet or chain calls</p>
  </div>;
}
