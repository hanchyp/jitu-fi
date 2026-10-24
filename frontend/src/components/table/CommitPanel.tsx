"use client";

import type { Dispatch } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import type { DemoAction, DemoState } from "./demo-engine";
import styles from "./game-styles";

export function CommitPanel({ state, dispatch }: { state: DemoState; dispatch: Dispatch<DemoAction> }) {
  const cap = state.preset.caps[state.round];
  const editable = state.phase === "commit" && !state.locked && !state.lockingUntil;
  return <aside className={styles.commitPanel} aria-labelledby="picks-title">
    <h2 id="picks-title" className={styles.heading}>{state.locked ? "Picks sealed" : "Your picks"}</h2>
    <p className={styles.small}>{state.picks.length}/{cap} selected. Buy or Sell each coin.</p>
    <div className={styles.selectedPicks}>
      {!state.picks.length && <p className={styles.muted}>Choose a coin from the board to begin.</p>}
      {state.picks.map((pick) => <div key={pick.symbol}>
        <div className={styles.selectedPick}><span className={pick.direction === "Buy" ? styles.buy : styles.sell}>{pick.direction}</span> {pick.symbol}{editable && <button aria-label={`Remove ${pick.symbol} pick`} onClick={() => dispatch({ type: "select", symbol: pick.symbol })}>Remove</button>}</div>
        {editable ? <div className={styles.skillSlot} aria-label={`${pick.symbol} commit skill`}>
          {(["BOOST", "INSURANCE"] as const).map((skill) => <button key={skill} disabled={!state.hand.includes(skill)} title={skill === "BOOST" ? "This pick has double weight in your average." : "This pick’s return cannot score below zero."} aria-pressed={pick.skill === skill} onClick={() => dispatch({ type: "skill", symbol: pick.symbol, skill: pick.skill === skill ? undefined : skill })}>{skill}{!state.hand.includes(skill) ? " · Not held" : ""}</button>)}
        </div> : pick.skill && <span className={styles.skillLabel}>{pick.skill}</span>}
      </div>)}
    </div>
    {state.picks.length > 0 && state.picks.length < cap && <p className={styles.confidence}>Confidence play · Fewer picks, stronger conviction.</p>}
    <p className={styles.small}>One skill on one pick per round. Hand: {state.hand.length ? state.hand.join(", ") : "empty"} ({state.hand.length}/3).</p>
    {state.error && <p role="alert" className={styles.error}>{state.error}</p>}
    <GameActionButton data-lock disabled={!editable || !state.picks.length} onClick={() => dispatch({ type: "lock", now: Date.now() })}>{state.lockingUntil ? "Locking picks…" : state.locked ? "Picks locked ✓" : "Lock picks"}</GameActionButton>
    <p className={styles.small}>{state.locked ? "Your picks will reveal automatically." : "Lock before the countdown ends. Unlocked picks forfeit this round."}</p>
  </aside>;
}
