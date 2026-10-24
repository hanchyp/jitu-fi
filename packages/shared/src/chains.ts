// Chains jitu.fi runs on. Monad mainnet (143) is deliberately absent.

export const MONAD_TESTNET = {
  id: 10143,
  name: "Monad Testnet",
  rpcUrl: "https://testnet-rpc.monad.xyz",
  explorerUrl: "https://testnet.monadvision.com",
  faucetUrl: "https://faucet.monad.xyz",
} as const;

export const LOCAL_ANVIL = {
  id: 31337,
  name: "Anvil",
  rpcUrl: "http://127.0.0.1:8545",
  explorerUrl: "",
  faucetUrl: "",
} as const;

export const SUPPORTED_CHAIN_IDS = [MONAD_TESTNET.id, LOCAL_ANVIL.id] as const;
export type SupportedChainId = (typeof SUPPORTED_CHAIN_IDS)[number];

export const explorerAddressUrl = (address: string): string => `${MONAD_TESTNET.explorerUrl}/address/${address}`;
export const explorerTxUrl = (hash: string): string => `${MONAD_TESTNET.explorerUrl}/tx/${hash}`;
