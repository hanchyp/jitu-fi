"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { DEMO_SEASON, durationRange, getPreset, PRESETS } from "@/mocks/table";
import { GameArena } from "./GameArena";

export type LobbyState = "ready" | "season-closing" | "active-table" | "outside-k";

export function PlayLobby({ initialState = "ready" }: { initialState?: LobbyState }) {
  const router = useRouter();
  const [presetId, setPresetId] = useState("quick");
  const [view, setView] = useState(initialState);
  const [pending, setPending] = useState(false);
  const preset = getPreset(presetId);
  const blocked = view === "season-closing";
  function play() {
    if (blocked || pending) return;
    setPending(true);
    router.push(view === "active-table" ? "/table/demo-quick?preset=quick" : `/table/demo-${preset.id}?preset=${preset.id}${view === "outside-k" ? "&scenario=outside-k" : ""}`);
  }
  return <>
    <GameArena lobby />
    <header className="lobby-title">
      <h1 className="font-display title-outline text-gading">Your next clash awaits.</h1>
      <p>Face three house bots. Your principal stays safe.</p>
    </header>
    <div className="lobby-crystal-space" aria-hidden="true" />
    <section className="lobby-controls" aria-label="Choose your clash">
      <div className="lobby-modes" role="group" aria-label="Choose game length">
        {PRESETS.map((item) => <button key={item.id} type="button" className="lobby-mode" aria-pressed={presetId === item.id} onClick={() => setPresetId(item.id)} disabled={pending}>
          <span className="lobby-mode-heading"><span className="font-display">{item.name}</span><span className="lobby-check" aria-hidden="true">{presetId === item.id ? "✓" : ""}</span></span>
          <span>{item.caps.length} rounds <span className="lobby-recommended">{item.id === "quick" ? "Recommended" : durationRange(item)}</span></span>
        </button>)}
      </div>
      <p className="lobby-detail" aria-live="polite">{preset.caps.length} rounds / Pick caps {preset.caps.join("–")} / {durationRange(preset)}</p>
      {view !== "ready" && <p role="status" className="lobby-notice">
        {view === "season-closing" && <>Season closing. A full game won’t fit before maturity. Play next season.</>}
        {view === "active-table" && <>Your table is in progress. Finish it before starting another.</>}
        {view === "outside-k" && <>Counted games complete. Play for practice; no season points added.</>}
      </p>}
      <div className="lobby-action">
        <GameActionButton size="lg" disabled={blocked || pending} onClick={play} aria-busy={pending}>{pending ? "Preparing arena…" : view === "active-table" ? "Return to table" : `Play ${preset.name}`}</GameActionButton>
        <p>Counted games <strong>{view === "outside-k" ? DEMO_SEASON.countedGames : DEMO_SEASON.gamesPlayed}/{DEMO_SEASON.countedGames}</strong><span> / No entry fee</span></p>
      </div>
    </section>
    {process.env.NODE_ENV === "development" && <details className="lobby-demo">
      <summary>Demo controls</summary><label>Lobby state <select value={view} disabled={pending} onChange={(event) => setView(event.target.value as LobbyState)}>
        <option value="ready">Ready</option><option value="season-closing">Season almost over</option><option value="active-table">Table in progress</option><option value="outside-k">Counted games used</option>
      </select></label>
    </details>}
  </>;
}
