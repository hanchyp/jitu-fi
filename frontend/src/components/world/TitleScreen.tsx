"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { GameButton } from "@/components/ui/GameButton";

// The 3D bundle loads after the page is interactive; the static backdrop shows until then.
const ArenaScene = dynamic(() => import("./ArenaScene"), {
  ssr: false,
  loading: () => <StaticBackdrop />,
});

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function StaticBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-[55%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#836EF9]/40 blur-3xl" />
      <div className="absolute left-1/2 top-[55%] h-24 w-14 -translate-x-1/2 -translate-y-1/2 [clip-path:polygon(50%_0,100%_50%,50%_100%,0_50%)] bg-[linear-gradient(135deg,#C4B8FF,#836EF9_55%,#4B36D6)]" />
    </div>
  );
}

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? <StaticBackdrop /> : this.props.children;
  }
}

function hasWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

export function TitleScreen({ nav }: { nav: ReactNode }) {
  const reduce = useReducedMotion() ?? false;
  const [webgl, setWebgl] = useState<boolean | null>(null);

  useEffect(() => {
    // Feature detection has to run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
  }, []);

  return (
    <section className="relative isolate flex h-[100svh] max-h-[1000px] min-h-[640px] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,#3A2F86_0%,#1B2552_38%,#0A1430_78%)]">
      {webgl ? (
        <SceneBoundary>
          <ArenaScene still={reduce} />
        </SceneBoundary>
      ) : (
        <StaticBackdrop />
      )}

      <div className="relative z-10">{nav}</div>

      {/* Title at the top, the arena visible in the middle, start buttons at the bottom. */}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-between px-4 pb-16 pt-[3vh] text-center sm:pb-20 sm:pt-[4vh]">
        <div className="flex flex-col items-center">
          <motion.h1
            initial={reduce ? false : { opacity: 0, y: -120, scaleY: 1.2 }}
            animate={{ opacity: 1, y: 0, scaleY: 1 }}
            transition={{ delay: 0.9, type: "spring", stiffness: 260, damping: 13 }}
            className="font-display wordmark text-[4.6rem] leading-none text-emas sm:text-[7rem] lg:text-[8.5rem]"
          >
            jitu.fi
          </motion.h1>
          <motion.p
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.35, duration: 0.5, ease: EASE_OUT }}
            className="mt-2 max-w-sm text-lg font-extrabold text-white [text-shadow:0_2px_0_#0B1626] sm:max-w-xl sm:text-2xl"
          >
            Deposito yang bisa kamu mainkan.
            <span className="block text-base sm:hidden">Pokok aman, bonusnya diperebutkan.</span>
          </motion.p>
        </div>
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.7, type: "spring", stiffness: 380, damping: 16 }}
          className="pointer-events-auto flex flex-col items-center gap-4"
        >
          <p className="hidden rounded-full border-[3px] border-garis bg-malam/80 px-4 py-1 font-extrabold text-white sm:block">
            Pokok aman di dalam kristal. Bonusnya diperebutkan di arena.
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
