"use client";

import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useState } from "react";
import { Guilloche } from "./Guilloche";

// Example hand shown in the hero. Values are illustrative, not live prices.
const HAND = [
  { symbol: "BTC", name: "Bitcoin", dir: "naik", ret: "+1,2%", contrarian: false },
  { symbol: "ETH", name: "Ethereum", dir: "turun", ret: "+2,0%", contrarian: true },
  { symbol: "SOL", name: "Solana", dir: "naik", ret: "−0,4%", contrarian: false },
] as const;

const BONUS_TARGET = 1.08;

const formatMusd = (v: number) =>
  v.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Timeline (seconds) for the single orchestrated hero moment.
const T = { bilyet: 0, deal: 0.45, dealGap: 0.14, flip: 1.15, flipGap: 0.18, badge: 1.85, bonus: 2.0 };

export function BilyetHero() {
  const reduce = useReducedMotion() ?? false;
  const [round, setRound] = useState(0);

  return (
    <div className="relative mx-auto w-full max-w-[460px]">
      <motion.div
        key={`bilyet-${round}`}
        initial={reduce || round > 0 ? false : { opacity: 0, y: 16, rotate: -3 }}
        animate={{ opacity: 1, y: 0, rotate: -1.2 }}
        transition={{ delay: T.bilyet, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-[4px] border border-tinta/15 bg-white/70 p-5 shadow-[6px_6px_0_0_rgb(20_40_71/0.08)] sm:p-6"
      >
        <Guilloche className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 text-guilloche/25" />
        <Guilloche
          size={240}
          lines={10}
          petals={7}
          className="pointer-events-none absolute -bottom-28 -left-20 h-64 w-64 text-guilloche/15"
        />

        <div className="relative flex items-start justify-between gap-4 text-sm">
          <div>
            <p className="font-semibold">Bilyet deposito</p>
            <p className="text-tinta/60">Musim demo #1, tenor 30 menit</p>
          </div>
          <p className="text-tinta/60">No. 0001</p>
        </div>

        <div className="relative mt-5 flex items-end justify-between gap-4 border-b border-dashed border-tinta/20 pb-4">
          <div>
            <p className="text-sm text-tinta/60">Pokok</p>
            <p className="whitespace-nowrap text-[1.7rem] font-extrabold leading-tight tracking-tight sm:text-3xl">
              100,00 mUSD
            </p>
          </div>
          <Stamp reduce={reduce} round={round} />
        </div>

        <div className="relative mt-5 grid grid-cols-3 gap-2.5 sm:gap-3 [perspective:900px]">
          {HAND.map((card, i) => (
            <CoinCard key={`${round}-${card.symbol}`} card={card} index={i} reduce={reduce} />
          ))}
        </div>

        <dl className="relative mt-5 space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-tinta/70">Bunga dasar (dijamin)</dt>
            <dd className="font-semibold">+0,42 mUSD</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-tinta/70">Bonus dari skor</dt>
            <dd className="font-semibold text-naik">
              +<BonusCounter reduce={reduce} round={round} /> mUSD
            </dd>
          </div>
        </dl>
      </motion.div>

      <div className="mt-4 flex items-center justify-between gap-3 px-1 text-sm text-tinta/60">
        <p>Contoh satu ronde. Angka ilustrasi, bukan harga asli.</p>
        <button
          type="button"
          onClick={() => setRound((r) => r + 1)}
          className="shrink-0 rounded-[10px] border border-tinta/20 px-3 py-1.5 font-semibold text-tinta transition-colors hover:bg-tinta/5 active:translate-y-px"
        >
          Kocok ulang
        </button>
      </div>
    </div>
  );
}

function Stamp({ reduce, round }: { reduce: boolean; round: number }) {
  return (
    <motion.div
      key={`stamp-${round}`}
      initial={reduce || round > 0 ? false : { opacity: 0, scale: 1.4, rotate: -14 }}
      animate={{ opacity: 1, scale: 1, rotate: -8 }}
      transition={{ delay: 0.3, duration: 0.35, ease: "easeOut" }}
      className="shrink-0 whitespace-nowrap rounded-[6px] border-2 border-naik/70 px-2 py-1 text-xs font-bold text-naik sm:px-2.5 sm:text-sm"
    >
      Kembali utuh
    </motion.div>
  );
}

type Card = (typeof HAND)[number];

function CoinCard({ card, index, reduce }: { card: Card; index: number; reduce: boolean }) {
  const up = card.dir === "naik";
  const dealDelay = T.deal + index * T.dealGap;
  const flipDelay = T.flip + index * T.flipGap;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, x: 120 - index * 40, y: -60, rotate: 14 }}
      animate={{ opacity: 1, x: 0, y: 0, rotate: index === 1 ? 0 : index === 0 ? -2 : 2 }}
      transition={{ delay: dealDelay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="relative aspect-[3/4]"
    >
      <motion.div
        initial={reduce ? false : { rotateY: 180 }}
        animate={{ rotateY: 0 }}
        transition={{ delay: flipDelay, duration: 0.55, ease: [0.65, 0, 0.35, 1] }}
        className="preserve-3d relative h-full w-full"
      >
        {/* Front */}
        <div className="backface-hidden absolute inset-0 flex flex-col justify-between rounded-[14px] border border-tinta/15 bg-white p-2.5 sm:p-3">
          <div>
            <p className="text-lg font-extrabold leading-none tracking-tight sm:text-xl">{card.symbol}</p>
            <p className="mt-1 text-[11px] text-tinta/55 sm:text-xs">{card.name}</p>
          </div>
          <div>
            <p className={`text-sm font-bold ${up ? "text-naik" : "text-turun"}`}>
              {up ? "▲ Naik" : "▼ Turun"}
            </p>
            <p className="text-xs text-tinta/60">hasil {card.ret}</p>
          </div>
        </div>
        {/* Back */}
        <div className="backface-hidden absolute inset-0 overflow-hidden rounded-[14px] bg-tinta [transform:rotateY(180deg)]">
          <Guilloche size={160} lines={8} petals={6} className="absolute inset-0 m-auto h-full w-full text-guilloche/60" />
        </div>
      </motion.div>

      {card.contrarian && (
        <motion.span
          initial={reduce ? false : { opacity: 0, scale: 0.4 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: T.badge, type: "spring", stiffness: 420, damping: 18 }}
          className="absolute -right-2 -top-2 rounded-full bg-guilloche px-2 py-0.5 text-xs font-bold text-white"
          title="Satu-satunya pemain yang memilih arah ini"
        >
          ×1,5
        </motion.span>
      )}
    </motion.div>
  );
}

function BonusCounter({ reduce, round }: { reduce: boolean; round: number }) {
  const value = useMotionValue(reduce ? BONUS_TARGET : 0);
  const text = useTransform(value, formatMusd);

  useEffect(() => {
    if (reduce) {
      value.set(BONUS_TARGET);
      return;
    }
    value.set(0);
    const controls = animate(value, BONUS_TARGET, { delay: T.bonus, duration: 0.9, ease: "easeOut" });
    return () => controls.stop();
  }, [reduce, round, value]);

  return <motion.span>{text}</motion.span>;
}
