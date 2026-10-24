import type { ReactNode } from "react";
import { Board } from "@/components/ui/Board";
import { Chip } from "@/components/ui/Chip";
import { Countdown } from "@/components/ui/Countdown";
import { formatMusd } from "@/lib/format";
import type { PositionView } from "./types";

type PositionCardProps = {
  position: PositionView;
  /** Usually one link, e.g. to the arena. */
  action?: ReactNode;
  /** Anchor id, so other screens can link to "your position". */
  id?: string;
  /** "raised" when it stands alone on the page, "night" when it sits inside another board. */
  tone?: "raised" | "night";
  className?: string;
};

const plus = (amount: bigint) => (amount > BigInt(0) ? `+${formatMusd(amount)}` : formatMusd(amount));

/**
 * The player's season position and what it should pay at maturity (previewClaim).
 * Reused on /deposit, /claim and /play.
 */
export function PositionCard({ position, action, id, tone = "raised", className = "" }: PositionCardProps) {
  const p = position;
  const enrolling = p.status === "enrolling";
  const total = p.principal + p.baseYield + p.bonus;
  const yieldHint = enrolling ? "Starts with the season" : "Estimate, simulated";

  const rows = [
    { label: "Principal", value: formatMusd(p.principal), hint: "Comes back in full" },
    { label: "Base yield", value: enrolling ? null : plus(p.baseYield), hint: yieldHint },
    { label: "Bonus", value: enrolling ? null : plus(p.bonus), hint: enrolling ? "Earned with season points" : "Estimate, simulated" },
  ];

  return (
    <section id={id} aria-labelledby={id ? `${id}-title` : undefined} className={`scroll-mt-24 ${className}`}>
      <Board tone={tone}>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <h2 id={id ? `${id}-title` : undefined} className="font-display text-2xl text-gading">
            Your position
          </h2>
          <p className="flex items-center gap-2 text-sm font-extrabold text-white/70">
            Season #{p.seasonId}
            <Chip tone="night">{p.tenorLabel}</Chip>
          </p>
        </div>

        <Countdown
          seconds={enrolling ? p.secondsToStart : p.secondsToMaturity}
          label={enrolling ? "Season starts in" : "Maturity in"}
          ticking
          className="mt-3"
        />

        <dl className="mt-4 space-y-2">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center justify-between gap-3 rounded-[14px] border-[3px] border-garis bg-dasar px-3 py-2">
              <dt className="font-extrabold text-white/85">
                {row.label}
                <span className="block text-sm font-bold text-white/55">{row.hint}</span>
              </dt>
              <dd
                  className={`font-display whitespace-nowrap text-right text-xl tabular-nums ${row.value === null ? "text-white/55" : "text-white"}`}
                >
                  {row.value ?? "Not started"}
                </dd>
            </div>
          ))}
          <div className="flex items-end justify-between gap-3 px-1 pt-2">
            <dt className="font-extrabold text-white/85">At maturity</dt>
            <dd className="font-display whitespace-nowrap text-right text-3xl text-emas tabular-nums">{formatMusd(total)}</dd>
          </div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 border-t-[3px] border-garis pt-4">
          <p className="font-extrabold text-white/85">Games counted</p>
          <p className="flex gap-1" aria-label={`${p.gamesCounted} of ${p.countedGames} games counted`}>
            {Array.from({ length: p.countedGames }, (_, i) => (
              <Chip key={i} tone={i < p.gamesCounted ? "gold" : "night"}>
                {i + 1}
              </Chip>
            ))}
          </p>
          <p className="w-full text-sm font-bold text-white/55">
            {enrolling
              ? `Your first ${p.countedGames} games after the season starts earn season points.`
              : p.gamesCounted < p.countedGames
                ? `${p.countedGames - p.gamesCounted} more ${p.countedGames - p.gamesCounted === 1 ? "game earns" : "games earn"} season points. Later games are just for fun.`
                : "All counted games played. Later games are just for fun."}
          </p>
        </div>

        {action && <div className="mt-5">{action}</div>}
      </Board>
    </section>
  );
}
