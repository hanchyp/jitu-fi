import { API_URL } from "./config";

/** `practice`: seasonId 0, no season points and never recorded on-chain. */
export type Credit = { kind: "counted" | "outside-k" | "after-end" | "practice"; gameNumber?: number; points?: number };
export type RecordStatus = "none" | "pending" | "sent" | "recorded" | "skipped" | "failed";
export type HistoryGame = { tableId: number; seasonId: number; place: number; gameScore: number; credit: Credit; recordStatus: RecordStatus; recordTxHash: string | null };

const STATUSES: RecordStatus[] = ["none", "pending", "sent", "recorded", "skipped", "failed"];
const KINDS = ["counted", "outside-k", "after-end", "practice"];

export function sessionAddress(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem("jitu.session") || "null");
    return typeof value?.address === "string" ? value.address : null;
  } catch { return null; }
}

export function parseHistory(data: unknown): HistoryGame[] {
  const games = (data as { games?: unknown })?.games;
  if (!Array.isArray(games)) return [];
  return games.flatMap((g): HistoryGame[] => {
    if (typeof g?.tableId !== "number" || !KINDS.includes(g.credit?.kind) || !STATUSES.includes(g.recordStatus)) return [];
    const { gameNumber, points } = g.credit;
    return [{ tableId: g.tableId, seasonId: Number(g.seasonId) || 0, place: Number(g.place) || 0, gameScore: Number(g.gameScore) || 0,
      credit: { kind: g.credit.kind, ...(typeof gameNumber === "number" ? { gameNumber } : {}), ...(typeof points === "number" ? { points } : {}) },
      recordStatus: g.recordStatus, recordTxHash: typeof g.recordTxHash === "string" && /^0x[0-9a-fA-F]+$/.test(g.recordTxHash) ? g.recordTxHash : null }];
  });
}

export async function fetchHistory(address: string): Promise<HistoryGame[]> {
  const response = await fetch(`${API_URL}/users/${encodeURIComponent(address)}/history`, { cache: "no-store" });
  if (!response.ok) throw new Error(`HTTP_${response.status}`);
  return parseHistory(await response.json());
}
