"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "./client";
import { parsePosition, parseSeasons } from "./types";

/** Open seasons (Enrollment or Active), newest first. Polls so countdowns and status stay current. */
export function useSeasons() {
  return useQuery({
    queryKey: ["seasons"],
    queryFn: async () => parseSeasons(await apiFetch("/seasons/current")),
    refetchInterval: 10_000,
  });
}

export function usePosition(address: string | null) {
  return useQuery({
    queryKey: ["position", address?.toLowerCase()],
    queryFn: async () => parsePosition(await apiFetch(`/users/${address}/position`)),
    enabled: address !== null,
    refetchInterval: 10_000,
  });
}
