"use client";

import { motion, useReducedMotion } from "motion/react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { HowToPlayTrigger } from "@/components/howto/HowToPlay";
import { GameButton } from "@/components/ui/GameButton";

// The 3D bundle loads after the page is interactive; the static backdrop shows until then.
const ArenaScene = dynamic(() => import("./ArenaScene"), {
  ssr: false,
  loading: () => <StaticBackdrop />,
});

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
// The server can't know the reduced-motion setting, so every intro starts from the same hidden
// state on both sides (no hydration mismatch); with reduced motion it then snaps to the end.
const INSTANT = { duration: 0 } as const;
// No WebGL: the wordmark drops in on its own, as the title screen did before the crest intro.
const DROP = { delay: 0.9, type: "spring", stiffness: 260, damping: 13 } as const;
const POP = { type: "spring", stiffness: 420, damping: 18 } as const;
// If the 3D chunk has not drawn the crest by then, skip the crest and show the 2D logo.
const CREST_WAIT_MS = 1800;
const CREST_MAX_MS = 3500;

type CrestState = "pending" | "playing" | "done" | "skipped";

function StaticBackdrop() {
  return (
    <div className="absolute inset-0">
      <div className="absolute left-1/2 top-[55%] h-36 w-36 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#836EF9]/40 blur-3xl" />
      {/* The Monad mark: a squircle ring turned 45 degrees. */}
      <div className="absolute left-1/2 top-[55%] h-24 w-24 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-[38%] border-[22px] border-[#836EF9] shadow-[0_0_40px_#836EF9]" />
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
  const [crest, setCrest] = useState<CrestState>("pending");
  const logoSlot = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Feature detection has to run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWebgl(hasWebGL());
  }, []);

  // The 3D crest plays the intro and hands off to the 2D logo. Timeouts make sure the logo always
  // shows, even if the 3D chunk is slow or the scene is not rendering (hidden tab, scrolled away).
  const crestMode = webgl === true && !reduce && crest !== "skipped";
  useEffect(() => {
    if (!crestMode || crest === "done") return;
    const next = crest === "pending" ? "skipped" : "done";
    const id = setTimeout(() => setCrest((c) => (c === crest ? next : c)), crest === "pending" ? CREST_WAIT_MS : CREST_MAX_MS);
    return () => clearTimeout(id);
  }, [crestMode, crest]);

  const intro = useMemo(
    () => ({
      target: logoSlot,
      onStart: () => setCrest((c) => (c === "pending" ? "playing" : c)),
      onHandoff: () => setCrest("done"),
    }),
    [],
  );

  const logoShown = reduce || webgl === false || crest === "done" || crest === "skipped";
  const logoTransition = reduce ? INSTANT : crest === "done" ? POP : crest === "skipped" ? { ...DROP, delay: 0 } : DROP;

  return (
    <section className="relative isolate flex h-[100svh] min-h-[640px] flex-col overflow-hidden bg-[radial-gradient(ellipse_at_50%_70%,#1D4A6B_0%,#113048_38%,#071624_78%)]">
      {webgl ? (
        <SceneBoundary>
          <ArenaScene still={reduce} intro={crestMode ? intro : null} />
        </SceneBoundary>
      ) : (
        <StaticBackdrop />
      )}

      {/* Dark scrims keep the wordmark and buttons readable over the full-bleed scene. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-[38%] bg-[linear-gradient(to_bottom,rgba(4,11,16,0.7),rgba(4,11,16,0))]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[34%] bg-[linear-gradient(to_top,rgba(17,48,72,0.85),rgba(17,48,72,0))]"
      />

      <div className="relative z-10">{nav}</div>

      {/* Title at the top, the arena visible in the middle, start buttons at the bottom. */}
      <div className="pointer-events-none relative z-10 flex flex-1 flex-col items-center justify-between px-4 pb-16 pt-[3vh] text-center sm:pb-20 sm:pt-[4vh]">
        <div className="flex flex-col items-center">
          <h1 className="sr-only">jitu.fi</h1>
          {/* The slot keeps the final layout box, so the 3D crest can fly to it while the logo
              inside is still hidden or mid-animation. */}
          <div ref={logoSlot} className="w-[min(80vw,19rem)] sm:w-[25rem] lg:w-[27rem]">
            <motion.div
              initial={{ opacity: 0, y: -120, scale: 1, scaleY: 1.2 }}
              animate={
                logoShown
                  ? { opacity: 1, y: 0, scale: 1, scaleY: 1 }
                  : crestMode
                    ? { opacity: 0, y: 0, scale: 0.6, scaleY: 1 }
                    : { opacity: 0, y: -120, scale: 1, scaleY: 1.2 }
              }
              transition={logoShown ? logoTransition : INSTANT}
              className="relative"
            >
              <Image
                src="/brand/jitu-wordmark.webp"
                alt=""
                width={1104}
                height={488}
                preload
                sizes="(min-width: 1024px) 432px, (min-width: 640px) 400px, 80vw"
                className="h-auto w-full drop-shadow-[0_6px_0_rgba(4,11,16,0.55)]"
              />
              <span aria-hidden="true" className="logo-shine pointer-events-none absolute inset-0" />
            </motion.div>
          </div>
          {/* With the crest intro, the tagline follows the logo instead of sitting over the crest. */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={crestMode && !logoShown ? { opacity: 0, y: 12 } : { opacity: 1, y: 0 }}
            transition={
              reduce ? INSTANT : { delay: crestMode && logoShown ? 0.25 : 1.35, duration: 0.5, ease: EASE_OUT }
            }
            className="mt-1 max-w-sm text-lg font-extrabold text-white [text-shadow:0_2px_0_#040B10] sm:max-w-xl sm:text-2xl"
          >
            The deposit you can play.
            <span className="block text-base sm:hidden">Principal stays safe. The bonus is up for grabs.</span>
          </motion.p>
        </div>
        <motion.div
          initial={{ opacity: 0, scale: 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={reduce ? INSTANT : { delay: 1.7, type: "spring", stiffness: 380, damping: 16 }}
          className="pointer-events-auto flex flex-col items-center gap-4"
        >
          <p className="hidden rounded-full border-[3px] border-garis bg-malam/80 px-4 py-1 font-extrabold text-white sm:block">
            Your principal stays safe in the crystal. The bonus is won in the arena.
          </p>
          <div className="flex justify-center gap-2.5 sm:gap-3">
            <GameButton href="/deposit" size="lg">
              Play now
            </GameButton>
            <HowToPlayTrigger>How to play</HowToPlayTrigger>
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
          fill="#113048"
          stroke="#040B10"
          strokeWidth="3"
        />
      </svg>
    </section>
  );
}
