"use client";

// Final-podium confetti over the table (DOM, so the 3D scene and the 2D fallback share it).
// Pops in once, then drifts gently; under reduced motion it simply sits there.

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import { tableFxUrl } from "./model";

export function Confetti() {
  const reduce = useReducedMotion() ?? false;
  return (
    <motion.div
      aria-hidden
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={reduce ? { duration: 0 } : { duration: 0.7, ease: "backOut" }}
    >
      <motion.div
        className="absolute inset-0"
        animate={reduce ? undefined : { y: [0, 10, 0] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image src={tableFxUrl("podium-confetti")} alt="" fill sizes="100vw" className="object-cover" />
      </motion.div>
    </motion.div>
  );
}
