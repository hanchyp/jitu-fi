"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { DEMO_SEASON, durationRange, getPreset, PRESETS } from "@/mocks/table";
import { GameArena } from "./GameArena";
import { PresetStone } from "./PresetStone";
import styles from "./game-styles";

export type LobbyState = "ready" | "season-closing" | "active-table" | "outside-k";

export function PlayLobby({ initialState = "ready" }: { initialState?: LobbyState }) {
  const router = useRouter();
  const [presetId, setPresetId] = useState("quick");
  const [view, setView] = useState(initialState);
  const [pending, setPending] = useState(false);
  const preset = getPreset(presetId);
  const blocked = view === "season-closing" || view === "active-table";
  function play() {
    if (blocked || pending) return;
    setPending(true);
    router.push(`/table/demo-${preset.id}?preset=${preset.id}${view === "outside-k" ? "&scenario=outside-k" : ""}`);
  }
  return <>
    <header className={styles.playHero}>
      <h1 className={styles.heading}>Your next clash awaits.</h1>
      <p className={styles.muted}>Pick your pace. Face three house bots.<br />Your calls compete. Your principal stays safe.</p>
    </header>
    <GameArena lobby />
    <div className={styles.presetGrid} role="group" aria-label="Choose game length">
      {PRESETS.map((item, index) => <button key={item.id} type="button" className={styles.preset} aria-pressed={presetId === item.id} onClick={() => setPresetId(item.id)} disabled={pending}>
        <span className={styles.presetTop}><span className={styles.presetTitle}>{item.name}</span><span className={styles.radio} aria-hidden="true" /></span>
        <span className={styles.roundCount}><strong>{item.caps.length}</strong><span>rounds</span><span className={styles.stoneArt}><PresetStone tier={index + 1} /></span></span>
        <span className={styles.small}>Max. coins per round</span>
        <span className={styles.caps} aria-label={`Pick caps: ${item.caps.join(", ")}`}>{item.caps.map((cap, i) => <span key={i} className={styles.cap}>{cap}</span>)}</span>
        <span className={styles.small}>{item.description}</span>
        <span className={styles.duration}>{durationRange(item)}</span>
      </button>)}
    </div>
    {view === "season-closing" && <div role="status" className={styles.notice}><strong>The season is almost over.</strong> A full game won’t fit before maturity. Return when the next season opens.</div>}
    {view === "active-table" && <div role="status" className={styles.notice}><strong>You have a table in progress.</strong> Finish it before starting another. <Link href="/table/demo-quick?preset=quick">Return to your table</Link></div>}
    {view === "outside-k" && <div role="status" className={styles.notice}>Your first {DEMO_SEASON.countedGames} games are complete. Keep playing for practice; this game won’t add season points.</div>}
    <div className={styles.playActions}>
      <div><strong>Counted games {view === "outside-k" ? 2 : DEMO_SEASON.gamesPlayed}/{DEMO_SEASON.countedGames}</strong><p className={styles.small}>Only your first {DEMO_SEASON.countedGames} games add season points. No entry fee.</p></div>
      <GameActionButton size="lg" disabled={blocked || pending} onClick={play}>{pending ? "Preparing arena…" : `Play ${preset.name}`}</GameActionButton>
    </div>
    <p className={styles.footer}>1 challenger + Bruno, Bera &amp; Dex. House bots never earn season points.</p>
    <details className={styles.preview} open={initialState !== "ready"}>
      <summary>Demo controls</summary><div className={styles.previewControls}><label>Lobby state <select value={view} disabled={pending} onChange={(event) => setView(event.target.value as LobbyState)}>
        <option value="ready">Ready</option><option value="season-closing">Season almost over</option><option value="active-table">Table in progress</option><option value="outside-k">Counted games used</option>
      </select></label><span>UI preview with dummy data.</span></div>
    </details>
  </>;
}
