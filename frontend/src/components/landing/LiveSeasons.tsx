"use client";

import { useEffect, useState } from "react";
import { Chip } from "@/components/ui/Chip";
import { Countdown } from "@/components/ui/Countdown";
import { formatMusd } from "@/lib/format";
import type { SeasonSummary } from "@/mocks/season";

type LiveSeasonsProps = {
  seasons: SeasonSummary[];
  /** The clock the timestamps are relative to (the dummy clock for now; the server's later). */
  now: number;
  /** Demo length of each tenor in minutes, shown next to its real length. */
  lengths: Record<SeasonSummary["tenor"], { label: string; demoMinutes: number }>;
};

type Phase = { status: "Enrolling" | "Live" | "Matured"; label: string; seconds: number };

function phaseAt(season: SeasonSummary, t: number): Phase {
  if (season.status !== "Finalized" && t < season.start)
    return { status: "Enrolling", label: "Enrollment closes in", seconds: season.start - t };
  if (season.status !== "Finalized" && t < season.end) return { status: "Live", label: "Matures in", seconds: season.end - t };
  return { status: "Matured", label: "Matured", seconds: 0 };
}

/**
 * Both open seasons with a ticking countdown. Hydration-safe: the first render (server and client)
 * uses `now` as given, and the card only advances its own elapsed-seconds counter after mount, so
 * no render ever reads Date.now(). Status flips (enrolling, live, matured) as the clock passes each
 * timestamp.
 */
export function LiveSeasons({ seasons, now, lengths }: LiveSeasonsProps) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const t = now + elapsed;

  return (
    <ul className="grid gap-3 sm:gap-4">
      {seasons.map((season) => {
        const phase = phaseAt(season, t);
        const length = lengths[season.tenor];
        return (
          <li key={season.seasonId} className="rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <p className="font-display text-2xl text-white">
                {length.label}
                <span className="ml-2 font-sans text-sm font-extrabold text-white/60">
                  {season.demoMode ? `${length.demoMinutes} min in the demo` : `Season #${season.seasonId}`}
                </span>
              </p>
              <Chip tone={phase.status === "Enrolling" ? "gold" : "night"}>{phase.status}</Chip>
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-x-4 gap-y-2">
              {phase.status === "Matured" ? (
                <p className="font-extrabold text-white/75">Matured. Claims are open.</p>
              ) : (
                <Countdown seconds={phase.seconds} label={phase.label} urgentAt={30} />
              )}
              <dl className="sm:text-right">
                <dt className="text-sm font-extrabold text-white/70">Bonus pot</dt>
                <dd className="font-display text-xl text-emas">{formatMusd(season.bonusPot, { decimals: 0 })}</dd>
              </dl>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
