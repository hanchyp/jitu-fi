"use client";

import { useState, type ReactNode } from "react";
import { AmountInput } from "@/components/ui/AmountInput";
import { Board } from "@/components/ui/Board";
import { Chip } from "@/components/ui/Chip";
import { CoinCard } from "@/components/ui/CoinCard";
import { Countdown } from "@/components/ui/Countdown";
import { DevStateBar } from "@/components/ui/DevStateBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatBadge } from "@/components/ui/StatBadge";
import { Tabs } from "@/components/ui/Tabs";
import { Tile } from "@/components/ui/Tile";
import { Toast, type ToastTone } from "@/components/ui/Toast";
import { COIN, TABLE_COINS } from "@/lib/coins";
import { formatBps, formatCountdown, formatMusd, parseMusd } from "@/lib/format";

const musd = (whole: number, micro = 0) => BigInt(whole) * BigInt(1_000_000) + BigInt(micro);
const BALANCE = musd(1_250, 750_000);
const MIN_DEPOSIT = musd(10);

// Dummy table prices for one live round (bps moves since the round opened).
const PRICES: Record<string, { price: string; bps: number }> = {
  BTC: { price: "$67,420.15", bps: 42 },
  ETH: { price: "$3,512.80", bps: -18 },
  SOL: { price: "$171.06", bps: 115 },
  DOGE: { price: "$0.1624", bps: -230 },
  BNB: { price: "$598.40", bps: 0 },
  XRP: { price: "$0.5231", bps: 7 },
  AVAX: { price: "$36.92", bps: -64 },
  MON: { price: "$0.0412", bps: 310 },
};

const TENORS = [
  { id: "week", label: "1 week" },
  { id: "month", label: "1 month" },
] as const;

const TOASTS: Record<ToastTone, { title: string; body: string }> = {
  info: { title: "Round 2 starts in 5s", body: "Pick up to 2 coins this round." },
  success: { title: "Skill earned: FREEZE", body: "You won round 1. FREEZE is now in your hand." },
  error: { title: "Deposit failed", body: "The wallet rejected the request. Try again from the deposit button." },
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="font-display title-outline text-3xl text-gading sm:text-4xl">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-sm font-extrabold text-white/60">{children}</p>;
}

