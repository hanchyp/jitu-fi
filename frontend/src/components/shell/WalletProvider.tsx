"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { createWalletClient, custom, type Address, type WalletClient } from "viem";
import { CHAIN_ID, monadTestnet } from "@/lib/web3/config";

/** Real wallet via Privy (email, social or external wallet; embedded wallet for new users). */
type Wallet = {
  /** Privy has finished loading; render wallet state only after this to avoid hydration mismatches. */
  ready: boolean;
  address: Address | null;
  /** Chain the wallet is on now, if connected. */
  chainId: number | null;
  connect: () => void;
  disconnect: () => void;
  switchChain: () => Promise<void>;
  getWalletClient: () => Promise<WalletClient>;
};

const Ctx = createContext<Wallet | null>(null);

function WalletState({ children }: { children: ReactNode }) {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const wallet = authenticated ? wallets[0] : undefined;

  const address = (wallet?.address as Address | undefined) ?? null;
  const chainId = wallet ? Number(wallet.chainId.split(":")[1]) : null;

  const switchChain = useCallback(async () => {
    await wallet?.switchChain(CHAIN_ID);
  }, [wallet]);

  const getWalletClient = useCallback(async () => {
    if (!wallet) throw new Error("Connect a wallet first");
    const provider = await wallet.getEthereumProvider();
    return createWalletClient({ account: wallet.address as Address, chain: monadTestnet, transport: custom(provider) });
  }, [wallet]);

  const value = useMemo<Wallet>(
    () => ({ ready, address, chainId, connect: login, disconnect: logout, switchChain, getWalletClient }),
    [ready, address, chainId, login, logout, switchChain, getWalletClient],
  );
  return <Ctx value={value}>{children}</Ctx>;
}

/** Privy + react-query + wallet context, mounted once in the root layout. */
export function WalletProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 5_000, retry: 1 } } }));
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID ?? ""}
      config={{
        defaultChain: monadTestnet,
        supportedChains: [monadTestnet],
        embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } },
        appearance: { theme: "dark" },
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WalletState>{children}</WalletState>
      </QueryClientProvider>
    </PrivyProvider>
  );
}

/** Shared across the nav and pages, so the connected state survives client navigation. */
export function useWallet(): Wallet {
  const wallet = useContext(Ctx);
  if (!wallet) throw new Error("useWallet must be used inside the wallet provider");
  return wallet;
}
