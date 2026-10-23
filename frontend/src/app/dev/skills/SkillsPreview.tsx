"use client";

import { useState } from "react";
import { SkillEffect, SkillHand, type SkillCard, type SkillTarget } from "@/components/skills";

const CARDS: SkillCard[] = [
  { id: "boost", skill: "BOOST" },
  { id: "flip", skill: "FLIP" },
  { id: "freeze", skill: "FREEZE" },
];
const TARGETS: SkillTarget[] = [
  { id: "you-btc", label: "Your BTC · Buy", owner: "you" },
  { id: "you-sol", label: "Your SOL · Sell", owner: "you" },
  { id: "bruno-eth", label: "Bruno · ETH", owner: "opponent" },
];

export function SkillsPreview() {
  const [selected, setSelected] = useState<string>();
  const [target, setTarget] = useState<string>();
  const [cast, setCast] = useState<string>();
  const [live, setLive] = useState(true);
  const [used, setUsed] = useState(false);
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emas">Dev preview</p>
      <h1 className="title-outline font-display text-3xl text-gading sm:text-4xl">Skill hand</h1>
      <p className="mt-1 text-sm font-bold text-white/70">Props-only UI for target selection, disabled states, and lightweight spell feedback.</p>
      <div className="mt-5 flex flex-wrap gap-3 text-sm font-bold">
        <label className="rounded-lg border-2 border-garis bg-papan px-3 py-2"><input className="mr-2 accent-emas" type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />Live phase</label>
        <label className="rounded-lg border-2 border-garis bg-papan px-3 py-2"><input className="mr-2 accent-emas" type="checkbox" checked={used} onChange={(e) => setUsed(e.target.checked)} />Skill already used</label>
      </div>
      <SkillHand
        className="mt-5 max-w-xl"
        cards={CARDS}
        targets={TARGETS}
        selectedId={selected}
        selectedTargetId={target}
        live={live}
        usedThisRound={used}
        onSelect={(card) => { setSelected(card.id); setTarget(undefined); }}
        onTargetSelect={(item) => setTarget(item.id)}
        onCast={(card, item) => { setCast(`${card.skill} on ${item.label}`); setUsed(true); }}
      />
      <div className="mt-6 rounded-2xl border-[3px] border-garis bg-papan p-4">
        <p className="font-display text-xl text-gading">Effect states</p>
        <div className="mt-3 flex flex-wrap gap-4">{["BOOST", "INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE"].map((skill) => <SkillEffect key={skill} skill={skill as SkillCard["skill"]} />)}</div>
        {cast && <p role="status" className="mt-4 font-extrabold text-naik">{cast} cast — dummy state only.</p>}
      </div>
    </main>
  );
}
