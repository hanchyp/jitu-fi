"use client";

// Animated scenes for the How to play tutorial. Each scene plays its own short timeline on mount.
// Numbers are illustrative examples, not live data.

import { animate, AnimatePresence, motion, useMotionValue, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { CHAMPIONS } from "@/lib/champions";
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

/* 2. Face the champions: you and the 3 house champions take their seats, then a preset is chosen. */
const SCENE_PRESETS = [
  { name: "Quick", caps: [1, 2, 3] },
  { name: "Standard", caps: [1, 1, 2, 2, 3] },
  { name: "Long", caps: [1, 1, 2, 2, 3, 3, 4] },
  { name: "Marathon", caps: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5] },
];

function Seat({ name, src, ring, you = false, className = "" }: { name: string; src: string; ring: string; you?: boolean; className?: string }) {
  return (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        width={64}
        height={64}
        className="h-14 w-14 rounded-full border-[3px] border-garis bg-malam sm:h-16 sm:w-16"
        style={{ boxShadow: `inset 0 0 0 3px ${ring}` }}
      />
      <span className={`rounded-full border-2 border-garis px-2 text-xs font-black ${you ? "bg-emas text-garis" : "bg-malam text-white"}`}>
        {name}
      </span>
    </div>
  );
}

export function TableScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([300, 550, 800, 1050, 1700], reduce);
  const seats = [
    { name: "You", src: "/assets/landing/portrait-hero.webp", ring: "#FFC93C", you: true },
    ...CHAMPIONS.map((c) => ({ name: c.short, src: c.portrait, ring: c.color, you: false })),
  ];
  const chosen = step >= 5;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-3">
      <div className="flex items-end gap-3 sm:gap-5">
        {seats.map((seat, i) => (
          <motion.div
            key={seat.name}
            initial={reduce ? false : { opacity: 0, y: 24, scale: 0.7 }}
            animate={step > i ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 24, scale: 0.7 }}
            transition={POP}
          >
            <Seat {...seat} className={i === 0 ? "mr-2 sm:mr-4" : ""} />
          </motion.div>
        ))}
      </div>
      <div className="grid w-full max-w-md grid-cols-2 gap-2 sm:grid-cols-4">
        {SCENE_PRESETS.map((preset) => {
          const active = chosen && preset.name === "Standard";
          return (
            <motion.div
              key={preset.name}
              animate={active && !reduce ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              className={`rounded-[12px] border-[3px] px-2 py-1 text-center ${active ? "border-emas bg-[#24406E]" : "border-garis bg-[#183056]"}`}
            >
              <p className="text-xs font-black text-white">
                {preset.name} <span className="font-display text-base text-emas">{preset.caps.length}</span>
              </p>
              <p className="text-[10px] font-bold tracking-wide text-white/60">{preset.caps.join("·")}</p>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

/* 3. Pick: 8 coins are dealt, the cap is 3, and you pick only the 2 you trust. */
const PICKED = ["BTC", "ETH"];
const CAP = 3;

export function PickScene({ reduce }: { reduce: boolean }) {
  const picked = useTimeline([1100, 1700], reduce);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full border-[3px] border-garis bg-malam px-4 py-1 font-extrabold text-white">
          Picked
          <motion.span key={picked} initial={reduce ? false : { scale: 1.8, color: "#FFC93C" }} animate={{ scale: 1, color: "#FFFFFF" }} className="font-display text-xl">
            {picked}/{CAP}
          </motion.span>
        </div>
        <span className="rounded-full border-[3px] border-garis bg-emas px-3 py-1 text-sm font-black text-garis">Cap ×{CAP}</span>
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

/* 4. Call it: each pick gets Buy or Sell, then one skill (BOOST) lands on a pick. */
const CALLS: { coin: Coin; dir: "buy" | "sell" }[] = [
  { coin: COIN.BTC, dir: "buy" },
  { coin: COIN.ETH, dir: "sell" },
];

const SKILL_NAMES = ["BOOST", "INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE"];

function CallPill({ dir, active, reduce }: { dir: "buy" | "sell"; active: boolean; reduce: boolean }) {
  const buy = dir === "buy";
  return (
    <motion.span
      animate={active && !reduce ? { scale: [1, 1.18, 1] } : { scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`whitespace-nowrap rounded-[10px] border-[3px] px-2 py-0.5 text-sm font-black transition-colors ${
        active
          ? buy
            ? "border-garis bg-naik text-garis"
            : "border-garis bg-turun text-garis"
          : "border-white/15 text-white/45"
      }`}
    >
      {buy ? "▲ Buy" : "▼ Sell"}
    </motion.span>
  );
}

export function CallScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([700, 1300, 2000], reduce);
  const boosted = step >= 3;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-3 sm:gap-4">
      <div className="flex gap-3 sm:gap-5">
        {CALLS.map(({ coin, dir }, i) => {
          const done = step > i;
          return (
            <motion.div
              key={coin.symbol}
              initial={reduce ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduce ? 0 : i * 0.1 }}
              className={`relative flex w-[150px] flex-col items-center gap-2 rounded-[16px] border-[3px] bg-[#183056] px-2 py-3 ${
                done ? (dir === "buy" ? "border-naik" : "border-turun") : "border-garis"
              }`}
            >
              <CoinToken coin={coin} size={46} />
              <span className="text-sm font-black text-white">{coin.symbol}</span>
              <div className="flex gap-1.5">
                <CallPill dir="buy" active={done && dir === "buy"} reduce={reduce} />
                <CallPill dir="sell" active={done && dir === "sell"} reduce={reduce} />
              </div>
              <AnimatePresence>
                {boosted && i === 0 && (
                  <motion.span
                    initial={reduce ? false : { scale: 0, rotate: -20, y: 60 }}
                    animate={{ scale: 1, rotate: 8, y: 0 }}
                    transition={POP}
                    className="absolute -right-3 -top-3 rounded-full border-[3px] border-garis bg-kristal px-1.5 text-xs font-black text-white"
                  >
                    BOOST ×2
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      <div className="flex max-w-md flex-wrap justify-center gap-1.5" aria-label="Skills">
        {SKILL_NAMES.map((name) => (
          <span
            key={name}
            className={`rounded-[8px] border-2 px-1.5 text-[11px] font-black ${
              name === "BOOST" && boosted ? "border-garis bg-kristal text-white" : "border-white/15 text-kristal-terang/70"
            }`}
          >
            {name}
          </span>
        ))}
      </div>
      <p className="text-center text-xs font-bold text-white/60">Max 1 skill per round.</p>
    </div>
  );
}

/* 5. Score the round: returns in bps, BOOST weighs double, cap multiplies; then the table ranks. */
const RESULTS = [
  { coin: COIN.BTC, call: "▲ Buy", move: "price +1.20%", bps: "+120", weight: "×2", good: true },
  { coin: COIN.ETH, call: "▼ Sell", move: "price −0.60%", bps: "+60", weight: "×1", good: true },
] as const;

const BEFORE = ["Bruno", "You", "Dex", "Bera"];
const AFTER = [
  { name: "You", score: "+300" },
  { name: "Bruno", score: "+180" },
  { name: "Dex", score: "+45" },
  { name: "Bera", score: "−90" },
];

export function WinScene({ reduce }: { reduce: boolean }) {
  const step = useTimeline([500, 900, 1500, 2300], reduce);
  const ranked = step >= 4;
  const rows = ranked ? AFTER : BEFORE.map((name) => ({ name, score: "" }));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-3 sm:flex-row sm:gap-6">
      <div className="flex flex-col gap-1.5 sm:gap-2">
        <div className="flex gap-2 sm:flex-col">
          {RESULTS.map((r, i) => (
            <motion.div
              key={r.coin.symbol}
              initial={reduce ? false : { opacity: 0.4 }}
              animate={{ opacity: step > i ? 1 : 0.4 }}
              className="flex items-center gap-1.5 rounded-[14px] border-[3px] border-garis bg-[#183056] px-1.5 py-1 sm:gap-2 sm:px-2 sm:py-1.5"
            >
              <CoinToken coin={r.coin} size={26} className="hidden sm:block" />
              <div className="leading-tight">
                <p className={`text-xs font-black ${r.call.includes("Buy") ? "text-naik" : "text-turun"}`}>
                  <span className="text-white sm:hidden">{r.coin.symbol} </span>
                  {r.call} <span className="text-kristal-terang">{r.weight}</span>
                </p>
                <p className="text-[11px] font-bold text-white/60">{r.move}</p>
              </div>
              <AnimatePresence>
                {step > i && (
                  <motion.span
                    initial={reduce ? false : { scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={POP}
                    className="font-display ml-1 text-lg text-naik"
                  >
                    {r.bps}
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
        <motion.p
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={step >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          className="rounded-[12px] border-[3px] border-garis bg-malam px-2 py-1 text-center text-xs font-black text-white"
        >
          cap 3 × avg 100 bps = <span className="font-display text-base text-emas">300</span>
        </motion.p>
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
            {ranked && <span className="text-sm text-emas">{row.score}</span>}
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
        <p className="font-display text-lg text-white">Claim at maturity</p>
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
