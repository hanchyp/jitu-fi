"use client";

import { useState } from "react";
import { Board } from "@/components/ui/Board";
import { Chip } from "@/components/ui/Chip";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameButton } from "@/components/ui/GameButton";
import { Tabs } from "@/components/ui/Tabs";
import { Tile } from "@/components/ui/Tile";
import { formatMusd, shortAddress } from "@/lib/format";
import type { LeaderboardEntry, LeaderboardResponse } from "@/mocks/leaderboard";
import type { SeasonTenor } from "@/mocks/season";
import { RankMedal } from "./RankMedal";

type LeaderboardScreenProps = {
  /** One board per tenor, in tab order. */
  boards: readonly LeaderboardResponse[];
  /** The connected wallet, for the YOU badge and row highlight. */
  you: string;
  /** The tenor of your position, if any: opens first and explains why you're missing from the other board. */
  yourTenor?: SeasonTenor;
  /** Medal art for ranks 1–3; a missing entry falls back to a numbered circle. */
  medals?: readonly (string | undefined)[];
  emptyArt?: string;
};

const TENOR_LABEL: Record<SeasonTenor, string> = { week: "1 week", month: "1 month" };

const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

/** Season points race per tenor: rank, points, counted games, weight and the estimated bonus share. */
export function LeaderboardScreen({ boards, you, yourTenor, medals = [], emptyArt }: LeaderboardScreenProps) {
  const [tenor, setTenor] = useState<SeasonTenor>(yourTenor ?? boards[0].tenor);
  const board = boards.find((b) => b.tenor === tenor) ?? boards[0];
  const k = board.countedGames;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Leaderboard</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-relaxed text-white/75">
        Season points come from each player&apos;s first {k} games. Your bonus share is points × weight, and weight is
        your deposit up to 1,000 mUSD. Only players appear here; house bots never earn points.
      </p>

      <Tabs
        label="Season tenor"
        tabs={boards.map((b) => ({ id: b.tenor, label: TENOR_LABEL[b.tenor] }))}
        value={tenor}
        onChange={setTenor}
        className="mt-8"
      >
        <Board>
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-2xl text-gading">{TENOR_LABEL[board.tenor]} season #{board.seasonId}</h2>
            <p className="font-extrabold text-white/75">
              Bonus pot <span className="font-display text-xl text-emas">{formatMusd(board.bonusPot)}</span>
            </p>
          </div>
          <p className="mt-1 text-sm font-bold text-white/60">Bonus figures are estimates if the season ended now, simulated.</p>

          {board.entries.length === 0 ? (
            <EmptyState
              art={emptyArt ?? "/assets/landing/play-cards.webp"}
              title="No scores yet"
              body="Nobody has finished a counted game in this season. Play one and your score sets the bar."
              action={
                <GameButton href="/play" size="lg">
                  Play a game
                </GameButton>
              }
            />
          ) : (
            <>
              <RankTable entries={board.entries} you={you} k={k} medals={medals} />
              <RankCards entries={board.entries} you={you} k={k} medals={medals} />
              {!board.entries.some((e) => sameAddress(e.address, you)) && (
                <NotRanked ownSeason={board.tenor === yourTenor} yourTenor={yourTenor} />
              )}
            </>
          )}
        </Board>
      </Tabs>
    </section>
  );
}

type RowsProps = { entries: LeaderboardEntry[]; you: string; k: number; medals: readonly (string | undefined)[] };

function YouChip() {
  return <Chip className="ml-2 shrink-0">You</Chip>;
}

