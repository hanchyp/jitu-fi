// Flat fallback for <TableScene> (no WebGL, or reduced motion): one column per player, each pick
// as a coin with a bar that rises or sinks with the call, and a mini ridge of its price line.
// Skill effects play on the coin (components/skills SkillCoin).

import { SkillCoin } from "@/components/skills/SkillEffect2D";
import { COIN } from "@/lib/coins";
import { formatBps, formatScore, isVoid, lift, ridgeHeights, seatPlayers, signedBps } from "./model";
import type { PriceSeries, ScenePick, ScenePlayer, TableSceneProps } from "./types";

type Props = Omit<TableSceneProps, "view" | "renderEffect">;

function MiniRidge({ series, color }: { series: PriceSeries[keyof PriceSeries]; color: string }) {
  const h = ridgeHeights(series, 24);
  const line = h.map((v, i) => `${(i / (h.length - 1)) * 100},${(1 - v) * 30}`).join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-5 w-full" aria-hidden>
      <polygon points={`0,30 ${line} 100,30`} className="fill-[#4A5373]" />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function PickRow({ pick, series, showReturn }: { pick: ScenePick; series: PriceSeries[keyof PriceSeries]; showReturn: boolean }) {
  const coin = COIN[pick.symbol];
  const dead = isVoid(pick);
  const l = showReturn ? lift(pick) : 0;
  return (
    <li className={`flex items-center gap-2 ${dead && showReturn ? "opacity-50 grayscale" : ""}`} data-effect={pick.effect}>
      {/* Keyed by effect and coin, so a new spell replays when it lands. */}
      <SkillCoin key={`${pick.effect}-${pick.symbol}`} symbol={pick.symbol} effect={pick.effect} swappedFrom={pick.swappedFrom} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-1 text-xs font-extrabold">
          <span className="whitespace-nowrap">
            {pick.symbol} <span className={pick.side === "Buy" ? "text-naik" : "text-turun"}>{pick.side}</span>
          </span>
          {showReturn && <span className="whitespace-nowrap text-white/80">{dead ? "void" : formatBps(signedBps(pick))}</span>}
        </div>
        <MiniRidge series={series} color={coin.rim} />
        {pick.effect && (
          <span className="mt-0.5 inline-block rounded-md bg-dasar px-1.5 text-[10px] font-extrabold tracking-wide text-zamrud">
            {pick.effect}
            {pick.effectBy && <span className="font-bold text-white/70"> by {pick.effectBy}</span>}
          </span>
        )}
      </div>
      {/* Up/down bar around a zero line: the 2D stand-in for the spirit's height. */}
      <div className="relative h-14 w-3 shrink-0 rounded-full border-2 border-garis bg-dasar" aria-hidden>
        <div className="absolute inset-x-0 top-1/2 h-px bg-white/40" />
        <div
          className={`absolute inset-x-0 rounded-full ${l >= 0 ? "bottom-1/2 bg-emas" : "top-1/2 bg-white/50"}`}
          style={{ height: `${(Math.abs(l) * 50).toFixed(1)}%` }}
        />
      </div>
    </li>
  );
}

function Column({ player, phase, prices, winner }: { player: ScenePlayer; winner: boolean } & Pick<Props, "phase" | "prices">) {
  return (
    <section
      className={`rounded-2xl border-[3px] border-garis p-3 ${winner ? "bg-papan-terang ring-4 ring-emas" : "bg-papan"}`}
      aria-label={player.name}
    >
      <header className="mb-2 flex items-center gap-2">
        <span className="h-3 w-3 rounded-full border-2 border-garis" style={{ background: player.color }} />
        <h3 className="font-display text-lg">{player.name}</h3>
        {winner && <span className="ml-auto rounded-full bg-emas px-2 text-xs font-extrabold text-garis">Winner</span>}
        {!winner && phase === "result" && player.score !== undefined && (
          <span className="ml-auto text-xs font-extrabold text-white/70">{formatScore(player.score)} pts</span>
        )}
      </header>
      {winner && player.score !== undefined && (
        <p className="-mt-1 mb-2 text-xs font-extrabold text-emas">{formatScore(player.score)} pts</p>
      )}
      {phase === "commit" ? (
        <p className="py-4 text-center text-sm font-bold text-white/60">Picks sealed</p>
      ) : (
        <ul className="space-y-2">
          {player.picks.map((pick, i) => (
            <PickRow key={`${pick.symbol}-${i}`} pick={pick} series={prices[pick.symbol]} showReturn={phase !== "reveal"} />
          ))}
        </ul>
      )}
    </section>
  );
}

export function TableScene2D({ players, prices, phase, winnerIds, className }: Props) {
  return (
    <div className={`grid grid-cols-2 content-start items-start gap-3 p-3 md:grid-cols-4 ${className ?? ""}`}>
      {seatPlayers(players).map(
        (p) =>
          p && (
            <Column
              key={p.id}
              player={p}
              phase={phase}
              prices={prices}
              winner={phase === "result" && (winnerIds?.includes(p.id) ?? false)}
            />
          ),
      )}
    </div>
  );
}
