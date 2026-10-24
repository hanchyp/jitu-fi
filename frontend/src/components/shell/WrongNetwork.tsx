"use client";

import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useRef, useState } from "react";
import { GameActionButton } from "@/components/ui/GameButton";
import { NetworkIcon } from "@/components/ui/icons";
import { useDialog } from "@/components/ui/useDialog";
import { useRawDevState, WRONG_NETWORK_STATE } from "@/lib/dev-state";

const INSTANT = { duration: 0 } as const;

type WrongNetworkProps = {
  /** Network the wallet is on now, if known. */
  currentNetwork?: string;
  /** Visual only for now; wagmi's switchChain plugs in here later. */
  onSwitch?: () => void;
  pending?: boolean;
};

/** Blocking board over an ink scrim: the app only works on Monad testnet (chain 10143). */
export function WrongNetwork({ currentNetwork = "Ethereum", onSwitch, pending = false }: WrongNetworkProps) {
  const reduce = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  // There is nothing to close to: the only way out is switching network.
  useDialog(true, () => {}, panel);

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6">
      <motion.div
        className="absolute inset-0 bg-[#040B10]/80"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? INSTANT : { duration: 0.15 }}
      />
      <motion.div
        ref={panel}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="wrong-network-title"
        aria-describedby="wrong-network-body"
        initial={{ opacity: 0, y: 40, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduce ? INSTANT : { type: "spring", stiffness: 320, damping: 26 }}
        className="relative w-full max-w-md rounded-[26px] border-[3px] border-garis bg-malam p-6 text-center shadow-[0_8px_0_0_#040B10] sm:p-8"
      >
        <NetworkIcon className="mx-auto h-16 w-16" />
        <h2 id="wrong-network-title" className="font-display title-outline mt-3 text-4xl text-gading">
          Wrong network
        </h2>
        <p id="wrong-network-body" className="mx-auto mt-2 max-w-xs font-semibold leading-relaxed text-white/80">
          Your wallet is on {currentNetwork}. The arena runs on Monad testnet, so switch networks to keep playing.
        </p>
        <GameActionButton size="lg" onClick={onSwitch} disabled={pending} data-autofocus className="mt-6">
          {pending ? "Switching" : "Switch network"}
        </GameActionButton>
        <p className="mt-4 text-sm font-bold text-white/55">Monad testnet, chain ID 10143. Your funds stay where they are.</p>
      </motion.div>
    </div>
  );
}

function Gate() {
  const state = useRawDevState();
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = useState(false);
  if (state !== WRONG_NETWORK_STATE) return null;
  // Dummy switch: pending for a moment, then drop the dev state, as a real switch would resolve.
  const onSwitch = () => {
    setPending(true);
    setTimeout(() => {
      setPending(false);
      router.replace(pathname, { scroll: false });
    }, 1200);
  };
  return <WrongNetwork onSwitch={onSwitch} pending={pending} />;
}

/** Shows the overlay on any page with `?state=wrong-network`. Wallet chain checks replace this later. */
export function WrongNetworkGate() {
  return (
    <Suspense fallback={null}>
      <Gate />
    </Suspense>
  );
}
