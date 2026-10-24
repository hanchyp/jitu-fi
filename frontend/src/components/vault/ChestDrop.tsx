"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { formatMusd } from "@/lib/format";

const INSTANT = { duration: 0 } as const;

type ChestDropProps = {
  /** The amount on the chip; null or 0 shows the open chest with nothing above it. */
  amount: bigint | null;
  /**
   * "waiting": next to the amount step, the typed amount hangs over the open chest (no motion).
   * "drop": the screen's one orchestrated moment, the amount drops in and the chest bumps once.
   */
  mode: "waiting" | "drop";
  className?: string;
};

const chip =
  "font-display whitespace-nowrap rounded-[14px] border-[3px] border-garis bg-emas px-3 py-1 text-xl text-garis shadow-[0_4px_0_0_#A17728]";

/**
 * The deposit chest from the landing. Under reduced motion the drop jumps straight to its end
 * (amount gone, chest at rest).
 */
export function ChestDrop({ amount, mode, className = "" }: ChestDropProps) {
  const reduce = useReducedMotion() ?? false;
  const value = amount ?? BigInt(0);
  const shown = value > BigInt(0);

  if (mode === "waiting") {
    return (
      <div className={`relative mx-auto h-40 w-40 ${className}`} aria-hidden="true">
        <Image src="/assets/landing/deposit-chest.webp" alt="" width={512} height={512} sizes="160px" className="absolute inset-x-0 bottom-0 h-36 w-40 object-contain" />
        <div className="absolute inset-x-0 top-0 flex justify-center">
          {shown && <span className={chip}>{formatMusd(value)}</span>}
        </div>
      </div>
    );
  }

  return (
    <div className={`relative mx-auto h-44 w-44 ${className}`} aria-hidden="true">
      <motion.div
        className="absolute inset-x-0 bottom-0 origin-bottom"
        initial={{ scaleY: 1, scaleX: 1 }}
        animate={{ scaleY: [1, 1, 0.9, 1.05, 1], scaleX: [1, 1, 1.06, 0.98, 1] }}
        transition={reduce ? INSTANT : { duration: 1.1, times: [0, 0.5, 0.62, 0.8, 1], ease: "easeOut" }}
      >
        <Image src="/assets/landing/deposit-chest.webp" alt="" width={512} height={512} sizes="176px" priority className="h-44 w-44" />
      </motion.div>
      {shown && (
        <div className="absolute inset-x-0 top-0 flex justify-center">
          <motion.span
            className={chip}
            initial={{ opacity: 0, y: -40, scale: 1 }}
            animate={{ opacity: [0, 1, 1, 0], y: [-40, -10, 70, 84], scale: [1, 1, 0.7, 0.5] }}
            transition={reduce ? INSTANT : { duration: 0.75, times: [0, 0.3, 0.8, 1], ease: "easeIn" }}
          >
            {formatMusd(value)}
          </motion.span>
        </div>
      )}
    </div>
  );
}
