"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { BonusScene, CallScene, DepositScene, PickScene, WinScene } from "./scenes";

const STEPS: { title: string; body: string; Scene: ComponentType<{ reduce: boolean }> }[] = [
  {
    title: "Deposit",
    body: "Deposit mUSD into this season's vault. Your principal is locked in the crystal and always comes back in full.",
    Scene: DepositScene,
  },
  {
    title: "Pick 3 coins",
    body: "Each round, 8 coins are dealt onto the table. Pick the 3 you want to play.",
    Scene: PickScene,
  },
  {
    title: "Call it: Up or Down",
    body: "For each coin, call where its price goes this round. Up if you think it rises, Down if you think it falls.",
    Scene: CallScene,
  },
  {
    title: "Win the round",
    body: "When the round ends, real price moves score your calls. If you're the only player with a call, it counts ×1.5. The top score earns the most points.",
    Scene: WinScene,
  },
  {
    title: "Collect your bonus",
    body: "When the season ends, everyone gets their principal and base yield. Your season points decide your share of the bonus pot.",
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

  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);

  return (
    <>
      {look === "button" ? (
        <GameActionButton ref={trigger} variant={variant} size={size} className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
          {children}
        </GameActionButton>
      ) : (
        <button ref={trigger} type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
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
  const nextButton = useRef<HTMLButtonElement>(null);
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
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    nextButton.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(step + 1);
      if (e.key === "ArrowLeft") go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, step]);

  const { title, body, Scene } = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-[#050B14]/75"
        initial={reduce ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="how-to-play-title"
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 320, damping: 26 }}
        className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-2xl flex-col overflow-y-auto rounded-[26px] border-[3px] border-garis bg-[#13284A] shadow-[0_8px_0_0_#050B14]"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-5 pt-4 sm:px-6 sm:pt-5">
          <p className="font-extrabold text-white/70">
            Step {step + 1} of {STEPS.length}
            <span className="ml-2 text-xs font-bold text-white/45">Example numbers</span>
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
        <div className="relative mx-4 mt-3 h-[clamp(240px,46svh,300px)] shrink-0 overflow-hidden rounded-[20px] border-[3px] border-garis bg-[radial-gradient(ellipse_at_50%_80%,#3A2F86_0%,#1B2552_55%,#0F1D3D_100%)] sm:mx-6 sm:h-[280px]">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
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
              <GameActionButton ref={nextButton} size="sm" onClick={() => go(step + 1)}>
                Next
              </GameActionButton>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
