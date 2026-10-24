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
    phase: text("phase", { enum: ["Waiting", "Commit", "Reveal", "Live", "Settled"] }).notNull(),
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
  (t) => [primaryKey({ columns: [t.tableId, t.seat] })],
);

export const rounds = sqliteTable(
  "rounds",
  {
    tableId: integer("table_id").notNull(),
    round: integer("round").notNull(),
    cap: integer("cap").notNull(),
    /** JSON array of coin symbols, in board order. */
    coins: text("coins").notNull(),
    liveDuration: integer("live_duration").notNull(),
    commitDeadlineMs: integer("commit_deadline_ms").notNull(),
    revealDeadlineMs: integer("reveal_deadline_ms"),
    liveStartMs: integer("live_start_ms"),
    liveEndMs: integer("live_end_ms"),
    settledAtMs: integer("settled_at_ms"),
  },
  (t) => [primaryKey({ columns: [t.tableId, t.round] })],
);

/** Pyth prices used to score a round: integer price with its exponent and publish time. */
export const roundPrices = sqliteTable(
  "round_prices",
  {
    tableId: integer("table_id").notNull(),
    round: integer("round").notNull(),
    coin: text("coin").notNull(),
    startPrice: text("start_price").notNull(),
    startExpo: integer("start_expo").notNull(),
    startPublishTime: integer("start_publish_time").notNull(),
    endPrice: text("end_price"),
    endExpo: integer("end_expo"),
    endPublishTime: integer("end_publish_time"),
  },
  (t) => [primaryKey({ columns: [t.tableId, t.round, t.coin] })],
);

export const picks = sqliteTable(
  "picks",
  {
    tableId: integer("table_id").notNull(),
    round: integer("round").notNull(),
    seat: integer("seat").notNull(),
    coin: text("coin").notNull(),
    side: text("side", { enum: ["Buy", "Sell"] }).notNull(),
    boosted: bool("boosted").notNull().default(false),
    insured: bool("insured").notNull().default(false),
    submittedAtMs: integer("submitted_at_ms").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tableId, t.round, t.seat, t.coin] })],
);

export const SKILLS = ["BOOST", "INSURANCE", "LOCK", "FLIP", "SWAP", "FREEZE"] as const;

export const skillHands = sqliteTable(
  "skill_hands",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableId: integer("table_id").notNull(),
    seat: integer("seat").notNull(),
    skill: text("skill", { enum: SKILLS }).notNull(),
    /** 0 = dealt at table start, n = earned by winning round n. */
    dealtRound: integer("dealt_round").notNull(),
    usedRound: integer("used_round"),
  },
  (t) => [index("skill_hands_table_seat").on(t.tableId, t.seat)],
);

export const skillsUsed = sqliteTable(
  "skills_used",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    tableId: integer("table_id").notNull(),
    round: integer("round").notNull(),
    seat: integer("seat").notNull(),
    skill: text("skill", { enum: SKILLS }).notNull(),
    targetSeat: integer("target_seat").notNull(),
    targetCoin: text("target_coin").notNull(),
    /** SWAP only: the coin the pick moved to. */
    swapToCoin: text("swap_to_coin"),
    /** Live skills: the backend price the effect was taken at. */
    price: text("price"),
    priceExpo: integer("price_expo"),
    publishTime: integer("publish_time"),
    atMs: integer("at_ms").notNull(),
  },
  (t) => [index("skills_used_table_round").on(t.tableId, t.round)],
);

export const roundResults = sqliteTable(
  "round_results",
  {
    tableId: integer("table_id").notNull(),
    round: integer("round").notNull(),
    seat: integer("seat").notNull(),
    roundScore: integer("round_score").notNull(),
    forfeit: bool("forfeit").notNull(),
    won: bool("won").notNull(),
  },
  (t) => [primaryKey({ columns: [t.tableId, t.round, t.seat] })],
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
