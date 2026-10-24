import { API_HEADERS, API_URL } from "./config";
import { getAuthToken } from "./session";
import type { LiveSkill, PickSubmission, TableState } from "./types";

export class ApiError extends Error {
  constructor(public code: string, message: string, public status = 0, public tableId?: number) { super(message); }
}
let clockOffsetMs = 0;
export const serverNow = () => Date.now() + clockOffsetMs;

async function request<T>(path: string, body?: unknown): Promise<T> {
  const token = getAuthToken();
  let response: Response;
  const sentAt = Date.now();
  try {
    response = await fetch(`${API_URL}${path}`, { method: body === undefined ? "GET" : "POST", cache: "no-store", headers: { ...API_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  } catch { throw new ApiError("NETWORK", "Network unavailable. Reconnecting…"); }
  const serverDate = Date.parse(response.headers.get("date") || "");
  if (Number.isFinite(serverDate)) clockOffsetMs = serverDate + 500 - (sentAt + Date.now()) / 2;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || `HTTP_${response.status}`, response.status === 401 ? "Sign in to play" : data.message || data.error || "Request failed", response.status, data.tableId);
  return data as T;
}
export const fetchTable = (id: number | string) => request<TableState>(`/tables/${encodeURIComponent(id)}`);
export const fetchRunningTable = (address: string) => request<{ tableId: number | null }>(`/users/${encodeURIComponent(address)}/table`);
export const postPicks = (id: number, picks: PickSubmission[]) => request<{ ok: boolean }>(`/tables/${id}/picks`, { picks });
export type SkillBody = { skill: LiveSkill; targetSeat: number; targetCoin: string; swapTo?: string };
export const postSkill = (id: number, body: SkillBody) => request<{ skill: unknown }>(`/tables/${id}/skill`, body);
