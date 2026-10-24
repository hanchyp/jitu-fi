import { API_URL } from "../game/config";
import type { LeaderboardResponse } from "@/mocks/leaderboard";
import type { ProfileResponse } from "@/mocks/profile";
import type { SeasonTenor } from "@/mocks/season";

const MONEY_FIELDS = new Set(["weight", "bonusPot", "estimatedBonus", "principal", "totalPrincipal", "sponsorFunds", "baseYield", "bonus"]);

/** API amounts are integer micro-mUSD strings; reject malformed/lossy values. */
export function parseStatsJson(text: string): unknown {
  return JSON.parse(text, (key, value) => {
    if (!MONEY_FIELDS.has(key)) return value;
    if (typeof value !== "string" || !/^\d+$/.test(value)) throw new Error("Invalid API amount");
    return BigInt(value);
  });
}

async function get<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { signal, cache: "no-store" });
  if (!response.ok) throw new Error("Stats unavailable");
  return parseStatsJson(await response.text()) as T;
}

export type StatsSeason = { seasonId: number; tenor: SeasonTenor; bonusPot: bigint; demoMode?: boolean };
export const fetchSeasons = (signal?: AbortSignal) => get<{ seasons: StatsSeason[] }>("/seasons/current", signal);
export const fetchLeaderboard = (seasonId: number, signal?: AbortSignal) => get<LeaderboardResponse>(`/seasons/${seasonId}/leaderboard`, signal);
export type RecordedGame = ProfileResponse["games"][number] & { recordStatus?: string; recordTxHash?: string | null };
export type StatsProfile = Omit<ProfileResponse, "season" | "games"> & { season: ProfileResponse["season"] | null; games: RecordedGame[] };

export async function fetchHistory(address: string, signal?: AbortSignal): Promise<StatsProfile> {
  const path = `/users/${encodeURIComponent(address)}`;
  const [history, position] = await Promise.all([
    get<{ address: string; games: RecordedGame[] }>(`${path}/history`, signal),
    get<ProfileResponse["season"] & { position?: null }>(`${path}/position`, signal),
  ]);
  // Practice games (seasonId 0) have no season to group or count under, so the season profile leaves them out.
  const games = history.games.filter((g) => (g.credit as { kind: string }).kind !== "practice");
  return { ...history, games, season: position.position === null ? null : position };
}

export function sessionAddress(): string | null {
  try {
    const session = JSON.parse(localStorage.getItem("jitu.session") || "null");
    return typeof session?.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(session.address) ? session.address : null;
  } catch { return null; }
}
