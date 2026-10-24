"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { DEMO_SEASON, durationRange, getPreset, PRESETS } from "@/mocks/table";
import { getRunningTable, getSessionAddress, postPlay, type PlayError } from "@/lib/game/play";
import { GameArena } from "./GameArena";

export type LobbyState = "ready" | "season-closing" | "active-table" | "outside-k";

// Match the tutorial's selection pop and slide, and the landing CTA entrance.
const POP = { type: "spring", stiffness: 420, damping: 20 } as const;
const SLIDE = { duration: 0.25, ease: "easeOut" } as const;
const CTA_POP = { type: "spring", stiffness: 380, damping: 16 } as const;
const INSTANT = { duration: 0 } as const;

export function PlayLobby({ initialState = "ready", preview = false }: { initialState?: LobbyState; preview?: boolean }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [presetId, setPresetId] = useState("quick");
  const [direction, setDirection] = useState(1);
  const [view, setView] = useState(initialState);
  const [pending, setPending] = useState(false);
  const [demo, setDemo] = useState<boolean | null>(null);
  const [runningTable, setRunningTable] = useState<number | null>(null);
  const [error, setError] = useState<PlayError | null>(null);
  const [resuming, setResuming] = useState(false);
  useEffect(() => {
    let active = true;
    const address = getSessionAddress();
    const useDemo = preview || process.env.NEXT_PUBLIC_USE_MOCKS === "1" || !address;
    // Read browser storage after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDemo(useDemo);
    if (!useDemo && address) void getRunningTable(address).then((result) => {
      if (!active) return;
      if (result.ok) setRunningTable(result.data.tableId);
      else setError(result);
    });
    return () => { active = false; };
  }, [preview]);
  const preset = getPreset(presetId);
  const blocked = view === "season-closing";
  function selectPreset(id: string) {
    if (pending || id === presetId) return;
    setDirection(PRESETS.findIndex((item) => item.id === id) > PRESETS.findIndex((item) => item.id === presetId) ? 1 : -1);
    setPresetId(id);
    setError(null);
  }
  const label = pending ? resuming ? "Resuming your table" : "Preparing arena…" : view === "active-table" ? "Return to table" : `Play ${preset.name}`;
  async function play() {
    if (blocked || pending || demo === null) return;
    setPending(true);
    if (!demo) {
      setError(null);
      const result = await postPlay(preset.id);
      if (result.ok) { router.push(`/table/${result.data.tableId}`); return; }
      if (result.code === "ALREADY_AT_TABLE" && result.tableId) {
        setResuming(true);
        router.push(`/table/${result.tableId}`);
        return;
      }
      setError(result);
      setPending(false);
      return;
    }
    router.push(view === "active-table" ? "/table/demo-quick?preset=quick" : `/table/demo-${preset.id}?preset=${preset.id}${view === "outside-k" ? "&scenario=outside-k" : ""}`);
  }
  return <>
    <GameArena lobby />
    <header className="lobby-title">
      <h1 className="font-display title-outline text-gading">Your next clash awaits.</h1>
      <p>Face three house bots. Your principal stays safe.</p>
    </header>
    <div className="lobby-crystal-space" aria-hidden="true" />
    <motion.section className="lobby-controls" aria-label="Choose your clash"
      initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={reduce ? INSTANT : CTA_POP}>
      <div className="lobby-modes" role="group" aria-label="Choose game length">
        {PRESETS.map((item) => <motion.button key={item.id} type="button" className="lobby-mode" aria-pressed={presetId === item.id} onClick={() => selectPreset(item.id)} disabled={pending}
          initial={false} animate={{ scale: presetId === item.id ? 1.02 : 1 }} transition={reduce ? INSTANT : POP}>
          <span className="lobby-mode-heading"><span className="font-display">{item.name}</span><motion.span className="lobby-check" aria-hidden="true"
            initial={false} animate={{ scale: presetId === item.id ? 1 : 0, opacity: presetId === item.id ? 1 : 0 }} transition={reduce ? INSTANT : POP}>✓</motion.span></span>
          <span>{item.caps.length} rounds <span className="lobby-recommended">{item.id === "quick" ? "Recommended" : durationRange(item)}</span></span>
        </motion.button>)}
      </div>
      {/* Replace immediately, without waiting for exits or retaining stale live-region text. */}
      <p className="lobby-detail" aria-live="polite"><motion.span key={preset.id} className="lobby-changing-text"
        initial={{ opacity: 0, x: direction * 8 }} animate={{ opacity: 1, x: 0 }} transition={reduce ? INSTANT : SLIDE}>
        {preset.caps.length} rounds / Pick caps {preset.caps.join("–")} / {durationRange(preset)}
      </motion.span></p>
      {error && <div className="lobby-notice" role="status">
        {error.message} {error.code === "NO_POSITION" && <GameButton href="/deposit" variant="night" size="sm">Deposit mUSD</GameButton>}
      </div>}
      {runningTable && !demo && <div className="lobby-resume"><GameButton href={`/table/${runningTable}`} variant="night" size="sm">Resume your table</GameButton></div>}
      {view !== "ready" && <motion.p key={view} role="status" className="lobby-notice"
        initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? INSTANT : SLIDE}>
        {view === "season-closing" && <>Season closing. A full game won’t fit before maturity. Play next season.</>}
        {view === "active-table" && <>Your table is in progress. Finish it before starting another.</>}
        {view === "outside-k" && <>Counted games complete. Play for practice; no season points added.</>}
      </motion.p>}
      <div className="lobby-action">
        <GameActionButton size="lg" disabled={blocked || pending || demo === null} onClick={play} aria-busy={pending}>
          <motion.span key={label} className="lobby-changing-text" initial={{ opacity: 0, x: direction * 8 }} animate={{ opacity: 1, x: 0 }} transition={reduce ? INSTANT : SLIDE}>{label}</motion.span>
        </GameActionButton>
        {demo && <p className="lobby-demo-note">Demo mode: using sample data.</p>}
        <p>{demo && <>Counted games <strong>{view === "outside-k" ? DEMO_SEASON.countedGames : DEMO_SEASON.gamesPlayed}/{DEMO_SEASON.countedGames}</strong><span> / </span></>}No entry fee</p>
      </div>
    </motion.section>
    {process.env.NODE_ENV === "development" && <details className="lobby-demo">
      <summary>Demo controls</summary><label>Lobby state <select value={view} disabled={pending} onChange={(event) => { setView(event.target.value as LobbyState); setDemo(true); setError(null); }}>
        <option value="ready">Ready</option><option value="season-closing">Season almost over</option><option value="active-table">Table in progress</option><option value="outside-k">Counted games used</option>
      </select></label>
    </details>}
  </>;
}
