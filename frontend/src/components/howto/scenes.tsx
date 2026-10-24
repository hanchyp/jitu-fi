"use client";

// Animated scenes for the How to play tutorial. Each scene plays its own short timeline on mount.
// Numbers are illustrative examples, not live data.

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { COIN, TABLE_COINS, coinDataUrl, type Coin } from "@/lib/coins";

const POP = { type: "spring", stiffness: 420, damping: 20 } as const;

/** Advances through timeline steps at the given times (ms). With reduced motion it jumps to the end. */
function useTimeline(times: number[], reduce: boolean) {
  const [step, setStep] = useState(reduce ? times.length : 0);
  useEffect(() => {
    if (reduce) return;
    const timers = times.map((t, i) => setTimeout(() => setStep(i + 1), t));
    return () => timers.forEach(clearTimeout);
    // The timeline is fixed per scene; it restarts only when the scene remounts.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce]);
  return step;
}

function CoinToken({ coin, size = 44, className = "" }: { coin: Coin; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={coinDataUrl(coin)}
      alt={coin.name}
      width={size}
      height={size}
      className={`rounded-full border-[3px] border-garis bg-white ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

function MusdChip({ size = 40 }: { size?: number }) {
  return (
    <div
      className="font-display flex items-center justify-center rounded-full border-[3px] border-garis bg-emas text-garis shadow-[inset_0_-4px_0_0_#E0A21E]"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
    >
      $
    </div>
  );
}

function CountUp({ to, decimals = 2, delay = 0, reduce }: { to: number; decimals?: number; delay?: number; reduce: boolean }) {
  const value = useMotionValue(reduce ? to : 0);
  const text = useTransform(value, (v) =>
    v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }),
  );
  useEffect(() => {
    if (reduce) return;
    const controls = animate(value, to, { delay, duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [to, delay, reduce, value]);
  return <motion.span>{text}</motion.span>;
}

/* 1. Deposit: mUSD flies from the wallet into the crystal and gets locked. */
export function DepositScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([1500, 1900], reduce);

  return (
    <div className="relative flex h-full items-center justify-between px-4 sm:px-10">
      <div className="flex flex-col items-center gap-2">
        <div className="rounded-[16px] border-[3px] border-garis bg-langit px-3 py-2 text-center">
          <p className="text-xs font-extrabold text-white/70">Your wallet</p>
          <p className="font-display text-xl text-white">100 mUSD</p>
        </div>
      </div>

      {/* Flying chips */}
      <div className="pointer-events-none absolute inset-0">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="absolute top-[44%]"
            style={{ left: "20%" }}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={
              reduce
                ? { opacity: 0 }
                : { left: ["20%", "48%", "74%"], y: [0, -70, -10], opacity: [0, 1, 0], scale: [0.6, 1, 0.5] }
            }
            transition={{ delay: 0.2 + i * 0.35, duration: 1.0, ease: "easeInOut" }}
          >
            <MusdChip />
          </motion.div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <motion.div
            className="absolute inset-0 -m-6 rounded-full bg-kristal/50 blur-2xl"
            animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5] }}
            transition={{ duration: 2.2, repeat: Infinity }}
          />
          <motion.div
            animate={reduce ? undefined : { y: [0, -6, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <CoinToken coin={COIN.MON} size={104} />
          </motion.div>
          <AnimatePresence>
            {step >= 1 && (
              <motion.div
                initial={reduce ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: -8 }}
                transition={POP}
                className="absolute -right-6 -top-3 rounded-[10px] border-[3px] border-garis bg-naik px-2 py-0.5 text-sm font-black text-garis"
              >
                Locked
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 8 }}
          animate={step >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
          className="text-center"
        >
          <p className="text-xs font-extrabold text-white/70">Principal Crystal</p>
          <p className="font-display text-xl text-emas">100 mUSD safe</p>
        </motion.div>
      </div>
    </div>
  );
}

/* 2. Pick 3 coins: 8 coins are dealt, three get picked one by one. */
const PICKED = ["BTC", "ETH", "DOGE"];

export function PickScene({ reduce }: { reduce: boolean }) {
  const picked = useTimeline([1100, 1700, 2300], reduce);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-3">
      <div className="flex items-center gap-2 rounded-full border-[3px] border-garis bg-malam px-4 py-1 font-extrabold text-white">
        Picked
        <motion.span key={picked} initial={reduce ? false : { scale: 1.8, color: "#FFC93C" }} animate={{ scale: 1, color: "#FFFFFF" }} className="font-display text-xl">
          {picked}/3
        </motion.span>
      </div>
      <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
        {TABLE_COINS.map((coin, i) => {
          const order = PICKED.indexOf(coin.symbol);
          const isPicked = order !== -1 && picked > order;
          return (
            <motion.div
              key={coin.symbol}
              initial={reduce ? false : { opacity: 0, y: -30, rotate: -8 }}
              animate={{ opacity: 1, y: isPicked ? -6 : 0, rotate: 0, scale: isPicked ? 1.06 : 1 }}
              transition={{ delay: reduce ? 0 : i * 0.07, ...POP }}
              className={`relative flex w-[68px] flex-col items-center gap-1 rounded-[14px] border-[3px] px-1 py-2 sm:w-[84px] ${
                isPicked ? "border-emas bg-[#24406E]" : "border-garis bg-[#183056]"
              }`}
            >
              <CoinToken coin={coin} size={36} />
              <span className="text-xs font-black text-white">{coin.symbol}</span>
              <AnimatePresence>
                {isPicked && (
                  <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={POP}
                    className="font-display absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-[3px] border-garis bg-emas text-xs text-garis"
                  >
                    {order + 1}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* 3. Call it: each picked coin gets an Up or Down call. */
const CALLS: { coin: Coin; dir: "up" | "down" }[] = [
  { coin: COIN.BTC, dir: "up" },
  { coin: COIN.ETH, dir: "down" },
  { coin: COIN.DOGE, dir: "up" },
];

function CallPill({ dir, active, reduce }: { dir: "up" | "down"; active: boolean; reduce: boolean }) {
  const up = dir === "up";
  return (
    <motion.span
      animate={active && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`rounded-[10px] border-[3px] px-2 py-0.5 text-sm font-black transition-colors ${
        active
          ? up
            ? "border-garis bg-naik text-garis"
            : "border-garis bg-turun text-garis"
          : "border-white/15 text-white/45"
      }`}
    >
      {up ? "▲ Up" : "▼ Down"}
    </motion.span>
  );
}

export function CallScene({ reduce }: { reduce: boolean }) {
  const called = useTimeline([700, 1300, 1900], reduce);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-3">
      <div className="flex gap-2.5 sm:gap-5">
        {CALLS.map(({ coin, dir }, i) => {
          const done = called > i;
          return (
            <motion.div
              key={coin.symbol}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.1 }}
              className={`flex w-[98px] flex-col items-center gap-2 rounded-[16px] border-[3px] bg-[#183056] px-2 py-3 sm:w-[124px] ${
                done ? (dir === "up" ? "border-naik" : "border-turun") : "border-garis"
              }`}
            >
              <CoinToken coin={coin} size={46} />
              <span className="text-sm font-black text-white">{coin.symbol}</span>
              <div className="flex flex-col gap-1.5 sm:flex-row">
                <CallPill dir="up" active={done && dir === "up"} reduce={reduce} />
                <CallPill dir="down" active={done && dir === "down"} reduce={reduce} />
              </div>
            </motion.div>
          );
        })}
      </div>
      <p className="max-w-sm text-center text-sm font-bold text-white/70">
        <span className="text-naik">Up</span> = you think the price rises.{" "}
        <span className="text-turun">Down</span> = you think it falls.
      </p>
    </div>
  );
}

/* 4. Win the round: calls get scored, then the table ranking settles with you on top. */
const RESULTS = [
  { coin: COIN.BTC, dir: "up", move: "+1.2%", score: "+1.2", good: true, bonus: false },
  { coin: COIN.ETH, dir: "down", move: "−2.0%", score: "+3.0", good: true, bonus: true },
  { coin: COIN.DOGE, dir: "up", move: "−0.4%", score: "−0.4", good: false, bonus: false },
] as const;

const BEFORE = ["Ayu", "Bima", "You", "Dewi"];
const AFTER = [
  { name: "You", score: "+3.8%", pts: "+4 pts" },
  { name: "Bima", score: "+2.1%", pts: "+3 pts" },
  { name: "Dewi", score: "+0.6%", pts: "+2 pts" },
  { name: "Ayu", score: "−1.3%", pts: "+1 pt" },
];

export function WinScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([500, 900, 1300, 2100], reduce);
  const ranked = step >= 4;
  const rows = ranked ? AFTER : BEFORE.map((name) => ({ name, score: "", pts: "" }));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-3 sm:flex-row sm:gap-6">
      <div className="flex gap-2 sm:flex-col">
        {RESULTS.map((r, i) => (
          <motion.div
            key={r.coin.symbol}
            initial={reduce ? false : { opacity: 0.4 }}
            animate={{ opacity: step > i ? 1 : 0.4 }}
            className="relative flex items-center gap-1.5 rounded-[14px] border-[3px] border-garis bg-[#183056] px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5"
          >
            <CoinToken coin={r.coin} size={26} className="hidden sm:block" />
            <div className="leading-tight">
              <p className={`text-xs font-black ${r.dir === "up" ? "text-naik" : "text-turun"}`}>
                <span className="text-white sm:hidden">{r.coin.symbol} </span>
                {r.dir === "up" ? "▲ Up" : "▼ Down"}
              </p>
              <p className="text-[11px] font-bold text-white/60">price {r.move}</p>
            </div>
            <AnimatePresence>
              {step > i && (
                <motion.span
                  initial={reduce ? false : { scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={POP}
                  className={`font-display ml-1 text-lg ${r.good ? "text-naik" : "text-turun"}`}
                >
                  {r.score}
                </motion.span>
              )}
            </AnimatePresence>
            {r.bonus && step > i && (
              <motion.span
                initial={reduce ? false : { scale: 0, rotate: -20 }}
                animate={{ scale: 1, rotate: 8 }}
                transition={{ ...POP, delay: reduce ? 0 : 0.15 }}
                className="absolute -right-3 -top-3 rounded-full border-[3px] border-garis bg-kristal px-1.5 text-xs font-black text-white"
                title="Only you made this call"
              >
                ×1.5
              </motion.span>
            )}
          </motion.div>
        ))}
      </div>

      <ol className="w-full max-w-[230px] space-y-1">
        {rows.map((row, i) => (
          <motion.li
            key={row.name}
            layout={!reduce}
            transition={POP}
            className={`flex items-center justify-between rounded-[12px] border-[3px] px-3 py-0.5 text-sm font-extrabold sm:py-1 sm:text-base ${
              row.name === "You" ? "border-emas bg-[#24406E] text-white" : "border-garis bg-malam text-white/80"
            }`}
          >
            <span>
              <span className="font-display mr-2 text-emas">{i + 1}</span>
              {row.name}
              {ranked && row.name === "You" && <span className="ml-1 text-emas">★</span>}
            </span>
            {ranked && <span className="text-sm text-emas">{row.pts}</span>}
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

/* 5. Bonus: at season end the claim adds up principal, base yield and bonus. */
const BURST = Array.from({ length: 10 }, (_, i) => {
  const a = (i / 10) * Math.PI * 2;
  return { x: Math.cos(a) * 150, y: Math.sin(a) * 90 };
});

export function BonusScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([400, 900, 1400, 2400], reduce);

  const rows = [
    { label: "Principal", note: "always back in full", value: 100, tone: "text-white" },
    { label: "Base yield", note: "shared by deposit", value: 0.42, tone: "text-langit" },
    { label: "Bonus", note: "from your season points", value: 1.08, tone: "text-emas" },
  ];

  return (
    <div className="relative flex h-full items-center justify-center px-3">
      {!reduce && step >= 4 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          {BURST.map((p, i) => (
            <motion.div
              key={i}
              className="absolute"
              initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }}
              animate={{ x: p.x, y: p.y, opacity: 0, scale: 1 }}
              transition={{ duration: 1.1, ease: "easeOut" }}
            >
              <MusdChip size={26} />
            </motion.div>
          ))}
        </div>
      )}

      <div className="relative w-full max-w-[340px] rounded-[18px] border-[3px] border-garis bg-malam px-4 py-3 shadow-[0_6px_0_0_#050B14]">
        <p className="font-display text-lg text-white">Season claim</p>
        <dl className="mt-1.5 space-y-1.5">
          {rows.map((row, i) => (
            <motion.div
              key={row.label}
              initial={reduce ? false : { opacity: 0, x: -16 }}
              animate={step > i ? { opacity: 1, x: 0 } : { opacity: 0, x: -16 }}
              className="flex items-end justify-between gap-3"
            >
              <dt className="leading-tight">
                <span className="block font-extrabold text-white">{row.label}</span>
                <span className="text-xs font-bold text-white/55">{row.note}</span>
              </dt>
              <dd className={`font-display text-xl ${row.tone}`}>
                {i > 0 && "+"}
                {step > i ? <CountUp to={row.value} reduce={reduce} /> : "0.00"}
              </dd>
            </motion.div>
          ))}
        </dl>
        <motion.div
          initial={reduce ? false : { opacity: 0 }}
          animate={step >= 4 ? { opacity: 1 } : { opacity: 0 }}
          className="mt-2 flex items-end justify-between border-t-[3px] border-dashed border-white/15 pt-1.5"
        >
          <span className="font-extrabold text-white">You get</span>
          <span className="font-display text-2xl text-emas">
            {step >= 4 ? <CountUp to={101.5} reduce={reduce} /> : "0.00"} mUSD
          </span>
        </motion.div>
      </div>
    </div>
  );
}
