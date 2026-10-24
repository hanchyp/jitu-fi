"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/** Dummy wallet for the UI-first phase: no wagmi yet, just a toggle and a fixed address. */
export const DUMMY_ADDRESS = "0x1234567890abcdef1234567890abcdef123456ab";

type DummyWallet = { address: string | null; connect: () => void; disconnect: () => void };

const Ctx = createContext<DummyWallet>({ address: null, connect: () => {}, disconnect: () => {} });

export function DummyWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const value = useMemo(
    () => ({ address, connect: () => setAddress(DUMMY_ADDRESS), disconnect: () => setAddress(null) }),
    [address],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

/** Shared across the nav and pages, so the connected state survives client navigation. */
export function useDummyWallet() {
  return useContext(Ctx);
}
