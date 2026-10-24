// Parsed shapes of the backend responses (they mirror src/mocks). bigint fields are decimal strings on the wire.
import type { PositionResponse } from "@/mocks/position";
import type { SeasonSummary } from "@/mocks/season";

export type { PositionResponse, SeasonSummary };

type RawSeason = Omit<SeasonSummary, "totalPrincipal" | "bonusPot" | "sponsorFunds"> & {
  totalPrincipal: string;
  bonusPot: string;
  sponsorFunds: string;
};

export function parseSeasons(raw: { seasons: RawSeason[] }): SeasonSummary[] {
  return raw.seasons.map((s) => ({
    ...s,
    totalPrincipal: BigInt(s.totalPrincipal),
    bonusPot: BigInt(s.bonusPot),
    sponsorFunds: BigInt(s.sponsorFunds),
  }));
}

type RawPosition = Omit<PositionResponse, "principal" | "weight" | "previewClaim"> & {
  principal: string;
  weight: string;
  previewClaim: { principal: string; baseYield: string; bonus: string };
};

/** The backend answers `{ address, position: null }` when the address has no open position. */
export function parsePosition(raw: RawPosition | { address: string; position: null }): PositionResponse | null {
  if ("position" in raw) return null;
  return {
    ...raw,
    principal: BigInt(raw.principal),
    weight: BigInt(raw.weight),
    previewClaim: {
      principal: BigInt(raw.previewClaim.principal),
      baseYield: BigInt(raw.previewClaim.baseYield),
      bonus: BigInt(raw.previewClaim.bonus),
    },
  };
}
