"use client";

// The six skill spells on a flat coin, for the 2D table and the skill UI. Same story as the 3D
// spells: each plays once when the effect lands, then holds a still mark. FREEZE encases the coin
// in ice, FLIP spins it upside down, SWAP trades it for the new coin through a portal, INSURANCE
// slides a light shield under it, BOOST grows it in an aura, LOCK drops a gold padlock on it.

import { motion, useReducedMotion, type Transition } from "motion/react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import type { CoinSymbol } from "@/components/table-scene/types";
import { COIN, coinDataUrl } from "@/lib/coins";
import { SKILL_FX_READY, skillFxUrl, type SkillFxName } from "./fx";
import type { SkillName } from "./types";

const INSTANT = { duration: 0 } as const;
const POP = { type: "spring", stiffness: 380, damping: 18 } as const;

/** The skill-fx sprite once it has shipped; the procedural SVG until then or if it fails to load. */
function FxArt({ name, className, children }: { name: SkillFxName; className: string; children: ReactNode }) {
  const [failed, setFailed] = useState(false);
  if (failed || !SKILL_FX_READY.has(name)) return <>{children}</>;
  return <Image src={skillFxUrl(name)} alt="" width={128} height={128} unoptimized onError={() => setFailed(true)} className={className} />;
}

function CoinFace({ symbol, className = "" }: { symbol: CoinSymbol; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- inline SVG data URL, nothing to optimize
    <img src={coinDataUrl(COIN[symbol])} alt="" className={`h-full w-full rounded-full border-2 border-garis ${className}`} />
  );
}

/**
 * Overlay box a bit larger than the coin, so marks can sit on its edge. The coin is positioned
 * too, so DOM order sets the stack: aura and portal paint behind it, ice, swirl and lock in front.
 */
const OVER = "pointer-events-none absolute -inset-[30%]";

function Ice({ t }: { t: Transition }) {
  return (
    <motion.div className={OVER} initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={t}>
      <FxArt name="freeze-ice" className="h-full w-full max-w-none scale-[1.45]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
          {/* Thin facets over a light frost, so the coin still reads through the ice. */}
          <path d="M20 3 L33 10 L36 24 L27 36 L12 36 L4 24 L7 10 Z" className="fill-gading/20 stroke-garis" strokeWidth={2} strokeLinejoin="round" />
          <path d="M20 3 L33 10 L17 17 Z M4 24 L12 36 L17 17 Z" className="fill-gading/35" />
          <path d="M20 3 L17 17 L7 10 M17 17 L4 24 M17 17 L27 36 M17 17 L36 24" className="fill-none stroke-gading/70" strokeWidth={0.8} />
        </svg>
      </FxArt>
    </motion.div>
  );
}

function Swirl({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      className={OVER}
      initial={{ rotate: 0, opacity: 0 }}
      animate={{ rotate: -360, opacity: 1 }}
      transition={reduce ? INSTANT : { duration: 0.9, ease: "easeOut" }}
    >
      <FxArt name="flip-swirl" className="h-full w-full max-w-none scale-[1.4]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
          <path d="M8 14 A14 14 0 0 1 30 9" className="fill-none stroke-zamrud" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M30 9 l-1 5 M30 9 l-5 -1" className="stroke-zamrud" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M32 26 A14 14 0 0 1 10 31" className="fill-none stroke-gading" strokeWidth={2.5} strokeLinecap="round" />
          <path d="M10 31 l1 -5 M10 31 l5 1" className="stroke-gading" strokeWidth={2.5} strokeLinecap="round" />
        </svg>
      </FxArt>
    </motion.div>
  );
}

