# Spec Delta

## Purpose

Groups eligible depositors into 4-player tables and opens them on-chain. Bots fill empty seats in demo mode, and no table is opened that could finish after the season ends.

## ADDED Requirements

### Requirement: Lobby queue
The backend SHALL keep a lobby queue per season. A player authenticated with SIWE may join or leave it. Only addresses for which vault.isEligible is true may join, and each address may be queued once.

#### Scenario: Ineligible join
- **WHEN** an address with no position calls POST /lobby/join
- **THEN** the request is rejected with an error and the queue is unchanged

#### Scenario: Leave queue
- **WHEN** a queued player calls POST /lobby/leave
- **THEN** they are removed and the lobby room receives the updated queue

### Requirement: Table formation
When 4 players are queued, the matchmaker SHALL create the table on-chain and notify those players over the lobby room with the new table id.

#### Scenario: Fourth player joins
- **WHEN** a fourth eligible player joins the queue
- **THEN** a table is created on-chain and the 4 players receive its id

### Requirement: Demo bot fill
In DEMO_MODE, when a player has waited more than 20 seconds, the matchmaker SHALL fill the remaining seats with eligible bot addresses.

#### Scenario: Judge plays alone
- **WHEN** a single player waits 20 seconds in DEMO_MODE
- **THEN** a table is created with that player and 3 bots

### Requirement: End-of-season guard
The matchmaker MUST NOT create a table when the time left in the season is less than one full game's duration plus a safety buffer. One game is about 9 minutes in demo mode.

#### Scenario: Too close to season end
- **WHEN** 6 minutes remain in a demo season and 4 players are queued
- **THEN** no table is created and the lobby room is told the season is closing
