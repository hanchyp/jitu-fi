# Spec Delta

## Purpose

Scripted players that fill demo tables, so a judge can play against them. They also drive the end-to-end test from an empty chain to a successful claim.

## ADDED Requirements

### Requirement: Bot player lifecycle
The bot runner SHALL run N players (default 4) from test private keys. Each bot uses the faucet, deposits, joins the lobby, commits, reveals, and sometimes uses a skill. It plays only through the public API and relayer.

#### Scenario: Four bots play a game
- **WHEN** the runner starts 4 bots on an enrolling season
- **THEN** they form a table and finish all 3 rounds

### Requirement: Local and testnet modes
The runner SHALL support --local and --testnet. --local uses anvil and the mock oracle, moving prices by random walk. --testnet uses Monad testnet with real price feeds.

#### Scenario: Local price movement
- **WHEN** the runner runs with --local during Live
- **THEN** mock oracle prices change between start and settle

### Requirement: End-to-end test
A single command `pnpm e2e:local` SHALL:
1. start anvil
2. deploy the contracts
3. start the backend
4. run 4 bots through a full demo season, from deposit to claim

It succeeds only if every bot receives at least its principal.

#### Scenario: Green e2e run
- **WHEN** `pnpm e2e:local` runs on a clean checkout
- **THEN** it exits 0 after all bots have claimed
