import monadTestnet from "./10143.js";
import { LOCAL_ANVIL, MONAD_TESTNET, type SupportedChainId } from "../chains.js";

export type Address = `0x${string}`;

export interface Deployment {
  chainId: number;
  deployBlock: number;
  demoMode: boolean;
  pointsK: number;
  keeper: Address;
  MockUSD: Address;
  MockYieldStrategy: Address;
  SeasonVault: Address;
  GameManager: Address;
  weekSeasonId: number;
  monthSeasonId: number;
}

const fromJson = (d: typeof monadTestnet): Deployment => ({
  chainId: d.chainId,
  deployBlock: d.deployBlock,
  demoMode: d.demoMode,
  pointsK: d.pointsK,
  keeper: d.keeper as Address,
  MockUSD: d.MockUSD as Address,
  MockYieldStrategy: d.MockYieldStrategy as Address,
  SeasonVault: d.SeasonVault as Address,
  GameManager: d.GameManager as Address,
  weekSeasonId: d.weekSeasonId,
  monthSeasonId: d.monthSeasonId,
});

/**
 * Addresses from `contracts/script/Deploy.s.sol` on a fresh anvil with dev key #0. CREATE addresses
 * depend only on the deployer and nonce, so they are the same on every fresh local run.
 */
const localAnvil: Deployment = {
  chainId: LOCAL_ANVIL.id,
  deployBlock: 0,
  demoMode: true,
  pointsK: 2,
  keeper: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  MockUSD: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  MockYieldStrategy: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  SeasonVault: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  GameManager: "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9",
  weekSeasonId: 1,
  monthSeasonId: 2,
};

export const deployments: Record<SupportedChainId, Deployment> = {
  [MONAD_TESTNET.id]: fromJson(monadTestnet),
  [LOCAL_ANVIL.id]: localAnvil,
};

export const getDeployment = (chainId: number): Deployment => {
  const d = deployments[chainId as SupportedChainId];
  if (!d) throw new Error(`No jitu.fi deployment for chain ${chainId}`);
  return d;
};
