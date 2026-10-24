# Spec Delta

## Purpose

Mirrors on-chain events into a queryable store. It serves seasons, positions, tables, history and leaderboards over REST, and pushes game events and live prices to clients over WebSocket.

## ADDED Requirements

### Requirement: Event indexing with backfill
The indexer SHALL subscribe to contract logs over WebSocket and persist every vault and game event. On startup it backfills missed blocks with eth_getLogs from the last processed block. It never stores the same event twice.

#### Scenario: Downtime recovery
- **WHEN** the indexer was offline for 500 blocks and restarts
- **THEN** all events from those blocks are stored exactly once

### Requirement: REST read endpoints
The API SHALL serve these endpoints, with inputs validated:
- GET /seasons/current (every open season, one per tenor)
- GET /seasons/:id/leaderboard (points, counted games n/K, weight, estimated bonus; humans only)
- GET /users/:addr/position (including previewClaim)
- GET /tables/:id
- GET /users/:addr/history

#### Scenario: Current season
- **WHEN** a client calls GET /seasons/current
- **THEN** it receives, for each open season, the season id, tenor, status, timestamps, total principal, bonus pot including sponsor funds, and the demo-mode flag

#### Scenario: Invalid address
- **WHEN** a client calls GET /users/not-an-address/position
- **THEN** it receives a 400 error

### Requirement: Real-time rooms
The backend SHALL provide WebSocket rooms table:<id> and prices, plus lobby:<preset> for the disabled multi-human queue. The table room gets round starts (coins, cap, live duration), phase changes, reveals, skill events and round results within seconds of the event being indexed.

#### Scenario: Reveal broadcast
- **WHEN** a Revealed event is indexed for table 7
- **THEN** every client in table:7 receives the revealed picks

### Requirement: Live price stream
The backend SHALL proxy Pyth Hermes prices. It pushes a tick about once per second for the coins at active tables, and serves update data on demand to the keeper and to the relayer for live skills.

#### Scenario: Price ticks
- **WHEN** a client subscribes to the prices room during a Live phase
- **THEN** it receives a price tick for each table coin roughly every second
