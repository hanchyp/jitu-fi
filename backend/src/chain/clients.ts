import { createPublicClient, createWalletClient, http, webSocket, type Chain } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { foundry, monadTestnet } from "viem/chains";
import { requireConfig, type Config } from "../config.js";

export function chainFor(config: Config): Chain {
  const base = config.CHAIN_ID === monadTestnet.id ? monadTestnet : foundry;
  return { ...base, rpcUrls: { default: { http: [config.RPC_URL], ...(config.WS_URL ? { webSocket: [config.WS_URL] } : {}) } } };
}

export function createClients(config: Config) {
  const chain = chainFor(config);
  const publicClient = createPublicClient({ chain, transport: http(config.RPC_URL) });
  // The indexer subscribes over WS when available and falls back to HTTP polling.
  const wsClient = config.WS_URL ? createPublicClient({ chain, transport: webSocket(config.WS_URL) }) : undefined;
  return { chain, publicClient, wsClient };
}

export function createKeeperWallet(config: Config) {
  const account = privateKeyToAccount(requireConfig(config, "KEEPER_PRIVATE_KEY") as `0x${string}`);
  return createWalletClient({ account, chain: chainFor(config), transport: http(config.RPC_URL) });
}
