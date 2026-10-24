"use client";
import { useState } from "react";
import { useTable } from "@/lib/game/useTable";
import { postPicks, postSkill } from "@/lib/game/api";
import { toDemoState } from "@/lib/game/toDemoState";
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
  if (!table.state) return <div className="jitu-table-app"><p role="status">{table.status === "notfound" ? "Table not found" : table.error || "Preparing the arena…"}</p></div>;
  const state = toDemoState(table.state, table.now, table.prices);
  if (state.phase === "commit" && !state.locked && draft?.round === state.round) state.picks = draft.picks;
  state.lockingUntil = pending ? Number.MAX_SAFE_INTEGER : 0;
  state.error = actionError || table.error || (table.state.seats.find((seat) => seat.seat === 0)?.hand ? "" : "Sign in to play");
  const attackKey = JSON.stringify(state.incoming);
  if (dismissedAttack === attackKey) state.incoming = null;
  const dispatch = (action: DemoAction) => {
    if (action.type === "dismiss-incoming") { setDismissedAttack(attackKey); return; }
    if (pending) return;
    if (action.type === "lock") {
      if (state.phase !== "commit" || state.remaining <= 0 || !state.picks.length) return;
      setPending(true); setActionError("");
      void postPicks(id, toPickSubmissions(state.picks)).then(() => table.refetch()).catch((err) => setActionError(commitErrorMessage(err))).finally(() => setPending(false));
    } else if (action.type === "cast") {
      if (state.phase !== "live" || state.remaining <= 0) return;
      const [owner, index] = action.target.pickId.split(":");
      const targetSeat = ["you", "bruno", "bera", "dex"].indexOf(owner);
      const targetCoin = table.state!.rounds.find((r) => r.n === table.state!.round)?.picks[targetSeat]?.[Number(index)]?.coin;
      if (targetSeat < 0 || !targetCoin) return;
      setPending(true); setActionError("");
      void postSkill(id, { skill: action.skill, targetSeat, targetCoin, swapTo: action.target.swapTo?.symbol }).then(() => table.refetch()).catch((err) => setActionError(commitErrorMessage(err))).finally(() => setPending(false));
    } else if (["select", "direction", "skill"].includes(action.type) && state.phase === "commit" && state.remaining > 0) {
      const next = demoReducer(state, action);
      setDraft({ round: state.round, picks: next.picks }); setActionError(next.error);
    }
  };
  const finalScores = state.phase === "finished" ? gameScores(state) : null;
  const winners = finalScores ? Object.keys(finalScores).filter((seat) => finalScores[seat] === Math.max(...Object.values(finalScores))) : roundResult(state).winners;
  return <div className="jitu-table-app">
    <header className={styles.tableHeader}><div><h1 className={styles.heading}>{state.preset.name} · {state.phase === "finished" ? "Game complete" : `Round ${state.round + 1}/${state.preset.caps.length}`}</h1><div className={styles.headerMeta}><span>{state.phase}</span><span>Table #{id}</span><span>Pick up to {state.preset.caps[state.round]}</span></div></div><span className={styles.clockValue} aria-label={`${state.remaining} seconds remaining`}>{state.remaining}s</span></header>
    <div className="jitu-table-session"><div className="jitu-table-board"><ArenaTable state={state} dispatch={dispatch} winners={winners} /></div>
      <TableDock key={`${state.phase}-${state.round}`} state={state} dispatch={dispatch} onShowResult={() => setDismissed(false)} />
      {state.phase === "finished" && !dismissed && <ResultPopup state={state} onClose={() => setDismissed(true)} />}
    </div><p className={styles.footer}>Server game · House bots never earn season points</p>
  </div>;
}
