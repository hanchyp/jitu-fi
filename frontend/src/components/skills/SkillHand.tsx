"use client";

// Your skill hand at the table: up to 3 cards, each playable or disabled with its reason, and the
// target picker for the selected card. Max 1 skill per round. Props only; `onUse` does the work.

import { useState } from "react";
import { SKILLS } from "./info";
import { cardBlock } from "./rules";
import { SkillCardFace } from "./SkillCard";
import { SkillPicker } from "./SkillPicker";
import type { SkillCard, SkillHandProps, SkillTarget } from "./types";

const HAND_MAX = 3;

type Cast = { state: "pending" } | { state: "success"; text: string } | { state: "error"; text: string };

function statusLine({ phase, liveDeadlinePassed, usedThisRound }: SkillHandProps) {
  if (usedThisRound) return "You've used this round's skill. Your hand opens again next round.";
  if (phase === "commit") return "BOOST and INSURANCE go on a pick now. Live skills wait for Live.";
  if (phase === "reveal") return "Live skills open when Live starts.";
  if (phase === "result") return "Round over. Your hand opens again next round.";
  if (liveDeadlinePassed) return "Live deadline passed. Your hand opens again next round.";
  return "Pick a card to cast it. One skill per round.";
}

/** What the success line says about the target, e.g. "Flipped your ETH". */
function doneText(card: SkillCard, target: SkillTarget, props: SkillHandProps) {
  const info = SKILLS[card.skill];
  const pick = [...props.ownPicks, ...(props.opponentPicks ?? [])].find((p) => p.id === target.pickId);
  if (!pick) return `${info.done}.`;
  const whose = props.ownPicks.some((p) => p.id === pick.id) ? "your" : `${pick.ownerName}'s`;
  const swap = target.swapTo ? ` for ${target.swapTo.symbol} ${target.swapTo.side}` : "";
  return `${info.done} ${whose} ${pick.symbol}${swap}.`;
}

export function SkillHand(props: SkillHandProps) {
  const { cards, onUse, className = "" } = props;
  const [selectedId, setSelectedId] = useState<string>();
  const [cast, setCast] = useState<Cast>();
  const pending = cast?.state === "pending";
  const selected = cards.find((c) => c.id === selectedId);
  const selectedBlock = selected ? cardBlock(selected, props) : null;

  const use = async (card: SkillCard, target: SkillTarget) => {
    setCast({ state: "pending" });
    try {
      await onUse?.(card, target);
      setCast({ state: "success", text: doneText(card, target, props) });
      setSelectedId(undefined);
    } catch (err) {
      const reason = err instanceof Error && err.message ? err.message : "Try again before the live deadline.";
      setCast({ state: "error", text: `${card.skill} didn't land. ${reason}` });
    }
  };

  return (
    <section aria-label="Your skills" className={`rounded-[22px] border-[3px] border-garis bg-dasar p-4 shadow-[0_6px_0_0_#040B10] sm:p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl text-gading">Your skills</h2>
        <span className="font-display rounded-[7px] border-2 border-garis bg-emas px-1.5 text-sm text-garis">
          {cards.length}/{HAND_MAX}
        </span>
      </div>
      <p className="mt-1 max-w-md text-sm font-semibold leading-relaxed text-white/70">
        {cards.length === 0 ? "No skills in hand. You get one for every round you win." : statusLine(props)}
      </p>

      <ul className="mt-4 grid max-w-md grid-cols-3 gap-3">
        {cards.slice(0, HAND_MAX).map((card) => {
          const block = cardBlock(card, props);
          const active = card.id === selectedId && !block;
          const note = `${card.id}-note`;
          return (
            <li key={card.id} className="flex flex-col">
              <button
                type="button"
                disabled={Boolean(block) || pending}
                aria-pressed={active}
                aria-describedby={note}
                aria-label={`${card.skill}${block ? `, ${block}` : ""}`}
                onClick={() => {
                  setSelectedId(active ? undefined : card.id);
                  setCast(undefined);
                }}
                className={`rounded-[12px] transition-transform duration-150 ${
                  active ? "-translate-y-2 outline outline-[3px] outline-offset-2 outline-emas" : "enabled:hover:-translate-y-1"
                } ${block ? "cursor-not-allowed opacity-55 grayscale" : ""}`}
              >
                <SkillCardFace skill={card.skill} />
              </button>
              <p id={note} className={`mt-2 text-xs leading-snug ${block ? "font-extrabold text-emas" : "font-semibold text-white/70"}`}>
                {block ?? SKILLS[card.skill].effect}
              </p>
            </li>
          );
        })}
        {/* Empty slots show how big the hand can grow. */}
        {Array.from({ length: Math.max(0, HAND_MAX - cards.length) }, (_, i) => (
          <li key={`empty-${i}`} aria-hidden>
            <span className="block aspect-[5/7] w-full rounded-[12px] border-[3px] border-dashed border-papan-terang bg-malam/60" />
          </li>
        ))}
      </ul>

      {selected && !selectedBlock && (
        <div className="mt-4">
          <SkillPicker
            key={selected.id}
            card={selected}
            table={props}
            pending={pending}
            onCancel={() => setSelectedId(undefined)}
            onConfirm={(target) => use(selected, target)}
          />
        </div>
      )}

      {(cast?.state === "success" || cast?.state === "error") && (
        <p
          role={cast.state === "error" ? "alert" : "status"}
          className={`mt-4 flex items-center gap-2 rounded-[14px] border-[3px] border-garis bg-malam px-3 py-2 text-sm font-extrabold ${
            cast.state === "error" ? "text-turun" : "text-zamrud"
          }`}
        >
          {cast.text}
        </p>
      )}
    </section>
  );
}
