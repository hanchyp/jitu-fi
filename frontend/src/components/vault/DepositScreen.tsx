"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AmountInput } from "@/components/ui/AmountInput";
import { Board } from "@/components/ui/Board";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { Toast } from "@/components/ui/Toast";
import { formatMusd, parseMusd } from "@/lib/format";
import { ChestDrop } from "./ChestDrop";
import { FaucetCard } from "./FaucetCard";
import { PositionCard } from "./PositionCard";
import { PrincipalPromise } from "./PrincipalPromise";
import { TenorPicker } from "./TenorPicker";
import type { PositionView, Tenor, TenorOption, VaultRules, WalletView } from "./types";
import { WeightMeter } from "./WeightMeter";

export type DepositPhase = "form" | "pending" | "success";

type DepositScreenProps = {
  rules: VaultRules;
  wallet: WalletView;
  options: TenorOption[];
  initialTenor: Tenor;
  initialAmount?: string;
  position: PositionView | null;
  /** Dev states start in "pending" (held there) or "success"; a real click moves through both. */
  initialPhase?: DepositPhase;
  /** For the "success" dev state: the amount that just dropped into the chest. */
  initialDeposited?: bigint;
};

// Dummy wallet timings: no transactions in the UI-first phase.
const DEPOSIT_MS = 1600;
const FAUCET_MS = 1200;
const ZERO = BigInt(0);

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <div>
      <h2 className="flex items-center gap-3">
        <span className="font-display flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[3px] border-garis bg-emas text-xl text-garis">
          {n}
        </span>
        <span className="font-display text-2xl text-gading">{title}</span>
      </h2>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[14px] border-[3px] border-garis bg-dasar px-3 py-2 font-semibold leading-relaxed text-white/80">
      {children}
    </div>
  );
}

/** "1 week" -> "1-week", for "the 1-week season". */
const asAdjective = (label: string) => label.replace(" ", "-");

const textLink = "font-extrabold text-emas underline decoration-2 underline-offset-2 hover:text-white";

