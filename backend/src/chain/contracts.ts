// Typed reads of SeasonVault, GameManager and MockUSD with a short TTL cache, so API handlers polling the
// same values within a few seconds hit the RPC once. The keeper builds one with ttlMs 0 (always fresh).
import { gameManagerAbi, getDeployment, mockUSDAbi, seasonVaultAbi } from "@jitu-fi/shared";
import type { Address, PublicClient } from "viem";
import type { Config } from "../config.js";

export const SEASON_STATUS = ["None", "Enrollment", "Active", "Finalized"] as const;
export type SeasonStatus = (typeof SEASON_STATUS)[number];

export interface ChainAddresses {
  vault: Address;
  game: Address;
  token: Address;
}

/** Deployment addresses for the configured chain, overridden by any address set in the env. */
export function resolveAddresses(config: Pick<Config, "CHAIN_ID" | "SEASON_VAULT_ADDRESS" | "GAME_MANAGER_ADDRESS" | "MOCK_USD_ADDRESS">): ChainAddresses {
  const d = getDeployment(config.CHAIN_ID);
  return {
    vault: (config.SEASON_VAULT_ADDRESS ?? d.SeasonVault) as Address,
    game: (config.GAME_MANAGER_ADDRESS ?? d.GameManager) as Address,
    token: (config.MOCK_USD_ADDRESS ?? d.MockUSD) as Address,
  };
}

export interface Season {
  id: bigint;
  enrollStart: bigint;
  start: bigint;
  end: bigint;
  status: SeasonStatus;
  shortfall: boolean;
  depositors: number;
  claims: number;
  totalPrincipal: bigint;
  sponsorFunds: bigint;
  returnedPrincipal: bigint;
  fee: bigint;
  baseYield: bigint;
  bonusPot: bigint;
  totalWeightedPoints: bigint;
  paidOut: bigint;
}

export type ReadClient = Pick<PublicClient, "readContract">;

export function createChainReader(client: ReadClient, addresses: ChainAddresses, opts: { ttlMs?: number; nowMs?: () => number } = {}) {
  const ttlMs = opts.ttlMs ?? 3_000;
  const nowMs = opts.nowMs ?? Date.now;
  const cache = new Map<string, { at: number; value: Promise<unknown> }>();

  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    if (ttlMs <= 0) return load();
    const hit = cache.get(key);
    if (hit && nowMs() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    cache.set(key, { at: nowMs(), value });
    // Never cache a failure.
    value.catch(() => cache.get(key)?.value === value && cache.delete(key));
    return value;
  }

  const vault = <T>(functionName: string, args: readonly unknown[]) =>
    cached(`v:${functionName}:${args.join(",")}`, () =>
      client.readContract({ address: addresses.vault, abi: seasonVaultAbi, functionName, args } as never) as Promise<T>,
    );
  const game = <T>(functionName: string, args: readonly unknown[]) =>
    cached(`g:${functionName}:${args.join(",")}`, () =>
      client.readContract({ address: addresses.game, abi: gameManagerAbi, functionName, args } as never) as Promise<T>,
    );
  const token = <T>(functionName: string, args: readonly unknown[]) =>
    cached(`t:${functionName}:${args.join(",")}`, () =>
      client.readContract({ address: addresses.token, abi: mockUSDAbi, functionName, args } as never) as Promise<T>,
    );

  return {
    addresses,
    async getSeason(id: bigint): Promise<Season> {
      const s = await vault<Omit<Season, "id" | "status"> & { status: number }>("getSeason", [id]);
      return { ...s, id, status: SEASON_STATUS[s.status] ?? "None" };
    },
    seasonCount: () => vault<bigint>("seasonCount", []),
    activeSeasonOf: (user: Address) => vault<bigint>("activeSeasonOf", [user]),
    isEligible: (seasonId: bigint, user: Address) => vault<boolean>("isEligible", [seasonId, user]),
    weightOf: (seasonId: bigint, user: Address) => vault<bigint>("weightOf", [seasonId, user]),
    principalOf: (seasonId: bigint, user: Address) => vault<bigint>("principalOf", [seasonId, user]),
    async previewClaim(seasonId: bigint, user: Address) {
      const [principalPart, basePart, bonusPart] = await vault<readonly [bigint, bigint, bigint]>("previewClaim", [seasonId, user]);
      return { principalPart, basePart, bonusPart };
    },
    seasonPoints: (seasonId: bigint, player: Address) => game<bigint>("seasonPoints", [seasonId, player]),
    gamesCounted: (seasonId: bigint, player: Address) => game<bigint>("gamesCounted", [seasonId, player]),
    seasonTotalWeighted: (seasonId: bigint) => game<bigint>("seasonTotalWeighted", [seasonId]),
    isRecorded: (gameId: `0x${string}`) => game<boolean>("recorded", [gameId]),
    balanceOf: (owner: Address) => token<bigint>("balanceOf", [owner]),
    allowance: (owner: Address, spender: Address) => token<bigint>("allowance", [owner, spender]),
    invalidate: () => cache.clear(),
  };
}

export type ChainReader = ReturnType<typeof createChainReader>;