export function KitchenSink() {
  const [amount, setAmount] = useState("");
  const [tenor, setTenor] = useState<(typeof TENORS)[number]["id"]>("week");
  const [modalOpen, setModalOpen] = useState(false);
  const [toastTone, setToastTone] = useState<ToastTone>("info");
  const [toastOpen, setToastOpen] = useState(false);
  const [picks, setPicks] = useState<Record<string, "buy" | "sell">>({ BTC: "buy", DOGE: "sell" });
  const [tickKey, setTickKey] = useState(0);

  const parsed = parseMusd(amount);
  const amountError =
    amount === "" ? undefined
    : parsed === null ? "Enter an amount like 250 or 12.5."
    : parsed < MIN_DEPOSIT ? `Minimum deposit is ${formatMusd(MIN_DEPOSIT)}.`
    : parsed > BALANCE ? "That is more than your balance. Lower the amount or use the faucet."
    : undefined;

  const CAP = 3;
  const pickCount = Object.keys(picks).length;
  const cyclePick = (symbol: string) =>
    setPicks((p) => {
      const next = { ...p };
      if (!next[symbol]) next[symbol] = "buy";
      else if (next[symbol] === "buy") next[symbol] = "sell";
      else delete next[symbol];
      return next;
    });

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 pb-32 sm:px-6">
      <h1 className="font-display title-outline text-4xl text-gading sm:text-5xl">UI kit</h1>
      <p className="mt-3 max-w-xl text-lg font-semibold leading-relaxed text-white/75">
        Every shared component in every state, on navy. Development builds only. Add <code>?state=wrong-network</code> to
        any page for the network overlay.
      </p>

      <Section title="Buttons">
        <div className="flex flex-wrap items-center gap-3">
          <GameButton href="/deposit" size="lg">Play now</GameButton>
          <GameButton href="/deposit">Deposit mUSD</GameButton>
          <GameActionButton variant="night">Cancel</GameActionButton>
          <GameActionButton size="sm">Lock picks</GameActionButton>
          <GameActionButton disabled>Claim</GameActionButton>
        </div>
      </Section>

      <Section title="Board and tile">
        <div className="grid gap-6 md:grid-cols-3">
          <Board>
            <h3 className="font-display text-2xl text-gading">Night board</h3>
            <p className="mt-1 font-semibold leading-relaxed text-white/70">The section panel for every app screen.</p>
          </Board>
          <Board tone="raised">
            <h3 className="font-display text-2xl text-emas">Raised board</h3>
            <p className="mt-1 font-semibold leading-relaxed text-white/80">Hero board or feature card.</p>
          </Board>
          <Board tone="raised" tilt="left">
            <h3 className="font-display text-2xl text-emas">Quest card</h3>
            <p className="mt-1 font-semibold leading-relaxed text-white/80">Tilted on md and up, like the landing quests.</p>
          </Board>
        </div>
        <Board className="mt-6">
          <ul className="grid gap-3 sm:grid-cols-3">
            <Tile as="li">
              <p className="font-extrabold text-white">
                Quick <span className="font-display text-xl text-emas">3</span>
                <span className="text-sm text-white/60"> rounds</span>
              </p>
            </Tile>
            <Tile as="li" active>
              <p className="font-extrabold text-white">
                Standard <span className="font-display text-xl text-emas">5</span>
                <span className="text-sm text-white/60"> rounds, selected</span>
              </p>
            </Tile>
            <Tile as="li" tone="dasar">
              <p className="font-display text-lg text-zamrud">FREEZE</p>
              <p className="text-sm font-semibold leading-snug text-white/75">Stop a rival&apos;s pick in its tracks.</p>
            </Tile>
          </ul>
        </Board>
      </Section>

      <Section title="Stat badges and chips">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBadge label="Your principal" value={formatMusd(musd(500))} />
          <StatBadge label="Base yield" value={formatMusd(musd(4, 250_000))} hint="Simulated" />
          <StatBadge label="Season points" value="1,240" />
          <StatBadge label="Last round" value={formatBps(42)} />
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {[1, 1, 2, 2, 3].map((cap, i) => (
            <Chip key={i}>{cap}</Chip>
          ))}
          <Chip tone="night">2/2 games</Chip>
          <Chip tone="night">Void</Chip>
        </div>
      </Section>

      <Section title="Countdown">
        <Board>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
            <div>
              <Note>Static clock</Note>
              <Countdown seconds={545} label="Season ends in" />
            </div>
            <div>
              <Note>Ticking clock</Note>
              <Countdown key={tickKey} seconds={125} ticking label="Enrollment closes in" />
            </div>
            <div>
              <Note>Seconds, ticking, urgent at 5s</Note>
              <Countdown key={tickKey + 1} seconds={12} format="seconds" ticking urgentAt={5} label="Commit" />
            </div>
            <div>
              <Note>Urgent</Note>
              <Countdown seconds={4} format="seconds" urgentAt={5} label="Reveal" />
            </div>
            <div>
              <Note>Done</Note>
              <Countdown seconds={0} urgentAt={0} />
            </div>
            <GameActionButton variant="night" size="sm" onClick={() => setTickKey((k) => k + 2)}>
              Restart
            </GameActionButton>
          </div>
          <p className="mt-4 text-sm font-bold text-white/55">
            formatCountdown(3725) is {formatCountdown(3725)}. Hours appear only when needed.
          </p>
        </Board>
      </Section>

      <Section title="Amount input">
        <div className="grid gap-6 md:grid-cols-2">
          <Board>
            <Note>Live: type, use Max, try 5 or 9999</Note>
            <AmountInput
              label="Deposit amount"
              value={amount}
              onChange={setAmount}
              max={BALANCE}
              error={amountError}
              hint="Minimum 10 mUSD. Weight counts up to 1,000 mUSD."
            />
          </Board>
          <Board className="grid gap-5">
            <div>
              <Note>Error</Note>
              <AmountInput label="Deposit amount" value="5" onChange={() => {}} max={BALANCE} error="Minimum deposit is 10 mUSD." />
            </div>
            <div>
              <Note>Disabled, no balance line</Note>
              <AmountInput label="Deposit amount" value="250" onChange={() => {}} disabled hint="Enrollment is closed for this season." />
            </div>
          </Board>
        </div>
      </Section>

      <Section title="Tabs">
        <Board>
          <Tabs label="Season tenor" tabs={TENORS} value={tenor} onChange={setTenor}>
            <p className="font-semibold leading-relaxed text-white/80">
              {tenor === "week"
                ? "1 week season: 15 minutes in the demo, 38 players enrolled."
                : "1 month season: 30 minutes in the demo, 12 players enrolled."}
            </p>
          </Tabs>
        </Board>
      </Section>

      <Section title="Skeleton and empty state">
        <div className="grid gap-6 md:grid-cols-2">
          <Board>
            <Note>Loading</Note>
            <div className="grid gap-3">
              <Skeleton className="h-8 w-1/2" label="Loading your position" />
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </div>
            </div>
          </Board>
          <Board>
            <EmptyState
              art="/assets/landing/skill-wins.webp"
              title="No games yet"
              body="Play a game this season and your scores show up here, round by round."
              action={<GameButton href="/play">Play a game</GameButton>}
            />
          </Board>
        </div>
      </Section>

      <Section title="Coin cards">
        <Note>Static, with price and move</Note>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TABLE_COINS.map((coin) => (
            <li key={coin.symbol}>
              <CoinCard coin={coin} price={PRICES[coin.symbol].price} changeBps={PRICES[coin.symbol].bps} />
            </li>
          ))}
        </ul>
        <div className="mt-6">
          <Note>
            Pickable: tap to cycle Buy, Sell, none. Pick up to {CAP} ({pickCount}/{CAP})
          </Note>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {TABLE_COINS.map((coin) => {
              const side = picks[coin.symbol];
              return (
                <li key={coin.symbol}>
                  <CoinCard
                    coin={coin}
                    price={PRICES[coin.symbol].price}
                    side={side}
                    selected={Boolean(side)}
                    disabled={!side && pickCount >= CAP}
                    onSelect={() => cyclePick(coin.symbol)}
                  />
                </li>
              );
            })}
          </ul>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <Note>Disabled</Note>
            <CoinCard coin={COIN.XRP} price="$0.5231" disabled onSelect={() => {}} />
          </div>
        </div>
      </Section>

      <Section title="Modal and toast">
        <div className="flex flex-wrap gap-3">
          <GameActionButton onClick={() => setModalOpen(true)}>Open modal</GameActionButton>
          {(Object.keys(TOASTS) as ToastTone[]).map((tone) => (
            <GameActionButton key={tone} variant="night" onClick={() => {
                setToastTone(tone);
                setToastOpen(true);
              }}>
              {`Show ${tone}`}
            </GameActionButton>
          ))}
          <GameButton href="?state=wrong-network" variant="night" scroll={false}>
            Wrong network
          </GameButton>
        </div>
      </Section>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Confirm deposit"
        footer={
          <>
            <GameActionButton variant="night" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </GameActionButton>
            <GameActionButton size="sm" onClick={() => setModalOpen(false)}>
              Deposit
            </GameActionButton>
          </>
        }
      >
        <p>
          Deposit {formatMusd(musd(250))} into the 1 week season. Your principal stays in the Principal Crystal and comes
          back in full at maturity.
        </p>
      </Modal>

      <Toast
        open={toastOpen}
        tone={toastTone}
        title={TOASTS[toastTone].title}
        body={TOASTS[toastTone].body}
        onClose={() => setToastOpen(false)}
        autoHideMs={toastTone === "error" ? undefined : 4000}
      />

      <DevStateBar states={["default"]} />
    </main>
  );
}