function Portal({ t }: { t: Transition }) {
  return (
    <motion.div className={OVER} initial={{ scale: 1.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={t}>
      <FxArt name="swap-portal" className="h-full w-full">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
          <circle cx={20} cy={20} r={17} className="fill-none stroke-zamrud" strokeWidth={2.5} strokeDasharray="6 3" />
        </svg>
      </FxArt>
    </motion.div>
  );
}

function Shield({ t }: { t: Transition }) {
  return (
    <motion.div
      className="pointer-events-none absolute -inset-x-[35%] -bottom-[45%] h-[70%]"
      initial={{ scaleX: 0, opacity: 0 }}
      animate={{ scaleX: 1, opacity: 1 }}
      transition={t}
    >
      <FxArt name="insurance-shield" className="absolute bottom-0 left-0 h-auto w-full max-w-none">
        <svg viewBox="0 0 40 20" className="h-full w-full" aria-hidden>
          <path d="M3 5 Q20 22 37 5 Q20 12 3 5 Z" className="fill-gading stroke-garis" strokeWidth={2} strokeLinejoin="round" />
          <path d="M3 5 Q20 12 37 5" className="fill-none stroke-emas" strokeWidth={2} />
        </svg>
      </FxArt>
    </motion.div>
  );
}

function Aura({ t }: { t: Transition }) {
  return (
    <motion.div className={OVER} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={t}>
      <FxArt name="boost-aura" className="h-full w-full max-w-none scale-[1.45]">
        <svg viewBox="0 0 40 40" className="h-full w-full" aria-hidden>
          <circle cx={20} cy={20} r={17} className="fill-zamrud/20 stroke-zamrud" strokeWidth={2.5} />
          <path d="M6 12 l2 -4 l2 4 M30 8 l2 -4 l2 4 M33 30 l2 -4 l2 4" className="fill-none stroke-zamrud" strokeWidth={2} strokeLinejoin="round" />
        </svg>
      </FxArt>
    </motion.div>
  );
}

function Padlock({ reduce }: { reduce: boolean }) {
  return (
    <motion.div
      className="pointer-events-none absolute -bottom-[25%] -right-[30%] h-[70%] w-[70%]"
      initial={{ y: "-120%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={reduce ? INSTANT : { type: "spring", stiffness: 500, damping: 14 }}
    >
      <FxArt name="lock-seal" className="h-full w-full">
        <svg viewBox="0 0 24 24" className="h-full w-full" aria-hidden>
          <path d="M7 11 V8 a5 5 0 0 1 10 0 V11" className="fill-none stroke-garis" strokeWidth={5} />
          <path d="M7 11 V8 a5 5 0 0 1 10 0 V11" className="fill-none stroke-emas-tua" strokeWidth={2.5} />
          <rect x={3.5} y={10.5} width={17} height={12} rx={3} className="fill-emas stroke-garis" strokeWidth={2} />
          <circle cx={12} cy={15.5} r={1.8} className="fill-garis" />
          <path d="M18 18 l2.5 2.5 l-2.5 2.5 l-2.5 -2.5 Z" className="fill-zamrud stroke-garis" strokeWidth={1} />
        </svg>
      </FxArt>
    </motion.div>
  );
}

type SkillCoinProps = {
  symbol: CoinSymbol;
  effect?: SkillName;
  /** SWAP: the coin traded away, which leaves as the new one arrives. */
  swappedFrom?: CoinSymbol;
  dim?: boolean;
  className?: string;
};

/**
 * A coin with its skill spell. Size it with `className` (h-7 w-7 and up); marks spill past the
 * edge, so leave a little room around it. Remount (key) to replay the spell.
 */
export function SkillCoin({ symbol, effect, swappedFrom, dim = false, className = "h-7 w-7" }: SkillCoinProps) {
  const reduce = useReducedMotion() ?? false;
  const t: Transition = reduce ? INSTANT : POP;
  const face = dim ? "opacity-50 grayscale" : "";

  const coin = (() => {
    switch (effect) {
      case "FLIP":
        return (
          <motion.div
            className="relative h-full w-full"
            initial={{ rotate: 0 }}
            animate={{ rotate: 540 }}
            transition={reduce ? INSTANT : { duration: 0.9, ease: [0.2, 0.8, 0.3, 1] }}
          >
            <CoinFace symbol={symbol} className={face} />
          </motion.div>
        );
      case "BOOST":
        return (
          <motion.div className="relative h-full w-full" initial={{ scale: 1 }} animate={{ scale: 1.12 }} transition={t}>
            <CoinFace symbol={symbol} className={face} />
          </motion.div>
        );
      case "SWAP":
        return (
          <motion.div className="relative h-full w-full" initial={{ x: "110%", scale: 0.5, opacity: 0 }} animate={{ x: 0, scale: 1, opacity: 1 }} transition={reduce ? INSTANT : { duration: 0.7, ease: "easeOut" }}>
            <CoinFace symbol={symbol} className={face} />
          </motion.div>
        );
      default:
        return <CoinFace symbol={symbol} className={`relative ${face} ${effect === "FREEZE" ? "saturate-50" : ""}`} />;
    }
  })();

  return (
    <span className={`relative inline-block shrink-0 ${className}`} data-effect={effect}>
      {effect === "BOOST" && <Aura t={t} />}
      {effect === "SWAP" && <Portal t={t} />}
      {effect === "SWAP" && swappedFrom && !reduce && (
        <motion.span
          className="absolute inset-0"
          initial={{ x: 0, scale: 1, opacity: 1 }}
          animate={{ x: "-110%", scale: 0.5, opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
        >
          <CoinFace symbol={swappedFrom} className="opacity-70 grayscale" />
        </motion.span>
      )}
      {coin}
      {effect === "INSURANCE" && <Shield t={t} />}
      {effect === "FREEZE" && <Ice t={t} />}
      {effect === "FLIP" && <Swirl reduce={reduce} />}
      {effect === "LOCK" && <Padlock reduce={reduce} />}
    </span>
  );
}