export function DepositScreen({
  rules,
  wallet,
  options,
  initialTenor,
  initialAmount = "",
  position: initialPosition,
  initialPhase = "form",
  initialDeposited,
}: DepositScreenProps) {
  const [balance, setBalance] = useState(wallet.balance);
  const [faucetLeft, setFaucetLeft] = useState(wallet.faucetSecondsLeft);
  const [faucetPending, setFaucetPending] = useState(false);
  const [toast, setToast] = useState(false);

  const [tenor, setTenor] = useState(initialTenor);
  const [closed, setClosed] = useState<ReadonlySet<Tenor>>(
    () => new Set(options.filter((o) => o.enrollSecondsLeft <= 0).map((o) => o.tenor)),
  );
  const [amount, setAmount] = useState(initialAmount);
  const [phase, setPhase] = useState(initialPhase);
  const [position, setPosition] = useState(initialPosition);
  const [deposited, setDeposited] = useState(initialDeposited ?? ZERO);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));

  // Focus follows the player into the success board after a real deposit (not on first render).
  const successTitle = useRef<HTMLHeadingElement>(null);
  const movedToSuccess = useRef(false);
  useEffect(() => {
    if (phase === "success" && movedToSuccess.current) successTitle.current?.focus();
  }, [phase]);

  const option = options.find((o) => o.tenor === tenor) ?? options[0];
  const held = position && position.tenor === tenor ? position.principal : ZERO;
  const otherTenorHeld = position !== null && position.tenor !== tenor;
  const enrollmentClosed = closed.has(tenor);
  const pending = phase === "pending";
  const stillOpen = options.filter((o) => !closed.has(o.tenor));

  const parsed = parseMusd(amount);
  const amountError =
    amount === "" ? undefined
    : parsed === null ? "Enter an amount like 250 or 12.5."
    : parsed < rules.minDeposit ? `Minimum deposit is ${formatMusd(rules.minDeposit)}. Raise the amount to lock it in.`
    : parsed > balance ? `That's more than your ${formatMusd(balance)} balance. Lower the amount or claim from the faucet.`
    : undefined;
  const valid = parsed !== null && amountError === undefined;
  const canDeposit = valid && !otherTenorHeld && !enrollmentClosed && !pending;

  const claimFaucet = () => {
    setFaucetPending(true);
    later(() => {
      setFaucetPending(false);
      setBalance((b) => b + rules.faucetAmount);
      setFaucetLeft(rules.faucetCooldownSeconds);
      setToast(true);
    }, FAUCET_MS);
  };

  const deposit = () => {
    if (!canDeposit || parsed === null) return;
    setPhase("pending");
    later(() => {
      setBalance((b) => b - parsed);
      setPosition({
        seasonId: option.seasonId,
        tenor: option.tenor,
        tenorLabel: option.label,
        status: "enrolling",
        principal: held + parsed,
        baseYield: ZERO,
        bonus: ZERO,
        secondsToStart: option.enrollSecondsLeft,
        secondsToMaturity: option.maturitySeconds,
        gamesCounted: 0,
        countedGames: rules.countedGames,
      });
      setDeposited(parsed);
      setAmount("");
      movedToSuccess.current = true;
      setPhase("success");
    }, DEPOSIT_MS);
  };

  const live = position?.status === "active";

  let main: ReactNode;
  if (live && position) {
    // Season already running: nothing to deposit until this position is claimed.
    main = (
      <PositionCard
        id="position"
        position={position}
        action={
          <GameButton href="/play" size="lg">
            Play a game
          </GameButton>
        }
      />
    );
  } else if (phase === "success" && position) {
    main = (
      <Board tone="raised">
        <div className="text-center" role="status">
          <ChestDrop amount={deposited} />
          <h2 ref={successTitle} tabIndex={-1} className="font-display title-outline mt-2 text-4xl text-gading outline-none!">
            Locked in
          </h2>
          <p className="mx-auto mt-2 max-w-md font-semibold leading-relaxed text-white/80">
            {formatMusd(deposited)} is in the Principal Crystal for the {asAdjective(position.tenorLabel)} season. All of it comes
            back at maturity.
          </p>
        </div>
        <PositionCard
          id="position"
          tone="night"
          position={position}
          className="mt-6"
          action={
            <div className="flex flex-wrap gap-3">
              <GameButton href="/play">Go to the arena</GameButton>
              <GameActionButton variant="night" onClick={() => setPhase("form")}>
                Deposit more
              </GameActionButton>
            </div>
          }
        />
      </Board>
    );
  } else {
    main = (
      <Board>
        <div className="space-y-8">
          <Step n={1} title="Pick a season">
            <TenorPicker
              options={options}
              value={tenor}
              onChange={setTenor}
              closed={closed}
              onEnrollmentEnd={(t) => setClosed((s) => new Set(s).add(t))}
              heldTenor={position?.tenor}
              disabled={pending}
            />
          </Step>

          <Step n={2} title="Choose an amount">
            <AmountInput
              label="Amount to lock"
              value={amount}
              onChange={setAmount}
              max={balance}
              error={amountError}
              hint={`Minimum ${formatMusd(rules.minDeposit)}. It stays locked until maturity.`}
              disabled={pending}
            />
            <div className="mt-4">
              <WeightMeter principal={held + (parsed ?? ZERO)} cap={rules.weightCap} held={held} />
            </div>
          </Step>
        </div>

        <div className="mt-8 space-y-4 border-t-[3px] border-garis pt-6">
          {otherTenorHeld && position && (
            <Note>
              You already hold a {asAdjective(position.tenorLabel)} position in Season #{position.seasonId}. You can be in one season at a
              time, so your points always count toward one bonus pot. Pick {position.tenorLabel} to add to it.{" "}
              <a href="#position" className={textLink}>
                See your position
              </a>
            </Note>
          )}
          {!otherTenorHeld && enrollmentClosed && (
            <Note>
              Enrollment for the {asAdjective(option.label)} season closed when it started.{" "}
              {stillOpen.length > 0
                ? `Pick ${stillOpen.map((o) => o.label).join(" or ")}, which is still enrolling, or come back for the next ${asAdjective(option.label)} season.`
                : "Come back for the next season."}
            </Note>
          )}
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <GameActionButton size="lg" onClick={deposit} disabled={!canDeposit}>
              {pending ? "Depositing" : held > ZERO ? "Add to deposit" : "Lock deposit"}
            </GameActionButton>
            <p aria-live="polite" className="font-bold text-white/70">
              {pending
                ? "Confirm the deposit in your wallet."
                : valid && parsed && !otherTenorHeld && !enrollmentClosed
                  ? `Locks ${formatMusd(parsed)} in Season #${option.seasonId} until maturity.`
                  : ""}
            </p>
          </div>
        </div>
      </Board>
    );
  }

  return (
    <>
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <header className="grid gap-6 lg:grid-cols-[1fr_minmax(0,24rem)] lg:items-end">
          <div>
            <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">
              {live ? "Your deposit is locked" : "Lock your deposit"}
            </h1>
            <p className="mt-3 max-w-xl text-lg font-semibold text-white/75">
              {live
                ? "Your season is live. Play your counted games to earn season points for the bonus pot."
                : "Pick a season and an amount. Your mUSD earns yield while you play, and all of it comes back at maturity."}
            </p>
          </div>
          <FaucetCard
            balance={balance}
            amount={rules.faucetAmount}
            cooldownLeft={faucetLeft}
            pending={faucetPending}
            onClaim={claimFaucet}
            onReady={() => setFaucetLeft(0)}
          />
        </header>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {main}
          <aside className="space-y-6">
            {live && position && (
              <Note>
                You can hold one position at a time. Claim Season #{position.seasonId} at maturity, then lock mUSD into a
                new season.
              </Note>
            )}
            {!live && phase !== "success" && position && <PositionCard id="position" position={position} />}
            <PrincipalPromise />
          </aside>
        </div>
      </div>

      <Toast
        open={toast}
        onClose={() => setToast(false)}
        tone="success"
        title={`${formatMusd(rules.faucetAmount)} claimed`}
        body="Test mUSD is in your wallet. The faucet opens again in an hour."
        autoHideMs={4000}
      />
    </>
  );
}
