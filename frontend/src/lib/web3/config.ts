import { getDeployment, MONAD_TESTNET, mockUSDAbi, seasonVaultAbi } from "@jitu-fi/shared";
import { createPublicClient, defineChain, http } from "viem";

/** Monad testnet only (chain 10143). Mainnet 143 is deliberately not configured. */
export const monadTestnet = defineChain({
  id: MONAD_TESTNET.id,
  name: MONAD_TESTNET.name,
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: { default: { http: [MONAD_TESTNET.rpcUrl] } },
  blockExplorers: { default: { name: "MonadVision", url: MONAD_TESTNET.explorerUrl } },
  testnet: true,
});

export const CHAIN_ID = MONAD_TESTNET.id;
export const deployment = getDeployment(CHAIN_ID);
export const ADDRESSES = { musd: deployment.MockUSD, vault: deployment.SeasonVault } as const;
export const ABIS = { musd: mockUSDAbi, vault: seasonVaultAbi } as const;

export const publicClient = createPublicClient({ chain: monadTestnet, transport: http(MONAD_TESTNET.rpcUrl) });

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "1";
