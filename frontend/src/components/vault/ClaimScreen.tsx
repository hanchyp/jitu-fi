"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Board } from "@/components/ui/Board";
import { Countdown } from "@/components/ui/Countdown";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { Tile } from "@/components/ui/Tile";
import { formatMusd, shortAddress } from "@/lib/format";
import type { ClaimSnapshot } from "@/mocks/claim";
import { ClaimBreakdown, formatShare } from "./ClaimBreakdown";
import { ClaimPayoutReveal } from "./ClaimPayoutReveal";

/** What the claim screen shows. "pending" and "claimed" can also be reached by pressing Claim. */
export type ClaimView = "ready" | "pending" | "claimed" | "not-mature" | "shortfall";

type ClaimScreenProps = {
  view: ClaimView;
  snapshot: ClaimSnapshot;
  /** Seconds to maturity on the dummy clock (not-mature only). */
  secondsToMaturity?: number;
};

const ART = "/assets/landing";
const TENOR = { week: "1-week", month: "1-month" } as const;
const PENDING_MS = 1_400;
const INSTANT = { duration: 0 } as const;
const BPS = BigInt(10_000);
const ZERO = BigInt(0);

type Phase = "idle" | "pending" | "claimed";

export function ClaimScreen({ view, snapshot, secondsToMaturity = 0 }: ClaimScreenProps) {
  const reduce = useReducedMotion() ?? false;
  const { season, position, payout, shortfall } = snapshot;
  const [phase, setPhase] = useState<Phase>(view === "pending" ? "pending" : view === "claimed" ? "claimed" : "idle");
  // Only a claim made on this screen plays the chest and the count-up; a direct load shows the result.
  const [celebrate, setCelebrate] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const total = payout.principal + payout.baseYield + payout.bonus;
  const bonusShareBps = season.bonusPot > ZERO ? Number((payout.bonus * BPS) / season.bonusPot) : 0;
  const mature = view !== "not-mature";
  const claimed = phase === "claimed";
  const seasonName = `${TENOR[season.tenor]} season #${season.seasonId}`;

  const onClaim = () => {
    setPhase("pending");
    // Dummy transaction: pending for a moment, then confirmed. The wallet call plugs in here later.
    timer.current = setTimeout(() => {
      timer.current = null;
      setCelebrate(true);
      setPhase("claimed");
    }, PENDING_MS);
  };

  const title = claimed ? "Loot claimed" : mature ? "Claim your loot" : "Not mature yet";
  const intro =
    claimed ? "It's in your wallet. The season is over for you, so a new deposit can join the next one."
    : !mature ? "This season is still live. Everything pays at maturity, so here is your estimate so far."
    : shortfall ? "The season matured. Your principal and your bonus share are ready in one claim."
    : "The season matured. Your principal, base yield and bonus are ready in one claim.";

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <p className="font-extrabold text-emas">{seasonName}</p>
      <h1 className="font-display title-outline mt-1 text-4xl text-gading sm:text-5xl">{title}</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-relaxed text-white/75">{intro}</p>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
        <Board tone="raised">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-extrabold text-white/80">
                {claimed ? "You received" : mature ? "You receive" : "Estimated at maturity (simulated)"}
              </p>
              <ClaimPayoutReveal
                key={claimed ? "claimed" : "open"}
                from={payout.principal}
                total={total}
                countUp={claimed && celebrate}
                className="mt-2"
              />
              <p className="mt-2 text-sm font-bold text-white/55">Exactly {formatMusd(total, { decimals: 6 })}</p>
            </div>
            {/* The chest opens when the claim confirms. */}
            <motion.div
              key={claimed ? "open" : "closed"}
              initial={claimed && celebrate ? { scale: 0.6, rotate: -8, opacity: 0 } : false}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={reduce ? INSTANT : { type: "spring", stiffness: 300, damping: 16 }}
              className="-my-3 -mr-2 shrink-0"
            >
              <Image
                src={claimed ? `${ART}/claim-treasure.webp` : `${ART}/deposit-chest.webp`}
                alt={claimed ? "An open chest overflowing with gold coins" : "A closed chest holding the crystal"}
                width={512}
                height={512}
                sizes="(min-width: 640px) 128px, 88px"
                priority
                className="h-22 w-22 sm:h-32 sm:w-32"
              />
            </motion.div>
          </div>

          {shortfall && !claimed && (
            <Tile tone="dasar" className="mt-5 px-4 py-3">
              <p className="font-extrabold text-white">This season came back short</p>
              <p className="mt-1 text-sm font-semibold leading-relaxed text-white/75">
                The yield strategy returned {formatMusd(shortfall.returned)} of the {formatMusd(season.totalPrincipal)}{" "}
                deposited ({formatShare(Number((shortfall.returned * BPS) / season.totalPrincipal))}). So there is no
                yield and no fee, principal is repaid pro-rata, and the bonus pot holds only sponsor funds, still shared
                by season points.
              </p>
            </Tile>
          )}

          {claimed ? (
            <p className="mt-5 font-semibold leading-relaxed text-white/75">
              {formatMusd(payout.principal)} principal, {formatMusd(payout.baseYield)} base yield and{" "}
              {formatMusd(payout.bonus)} bonus.
            </p>
          ) : (
            <div className="mt-4">
              <ClaimBreakdown
                payout={payout}
                deposited={position.principal}
                bonusShareBps={bonusShareBps}
                shortfall={shortfall !== null}
                estimate={!mature}
              />
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-3 border-t-[3px] border-garis/60 pt-5">
            {claimed ? (
              <>
                <GameButton href="/deposit" size="lg">
                  Join next season
                </GameButton>
                <p className="text-sm font-bold text-white/60" role="status">
                  Sent to {shortAddress(position.address)}.
                </p>
              </>
            ) : mature ? (
              <>
                <GameActionButton size="lg" onClick={onClaim} disabled={phase === "pending"}>
                  {phase === "pending" ? "Claiming" : "Claim"}
                </GameActionButton>
                <p className="text-sm font-bold text-white/60" role="status">
                  {phase === "pending" ? "Confirm the claim in your wallet." : "One transaction. Claims can never be paused."}
                </p>
              </>
            ) : (
              <>
                <GameActionButton size="lg" disabled>
                  Claim
                </GameActionButton>
                <Countdown seconds={secondsToMaturity} ticking label="Matures in" urgentAt={60} />
              </>
            )}
          </div>
        </Board>

        <Board as="aside">
          <h2 className="font-display text-2xl text-gading">How you earned it</h2>
          <dl className="mt-4 grid grid-cols-2 gap-3">
            <Tile>
              <dt className="text-sm font-extrabold text-white/70">Season points</dt>
              <dd className="font-display text-2xl text-emas">{position.seasonPoints.toLocaleString("en-US")}</dd>
            </Tile>
            <Tile>
              <dt className="text-sm font-extrabold text-white/70">Games counted</dt>
              <dd className="font-display text-2xl text-emas">
                {position.gamesCounted}
                <span className="text-lg text-white/60">/{position.countedGames}</span>
              </dd>
            </Tile>
            <Tile>
              <dt className="text-sm font-extrabold text-white/70">Weight</dt>
              <dd className="font-display text-2xl text-emas">{formatMusd(position.weight, { unit: false })}</dd>
            </Tile>
            <Tile>
              <dt className="text-sm font-extrabold text-white/70">Bonus share</dt>
              <dd className="font-display text-2xl text-emas">{formatShare(bonusShareBps)}</dd>
            </Tile>
          </dl>
          <p className="mt-4 font-semibold leading-relaxed text-white/70">
            {position.gamesCounted === 0
              ? `Your first ${position.countedGames} games this season earn points.`
              : `Points from your first ${position.countedGames} games, times your weight (your deposit, capped at 1,000 mUSD), set your share of the ${formatMusd(season.bonusPot)} bonus pot.`}
            {!mature && position.gamesCounted < position.countedGames && " Play before maturity to raise it."}
          </p>
          {!mature && position.gamesCounted < position.countedGames && (
            <GameButton href="/play" variant="night" className="mt-4">
              Play a game
            </GameButton>
          )}
        </Board>
      </div>
    </section>
  );
}
