"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef } from "react";
import { CloseIcon } from "./icons";

export type ToastTone = "info" | "success" | "error";

type ToastProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  body?: string;
  tone?: ToastTone;
  /** Hides itself after this many ms. Omit for toasts the player should read and dismiss. */
  autoHideMs?: number;
};

// The tone shows only on the edge bar, so the toast board stays the same navy everywhere.
const BARS: Record<ToastTone, string> = {
  info: "bg-langit",
  success: "bg-zamrud",
  error: "bg-turun",
};

const INSTANT = { duration: 0 } as const;

/** One toast at a time, pinned bottom center. Errors are announced assertively. */
export function Toast({ open, onClose, title, body, tone = "info", autoHideMs }: ToastProps) {
  const reduce = useReducedMotion() ?? false;
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    if (!open || !autoHideMs) return;
    const id = setTimeout(() => close.current(), autoHideMs);
    return () => clearTimeout(id);
  }, [open, autoHideMs]);

  return (
    <div
      aria-live={tone === "error" ? "assertive" : "polite"}
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex justify-center px-3"
    >
      <AnimatePresence>
        {open && (
          <motion.div
            role={tone === "error" ? "alert" : "status"}
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12 }}
            transition={reduce ? INSTANT : { type: "spring", stiffness: 420, damping: 28 }}
            className="pointer-events-auto flex w-full max-w-sm overflow-hidden rounded-[16px] border-[3px] border-garis bg-malam shadow-[0_6px_0_0_#040B10]"
          >
            <span aria-hidden="true" className={`w-2.5 shrink-0 border-r-[3px] border-garis ${BARS[tone]}`} />
            <div className="min-w-0 flex-1 px-4 py-3">
              <p className="font-display text-lg leading-snug text-gading">{title}</p>
              {body && <p className="mt-0.5 text-sm font-semibold leading-relaxed text-white/75">{body}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Dismiss"
              className="m-2 flex h-8 w-8 shrink-0 items-center justify-center self-start rounded-full border-[3px] border-garis bg-dasar text-white hover:bg-papan"
            >
              <CloseIcon className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
