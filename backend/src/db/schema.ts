// Drizzle schema. On-chain amounts (uint256) and Pyth prices are stored as decimal strings and
// converted with BigInt at the edges; timestamps are unix seconds unless the name ends in `Ms`.
import { index, integer, primaryKey, sqliteTable, text } from "drizzle-orm/sqlite-core";

const bool = (name: string) => integer(name, { mode: "boolean" });

// ---------- Mirrored from chain logs (indexer) ----------

export const seasons = sqliteTable("seasons", {
  id: integer("id").primaryKey(),
  enrollStart: integer("enroll_start").notNull(),
  start: integer("start").notNull(),
  end: integer("end").notNull(),
  status: text("status", { enum: ["Enrollment", "Active", "Finalized"] }).notNull(),
  totalPrincipal: text("total_principal").notNull().default("0"),
  bonusPot: text("bonus_pot").notNull().default("0"),
  sponsorFunds: text("sponsor_funds").notNull().default("0"),
  withdrawn: text("withdrawn"),
  fee: text("fee"),
  baseYield: text("base_yield"),
  totalWeightedPoints: text("total_weighted_points"),
  shortfall: bool("shortfall").notNull().default(false),
});

export const positions = sqliteTable(
  "positions",
  {
    seasonId: integer("season_id").notNull(),
    address: text("address").notNull(),
    principal: text("principal").notNull(),
    claimed: bool("claimed").notNull().default(false),
    claimedPrincipal: text("claimed_principal"),
    claimedBase: text("claimed_base"),
    claimedBonus: text("claimed_bonus"),
  },
  (t) => [primaryKey({ columns: [t.seasonId, t.address] }), index("positions_address").on(t.address)],
);

export const bonusFundings = sqliteTable("bonus_fundings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  seasonId: integer("season_id").notNull(),
  sponsor: text("sponsor").notNull(),
  amount: text("amount").notNull(),
  txHash: text("tx_hash").notNull(),
});

export const gameResults = sqliteTable(
  "game_results",
  {
    gameId: text("game_id").primaryKey(),
    player: text("player").notNull(),
    seasonId: integer("season_id").notNull(),
    gameScore: integer("game_score").notNull(),
    credited: text("credited").notNull().default("0"),
    /** True for PointsSkipped (recorded after season end). */
    skipped: bool("skipped").notNull().default(false),
    logHash: text("log_hash"),
    txHash: text("tx_hash").notNull(),
    blockNumber: integer("block_number").notNull(),
  },
  (t) => [index("game_results_season_player").on(t.seasonId, t.player)],
);

/** Exactly-once guard for the indexer. */
export const processedLogs = sqliteTable(
  "processed_logs",
  {
    txHash: text("tx_hash").notNull(),
    logIndex: integer("log_index").notNull(),
    blockNumber: integer("block_number").notNull(),
  },
  (t) => [primaryKey({ columns: [t.txHash, t.logIndex] })],
);

export const indexerCursor = sqliteTable("indexer_cursor", {
  id: text("id").primaryKey(),
  lastBlock: integer("last_block").notNull(),
});

// ---------- Written by the game engine ----------

export const tables = sqliteTable(
  "tables",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    preset: text("preset", { enum: ["Quick", "Standard", "Long", "Marathon"] }).notNull(),
    status: text("status", { enum: ["Running", "Finished", "Aborted"] }).notNull(),
    humanAddress: text("human_address").notNull(),
    seasonId: integer("season_id").notNull(),
    currentRound: integer("current_round").notNull().default(0),
    phase: text("phase", { enum: ["Commit", "Reveal", "Live", "Finished"] }).notNull(),
    phaseDeadlineMs: integer("phase_deadline_ms"),
    createdAtMs: integer("created_at_ms").notNull(),
    finishedAtMs: integer("finished_at_ms"),
    /** Human seat's game score in bps, clamped to ≤ 10,000 before recordGame. */
    gameScore: integer("game_score"),
    gameId: text("game_id"),
    logHash: text("log_hash"),
    recordStatus: text("record_status", { enum: ["none", "pending", "sent", "recorded", "skipped", "failed"] })
      .notNull()
      .default("none"),
    recordTxHash: text("record_tx_hash"),
    recordError: text("record_error"),
    /** Full engine state (engine/types.ts TableState) as JSON: restart source and the game log. */
    state: text("state").notNull(),
  },
  (t) => [index("tables_human_status").on(t.humanAddress, t.status), index("tables_record_status").on(t.recordStatus)],
);

export const tablePlayers = sqliteTable(
  "table_players",
  {
    tableId: integer("table_id").notNull(),
    seat: integer("seat").notNull(),
    address: text("address").notNull(),
    isBot: bool("is_bot").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tableId, t.seat] }), index("table_players_address").on(t.address)],
);

// ---------- Auth ----------

export const siweNonces = sqliteTable("siwe_nonces", {
  nonce: text("nonce").primaryKey(),
  createdAt: integer("created_at").notNull(),
  used: bool("used").notNull().default(false),
});

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    address: text("address").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => [index("sessions_address").on(t.address)],
);
