"use client";

import { useState } from "react";
import { LEADERBOARDS } from "@/mocks/leaderboard";

const money = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 1 });

export default function LeaderboardPage() {
  const [tenor, setTenor] = useState(0);
  const rows = LEADERBOARDS[tenor].rows;
  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-10 sm:py-16">
      <p className="text-xs font-extrabold uppercase tracking-widest text-emas">Demo season #1 · simulated</p>
      <h1 className="title-outline mt-1 font-display text-4xl text-gading sm:text-5xl">Leaderboard</h1>
      <p className="mt-2 max-w-xl font-bold text-white/70">Only your first counted games earn season points. Bonus is an estimate until the season closes.</p>
      <div className="mt-6 flex gap-2" role="tablist" aria-label="Tenor">
        {LEADERBOARDS.map((board, index) => <button key={board.tenor} type="button" role="tab" aria-selected={index === tenor} onClick={() => setTenor(index)} className={`rounded-lg border-2 border-garis px-4 py-2 font-display text-lg ${index === tenor ? "bg-emas text-garis" : "bg-papan text-gading"}`}>{board.tenor}</button>)}
      </div>
      {rows.length === 0 ? (
        <section className="mt-6 rounded-2xl border-[3px] border-garis bg-papan p-10 text-center"><p className="font-display text-2xl text-gading">No scores yet</p><p className="mt-2 font-bold text-white/65">Play the first game in this tenor to put a score on the board.</p></section>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-2xl border-[3px] border-garis bg-papan">
          <table className="w-full min-w-[650px] text-left"><thead className="border-b-2 border-garis bg-dasar text-xs uppercase tracking-wider text-white/60"><tr><th className="p-3">Rank</th><th className="p-3">Player</th><th className="p-3">Points</th><th className="p-3">Games</th><th className="p-3">Weight</th><th className="p-3">Est. bonus</th></tr></thead>
            <tbody>{rows.map((row) => <tr key={row.name} className={`border-t-2 border-garis/70 font-bold ${row.isYou ? "bg-emas/25 text-gading" : "text-white/85"}`}><td className="p-3 font-display text-xl">#{row.rank}</td><td className="p-3">{row.name}{row.isYou && <span className="ml-2 rounded bg-zamrud px-1.5 py-0.5 text-xs text-garis">YOU</span>}</td><td className="p-3 tabular-nums">{row.points.toLocaleString("en-US")}</td><td className="p-3">{row.countedGames}/{row.games} counted</td><td className="p-3">{row.weight.toLocaleString("en-US")} mUSD</td><td className="p-3 tabular-nums text-emas">{money.format(row.estimatedBonus)}</td></tr>)}</tbody>
          </table>
        </div>
      )}
    </main>
  );
}
