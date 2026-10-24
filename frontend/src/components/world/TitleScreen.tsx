"use client";

import {
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import type { ComponentType, PointerEvent, ReactNode } from "react";
import { GameButton } from "@/components/ui/GameButton";
import {
  CandiLayer,
  CloudLayer,
  FarMountainLayer,
  FoliageLayer,
  NearHillLayer,
  SkyLayer,
} from "./layers";

// depth: how far a layer moves with the pointer; rise: how far it starts below on load.
const LAYERS: { Art: ComponentType; depth: number; rise: number }[] = [
  { Art: SkyLayer, depth: 0, rise: 0 },
  { Art: CloudLayer, depth: 6, rise: 30 },
  { Art: FarMountainLayer, depth: 10, rise: 60 },
  { Art: CandiLayer, depth: 18, rise: 110 },
  { Art: NearHillLayer, depth: 28, rise: 160 },
  { Art: FoliageLayer, depth: 40, rise: 220 },
];

const COINS = [
  { glyph: "₿", label: "BTC", left: "16%", top: "34%", size: 64, delay: 0 },
  { glyph: "Ξ", label: "ETH", left: "78%", top: "28%", size: 58, delay: 0.8 },
  { glyph: "S", label: "SOL", left: "26%", top: "56%", size: 46, delay: 1.6 },
  { glyph: "M", label: "MON", left: "70%", top: "54%", size: 50, delay: 0.4 },
] as const;

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

export function TitleScreen({ nav }: { nav: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const x = useSpring(pointerX, { stiffness: 60, damping: 18 });
  const y = useSpring(pointerY, { stiffness: 60, damping: 18 });

  function onPointerMove(e: PointerEvent<HTMLElement>) {
    if (reduce || e.pointerType !== "mouse") return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section
      onPointerMove={onPointerMove}
      className="relative isolate flex min-h-[640px] flex-col overflow-hidden bg-[#13284F] h-[100svh] max-h-[1000px]"
    >
      {LAYERS.map(({ Art, depth, rise }, i) => (
        <ParallaxLayer key={i} x={x} y={y} depth={depth} rise={rise} reduce={reduce}>
          <Art />
        </ParallaxLayer>
      ))}

      {COINS.map((coin) => (
        <CoinSpirit key={coin.label} coin={coin} reduce={reduce} x={x} y={y} />
      ))}

      <div className="relative z-10">{nav}</div>

      {/* Title at the top, the candi visible in the middle, start buttons at the bottom. */}
      <div className="relative z-10 flex flex-1 flex-col items-center justify-between px-4 pb-16 pt-[3vh] text-center sm:pb-20 sm:pt-[4vh]">
        <div className="flex flex-col items-center">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: -120, scaleY: 1.2 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            transition={{ delay: 0.55, type: "spring", stiffness: 260, damping: 13 }}
            className="font-display wordmark text-[4.6rem] leading-none text-emas sm:text-[7rem] lg:text-[8.5rem]"
          >
            jitu.fi
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.0, duration: 0.5, ease: EASE_OUT }}
            className="mt-2 max-w-sm text-lg font-extrabold text-white [text-shadow:0_2px_0_#0B1626] sm:max-w-xl sm:text-2xl"
          >
            Deposito yang bisa kamu mainkan.
            <span className="block text-base sm:hidden">Pokok aman, bonusnya diperebutkan.</span>
          </motion.p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.25, type: "spring", stiffness: 380, damping: 16 }}
          className="flex flex-col items-center gap-4"
        >
          <p className="hidden rounded-full border-[3px] border-garis bg-malam/80 px-4 py-1 font-extrabold text-white sm:block">
            Pokok aman di candi. Bonusnya diperebutkan.
          </p>
          <div className="flex justify-center gap-2.5 sm:gap-3">
          <GameButton href="/deposit" size="lg">
            Main sekarang
          </GameButton>
          <GameButton href="#cara-main" size="lg" variant="night">
            Cara main
          </GameButton>
          </div>
        </motion.div>
      </div>

      {/* Torn edge into the night sections below */}
      <svg
        viewBox="0 0 1600 60"
        preserveAspectRatio="none"
        className="absolute bottom-0 left-0 z-20 h-8 w-full sm:h-12"
        aria-hidden="true"
      >
        <path
          d="M0 60 L0 34 L70 22 L140 38 L230 18 L320 36 L410 24 L520 40 L610 20 L720 34 L810 16 L920 36 L1010 22 L1120 40 L1210 20 L1320 34 L1420 18 L1520 36 L1600 26 L1600 60 Z"
          fill="#10213D"
          stroke="#0B1626"
          strokeWidth="3"
        />
      </svg>
    </section>
  );
}

function ParallaxLayer({
  x,
  y,
  depth,
  rise,
  reduce,
  children,
}: {
  x: MotionValue<number>;
  y: MotionValue<number>;
  depth: number;
  rise: number;
  reduce: boolean;
  children: ReactNode;
}) {
  const tx = useTransform(x, (v) => v * -depth);
  const ty = useTransform(y, (v) => v * -depth * 0.5);

  return (
    <motion.div style={{ x: tx, y: ty }} className="absolute -inset-[3%]">
      <motion.div
        initial={reduce || rise === 0 ? false : { y: rise }}
        animate={{ y: 0 }}
        transition={{ duration: 1.3, ease: EASE_OUT }}
        className="absolute inset-0"
      >
        {children}
      </motion.div>
    </motion.div>
  );
}

function CoinSpirit({
  coin,
  reduce,
  x,
  y,
}: {
  coin: (typeof COINS)[number];
  reduce: boolean;
  x: MotionValue<number>;
  y: MotionValue<number>;
}) {
  const tx = useTransform(x, (v) => v * -22);
  const ty = useTransform(y, (v) => v * -12);

  return (
    <motion.div
      style={{ left: coin.left, top: coin.top, x: tx, y: ty }}
      className="absolute z-[5] hidden sm:block"
      aria-hidden="true"
    >
      <motion.div
        initial={reduce ? false : { opacity: 0, scale: 0 }}
        animate={reduce ? { opacity: 1, scale: 1 } : { opacity: 1, scale: 1, y: [0, -14, 0] }}
        transition={{
          opacity: { delay: 1.4 + coin.delay * 0.3, duration: 0.3 },
          scale: { delay: 1.4 + coin.delay * 0.3, type: "spring", stiffness: 300, damping: 14 },
          y: { delay: coin.delay, duration: 3.2, repeat: Infinity, ease: "easeInOut" },
        }}
        className="relative"
      >
        <div
          className="absolute inset-0 -m-4 rounded-full bg-emas/40 blur-xl"
          style={{ width: coin.size + 32, height: coin.size + 32 }}
        />
        <div
          className="font-display relative flex items-center justify-center rounded-full border-[3px] border-garis bg-emas text-garis shadow-[inset_0_-5px_0_0_#E0A21E,inset_0_4px_0_0_#FFE28A]"
          style={{ width: coin.size, height: coin.size, fontSize: coin.size * 0.48 }}
        >
          {coin.glyph}
        </div>
      </motion.div>
    </motion.div>
  );
}
