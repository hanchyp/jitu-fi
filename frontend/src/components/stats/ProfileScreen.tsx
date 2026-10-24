"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Board } from "@/components/ui/Board";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameButton } from "@/components/ui/GameButton";
import { StatBadge } from "@/components/ui/StatBadge";
import { COIN, coinDataUrl } from "@/lib/coins";
import { formatBps, shortAddress } from "@/lib/format";
import {
  PRESET_ROUNDS,
  type HistoryPick,
  type HistoryRound,
  type PointsCredit,
  type SkillName,
} from "@/mocks/profile";
import type { StatsProfile, RecordedGame } from "@/lib/stats/api";
import type { SeasonTenor } from "@/mocks/season";
import { ChevronIcon } from "./icons";

type ProfileScreenProps = {
  profile: StatsProfile;
  sample?: boolean;
  emptyArt?: string;
};

const TENOR_LABEL: Record<SeasonTenor, string> = { week: "1-week", month: "1-month" };
const PLACES = ["1st", "2nd", "3rd", "4th"] as const;

// Fixed time zone so the server render and hydration print the same text.
const DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "UTC",
});
const formatDate = (unix: number) => `${DATE.format(unix * 1000)} UTC`;

/** Signed integer score: +184, -13, 0. */
const formatScore = (n: number) => `${n > 0 ? "+" : ""}${n.toLocaleString("en-US")}`;

const skillArt = (skill: SkillName) => `/assets/skills/${skill.toLowerCase()}.webp`;

/** Your season summary, then every finished game with rounds, picks and skills on demand. */
export function ProfileScreen({ profile, emptyArt, sample = true }: ProfileScreenProps) {
  const { season, games } = profile;
  const selectedGame = useSearchParams().get("game");
  const seasonGames = games.filter((g) => g.seasonId === season?.seasonId);
  const best = seasonGames.length ? Math.max(...seasonGames.map((g) => g.gameScore)) : null;

  return (
    <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-extrabold text-emas" title={profile.address}>
        {shortAddress(profile.address)}
      </p>
      <h1 className="font-display title-outline mt-1 text-4xl text-gading sm:text-5xl">Your games</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-relaxed text-white/75">
        Every finished game with its rounds, picks and skills. Counted games add season points.
      </p>

      {season && <>
      <h2 className="font-display mt-8 text-2xl text-gading">
        {TENOR_LABEL[season.tenor]} season #{season.seasonId}
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatBadge label="Season points" value={season.seasonPoints.toLocaleString("en-US")} className="col-span-2 sm:col-span-1" />
        <StatBadge
          label="Counted games"
          value={
            <>
              {season.gamesCounted}
              <span className="text-lg text-white/60">/{season.countedGames}</span>
            </>
          }
        />
        <StatBadge label="Best game score" value={best === null ? "None yet" : formatScore(best)} />
      </div>

      </>}

      {selectedGame === "latest" && <p role="status" className="mt-5 font-semibold text-white/75">{sample ? "Latest sample game expanded. Table demos are not saved to this history." : "Latest game expanded."}</p>}
      <Board className="mt-6">
        <h2 className="font-display text-2xl text-gading">Game history</h2>
        {games.length === 0 ? (
          <EmptyState
            art={emptyArt ?? "/assets/landing/play-cards.webp"}
            title="No games yet"
            body="Finish a game and it lands here with every round, pick and skill. Counted games earn season points."
            action={
              <GameButton href="/play" size="lg">
                Play a game
              </GameButton>
            }
          />
        ) : (
          bySeason(games).map((group) => (
            <section key={group[0].seasonId} className="mt-5">
              <h3 className="font-extrabold text-white/70">
                {TENOR_LABEL[group[0].tenor]} season #{group[0].seasonId}
              </h3>
              <ul className="mt-2 space-y-3">
                {group.map((game) => (
                  <GameItem key={`${game.tableId}-${selectedGame}`} game={game} k={season?.countedGames} initiallyOpen={selectedGame === String(game.tableId) || (selectedGame === "latest" && game === games[0])} />
                ))}
              </ul>
            </section>
          ))
        )}
      </Board>
    </section>
  );
}

/** Games are newest first; consecutive games of one season form a group. */
function bySeason(games: RecordedGame[]): RecordedGame[][] {
  const groups: RecordedGame[][] = [];
  for (const g of games) {
    const last = groups.at(-1);
    if (last && last[0].seasonId === g.seasonId) last.push(g);
    else groups.push([g]);
  }
  return groups;
}

function creditLine(credit: PointsCredit, k?: number): { points: string | null; note: string } {
  switch (credit.kind) {
    case "counted":
      return {
        points: `+${credit.points.toLocaleString("en-US")} points`,
        note: credit.points === 0 ? `Game ${credit.gameNumber}${k ? ` of ${k}` : ""}, score below zero adds 0` : `Game ${credit.gameNumber}${k ? ` of ${k}` : ""}`,
      };
    case "outside-k":
      return { points: null, note: k ? `Outside first ${k} games` : "Outside counted games" };
    case "after-end":
      return { points: null, note: "After season end" };
  }
}

