"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { Board } from "@/components/ui/Board";
import { Countdown } from "@/components/ui/Countdown";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { formatMusd, shortAddress } from "@/lib/format";
import type { ClaimSnapshot } from "@/mocks/claim";
import { ClaimBreakdown, formatShare } from "./ClaimBreakdown";
import { ClaimPayoutReveal } from "./ClaimPayoutReveal";

export type ClaimView = "ready" | "pending" | "claimed" | "not-mature" | "shortfall";

type ClaimScreenProps = {
  view: ClaimView;
  snapshot: ClaimSnapshot;
  secondsToMaturity?: number;
};

const TENOR = { week: "1-week", month: "1-month" } as const;
const PENDING_MS = 1_400;
const BPS = BigInt(10_000);
const ZERO = BigInt(0);
type Phase = "idle" | "pending" | "claimed";

export function ClaimScreen({ view, snapshot, secondsToMaturity = 0 }: ClaimScreenProps) {
  const reduce = useReducedMotion() ?? false;
  const { season, position, payout, shortfall } = snapshot;
  const [phase, setPhase] = useState<Phase>(view === "pending" ? "pending" : view === "claimed" ? "claimed" : "idle");
  const [celebrate, setCelebrate] = useState(false);

  // Both a direct pending preview and a button press complete the same simulated claim.
  useEffect(() => {
    if (phase !== "pending") return;
    const timer = setTimeout(() => {
      setCelebrate(true);
      setPhase("claimed");
    }, PENDING_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  const total = payout.principal + payout.baseYield + payout.bonus;
  const bonusShareBps = season.bonusPot > ZERO ? Number((payout.bonus * BPS) / season.bonusPot) : 0;
  const mature = view !== "not-mature";
  const claimed = phase === "claimed";
  const pending = phase === "pending";
  const title = claimed ? "Loot claimed" : !mature ? "Your season is still live" : shortfall ? "Your season settled" : "Open your season’s treasure";

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-extrabold text-white/70">{TENOR[season.tenor]} season #{season.seasonId}</p>
      <h1 className="font-display title-outline mt-2 text-4xl text-gading sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-relaxed text-white/75">
        {claimed ? "Season complete. Your next adventure starts with a new deposit."
          : !mature ? "Principal, base yield and bonus pay together at maturity."
          : shortfall ? "The strategy returned less than was deposited. Review your payout below."
          : "The season has matured. Bring your principal and earnings home."}
      </p>

      <Board tone="raised" className="mt-8">
        {shortfall && (
          <div className="mb-6 border-b-[3px] border-garis pb-5" role="note" aria-label="Principal shortfall">
            <h2 className="font-display text-2xl text-gading">Principal returned short</h2>
            <p className="mt-2 max-w-2xl font-semibold leading-relaxed text-white/85">
              {claimed ? "You received" : "You receive"} {formatMusd(payout.principal, { decimals: 6 })} of your {formatMusd(position.principal)} deposit.
              {" "}{formatMusd(position.principal - payout.principal, { decimals: 6 })} of principal was not recovered.
              No base yield or fee applies. Your bonus comes only from sponsors.
            </p>
          </div>
        )}

        <div className="grid grid-cols-[minmax(0,1fr)_112px] items-center gap-x-2 sm:grid-cols-[minmax(0,1fr)_240px] sm:gap-x-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <p className="font-extrabold text-white/85">
              {claimed ? "Received in this demo" : mature ? "Ready to claim" : "Estimated payout"}
            </p>
            <ClaimPayoutReveal key={claimed ? "claimed" : "open"} from={payout.principal} total={total} countUp={claimed && celebrate} className="mt-3" />
          </div>
          <motion.div
            key={claimed ? "open" : "waiting"}
            initial={claimed && celebrate ? { scale: 0.8, rotate: -5, opacity: 0 } : false}
            animate={{ scale: 1, rotate: 0, opacity: 1 }}
            transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 260, damping: 20 }}
            className="self-center sm:row-span-3"
          >
            <Image
              src={`/assets/landing/${claimed ? "claim-treasure" : "deposit-chest"}.webp`}
              alt=""
              width={512}
              height={512}
              sizes="(min-width: 1024px) 320px, (min-width: 640px) 240px, 112px"
              preload
              className="h-auto w-full"
            />
          </motion.div>
          <p className="col-span-2 mt-3 break-words text-sm font-bold leading-relaxed text-white/75 sm:col-span-1">
            {mature ? "Exact payout" : "Exact estimate"}: {formatMusd(total, { decimals: 6 })}
            <span className="block">{season.demoMode ? "Demo payout includes simulated yield." : ""}</span>
          </p>
          <div className="col-span-2 mt-6 flex flex-wrap items-center gap-4 sm:col-span-1 sm:mt-4">
            {claimed ? (
              <>
                <GameButton href="/deposit" size="lg">Join next season</GameButton>
                <p className="text-sm font-bold text-white/75" role="status">Simulated claim complete for {shortAddress(position.address)}.</p>
              </>
            ) : mature ? (
              <>
                <GameActionButton size="lg" onClick={() => { if (!pending) setPhase("pending"); }} aria-disabled={pending} aria-busy={pending}>
                  {pending ? "Claiming…" : "Claim loot"}
                </GameActionButton>
                <p className="text-sm font-bold text-white/75" role="status">
                  {pending ? "Simulating your claim. No wallet transaction." : "One claim for the full payout. Simulated."}
                </p>
              </>
            ) : (
              <>
                <GameActionButton size="lg" disabled>Claim loot</GameActionButton>
                <Countdown seconds={secondsToMaturity} ticking label="Matures in" urgentAt={60} />
              </>
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-8 border-t-[3px] border-garis pt-6 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
          <div className="min-w-0">
            <h2 className="font-display text-2xl text-gading">{claimed ? "Claim complete" : "Inside your chest"}</h2>
            <p className="mt-1 text-sm font-bold text-white/75">Amounts in mUSD{!mature ? ". Estimates, not guaranteed." : "."}</p>
            <ClaimBreakdown payout={payout} deposited={position.principal} bonusShareBps={bonusShareBps} shortfall={shortfall !== null} estimate={!mature} simulated={season.demoMode} />
          </div>
          <aside className="min-w-0 border-t-[3px] border-garis pt-6 lg:border-t-0 lg:border-l-[3px] lg:pt-0 lg:pl-8">
            <h2 className="font-display text-2xl text-gading">Your season record</h2>
            <dl className="mt-3 divide-y divide-white/15 text-base font-semibold">
              <div className="flex justify-between gap-4 py-2"><dt className="text-white/75">Season points</dt><dd className="font-extrabold text-gading">{position.seasonPoints.toLocaleString("en-US")}</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-white/75">Games counted</dt><dd className="font-extrabold text-gading">{position.gamesCounted} / {position.countedGames}</dd></div>
              <div className="flex flex-wrap justify-between gap-x-4 py-2"><dt className="text-white/75">Deposit weight</dt><dd className="font-extrabold text-gading">{formatMusd(position.weight)}</dd></div>
              <div className="flex justify-between gap-4 py-2"><dt className="text-white/75">Bonus share</dt><dd className="font-extrabold text-gading">{formatShare(bonusShareBps)}</dd></div>
            </dl>
            <p className="mt-4 max-w-md text-sm font-semibold leading-relaxed text-white/75">
              {position.gamesCounted === 0
                ? `Your first ${position.countedGames} games earn season points.`
                : `Season points × deposit weight set your share of the ${formatMusd(season.bonusPot)} bonus pot. Weight is capped at 1,000 mUSD.`}
              {!mature && position.gamesCounted < position.countedGames && " Play before maturity to earn more points."}
            </p>
            {!mature && position.gamesCounted < position.countedGames && <GameButton href="/play" variant="night" className="mt-4">Play a game</GameButton>}
          </aside>
        </div>
      </Board>
    </section>
  );
}
