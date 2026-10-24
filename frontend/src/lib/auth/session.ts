"use client";

import { useCallback, useState } from "react";
import { createSiweMessage } from "viem/siwe";
import { useWallet } from "@/components/shell/WalletProvider";
import { apiFetch, ApiError } from "@/lib/api/client";
import { CHAIN_ID } from "@/lib/web3/config";

type Session = { token: string; address: string; expiresAt: number };
const KEY = "jitu.session";

function load(address: string): Session | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Session) : null;
    return s && s.address.toLowerCase() === address.toLowerCase() && s.expiresAt > Date.now() / 1000 + 60 ? s : null;
  } catch {
    return null;
  }
}

function save(session: Session) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // Private mode or blocked storage: the session just lasts until reload.
  }
}

/** Sign-In with Ethereum against the backend. `ensureToken()` reuses a stored session or asks the wallet to sign. */
export function useSession() {
  const { address, getWalletClient } = useWallet();
  const [signingIn, setSigningIn] = useState(false);

  const ensureToken = useCallback(async (): Promise<string> => {
    if (!address) throw new ApiError("Connect a wallet first", 401);
    const stored = load(address);
    if (stored) return stored.token;
    setSigningIn(true);
    try {
      const { nonce } = await apiFetch<{ nonce: string }>("/auth/nonce", { method: "POST" });
      const message = createSiweMessage({
        address,
        chainId: CHAIN_ID,
        domain: window.location.host,
        nonce,
        uri: window.location.origin,
        version: "1",
        statement: "Sign in to jitu.fi",
      });
      const wallet = await getWalletClient();
      const signature = await wallet.signMessage({ account: address, message });
      const session = await apiFetch<Session>("/auth/verify", { method: "POST", body: { message, signature } });
      save(session);
      return session.token;
    } finally {
      setSigningIn(false);
    }
  }, [address, getWalletClient]);

  return { ensureToken, signingIn };
}
