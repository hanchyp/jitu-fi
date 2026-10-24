"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useId, useRef, useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { GameActionButton } from "./GameButton";
import { CloseIcon } from "./icons";
import { useDialog } from "./useDialog";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Action row, usually a night "Cancel" and one gold primary button. */
  footer?: ReactNode;
};

const INSTANT = { duration: 0 } as const;
const SPRING = { type: "spring", stiffness: 320, damping: 26 } as const;
const noop = () => () => {};

/** Centered dialog board over an ink scrim (a bottom sheet on phones), like the How to play popup. */
export function Modal({ open, onClose, title, children, footer }: ModalProps) {
  const reduce = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  const titleId = useId();
  // Portals need document.body, which only exists after hydration.
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useDialog(open, onClose, panel);

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-3 sm:items-center sm:p-6">
          <motion.div
            className="absolute inset-0 bg-garis/75"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={reduce ? INSTANT : { duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            initial={{ opacity: 0, y: 40, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={reduce ? INSTANT : SPRING}
            className="relative flex max-h-[calc(100svh-1.5rem)] w-full max-w-lg flex-col overflow-y-auto rounded-[26px] border-[3px] border-garis bg-malam shadow-[0_8px_0_0_#040B10]"
          >
            <div className="flex items-start justify-between gap-3 px-5 pt-5 sm:px-6">
              <h2 id={titleId} className="font-display title-outline text-3xl text-gading">
                {title}
              </h2>
              <GameActionButton variant="night" size="icon" onClick={onClose} aria-label="Close">
                <CloseIcon />
              </GameActionButton>
            </div>
            <div className="px-5 pt-3 font-semibold leading-relaxed text-white/85 sm:px-6">{children}</div>
            {footer ? (
              <div className="flex flex-wrap justify-end gap-2 px-5 pb-5 pt-5 sm:px-6">{footer}</div>
            ) : (
              <div className="pb-5" />
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
