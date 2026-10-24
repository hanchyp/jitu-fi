// Response shapes for the frontend (they mirror `frontend/src/mocks/*.ts`, so the UI swaps mocks
// for real data without type changes). bigint fields are serialized as decimal strings.
import { PRESETS } from "@jitu-fi/shared";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../db/client.js";
import { tables } from "../db/schema.js";
import type { TableState } from "../engine/types.js";
import { tenorOf, type ChainReads, type SeasonInfo } from "./chain.js";

/** Seat order matches the frontend's HOUSE_BOTS (Bruno, Bera, Dex). */
const CASTERS = ["you", "Bruno", "Bera", "Dex"] as const;

/**
 * The status a season has by the clock: the keeper's activate/finalize can lag a few seconds, so a
 * season past `start` reads as Active and one past `end` as Finalized even before those txs land.
 */
export function effectiveStatus(s: SeasonInfo, nowSeconds = Math.floor(Date.now() / 1000)): SeasonInfo["status"] {
  if (s.status === "Finalized" || s.status === "None") return s.status;
  if (nowSeconds >= s.end) return "Finalized";
  if (nowSeconds >= s.start) return "Active";
  return "Enrollment";
}

export async function currentSeasons(chain: ChainReads) {
  const count = await chain.seasonCount();
  const seasons = [];
  for (let id = count; id >= 1; id--) {
    const raw = await chain.getSeason(id);
    const s = { ...raw, status: effectiveStatus(raw) };
    if (s.status !== "Enrollment" && s.status !== "Active") continue;
    seasons.push({ ...s, tenor: tenorOf(s), demoMode: chain.demoMode });
    if (seasons.length >= 4) break;
  }
  return { seasons };
}

export async function position(chain: ChainReads, address: string) {
  const seasonId = await chain.activeSeasonOf(address);
  if (seasonId === 0) return { address, position: null };
  const [season, principal, weight, points, gamesCounted, k, preview] = await Promise.all([
    chain.getSeason(seasonId),
    chain.principalOf(seasonId, address),
    chain.weightOf(seasonId, address),
    chain.seasonPoints(seasonId, address),
    chain.gamesCounted(seasonId, address),
    chain.pointsK(),
    chain.previewClaim(seasonId, address),
  ]);
  return {
    address,
    seasonId,
    tenor: tenorOf(season),
    seasonStatus: effectiveStatus(season),
    start: season.start,
    end: season.end,
    principal,
    weight,
    seasonPoints: Number(points),
    gamesCounted,
    countedGames: k,
    previewClaim: preview,
  };
}

export async function leaderboard(db: Db, chain: ChainReads, seasonId: number) {
  const [season, k] = await Promise.all([chain.getSeason(seasonId), chain.pointsK()]);
  const rows = await db.selectDistinct({ address: tables.humanAddress }).from(tables).where(eq(tables.seasonId, seasonId));
  const players = await Promise.all(
    rows.map(async ({ address }) => {
      const [points, weight, gamesCounted] = await Promise.all([
        chain.seasonPoints(seasonId, address),
        chain.weightOf(seasonId, address),
        chain.gamesCounted(seasonId, address),
      ]);
      return { address, points, weight, gamesCounted };
    }),
  );
  const ranked = players.filter((p) => p.points > 0n).sort((a, b) => (b.points > a.points ? 1 : b.points < a.points ? -1 : 0));
  const totalWeighted = ranked.reduce((sum, p) => sum + p.points * p.weight, 0n);
  return {
    seasonId,
    tenor: tenorOf(season),
    countedGames: k,
    bonusPot: season.bonusPot,
    entries: ranked.map((p, i) => ({
      rank: i + 1,
      address: p.address,
      seasonPoints: Number(p.points),
      gamesCounted: p.gamesCounted,
      weight: p.weight,
      estimatedBonus: totalWeighted === 0n ? 0n : (season.bonusPot * p.points * p.weight) / totalWeighted,
    })),
  };
}

function historyRounds(state: TableState) {
  return state.rounds
    .filter((r) => r.results)
    .map((r) => {
      const result = r.results!.find((x) => x.seat === 0)!;
      const submitted = r.picks[0] ?? [];
      return {
        round: r.n,
        cap: r.cap,
        forfeit: result.forfeit,
        roundScore: result.score,
        picks: result.picks.map((p, i) => {
          const sub = submitted[i];
          const live = r.skills.filter((s) => s.targetSeat === 0 && s.targetCoin === p.coin);
          const skills = [
            ...(sub?.boosted ? [{ skill: "BOOST", by: "you" }] : []),
            ...(sub?.insured ? [{ skill: "INSURANCE", by: "you" }] : []),
            ...live.map((s) => ({ skill: s.skill, by: CASTERS[s.seat] })),
          ];
          const swap = live.find((s) => s.skill === "SWAP");
          const flipped = live.some((s) => s.skill === "FLIP");
          const side = flipped ? (p.side === "Buy" ? "sell" : "buy") : p.side === "Buy" ? "buy" : "sell";
          return {
            coin: swap?.swapTo ?? p.coin,
            side,
            returnBps: p.raw,
            void: p.void,
            skills,
            ...(swap ? { swappedFrom: p.coin } : {}),
          };
        }),
      };
    });
}

export async function history(db: Db, chain: ChainReads, address: string) {
  const human = address.toLowerCase();
  const rows = await db
    .select()
    .from(tables)
    .where(and(eq(tables.humanAddress, human), eq(tables.status, "Finished")))
    .orderBy(asc(tables.finishedAtMs));
  const k = await chain.pointsK();
  const perSeason = new Map<number, number>();
  const games = [];
  for (const row of rows) {
    const state = JSON.parse(row.state) as TableState;
    const scores = state.gameScores ?? [];
    const mine = scores[0] ?? 0;
    // Practice (seasonId 0) has no season: no points, no on-chain record, not a counted game.
    const season = row.seasonId === 0 ? null : await chain.getSeason(row.seasonId);
    let credit;
    if (!season) credit = { kind: "practice" as const };
    else if (row.recordStatus === "skipped") credit = { kind: "after-end" as const };
    else {
      const n = (perSeason.get(row.seasonId) ?? 0) + 1;
      perSeason.set(row.seasonId, n);
      credit = n <= k ? { kind: "counted" as const, gameNumber: n, points: Math.max(0, row.gameScore ?? mine) } : { kind: "outside-k" as const };
    }
    games.push({
      tableId: row.id,
      seasonId: row.seasonId,
      tenor: season ? tenorOf(season) : null,
      preset: PRESETS[state.preset].name,
      endedAt: Math.floor((state.finishedAtMs ?? row.finishedAtMs ?? 0) / 1000),
      place: 1 + scores.filter((s, seat) => seat !== 0 && s > mine).length,
      gameScore: mine,
      credit,
      recordStatus: row.recordStatus,
      recordTxHash: row.recordTxHash,
      rounds: historyRounds(state),
    });
  }
  games.reverse(); // newest first
  return { address: human, games };
}
