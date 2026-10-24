import { apiFetch, ApiError } from "@/lib/api/client";
import { clearAuthToken } from "@/lib/game/session";

/** Season-manager call. Signs in only on this explicit action; a session the backend rejects is forgotten. */
export async function adminPost<T>(path: string, body: unknown, ensureToken: () => Promise<string>): Promise<T> {
  const token = await ensureToken();
  try {
    return await apiFetch<T>(path, { method: "POST", body, token });
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) clearAuthToken(token);
    throw error;
  }
}

/** Backend reasons (role, keeper, stale session) are already user-facing; wallet and network errors are not. */
export function adminErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.status === 401 && error.message !== "Connect a wallet first" ? "Session expired. Try again to sign in." : error.message;
  if (error instanceof TypeError) return "Unable to reach the game server.";
  return "Sign-in didn’t finish. Approve the signature request and try again.";
}
