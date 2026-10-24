"use client";

import Image from "next/image";
import { useCallback, useState } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { SkillHand } from "@/components/skills/SkillHand";
import { IncomingSkillToast } from "@/components/skills/IncomingSkillToast";
import type { CoinSymbol } from "@/components/table-scene/types";
import { COINS, PLAYERS } from "@/mocks/table";
import { castLiveSkill, skillPicks, type DemoAction, type DemoState } from "./demo-engine";

export function TableDock({ state, dispatch, onShowResult }: { state: DemoState; dispatch: (action: DemoAction) => void | Promise<void>; onShowResult: () => void }) {
  const [historyRound, setHistoryRound] = useState(0);
  const commitPick = state.picks.find((pick) => pick.skill);
  const targets = skillPicks(state);
  const dismissIncoming = useCallback(() => dispatch({ type: "dismiss-incoming" }), [dispatch]);
  const editable = state.phase === "commit" && !state.locked && !state.lockingUntil;
  const cap = state.preset.caps[state.round];
  const finished = state.phase === "finished";
  const result = state.phase === "results" ? state.history.at(-1) : null;
  const names = result?.winners.map((id) => PLAYERS.find((player) => player.id === id)!.name).join(" & ");
  return <section className="jitu-table-dock" data-phase={state.phase} aria-label="Table actions">
    {state.toast && state.phase === "results" && <p className="jitu-table-winToast" role="status"><Image src="/assets/table-fx/skill-gained.webp" alt="" width={32} height={32} />{state.toast}</p>}
    {state.phase === "live" && <IncomingSkillToast incoming={state.incoming} onClose={dismissIncoming} inline />}
    <div className="jitu-table-dockBody">
      <div className="jitu-table-dockTitle"><h2>{finished ? "Game complete" : result ? `${names} ${result.winners.length > 1 ? "tie" : "wins"} the round!` : state.phase === "commit" ? state.locked ? "Picks sealed" : "Your move" : state.phase === "reveal" ? "Picks revealed" : "Round live"}</h2>
        <p>{finished ? "Final scores sit at every seat. Your principal stays safe." : result ? `Round ${state.round + 1} settled. ${state.paused ? "Demo paused." : `Continuing in ${state.remaining}s.`}` : state.phase === "commit" ? `${state.picks.length}/${cap} picks${state.picks.length > 0 && state.picks.length < cap ? " · Confidence play" : ""}. Choose Buy or Sell on the table.` : !state.locked ? "Forfeit: no sealed picks. You can play the next round." : state.phase === "reveal" ? "Every seat opens its picks. Commit skills are now visible." : "Scores follow your calls. Moves under 1 bps are void."}</p>
      </div>
      {result && <div className="jitu-table-resultScores">{PLAYERS.map((player) => <span key={player.id}>{player.name}<strong>{result.scores[player.id]}</strong></span>)}</div>}
      {finished ? <GameActionButton size="sm" className="jitu-table-showResult" onClick={onShowResult}>Show result</GameActionButton> : result ? <GameActionButton size="sm" onClick={() => dispatch({ type: "advance", now: Date.now() })}>{state.round === state.preset.caps.length - 1 ? "Final scores" : "Next round"}</GameActionButton> : state.phase === "commit" ? <GameActionButton size="sm" disabled={!editable || !state.picks.length} onClick={() => dispatch({ type: "lock", now: Date.now() })}>{state.lockingUntil ? "Locking…" : state.locked ? "Locked ✓" : "Lock picks"}</GameActionButton> : <span className="jitu-table-wait">{state.phase === "reveal" ? "Revealing…" : "Live"}</span>}
    </div>
    {(state.phase === "commit" || state.phase === "live") && <SkillHand compact
      cards={state.hand.map((skill, index) => ({ id: `hand-${index}-${skill}`, skill }))}
      phase={state.phase === "commit" && !editable ? "reveal" : state.phase}
      usedThisRound={Boolean(commitPick) || state.usedSkills.includes("you")}
      liveDeadlinePassed={state.remaining <= 0}
      ownPicks={targets.filter((pick) => pick.ownerId === "you")}
      opponentPicks={targets.filter((pick) => pick.ownerId !== "you")}
      boardCoins={COINS.filter((coin) => !state.server || state.server.coins.includes(coin.symbol)).map((coin) => coin.symbol as CoinSymbol)}
      onUse={(card, target) => {
        if (card.skill === "BOOST" || card.skill === "INSURANCE") {
          const pick = targets.find((pick) => pick.id === target.pickId);
          if (pick && editable) dispatch({ type: "skill", symbol: pick.symbol, skill: card.skill });
        } else {
          const now = Date.now();
          if (!state.server && castLiveSkill(state, "you", card.skill, target, now) === state) throw new Error("That target is no longer available. Check the Live deadline and choose again.");
          return dispatch({ type: "cast", skill: card.skill, target, now });
        }
      }}
    />}
    {state.phase === "commit" && commitPick && <div className="jitu-table-commitSkill"><span>{commitPick.skill} on {commitPick.symbol}</span>{editable && <GameActionButton variant="night" size="sm" onClick={() => dispatch({ type: "skill", symbol: commitPick.symbol })}>Clear skill</GameActionButton>}</div>}
    {state.error && <p role="alert" className="jitu-table-error">{state.error}</p>}
    {finished && <details className="jitu-table-history"><summary>Round scores</summary><div><label>Round <select aria-label="View round scores" value={historyRound} onChange={(event) => setHistoryRound(Number(event.target.value))}>{state.history.map((_, index) => <option key={index} value={index}>{index + 1}</option>)}</select></label><div className="jitu-table-resultScores">{PLAYERS.map((player) => <span key={player.id}>{player.name}<strong>{state.history[historyRound]?.scores[player.id] ?? 0}</strong></span>)}</div></div></details>}
  </section>;
}
