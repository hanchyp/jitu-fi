"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { HowToPlayTrigger } from "@/components/howto/HowToPlay";
import { GameActionButton, GameButton } from "@/components/ui/GameButton";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { useDialog } from "@/components/ui/useDialog";
import { shortAddress } from "@/lib/format";
import { useDummyWallet } from "./DummyWallet";

const LINKS = [
  { href: "/play", label: "Play" },
  { href: "/leaderboard", label: "Leaderboard" },
] as const;

const INSTANT = { duration: 0 } as const;
const noop = () => () => {};

type NavProps = {
  /** The landing's variant: translucent with a blur, floating over the 3D title screen. */
  floating?: boolean;
  /** Current pathname, to mark the active link. */
  current?: string;
};

function isCurrent(current: string | undefined, href: string) {
  return current === href || current?.startsWith(`${href}/`);
}

/** The shared nav board: crest lockup, page links, dummy Connect and the Deposit CTA. */
export function Nav({ floating = false, current }: NavProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const surface = floating ? "bg-malam/85 backdrop-blur-sm" : "bg-malam shadow-[0_6px_0_0_#040B10]";

  return (
    <nav
      aria-label="Main"
      className={`mx-auto mt-3 flex w-[calc(100%-1.5rem)] max-w-5xl items-center justify-between gap-3 rounded-[18px] border-[3px] border-garis px-3 py-2 sm:px-4 ${surface}`}
    >
      {/* Horizontal lockup built from the crest and wordmark crops of the logo. */}
      <Link href="/" aria-label="jitu.fi home" className="flex shrink-0 items-center gap-1.5 rounded-[10px]">
        <Image src="/brand/jitu-crest.webp" alt="" width={36} height={40} loading="eager" className="h-10 w-9 object-contain" />
        <Image src="/brand/jitu-wordmark.webp" alt="" width={77} height={34} loading="eager" className="h-[34px] w-[77px]" />
      </Link>
      <div className="hidden items-center gap-6 font-extrabold text-white/85 md:flex">
        <HowToPlayTrigger look="link" className="font-extrabold hover:text-emas">
          How to play
        </HowToPlayTrigger>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isCurrent(current, link.href) ? "page" : undefined}
            className="hover:text-emas aria-[current=page]:text-emas"
          >
            {link.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <ConnectButton />
        <span className="hidden md:block">
          <GameButton href="/deposit" size="sm">
            Deposit mUSD
          </GameButton>
        </span>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-haspopup="dialog"
          aria-expanded={menuOpen}
          className="flex h-10 w-10 items-center justify-center rounded-[12px] border-[3px] border-garis bg-malam text-white hover:bg-papan md:hidden"
        >
          <MenuIcon />
        </button>
      </div>
      <MobileMenu open={menuOpen} onClose={() => setMenuOpen(false)} current={current} />
    </nav>
  );
}

function ConnectButton() {
  const { address, connect, disconnect } = useDummyWallet();
  if (!address) {
    return (
      <GameActionButton variant="night" size="sm" onClick={connect}>
        Connect
      </GameActionButton>
    );
  }
  return (
    <GameActionButton variant="night" size="sm" onClick={disconnect} aria-label={`Connected as ${shortAddress(address)}. Disconnect`}>
      <span className="inline-flex items-center gap-1.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full border-2 border-garis bg-zamrud" />
        {shortAddress(address)}
      </span>
    </GameActionButton>
  );
}

/** Phones: the same links on a board under the nav. Portalled so it sits above the title screen. */
function MobileMenu({ open, onClose, current }: { open: boolean; onClose: () => void; current?: string }) {
  const reduce = useReducedMotion() ?? false;
  const panel = useRef<HTMLDivElement>(null);
  const mounted = useSyncExternalStore(noop, () => true, () => false);
  useDialog(open, onClose, panel);
  if (!mounted || !open) return null;

  const item =
    "block w-full rounded-[14px] border-[3px] border-garis bg-papan px-4 py-2.5 text-left text-lg font-extrabold text-white hover:bg-papan-terang aria-[current=page]:bg-papan-terang aria-[current=page]:text-emas";

  return createPortal(
    <div className="fixed inset-0 z-40 md:hidden">
      <motion.div
        className="absolute inset-0 bg-[#040B10]/75"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={reduce ? INSTANT : { duration: 0.15 }}
        onClick={onClose}
      />
      <motion.div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reduce ? INSTANT : { type: "spring", stiffness: 420, damping: 30 }}
        className="absolute inset-x-3 top-3 rounded-[22px] border-[3px] border-garis bg-malam p-4 shadow-[0_6px_0_0_#040B10]"
      >
        <div className="flex items-center justify-between">
          <p className="font-display text-2xl text-gading">Menu</p>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            data-autofocus
            className="flex h-10 w-10 items-center justify-center rounded-[12px] border-[3px] border-garis bg-malam text-white hover:bg-papan"
          >
            <CloseIcon />
          </button>
        </div>
        <ul className="mt-3 grid gap-2">
          <li>
            <HowToPlayTrigger look="link" className={item}>
              How to play
            </HowToPlayTrigger>
          </li>
          {LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                aria-current={isCurrent(current, link.href) ? "page" : undefined}
                className={item}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
        <GameButton href="/deposit" onClick={onClose} className="mt-4 w-full text-center">
          Deposit mUSD
        </GameButton>
      </motion.div>
    </div>,
    document.body,
  );
}
