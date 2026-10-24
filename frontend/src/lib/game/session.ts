export function getAuthToken(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem("jitu.session") || "null");
    // Backend session expiry is Unix seconds.
    return typeof value?.token === "string" && typeof value.expiresAt === "number" && value.expiresAt * 1000 > Date.now() ? value.token : null;
  } catch { return null; }
}

/** Drop the stored session only if it still holds `token`, so a newer sign-in is never cleared. */
export function clearAuthToken(token: string) {
  try {
    if (JSON.parse(localStorage.getItem("jitu.session") || "null")?.token === token) localStorage.removeItem("jitu.session");
  } catch { /* Blocked storage: nothing stored to clear. */ }
}
