// Read-only chain access for the API and matchmaker: vault and game views, cached briefly.
import { gameManagerAbi, getDeployment, seasonVaultAbi } from "@jitu-fi/shared";
import type { Address, PublicClient } from "viem";

export type SeasonStatus = "None" | "Enrollment" | "Active" | "Finalized";
const STATUS: SeasonStatus[] = ["None", "Enrollment", "Active", "Finalized"];

export type SeasonInfo = {
  seasonId: number;
  enrollStart: number;
  start: number;
  end: number;
  status: SeasonStatus;
  shortfall: boolean;
  totalPrincipal: bigint;
  sponsorFunds: bigint;
  bonusPot: bigint;
};

export interface ChainReads {
  seasonCount(): Promise<number>;
  getSeason(seasonId: number): Promise<SeasonInfo>;
  activeSeasonOf(user: string): Promise<number>;
  isEligible(seasonId: number, user: string): Promise<boolean>;
  principalOf(seasonId: number, user: string): Promise<bigint>;
  weightOf(seasonId: number, user: string): Promise<bigint>;
  previewClaim(seasonId: number, user: string): Promise<{ principal: bigint; baseYield: bigint; bonus: bigint }>;
  seasonPoints(seasonId: number, user: string): Promise<bigint>;
  gamesCounted(seasonId: number, user: string): Promise<number>;
  pointsK(): Promise<number>;
  demoMode: boolean;
}

export function createChainReads(
  client: PublicClient,
  chainId: number,
  overrides: { vault?: string; game?: string } = {},
  ttlMs = 3_000,
): ChainReads {
  const deployment = getDeployment(chainId as Parameters<typeof getDeployment>[0]);
  const vault = (overrides.vault ?? deployment.SeasonVault) as Address;
  const game = (overrides.game ?? deployment.GameManager) as Address;
  const cache = new Map<string, { at: number; value: Promise<unknown> }>();

  function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
    const hit = cache.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
    const value = load();
    cache.set(key, { at: Date.now(), value });
    value.catch(() => cache.delete(key));
    return value;
  }

  const readVault = (functionName: string, args: unknown[] = []) =>
    cached(`v:${functionName}:${args.join(",")}`, () => client.readContract({ address: vault, abi: seasonVaultAbi, functionName, args } as never));
  const readGame = (functionName: string, args: unknown[] = []) =>
    cached(`g:${functionName}:${args.join(",")}`, () => client.readContract({ address: game, abi: gameManagerAbi, functionName, args } as never));

  return {
    demoMode: Boolean((deployment as { demoMode?: boolean }).demoMode),
    seasonCount: async () => Number(await readVault("seasonCount")),
    getSeason: async (seasonId) => {
      const s = (await readVault("getSeason", [BigInt(seasonId)])) as {
        enrollStart: bigint; start: bigint; end: bigint; status: number; shortfall: boolean;
        totalPrincipal: bigint; sponsorFunds: bigint; bonusPot: bigint;
      };
      return {
        seasonId,
        enrollStart: Number(s.enrollStart),
        start: Number(s.start),
        end: Number(s.end),
        status: STATUS[s.status] ?? "None",
        shortfall: s.shortfall,
        totalPrincipal: s.totalPrincipal,
        sponsorFunds: s.sponsorFunds,
        // Before finalize the pot is what sponsors put in; finalize adds the yield share.
        bonusPot: s.bonusPot > s.sponsorFunds ? s.bonusPot : s.sponsorFunds,
      };
    },
    activeSeasonOf: async (user) => Number(await readVault("activeSeasonOf", [user])),
    isEligible: async (id, user) => (await readVault("isEligible", [BigInt(id), user])) as boolean,
    principalOf: async (id, user) => (await readVault("principalOf", [BigInt(id), user])) as bigint,
    weightOf: async (id, user) => (await readVault("weightOf", [BigInt(id), user])) as bigint,
    previewClaim: async (id, user) => {
      const [principal, baseYield, bonus] = (await readVault("previewClaim", [BigInt(id), user])) as [bigint, bigint, bigint];
      return { principal, baseYield, bonus };
    },
    seasonPoints: async (id, user) => (await readGame("seasonPoints", [BigInt(id), user])) as bigint,
    gamesCounted: async (id, user) => Number(await readGame("gamesCounted", [BigInt(id), user])),
    pointsK: async () => Number(await readGame("pointsK")),
  };
}

/** "week" or "month" from a season's length (demo: 15 and 30 minutes). */
export function tenorOf(season: Pick<SeasonInfo, "start" | "end">): "week" | "month" {
  const length = season.end - season.start;
  if (length <= 22 * 60) return "week";
  if (length < 60 * 60) return "month";
  return length <= 8 * 86_400 ? "week" : "month";
}
