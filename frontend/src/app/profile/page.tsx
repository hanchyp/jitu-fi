"use client";

import { useState } from "react";
import { PROFILE_GAMES } from "@/mocks/profile";

export default function ProfilePage() {
  const [empty, setEmpty] = useState(false);
  const [open, setOpen] = useState<string>();
  const games = empty ? [] : PROFILE_GAMES;
  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-10 sm:py-16">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emas">Player profile · simulated</p>
      <div className="mt-1 flex flex-wrap items-end justify-between gap-4"><div><h1 className="title-outline font-display text-4xl text-gading sm:text-5xl">Your games</h1><p className="mt-2 font-bold text-white/70">0x12…ab · 7,640 season points</p></div><label className="rounded-lg border-2 border-garis bg-papan px-3 py-2 text-sm font-bold"><input className="mr-2 accent-emas" type="checkbox" checked={empty} onChange={(event) => setEmpty(event.target.checked)} />Empty state</label></div>
      {games.length === 0 ? <section className="mt-6 rounded-2xl border-[3px] border-garis bg-papan p-10 text-center"><p className="font-display text-2xl text-gading">No games yet</p><p className="mt-2 font-bold text-white/65">Your completed games and used skills will appear here.</p></section> : <ul className="mt-6 space-y-3">{games.map((game) => <li key={game.id} className="rounded-2xl border-[3px] border-garis bg-papan"><button type="button" className="flex w-full items-center justify-between gap-4 p-4 text-left" aria-expanded={open === game.id} onClick={() => setOpen(open === game.id ? undefined : game.id)}><span><span className="font-display text-xl text-gading">{game.preset}</span><span className="mt-1 block text-sm font-bold text-white/60">{game.playedAt} · #{game.placed} place</span></span><span className="text-right"><span className="block font-display text-2xl text-emas">{game.score.toLocaleString("en-US")}</span><span className="text-xs font-extrabold uppercase text-white/60">game score</span></span></button>{open === game.id && <div className="border-t-2 border-garis bg-dasar p-4"><p className="text-xs font-extrabold uppercase tracking-wider text-white/60">Round detail</p><ul className="mt-2 grid gap-2 sm:grid-cols-3">{game.rounds.map((round) => <li key={round.round} className="rounded-lg border-2 border-garis bg-papan p-3"><span className="font-display text-gading">Round {round.round}</span><span className="mt-1 block font-extrabold text-naik">+{round.score.toLocaleString("en-US")}</span><span className="text-xs font-bold text-white/60">{round.picks} picks{round.skill ? ` · ${round.skill}` : ""}</span></li>)}</ul></div>}</li>)}</ul>}
    </main>
  );
}
