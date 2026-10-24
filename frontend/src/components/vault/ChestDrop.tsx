"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { formatMusd } from "@/lib/format";

const INSTANT = { duration: 0 } as const;

/**
 * The deposit screen's one orchestrated moment: the amount drops into the chest and the lid
 * bumps once. Under reduced motion it jumps straight to the end (amount gone, chest at rest).
 */
export function ChestDrop({ amount }: { amount: bigint }) {
  const reduce = useReducedMotion() ?? false;
  return (
    <div className="relative mx-auto h-44 w-44" aria-hidden="true">
      <motion.div
        className="absolute inset-x-0 bottom-0 origin-bottom"
        initial={{ scaleY: 1, scaleX: 1 }}
        animate={{ scaleY: [1, 1, 0.9, 1.05, 1], scaleX: [1, 1, 1.06, 0.98, 1] }}
        transition={reduce ? INSTANT : { duration: 1.1, times: [0, 0.5, 0.62, 0.8, 1], ease: "easeOut" }}
      >
        <Image src="/assets/landing/deposit-chest.webp" alt="" width={512} height={512} sizes="176px" priority className="h-44 w-44" />
      </motion.div>
      <div className="absolute inset-x-0 top-0 flex justify-center">
        <motion.span
          className="font-display rounded-[14px] border-[3px] border-garis bg-emas px-3 py-1 text-xl text-garis shadow-[0_4px_0_0_#A17728]"
          initial={{ opacity: 0, y: -40, scale: 1 }}
          animate={{ opacity: [0, 1, 1, 0], y: [-40, -10, 70, 84], scale: [1, 1, 0.7, 0.5] }}
          transition={reduce ? INSTANT : { duration: 0.75, times: [0, 0.3, 0.8, 1], ease: "easeIn" }}
        >
          {formatMusd(amount)}
        </motion.span>
      </div>
    </div>
  );
}
