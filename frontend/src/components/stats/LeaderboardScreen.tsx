"use client";

import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Board } from "@/components/ui/Board";
import { GameButton } from "@/components/ui/GameButton";
import { Tabs } from "@/components/ui/Tabs";
import { formatMusd, shortAddress } from "@/lib/format";
import type { LeaderboardEntry, LeaderboardResponse } from "@/mocks/leaderboard";
import type { SeasonTenor } from "@/mocks/season";
import { ChevronIcon } from "./icons";
import { RankMedal } from "./RankMedal";

type LeaderboardScreenProps = {
  /** One board per tenor, in tab order. */
  boards: readonly LeaderboardResponse[];
  you: string;
  /** Opens the season containing the connected wallet's position. */
  yourTenor?: SeasonTenor;
  medals?: readonly (string | undefined)[];
  emptyArt?: string;
};

const TENOR_LABEL: Record<SeasonTenor, string> = { week: "1 week", month: "1 month" };
const sameAddress = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();

export function LeaderboardScreen({ boards, you, yourTenor, medals = [], emptyArt }: LeaderboardScreenProps) {
  const highlight = useSearchParams().get("highlight") === "you";
  const [tenor, setTenor] = useState<SeasonTenor>(yourTenor ?? boards[0].tenor);
  const board = boards.find((b) => b.tenor === tenor) ?? boards[0];
  const yours = board.entries.find((entry) => sameAddress(entry.address, you));
  const ownSeason = board.tenor === yourTenor;

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
      <header>
        <div>
          <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">Hall of fame</h1>
          <p className="mt-2 max-w-xl font-semibold leading-relaxed text-white/75">
            Your first {board.countedGames} games earn season points.
          </p>
        </div>
      </header>

      {highlight && <p role="status" className="mt-4 font-semibold text-emas">{yours ? `Your row is highlighted below: rank #${yours.rank}.` : "No ranked row in this season yet."} Standings are simulated.</p>}
      <Tabs
        label="Season tenor"
        tabs={boards.map((b) => ({ id: b.tenor, label: TENOR_LABEL[b.tenor] }))}
        value={tenor}
        onChange={setTenor}
        className="mt-6"
      >
        <div className="mb-5 flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
          <h2 className="font-display text-2xl text-gading">{TENOR_LABEL[board.tenor]} season #{board.seasonId}</h2>
          <p className="text-sm font-semibold text-white/75">
            Bonus pot <span className="font-extrabold text-gading">{formatMusd(board.bonusPot)}</span>
            <span className="ml-2">(simulated)</span>
          </p>
        </div>

        {board.entries.length === 0 ? (
          <Board className="grid items-center gap-4 sm:grid-cols-2">
            <Image
              src={emptyArt ?? "/assets/stats/empty-leaderboard.webp"}
              alt=""
              width={640}
              height={480}
              sizes="(min-width: 640px) 400px, 280px"
              className="mx-auto h-auto w-full max-w-[280px] sm:order-2 sm:max-w-[400px]"
            />
            <div className="pb-3 sm:py-6">
              <h3 className="font-display title-outline text-3xl text-gading sm:text-4xl">The podium is waiting</h3>
              <p className="mt-3 max-w-md font-semibold leading-relaxed text-white/75">
                No season points yet. Finish a counted game to take your place.
              </p>
              <div className="mt-5">
                {ownSeason ? <GameButton href="/play">Play a game</GameButton> : (
                  <SeasonGuidance yourTenor={yourTenor} />
                )}
              </div>
            </div>
          </Board>
        ) : (
          <>
            <div className="grid items-stretch gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <Podium entries={board.entries.filter((entry) => entry.rank <= 3)} medals={medals} you={you} />
              <Board as="aside" tone="raised" className="min-w-0">
                <h3 className="font-display text-2xl text-gading">Your standing</h3>
                {yours ? (
                  <>
                    <div className="mt-5 flex items-end justify-between gap-3 border-b-[3px] border-garis pb-4">
                      <div>
                        <p className="font-display text-5xl leading-none text-gading">#{yours.rank}</p>
                        <p className="mt-2 text-sm font-extrabold text-white/70">of {board.entries.length} players</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display text-4xl leading-none text-emas tabular-nums">{yours.seasonPoints.toLocaleString("en-US")}</p>
                        <p className="mt-2 text-sm font-extrabold text-white/75">season points</p>
                      </div>
                    </div>
                    <dl className="mt-4 space-y-2 text-sm font-semibold">
                      <div className="flex justify-between gap-2">
                        <dt className="text-white/75">Counted games</dt>
                        <dd className="font-extrabold text-gading">{yours.gamesCounted}/{board.countedGames}</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-white/75">Deposit weight</dt>
                        <dd className="font-extrabold text-gading">{formatMusd(yours.weight)}</dd>
                      </div>
                      <div className="flex flex-wrap justify-between gap-2">
                        <dt className="text-white/75">Bonus estimate</dt>
                        <dd className="font-extrabold text-gading">{formatMusd(yours.estimatedBonus)}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-sm font-semibold leading-relaxed text-white/70">Simulated, if the season ended now.</p>
                    <GameButton href={yours.gamesCounted < board.countedGames ? "/play" : "/profile"} className="mt-5">
                      {yours.gamesCounted < board.countedGames ? "Play a game" : "View your games"}
                    </GameButton>
                  </>
                ) : (
                  <div className="mt-5">
                    <p className="font-display text-3xl text-gading">{ownSeason ? "Your place awaits" : "Another season"}</p>
                    {ownSeason ? (
                      <>
                        <p className="mt-3 max-w-md font-semibold leading-relaxed text-white/75">
                          You&apos;re not ranked yet. Finish a counted game to put your points on the board.
                        </p>
                        <GameButton href="/play" className="mt-5">Play a game</GameButton>
                      </>
                    ) : <SeasonGuidance yourTenor={yourTenor} />}
                  </div>
                )}
              </Board>
            </div>

            <section className="mt-9" aria-labelledby="standings-title">
              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h3 id="standings-title" className="font-display text-2xl text-gading">All players</h3>
                <p className="text-sm font-extrabold text-white/70">Season points</p>
              </div>
              <ol className="overflow-hidden rounded-[22px] border-[3px] border-garis bg-dasar shadow-[0_6px_0_0_#040B10]">
                {board.entries.map((entry) => (
                  <li key={`${board.tenor}-${entry.address}`} className="border-b-2 border-garis last:border-b-0">
                    <RankRow entry={entry} mine={sameAddress(entry.address, you)} k={board.countedGames} />
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-sm font-semibold text-white/70">Open a player for counted games, weight and simulated bonus.</p>
            </section>
          </>
        )}

        <details className="mt-7 border-t-2 border-garis pt-4">
          <summary className="w-fit cursor-pointer py-1 font-extrabold text-gading">How standings and bonuses work</summary>
          <div className="mt-3 grid gap-4 font-semibold leading-relaxed text-white/75 sm:grid-cols-2">
            <p className="max-w-md">
              Rank follows season points from your first {board.countedGames} games. Only players with points appear here;
              house bots never earn season points.
            </p>
            <p className="max-w-md">
              Your share of the bonus pot follows points × deposit weight. Weight is your deposit capped at 1,000 mUSD.
              Bonuses are simulated estimates until the season ends and are paid at maturity.
            </p>
          </div>
        </details>
      </Tabs>
    </section>
  );
}

/** A single stepped composition: podium rank one is first in reading order, centered visually. */
function Podium({ entries, medals, you }: { entries: LeaderboardEntry[]; medals: readonly (string | undefined)[]; you: string }) {
  return (
    <section className="relative isolate flex flex-col overflow-hidden rounded-[22px] border-[3px] border-garis bg-dasar shadow-[0_6px_0_0_#040B10]" aria-label="Season leaders">
      <Image src="/assets/landing/season-banner.webp" alt="" fill sizes="(min-width: 1024px) 720px, 100vw" className="-z-20 object-cover object-right" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-dasar/80" />
      <div className="px-4 pt-5 sm:px-6">
        <h3 className="font-display text-2xl text-gading">Season leaders</h3>
      </div>
      <ol className="grid flex-1 grid-cols-3 items-end gap-2 px-3 pt-5 sm:gap-3 sm:px-6 sm:pt-4">
        {entries.map((entry) => (
          <li key={entry.address} className={`min-w-0 text-center ${entry.rank === 1 ? "order-2" : entry.rank === 2 ? "order-1" : "order-3"}`}>
            <RankMedal rank={entry.rank} medal={medals[entry.rank - 1]} size="podium" className="relative z-10 mx-auto -mb-3" />
            <div className={`rounded-t-[14px] border-x-[3px] border-t-[6px] border-garis px-1 pt-4 shadow-[inset_0_3px_0_0_#040B10] sm:px-3 ${
              entry.rank === 1 ? "border-t-emas bg-papan pb-9 sm:pb-12" : entry.rank === 2 ? "border-t-gading bg-malam pb-5 sm:pb-8" : "border-t-emas-tua bg-malam pb-3 sm:pb-4"
            }`}>
              <p className="text-sm font-extrabold text-white/75">#{entry.rank}</p>
              <p className="mt-1 truncate text-sm font-extrabold text-gading sm:text-base" title={entry.address}>
                {sameAddress(entry.address, you) ? "You" : shortAddress(entry.address)}
              </p>
              <p className={`font-display mt-2 leading-none tabular-nums ${entry.rank === 1 ? "text-4xl text-emas sm:text-5xl" : "text-3xl text-gading sm:text-4xl"}`}>
                {entry.seasonPoints.toLocaleString("en-US")}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/75">points</p>
            </div>
          </li>
        ))}
      </ol>
      <div aria-hidden="true" className="h-4 border-t-[3px] border-emas-tua bg-garis" />
    </section>
  );
}

function RankRow({ entry, mine, k }: { entry: LeaderboardEntry; mine: boolean; k: number }) {
  return (
    <details className={`group ${mine ? "border-l-4 border-emas bg-papan" : "border-l-4 border-transparent"}`} aria-current={mine ? "true" : undefined}>
      <summary style={{ outlineOffset: -4 }} className="grid cursor-pointer list-none grid-cols-[2rem_minmax(0,1fr)_auto_1rem] items-center gap-2 px-3 py-3 hover:bg-papan sm:gap-4 sm:px-5 [&::-webkit-details-marker]:hidden">
        <span className="font-display text-lg text-white/70"><span className="sr-only">Rank </span>{entry.rank}</span>
        <span className="min-w-0 font-extrabold text-gading">
          {mine && <span className="mr-2 text-emas">You</span>}
          <span className={mine ? "text-sm text-white/75" : ""}>{shortAddress(entry.address)}</span>
        </span>
        <span className="font-display text-2xl text-gading tabular-nums">
          {entry.seasonPoints.toLocaleString("en-US")}<span className="sr-only"> season points</span>
        </span>
        <ChevronIcon className="h-4 w-4 text-white/70 group-open:rotate-180" />
      </summary>
      <div className="px-4 pb-4 sm:pl-[4.5rem] sm:pr-5">
        <dl className="grid grid-cols-2 gap-x-3 gap-y-3 border-t-2 border-garis pt-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-white/70">Counted games</dt>
            <dd className="mt-1 font-extrabold text-gading">{entry.gamesCounted}/{k}</dd>
          </div>
          <div>
            <dt className="font-semibold text-white/70">Deposit weight</dt>
            <dd className="mt-1 font-extrabold text-gading">{formatMusd(entry.weight)}</dd>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <dt className="font-semibold text-white/70">Bonus estimate (simulated)</dt>
            <dd className="mt-1 font-extrabold text-gading">{formatMusd(entry.estimatedBonus)}</dd>
          </div>
        </dl>
        <p className="mt-3 break-all text-sm font-semibold text-white/70"><span className="sr-only">Wallet address: </span>{entry.address}</p>
      </div>
    </details>
  );
}

function SeasonGuidance({ yourTenor }: { yourTenor?: SeasonTenor }) {
  return (
    <>
      <p className="mt-3 max-w-md font-semibold leading-relaxed text-white/75">
        {yourTenor ? `Your deposit belongs to the ${TENOR_LABEL[yourTenor]} season. Choose that tab to see your standing; you can hold one position at a time.` : "Deposit mUSD into a season to play counted games and join its leaderboard."}
      </p>
      {!yourTenor && <GameButton href="/deposit" className="mt-5">Deposit mUSD</GameButton>}
    </>
  );
}
