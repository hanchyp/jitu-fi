"use client";

import dynamic from "next/dynamic";
import { useReducedMotion } from "motion/react";
import { Component, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import type { Phase } from "@/mocks/table";
import styles from "./game-styles";

const Scene = dynamic(() => import("./GameArenaScene"), { ssr: false, loading: () => <ArenaFallback /> });
const subscribe = () => () => {};
let supported: boolean | undefined;
function webglSupported() {
  if (supported !== undefined) return supported;
  try {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("webgl2");
    supported = Boolean(context);
    context?.getExtension("WEBGL_lose_context")?.loseContext();
  } catch { supported = false; }
  return supported;
}

function ArenaFallback({ phase = "commit", selected = 0, locked = false, winners = [] }: { phase?: Phase; selected?: number; locked?: boolean; winners?: string[] }) {
  return <div className={styles.fallback} data-testid="arena-fallback">
    <div className={styles.fallbackPlatform}><div className={styles.fallbackRunes} />
      {["#daae4b", "#7be35a", "#5aa9ff", "#ff6b5e"].map((color, i) => <div key={color} className={styles.fallbackSeat} data-active={phase === "results" || phase === "finished" ? winners.includes(["you", "bruno", "bera", "dex"][i]) : phase === "commit" ? i === 0 && (selected > 0 || locked) : true} style={{ "--seat": color, left: `${i % 2 ? 73 : 15}%`, top: `${i < 2 ? 60 : 15}%` } as CSSProperties} />)}
    </div><div className={styles.fallbackCrystal} />
  </div>;
}

class ArenaBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <ArenaFallback /> : this.props.children; }
}

export function GameArena({ phase = "commit", selected = 0, locked = false, winners = [], lobby = false }: {
  phase?: Phase; selected?: number; locked?: boolean; winners?: string[]; lobby?: boolean;
}) {
  const reduce = useReducedMotion();
  const webgl = useSyncExternalStore(subscribe, webglSupported, () => false);
  return <div className={`${styles.arena} ${lobby ? styles.playArena : styles.tableArena}`}>
    <div className={styles.arenaCanvas} aria-hidden="true">
      <ArenaBoundary>{webgl && !reduce ? <Scene phase={phase} selected={selected} locked={locked} winners={winners} /> : <ArenaFallback phase={phase} selected={selected} locked={locked} winners={winners} />}</ArenaBoundary>
      {!reduce && (locked || phase === "reveal" || phase === "results") && <div key={`${phase}-${locked}`} className={styles.arenaSignal} />}
    </div>
    {!lobby && <p className={styles.arenaStatus}>{phase === "commit" ? locked ? "Picks sealed. Your podium is ready." : "Choose your coins. Take your place in the arena." : phase === "reveal" ? "The podiums awaken. Picks are revealed." : phase === "live" ? "The round is live. Watch your calls play out." : phase === "results" ? "The winning podiums light up." : "A clash well played. Your principal stays safe."}</p>}
    <p className={styles.arenaCaption}>Principal Crystal · Always protected</p>
  </div>;
}
