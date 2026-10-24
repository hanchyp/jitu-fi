export function getAuthToken(): string | null {
  try {
    const value = JSON.parse(localStorage.getItem("jitu.session") || "null");
    // Backend session expiry is Unix seconds.
    return typeof value?.token === "string" && typeof value.expiresAt === "number" && value.expiresAt * 1000 > Date.now() ? value.token : null;
  } catch { return null; }
}
