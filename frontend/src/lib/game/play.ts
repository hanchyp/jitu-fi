import { API_HEADERS, API_URL } from "./config";
import { clearAuthToken, getAuthToken } from "./session";

type Preset = "quick" | "standard" | "long" | "marathon";
const messages = {
  NO_POSITION: "Deposit mUSD before starting a clash.",
  SEASON_NOT_ACTIVE: "The season is not active yet. Try again when it opens.",
  NOT_ELIGIBLE: "Your position is not eligible to play this season.",
  SEASON_CLOSING: "Season closing. A full game won’t fit. Play next season.",
  ALREADY_AT_TABLE: "Resuming your table",
  UNAUTHORIZED: "Your session expired. Press Play to sign in again.",
  AUTH: "Sign-in didn’t finish. Approve the signature request, then press Play again.",
  NETWORK: "Unable to reach the game server. Please try again.",
  UNKNOWN: "Unable to load your table. Please try again.",
} as const;
export type PlayError = { ok: false; code: keyof typeof messages; message: string; tableId?: number };
type Result<T> = { ok: true; data: T } | PlayError;
const validId = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value > 0;

async function request<T>(path: string, valid: (data: Record<string, unknown>) => boolean, body?: unknown, explicitToken?: string): Promise<Result<T>> {
  let response: Response;
  try {
    const token = explicitToken ?? getAuthToken();
    response = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? "GET" : "POST", cache: "no-store",
      headers: { ...API_HEADERS, ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { return { ok: false, code: "NETWORK", message: messages.NETWORK }; }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const code = response.status === 401 ? "UNAUTHORIZED" : Object.hasOwn(messages, data?.error) ? data.error as keyof typeof messages : "UNKNOWN";
    return { ok: false, code, message: messages[code], ...(validId(data?.tableId) ? { tableId: data.tableId } : {}) };
  }
  return data && typeof data === "object" && valid(data)
    ? { ok: true, data: data as T }
    : { ok: false, code: "UNKNOWN", message: messages.UNKNOWN };
}

export const postPlay = (preset: Preset, token?: string) => request<{ tableId: number }>("/play", (data) => validId(data.tableId), { preset }, token);

/** Get a session for the connected wallet (reused or signed), then start the game with that exact token. */
export async function startPlay(preset: Preset, ensureToken: () => Promise<string>): Promise<Result<{ tableId: number }>> {
  let token: string;
  try { token = await ensureToken(); }
  catch (error) {
    const code = error instanceof TypeError ? "NETWORK" : "AUTH";
    return { ok: false, code, message: messages[code] };
  }
  const result = await postPlay(preset, token);
  // Backend rejected a client-valid session: forget it so the next Play click signs again.
  if (!result.ok && result.code === "UNAUTHORIZED") clearAuthToken(token);
  return result;
}
export const getRunningTable = (address: string) => request<{ tableId: number | null }>(`/users/${encodeURIComponent(address)}/table`, (data) => data.tableId === null || validId(data.tableId));

export function getSessionAddress(): string | null {
  try {
    const session = JSON.parse(localStorage.getItem("jitu.session") || "null");
    return typeof session?.address === "string" && /^0x[0-9a-fA-F]{40}$/.test(session.address) ? session.address : null;
  } catch { return null; }
}
