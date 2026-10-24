import type { Pick } from "@/mocks/table";
import type { PickSubmission } from "./types";
export function toPickSubmissions(picks: Pick[]): PickSubmission[] {
  return picks.map((p) => ({ coin: p.symbol, side: p.direction, ...(p.skill === "BOOST" ? { boosted: true } : {}), ...(p.skill === "INSURANCE" ? { insured: true } : {}) }));
}
export function commitErrorMessage(err: unknown): string { return err instanceof Error ? err.message : "Request failed. Try again."; }
