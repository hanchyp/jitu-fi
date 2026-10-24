CREATE TABLE `bonus_fundings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`season_id` integer NOT NULL,
	`sponsor` text NOT NULL,
	`amount` text NOT NULL,
	`tx_hash` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `game_results` (
	`game_id` text PRIMARY KEY NOT NULL,
	`player` text NOT NULL,
	`season_id` integer NOT NULL,
	`game_score` integer NOT NULL,
	`credited` text DEFAULT '0' NOT NULL,
	`skipped` integer DEFAULT false NOT NULL,
	`log_hash` text,
	`tx_hash` text NOT NULL,
	`block_number` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `game_results_season_player` ON `game_results` (`season_id`,`player`);--> statement-breakpoint
CREATE TABLE `indexer_cursor` (
	`id` text PRIMARY KEY NOT NULL,
	`last_block` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `positions` (
	`season_id` integer NOT NULL,
	`address` text NOT NULL,
	`principal` text NOT NULL,
	`claimed` integer DEFAULT false NOT NULL,
	`claimed_principal` text,
	`claimed_base` text,
	`claimed_bonus` text,
	PRIMARY KEY(`season_id`, `address`)
);
--> statement-breakpoint
CREATE INDEX `positions_address` ON `positions` (`address`);--> statement-breakpoint
CREATE TABLE `processed_logs` (
	`tx_hash` text NOT NULL,
	`log_index` integer NOT NULL,
	`block_number` integer NOT NULL,
	PRIMARY KEY(`tx_hash`, `log_index`)
);
--> statement-breakpoint
CREATE TABLE `seasons` (
	`id` integer PRIMARY KEY NOT NULL,
	`enroll_start` integer NOT NULL,
	`start` integer NOT NULL,
	`end` integer NOT NULL,
	`status` text NOT NULL,
	`total_principal` text DEFAULT '0' NOT NULL,
	`bonus_pot` text DEFAULT '0' NOT NULL,
	`sponsor_funds` text DEFAULT '0' NOT NULL,
	`withdrawn` text,
	`fee` text,
	`base_yield` text,
	`total_weighted_points` text,
	`shortfall` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `sessions_address` ON `sessions` (`address`);--> statement-breakpoint
CREATE TABLE `siwe_nonces` (
	`nonce` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE `table_players` (
	`table_id` integer NOT NULL,
	`seat` integer NOT NULL,
	`address` text NOT NULL,
	`is_bot` integer NOT NULL,
	PRIMARY KEY(`table_id`, `seat`)
);
--> statement-breakpoint
CREATE INDEX `table_players_address` ON `table_players` (`address`);--> statement-breakpoint
CREATE TABLE `tables` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`preset` text NOT NULL,
	`status` text NOT NULL,
	`human_address` text NOT NULL,
	`season_id` integer NOT NULL,
	`current_round` integer DEFAULT 0 NOT NULL,
	`phase` text NOT NULL,
	`phase_deadline_ms` integer,
	`created_at_ms` integer NOT NULL,
	`finished_at_ms` integer,
	`game_score` integer,
	`game_id` text,
	`log_hash` text,
	`record_status` text DEFAULT 'none' NOT NULL,
	`record_tx_hash` text,
	`record_error` text,
	`state` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `tables_human_status` ON `tables` (`human_address`,`status`);--> statement-breakpoint
CREATE INDEX `tables_record_status` ON `tables` (`record_status`);