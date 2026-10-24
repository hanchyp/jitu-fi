// POST /play: seats an eligible human with the 3 house bots at once (the multi-human queue is
// designed but off). Refuses tables that could finish after the player's season ends.
import { presetMaxDurationSeconds, type PresetId } from "@jitu-fi/shared";
import { and, eq } from "drizzle-orm";
import type { ChainReads } from "../api/chain.js";
import { effectiveStatus } from "../api/views.js";
import type { Db } from "../db/client.js";
import { tables } from "../db/schema.js";
import { HOUSE_BOTS } from "./bots.js";
import type { GameEngine } from "./engine.js";
import { GameError } from "./types.js";

export const END_OF_SEASON_BUFFER_SECONDS = 60;

export class Matchmaker {
  private readonly inFlight = new Set<string>();

  constructor(
    private readonly deps: { db: Db; engine: GameEngine; chain: ChainReads; nowSeconds?: () => number },
  ) {}

  async runningTable(address: string): Promise<number | null> {
    const [row] = await this.deps.db
      .select({ id: tables.id })
      .from(tables)
      .where(and(eq(tables.humanAddress, address.toLowerCase()), eq(tables.status, "Running")));
    return row?.id ?? null;
  }

  async play(address: string, preset: PresetId): Promise<{ tableId: number }> {
    const human = address.toLowerCase();
    if (this.inFlight.has(human)) throw new GameError("ALREADY_AT_TABLE", "a table is being created");
    this.inFlight.add(human);
    try {
      const running = await this.runningTable(human);
      if (running !== null) throw Object.assign(new GameError("ALREADY_AT_TABLE"), { tableId: running });

      const { chain } = this.deps;
      const seasonId = await chain.activeSeasonOf(human);
      if (seasonId === 0) throw new GameError("NO_POSITION", "deposit into a season to play");
      const season = await chain.getSeason(seasonId);
      const now = (this.deps.nowSeconds ?? (() => Math.floor(Date.now() / 1000)))();
      // recordGame reverts with SeasonNotActive during Enrollment, so games start with the season.
      // A season past its start counts as Active: the keeper activates it long before a game ends.
      if (effectiveStatus(season, now) !== "Active") throw new GameError("SEASON_NOT_ACTIVE", "games open when your season starts");
      if (season.status === "Active" && !(await chain.isEligible(seasonId, human))) throw new GameError("NOT_ELIGIBLE");
      if (season.end - now < presetMaxDurationSeconds(preset) + END_OF_SEASON_BUFFER_SECONDS) {
        throw new GameError("SEASON_CLOSING", "not enough time left in your season for this game");
      }
      const table = await this.deps.engine.createTable({ human, bots: [...HOUSE_BOTS], seasonId, preset });
      return { tableId: table.id };
    } finally {
      this.inFlight.delete(human);
    }
  }
}
