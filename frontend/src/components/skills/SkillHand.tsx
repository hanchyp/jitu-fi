"use client";

import type { SkillCard, SkillHandProps, SkillName } from "./types";

const COPY: Record<SkillName, { label: string; body: string }> = {
  BOOST: { label: "Boost", body: "Double this pick's weight." },
  INSURANCE: { label: "Insurance", body: "Floor this pick at zero." },
  LOCK: { label: "Lock", body: "Seal your pick in place." },
  FLIP: { label: "Flip", body: "Reverse your pick's call." },
  SWAP: { label: "Swap", body: "Trade your pick for another call." },
  FREEZE: { label: "Freeze", body: "Freeze one opponent pick." },
};

const art = (skill: SkillName) => `/assets/skills/${skill.toLowerCase()}.webp`;

function cardDisabled(card: SkillCard, live: boolean, used: boolean) {
  return card.disabled || !live || used;
}

export function SkillHand({
  cards,
  targets = [],
  selectedId,
  selectedTargetId,
  usedThisRound = false,
  live = true,
  onSelect,
  onTargetSelect,
  onCast,
  className = "",
}: SkillHandProps) {
  const selected = cards.find((card) => card.id === selectedId);
  const target = targets.find((item) => item.id === selectedTargetId);
  const disabled = selected ? cardDisabled(selected, live, usedThisRound) : true;
  const status = !live ? "Skills open during Live." : usedThisRound ? "One skill per round." : "Choose a skill, then its target.";

  return (
    <section aria-label="Skill hand" className={`rounded-2xl border-[3px] border-garis bg-dasar p-3 shadow-[0_5px_0_#040b10] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-emas">Your hand</p>
          <p className="text-sm font-bold text-white/70">{status}</p>
        </div>
        <span className="rounded-full border-2 border-garis bg-papan px-2 py-0.5 text-xs font-extrabold text-gading">{cards.length}/3</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {cards.map((card) => {
          const info = COPY[card.skill];
          const inactive = cardDisabled(card, live, usedThisRound);
          const active = card.id === selectedId;
          return (
            <button
              key={card.id}
              type="button"
              disabled={inactive}
              aria-pressed={active}
              onClick={() => onSelect?.(card)}
              title={card.disabledReason}
              className={`group relative overflow-hidden rounded-xl border-[3px] text-left transition ${
                active ? "-translate-y-1 border-emas bg-papan-terang shadow-[0_5px_0_#a17728]" : "border-garis bg-papan hover:-translate-y-0.5 hover:bg-papan-terang"
              } ${inactive ? "cursor-not-allowed opacity-50 grayscale" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- game asset from public folder */}
              <img src={art(card.skill)} alt="" className="mx-auto aspect-square w-full object-contain p-1" />
              <span className="block border-t-2 border-garis bg-dasar px-1.5 py-1 text-center font-display text-sm text-gading">{info.label}</span>
            </button>
          );
        })}
      </div>

      {selected && !disabled && (
        <div className="mt-3 rounded-xl border-2 border-garis bg-papan p-3">
          <p className="font-display text-lg text-gading">{COPY[selected.skill].label}</p>
          <p className="text-sm font-bold text-white/70">{COPY[selected.skill].body}</p>
          <div className="mt-2 flex flex-wrap gap-2" aria-label="Pick a target">
            {targets.map((item) => (
              <button
                key={item.id}
                type="button"
                disabled={item.affected}
                aria-pressed={item.id === selectedTargetId}
                onClick={() => onTargetSelect?.(item)}
                className={`rounded-lg border-2 border-garis px-2 py-1 text-sm font-extrabold ${
                  item.id === selectedTargetId ? "bg-emas text-garis" : "bg-dasar text-gading hover:bg-papan-terang"
                } ${item.affected ? "cursor-not-allowed opacity-45 line-through" : ""}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button
            type="button"
            disabled={!target || !onCast}
            onClick={() => target && onCast?.(selected, target)}
            className="mt-3 w-full rounded-lg border-2 border-garis bg-emas px-3 py-2 font-display text-lg text-garis disabled:cursor-not-allowed disabled:opacity-45"
          >
            Cast {COPY[selected.skill].label}
          </button>
        </div>
      )}
    </section>
  );
}
