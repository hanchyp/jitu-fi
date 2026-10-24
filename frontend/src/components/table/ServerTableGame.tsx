"use client";
import { useState } from "react";
import { useTable } from "@/lib/game/useTable";
import { postPicks, postSkill } from "@/lib/game/api";
import { toDemoState } from "@/lib/game/toDemoState";
import { skillErrorMessage } from "@/lib/game/skills";
import { TableView3D } from "@/components/table-scene";
import { commitErrorMessage, toPickSubmissions } from "@/lib/game/picks";
import type { Pick } from "@/mocks/table";
import { ArenaTable } from "./ArenaTable";
import { TableDock } from "./TableDock";
import { ResultPopup } from "./ResultPopup";
import { demoReducer, gameScores, roundResult, type DemoAction } from "./demo-engine";
import styles from "./game-styles";

export function ServerTableGame({ id }: { id: number }) {
  const table = useTable(id);
  const [draft, setDraft] = useState<{ round: number; picks: Pick[] } | null>(null);
  const [pending, setPending] = useState(false);
  const [actionError, setActionError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const [dismissedAttack, setDismissedAttack] = useState<string | null>(null);
  const [view3d, setView3d] = useState(false);
  const [sceneLoaded, setSceneLoaded] = useState(false);
  if (!table.state) return <div className="jitu-table-app"><p role="status">{table.status === "notfound" ? "Table not found" : table.error || "Preparing the arena…"}</p></div>;
  const state = toDemoState(table.state, table.now, table.prices);
  if (state.phase === "commit" && !state.locked && draft?.round === state.round) state.picks = draft.picks;
  state.lockingUntil = pending ? Number.MAX_SAFE_INTEGER : 0;
  state.error = actionError || table.error || (table.state.seats.find((seat) => seat.seat === 0)?.hand ? "" : "Sign in to play");
  const attackKey = JSON.stringify([state.round, state.incoming]);
  if (dismissedAttack === attackKey) state.incoming = null;
  const dispatch = (action: DemoAction) => {
    if (action.type === "dismiss-incoming") { setDismissedAttack(attackKey); return; }
    if (pending) return;
    if (action.type === "lock") {
      if (state.phase !== "commit" || state.remaining <= 0 || !state.picks.length) return;
      setPending(true); setActionError("");
      void postPicks(id, toPickSubmissions(state.picks)).then(() => table.refetch()).catch((err) => setActionError(commitErrorMessage(err))).finally(() => setPending(false));
    } else if (action.type === "cast") {
      if (state.phase !== "live" || state.remaining <= 0) throw new Error(skillErrorMessage("LIVE_DEADLINE_PASSED"));
      if (state.usedSkills.includes("you")) throw new Error(skillErrorMessage("ALREADY_USED_SKILL"));
      const [owner, index] = action.target.pickId.split(":");
      const targetSeat = ["you", "bruno", "bera", "dex"].indexOf(owner);
      const targetCoin = table.state!.rounds.find((r) => r.n === table.state!.round)?.picks[targetSeat]?.[Number(index)]?.coin;
      if (targetSeat < 0 || !targetCoin) throw new Error(skillErrorMessage("NO_SUCH_PICK"));
      setPending(true); setActionError("");
      return postSkill(id, { skill: action.skill, targetSeat, targetCoin, swapTo: action.target.swapTo?.symbol }).then(() => table.refetch()).catch((err) => { const message = skillErrorMessage(err); setActionError(message); throw new Error(message); }).finally(() => setPending(false));
    } else if (["select", "direction", "skill"].includes(action.type) && state.phase === "commit" && state.remaining > 0) {
      const next = demoReducer(state, action);
      setDraft({ round: state.round, picks: next.picks }); setActionError(next.error);
    }
  };
  const finalScores = state.phase === "finished" ? gameScores(state) : null;
  const winners = finalScores ? Object.keys(finalScores).filter((seat) => finalScores[seat] === Math.max(...Object.values(finalScores))) : roundResult(state).winners;
  const arena = <ArenaTable state={state} dispatch={dispatch} winners={winners} />;
  const show3d = view3d && state.phase !== "commit";
  const ticks = Object.entries(table.prices).map(([coin, price]) => ({ coin, ...price }));
  return <div className="jitu-table-app">
    <header className={styles.tableHeader}><div><h1 className={styles.heading}>{state.preset.name} · {state.phase === "finished" ? "Game complete" : `Round ${state.round + 1}/${state.preset.caps.length}`}</h1><div className={styles.headerMeta}><span>{state.phase}</span><span>Table #{id}</span><span>Pick up to {state.preset.caps[state.round]}</span></div></div><div className="jitu-table-hudEnd"><div className="jitu-table-viewToggle" role="group" aria-label="Table view">{(["2D", "3D"] as const).map((view) => <button key={view} type="button" aria-pressed={view3d === (view === "3D")} onClick={() => { setView3d(view === "3D"); if (view === "3D") setSceneLoaded(true); }}>{view}</button>)}</div><span className={styles.clockValue} aria-label={`${state.remaining} seconds remaining`}>{state.remaining}s</span></div></header>
    <div className="jitu-table-session"><div className="jitu-table-board">{sceneLoaded && <div className="jitu-table-stage3d" data-visible={show3d} aria-hidden={!show3d} inert={!show3d}><TableView3D source="server" state={table.state} options={{ ticks }} fallback={arena} /></div>}{!show3d && arena}</div>
      <TableDock key={`${state.phase}-${state.round}`} state={state} dispatch={dispatch} onShowResult={() => setDismissed(false)} />
      {state.phase === "finished" && !dismissed && <ResultPopup state={state} tableId={id} onClose={() => setDismissed(true)} />}
    </div><p className={styles.footer}>Server game · House bots never earn season points</p>
  </div>;
}