/** md and up: one table row per player. */
function RankTable({ entries, you, k, medals }: RowsProps) {
  return (
    <table className="mt-5 hidden w-full border-separate border-spacing-y-2 text-left md:table">
      <thead className="text-sm font-extrabold text-white/60">
        <tr>
          <th scope="col" className="px-3 pb-1 font-extrabold">Rank</th>
          <th scope="col" className="px-3 pb-1 font-extrabold">Player</th>
          <th scope="col" className="px-3 pb-1 text-right font-extrabold">Season points</th>
          <th scope="col" className="px-3 pb-1 text-right font-extrabold">Counted games</th>
          <th scope="col" className="px-3 pb-1 text-right font-extrabold">Weight</th>
          <th scope="col" className="px-3 pb-1 text-right font-extrabold">Est. bonus</th>
        </tr>
      </thead>
      <tbody className="font-extrabold text-white/85">
        {entries.map((e) => {
          const mine = sameAddress(e.address, you);
          // Borders sit on the cells so each row reads as one tile; the first and last cells round its ends.
          const cell = `border-y-[3px] border-garis px-3 py-2 ${mine ? "bg-papan-terang" : "bg-papan"}`;
          return (
            <tr key={e.address} aria-current={mine ? "true" : undefined}>
              <td className={`${cell} w-20 rounded-l-[14px] border-l-[3px]`}>
                <RankMedal rank={e.rank} medal={medals[e.rank - 1]} />
              </td>
              <td className={cell}>
                <span className="inline-flex items-center text-white" title={e.address}>
                  {shortAddress(e.address)}
                  {mine && <YouChip />}
                </span>
              </td>
              <td className={`${cell} font-display text-right text-2xl text-emas tabular-nums`}>
                {e.seasonPoints.toLocaleString("en-US")}
              </td>
              <td className={`${cell} text-right tabular-nums`}>
                {e.gamesCounted}
                <span className="text-white/55">/{k}</span>
              </td>
              <td className={`${cell} text-right tabular-nums`}>{formatMusd(e.weight)}</td>
              <td className={`${cell} rounded-r-[14px] border-r-[3px] text-right tabular-nums text-gading`}>
                {formatMusd(e.estimatedBonus)}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

/** Below md: stacked tiles, so 375 px never scrolls sideways. Amounts drop the unit; the legend names it. */
function RankCards({ entries, you, k, medals }: RowsProps) {
  return (
    <>
      <ol className="mt-5 space-y-2 md:hidden">
        {entries.map((e) => {
          const mine = sameAddress(e.address, you);
          return (
            <li key={e.address} aria-current={mine ? "true" : undefined}>
              <Tile active={mine} className="px-3 py-2.5">
                <div className="flex items-center gap-3">
                  <RankMedal rank={e.rank} medal={medals[e.rank - 1]} />
                  <span className="flex min-w-0 flex-1 items-center font-extrabold text-white" title={e.address}>
                    {shortAddress(e.address)}
                    {mine && <YouChip />}
                  </span>
                  <span className="text-right">
                    <span className="font-display block text-2xl leading-none text-emas tabular-nums">
                      {e.seasonPoints.toLocaleString("en-US")}
                    </span>
                    <span className="text-xs font-extrabold text-white/60">points</span>
                  </span>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 border-t-[3px] border-garis/50 pt-2 text-sm">
                  <div>
                    <dt className="font-extrabold text-white/60">Games</dt>
                    <dd className="font-extrabold text-white/85 tabular-nums">
                      {e.gamesCounted}/{k}
                    </dd>
                  </div>
                  <div>
                    <dt className="font-extrabold text-white/60">Weight</dt>
                    <dd className="font-extrabold text-white/85 tabular-nums">{formatMusd(e.weight, { unit: false })}</dd>
                  </div>
                  <div>
                    <dt className="font-extrabold text-white/60">Est. bonus</dt>
                    <dd className="font-extrabold text-gading tabular-nums">{formatMusd(e.estimatedBonus, { unit: false })}</dd>
                  </div>
                </dl>
              </Tile>
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-sm font-bold text-white/55 md:hidden">Weight and bonus in mUSD.</p>
    </>
  );
}

/** Shown under a board you're not on: either no points yet in your season, or your deposit is elsewhere. */
function NotRanked({ ownSeason, yourTenor }: { ownSeason: boolean; yourTenor?: SeasonTenor }) {
  if (ownSeason) {
    return (
      <Tile tone="dasar" className="mt-4 flex flex-wrap items-center justify-between gap-4 px-4 py-3">
        <div className="max-w-md">
          <p className="font-extrabold text-white">You&apos;re not on the board yet</p>
          <p className="mt-0.5 text-sm font-semibold leading-relaxed text-white/75">
            Finish a counted game in this season and your season points put you here.
          </p>
        </div>
        <GameButton href="/play">Play a game</GameButton>
      </Tile>
    );
  }
  return (
    <Tile tone="dasar" className="mt-4 px-4 py-3">
      <p className="font-extrabold text-white">You&apos;re not in this season</p>
      <p className="mt-0.5 max-w-xl text-sm font-semibold leading-relaxed text-white/75">
        {yourTenor
          ? `Your deposit is in the ${TENOR_LABEL[yourTenor]} season, and you can hold one position at a time.`
          : "Deposit mUSD into this season to play counted games and climb this board."}
      </p>
    </Tile>
  );
}
