"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { formatMusd } from "@/lib/format";

type ClaimPayoutRevealProps = {
  /** Where the count starts (the principal, so the climb is the yield the player earned). */
  from: bigint;
  total: bigint;
  /** Count up once on mount. Off: show the total at once (direct loads, reduced motion). */
  countUp: boolean;
  className?: string;
};

const STEPS = 1_000;

/**
 * The claim total, the screen's focal number. Its one orchestrated moment is counting up from the
 * principal to the total after a claim. The count is bigint math on a 0..1000 progress, so every
 * frame is a real truncated amount and the last frame is exactly `total`.
 */
export function ClaimPayoutReveal({ from, total, countUp, className = "" }: ClaimPayoutRevealProps) {
  const reduce = useReducedMotion() ?? false;
  const animated = countUp && !reduce;
  const [step, setStep] = useState(animated ? 0 : STEPS);

  useEffect(() => {
    if (!animated) return;
    const controls = animate(0, STEPS, {
      duration: 1.1,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setStep(Math.round(v)),
      // Land exactly on the total even if the last frame was skipped.
      onComplete: () => setStep(STEPS),
    });
    return () => controls.stop();
  }, [animated]);

  const shown = animated ? from + ((total - from) * BigInt(step)) / BigInt(STEPS) : total;

  return (
    <p className={`font-display text-5xl leading-none text-emas tabular-nums sm:text-6xl ${className}`}>
      {/* Screen readers get the final amount once, not every frame. */}
      <span aria-hidden="true">{formatMusd(shown, { unit: false })}</span>
      <span className="sr-only">{formatMusd(total)}</span>
      <span aria-hidden="true" className="ml-2 text-2xl text-white/70 sm:text-3xl">
        mUSD
      </span>
    </p>
  );
}