function GameItem({ game, k, initiallyOpen = false }: { game: RecordedGame; k?: number; initiallyOpen?: boolean }) {
  const [open, setOpen] = useState(initiallyOpen);
  const reduce = useReducedMotion() ?? false;
  const credit = creditLine(game.credit, k);
  const panelId = `game-${game.tableId}`;
  const skills = game.rounds.flatMap((r) => r.picks.flatMap((p) => p.skills.filter((s) => s.by === "you").map((s) => s.skill)));

  return (
    <li className="overflow-hidden rounded-[14px] border-[3px] border-garis bg-papan">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-papan-terang focus-visible:-outline-offset-4!"
      >
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="font-display text-xl text-gading">{game.preset}</span>
            <Chip tone="night">{PRESET_ROUNDS[game.preset]} rounds</Chip>
          </span>
          <span className="mt-0.5 block text-sm font-bold text-white/60">
            Finished {PLACES[game.place - 1]} of 4, {formatDate(game.endedAt)}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-sm font-extrabold text-white/60">Game score</span>
          <span className={`font-display block text-2xl leading-tight tabular-nums ${game.gameScore < 0 ? "text-turun" : "text-white"}`}>
            {formatScore(game.gameScore)}
          </span>
        </span>
        <ChevronIcon className={`h-5 w-5 shrink-0 text-white/70 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <p className="flex flex-wrap items-baseline gap-x-2 border-t-[3px] border-garis/50 px-4 py-2 text-sm font-bold text-white/60">
        {credit.points && <span className="font-display text-base text-emas">{credit.points}</span>}
        <span>{credit.note}</span>
        {game.recordStatus === "recorded" && game.recordTxHash && /^0x[0-9a-fA-F]{64}$/.test(game.recordTxHash) ? (
          <a className="text-emas underline" href={`https://testnet.monadexplorer.com/tx/${game.recordTxHash}`} target="_blank" rel="noopener noreferrer">Recorded on-chain</a>
        ) : game.recordStatus && <span>{game.recordStatus === "recorded" ? "Recorded on-chain" : game.recordStatus === "failed" ? "On-chain recording failed" : game.recordStatus === "skipped" ? "On-chain recording skipped" : "On-chain recording pending"}</span>}
      </p>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={panelId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={reduce ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="border-t-[3px] border-garis bg-dasar px-3 py-4 sm:px-4">
              <div className="flex flex-wrap items-center gap-2 text-sm font-extrabold text-white/70">
                <span>Skills you used</span>
                {skills.length === 0 ? <span className="text-white/55">None</span> : skills.map((s, i) => <SkillTag key={`${s}-${i}`} skill={s} />)}
              </div>
              <ol className="mt-3 space-y-2">
                {game.rounds.map((round) => (
                  <RoundDetail key={round.round} round={round} />
                ))}
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

function SkillTag({ skill }: { skill: SkillName }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-[7px] border-2 border-garis bg-malam py-0.5 pl-0.5 pr-1.5">
      <Image src={skillArt(skill)} alt="" width={64} height={64} sizes="20px" className="h-5 w-5" />
      <span className="font-display text-sm text-zamrud">{skill}</span>
    </span>
  );
}

function RoundDetail({ round }: { round: HistoryRound }) {
  return (
    <li className="rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2">
          <span className="font-display text-lg text-gading">Round {round.round}</span>
          <span className="text-sm font-bold text-white/60">
            cap <Chip>{round.cap}</Chip>
          </span>
        </p>
        <p className="text-right">
          <span className="sr-only">Round score </span>
          <span className={`font-display text-xl tabular-nums ${round.roundScore < 0 ? "text-turun" : "text-white"}`}>
            {formatScore(round.roundScore)}
          </span>
        </p>
      </div>
      {round.forfeit ? (
        <p className="mt-1 text-sm font-semibold leading-relaxed text-white/70">Forfeit: no picks revealed, so the round scores 0.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {round.picks.map((p, i) => (
            <PickRow key={`${p.coin}-${i}`} pick={p} />
          ))}
        </ul>
      )}
    </li>
  );
}

function PickRow({ pick }: { pick: HistoryPick }) {
  const coin = COIN[pick.coin];
  const insured = pick.skills.some((s) => s.skill === "INSURANCE") && pick.returnBps < 0;
  return (
    <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-[10px] bg-malam/60 px-2 py-1.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-garis" style={{ backgroundColor: coin.rim }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL, nothing to optimize */}
        <img src={coinDataUrl(coin)} alt="" width={24} height={24} className="h-6 w-6 rounded-full border-2 border-garis" />
      </span>
      <span className="font-display w-12 text-white">{coin.symbol}</span>
      <span className={`font-display rounded-[7px] border-2 border-garis px-1.5 text-sm text-garis ${pick.side === "buy" ? "bg-naik" : "bg-turun"}`}>
        {pick.side === "buy" ? "Buy" : "Sell"}
      </span>
      {pick.void ? (
        <Chip tone="night">Void</Chip>
      ) : (
        <span
          className={`font-extrabold tabular-nums ${insured ? "text-white/55 line-through" : pick.returnBps > 0 ? "text-naik" : "text-turun"}`}
        >
          {formatBps(pick.returnBps)}
        </span>
      )}
      {insured && <span className="font-extrabold text-white/85 tabular-nums">{formatBps(0)}</span>}
      <span className="flex flex-wrap items-center gap-1.5 text-sm font-bold text-white/60 sm:ml-auto">
        {pick.swappedFrom && <span>Swapped from {pick.swappedFrom}</span>}
        {pick.skills.map((s, i) =>
          s.by === "you" ? (
            <SkillTag key={`${s.skill}-${i}`} skill={s.skill} />
          ) : (
            <span key={`${s.skill}-${i}`} className="inline-flex items-center gap-1">
              <SkillTag skill={s.skill} /> by {s.by}
            </span>
          ),
        )}
      </span>
    </li>
  );
}
