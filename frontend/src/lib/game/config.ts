export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000").replace(/\/$/, "");
export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || `${API_URL.replace(/^http/, "ws")}/ws`;
/** Sent on every backend request so an ngrok free-tier tunnel skips its HTML warning page. */
export const API_HEADERS = { "ngrok-skip-browser-warning": "1" } as const;
