"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { useDialog } from "@/components/ui/useDialog";
import { BonusScene, CallScene, DepositScene, PickScene, TableScene, WinScene } from "./scenes";

const STEPS: { title: string; body: string; Scene: ComponentType<{ reduce: boolean }> }[] = [
  {
    title: "Deposit",
    body: "Deposit mUSD into a season vault. Your principal is locked in the crystal and always comes back in full. Playing is free: no entry fee.",
    Scene: DepositScene,
  },
  {
    title: "Take a seat",
    body: "You sit down with 3 house bots. Choose Quick 3, Standard 5, Long 7 or Marathon 10 rounds. Each round lets you pick a few more coins than the last.",
    Scene: TableScene,
  },
  {
    title: "Pick only what you trust",
    body: "Each round deals 8 coins. Pick up to the round's cap. Fewer picks = more confidence: your score is still multiplied by the full cap.",
    Scene: PickScene,
  },
  {
    title: "Call it, cast a skill",
    body: "Call Buy if you think the price rises, Sell if it falls. Then cast up to one skill: BOOST, INSURANCE, LOCK, FLIP, SWAP or FREEZE. You start with 1 random skill and earn 1 more for each round won, hand max 3. Skills aren't tied to any character, and bots follow the same rules.",
    Scene: CallScene,
  },
  {
    title: "Score the round",
    body: "Prices run live for 60–120 s. Round score = cap × weighted average return in bps. Moves under 1 bps are void. House bots play too, but never earn points.",
    Scene: WinScene,
  },
  {
    title: "Collect at maturity",
    body: "Your first 5 games of a season (2 in the demo) earn season points. At maturity everyone gets principal plus base yield; points win your share of the bonus pot.",
    Scene: BonusScene,
  },
];

type TriggerProps = {
  children: ReactNode;
  /** "button" renders a chunky game button; "link" renders a plain nav-style text button. */
  look?: "button" | "link";
  variant?: "gold" | "night";
  size?: "sm" | "md" | "lg";
  className?: string;
};

export function HowToPlayTrigger({ children, look = "button", variant = "night", size = "lg", className }: TriggerProps) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  const show = () => {
    trigger.current?.focus();
    setOpen(true);
  };

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      {look === "button" ? (
        <GameActionButton ref={trigger} variant={variant} size={size} className={className} onClick={show} aria-haspopup="dialog">
          {children}
        </GameActionButton>
      ) : (
        <button ref={trigger} type="button" className={className} onClick={show} aria-haspopup="dialog">
          {children}
        </button>
      )}
      {open && createPortal(<HowToPlayModal onClose={close} />, document.body)}
    </>
  );
}

function HowToPlayModal({ onClose }: { onClose: () => void }) {
  const reduce = useReducedMotion() ?? false;
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);
  const overlay = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const last = step === STEPS.length - 1;

  const go = useCallback(
    (to: number) => {
      const target = Math.max(0, Math.min(STEPS.length - 1, to));
      if (target === step) return;
      setDir(target > step ? 1 : -1);
      setStep(target);
    },
    [step],
  );

  useEffect(() => {
    // Only this portal stays interactive, including when opened above the phone menu.
    const background = [...document.body.children].filter(
      (node): node is HTMLElement => node instanceof HTMLElement && node !== overlay.current,
    );
    const previous = background.map((node) => node.inert);
    background.forEach((node) => { node.inert = true; });
    return () => {
      background.forEach((node, i) => { node.inert = previous[i]; });
    };
  }, []);
  // Restore background interactivity before the shared hook restores opener focus.
  useDialog(true, onClose, panel);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

  const { title, body, Scene } = STEPS[step];

  return (
    <div ref={overlay} className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-[#040B10]/75"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-y-auto rounded-[26px] border-[3px] border-garis bg-malam shadow-[0_8px_0_0_#040B10]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
          <p className="font-extrabold text-white/70">
            Step {step + 1} of {STEPS.length}
            <span className="ml-2 text-xs font-bold text-white/60">Example numbers</span>
          </p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-garis bg-malam text-lg font-black text-white transition-transform hover:scale-105 active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Stage */}
        <div className="relative mx-4 mt-3 h-[clamp(240px,46svh,300px)] shrink-0 overflow-hidden rounded-[20px] border-[3px] border-garis bg-[radial-gradient(ellipse_at_50%_80%,#1D4A6B_0%,#113048_55%,#0A2235_100%)] sm:mx-6 sm:h-[280px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={step}
              custom={dir}
              initial={reduce ? false : { opacity: 0, x: dir * 60 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -60 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="absolute inset-0"
            >
              <Scene reduce={reduce} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Caption */}
        <div className="px-5 pt-4 sm:px-6" aria-live="polite">
          <h2 id="how-to-play-title" className="font-display title-outline text-3xl text-emas sm:text-4xl">
            {title}
          </h2>
          <p className="mt-2 min-h-[4.5rem] text-[17px] font-semibold leading-relaxed text-white/85">{body}</p>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 pb-5 pt-3 sm:px-6">
          <div className="flex gap-2" role="tablist" aria-label="Tutorial steps">
            {STEPS.map((s, i) => (
              <button
                key={s.title}
                type="button"
                role="tab"
                aria-selected={i === step}
                aria-label={`Step ${i + 1}: ${s.title}`}
                onClick={() => go(i)}
                className={`h-3.5 rounded-full border-2 border-garis transition-all ${
                  i === step ? "w-8 bg-emas" : "w-3.5 bg-white/30 hover:bg-white/60"
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            <GameActionButton variant="night" size="sm" onClick={() => go(step - 1)} disabled={step === 0}>
              Back
            </GameActionButton>
            {last ? (
              <GameButton href="/deposit" size="sm">
                Play now
              </GameButton>
            ) : (
              <GameActionButton data-autofocus size="sm" onClick={() => go(step + 1)}>
                Next
              </GameActionButton>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
