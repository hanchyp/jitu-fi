import { API_HEADERS } from "@/lib/game/config";
import { API_URL } from "@/lib/web3/config";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

type Options = { method?: "GET" | "POST"; body?: unknown; token?: string | null };

/** JSON fetch against the backend. bigint fields arrive as decimal strings; parsers in ./types convert them. */
export async function apiFetch<T>(path: string, { method = "GET", body, token }: Options = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...API_HEADERS,
      ...(body !== undefined ? { "content-type": "application/json" } : {}),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const e = (data ?? {}) as { message?: string; error?: string; code?: string };
    throw new ApiError(e.message ?? e.error ?? `Request failed (${res.status})`, res.status, e.code);
  }
  return data as T;
}
