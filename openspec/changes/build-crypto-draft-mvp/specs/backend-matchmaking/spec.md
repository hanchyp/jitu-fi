# Spec Delta

## Purpose

Seats players at 4-player tables and opens them on-chain. For the MVP each table is 1 human and 3 house bots, created as soon as the player presses Play. A queue for several humans is designed in but not enabled. No table is opened that could finish after the player's season ends.

## ADDED Requirements

### Requirement: Play request
A player authenticated with SIWE SHALL be able to request a table with a preset (Quick, Standard, Long or Marathon) via POST /play. Only addresses for which vault.isEligible is true may play, and a player at an unfinished table may not request another.

#### Scenario: Ineligible player
- **WHEN** an address with no active position calls POST /play
- **THEN** the request is rejected with an error and no table is created

#### Scenario: Already at a table
- **WHEN** a player whose table is still running calls POST /play
- **THEN** the request is rejected and the response carries the running table's id

### Requirement: Instant bot table
In the MVP, the matchmaker SHALL create the table at once with the player and 3 registered house bots, and return the new table id. Bots never need a deposit.

#### Scenario: Judge plays
- **WHEN** an eligible player requests a Quick game
- **THEN** a table with that player and 3 bots is created on-chain and its id is returned

### Requirement: Multi-human queue (designed, disabled)
The matchmaker SHALL keep a per-preset queue behind a config flag, off by default. When enabled, it seats up to 4 queued humans together and fills the remaining seats with bots after 20 seconds.

#### Scenario: Flag off
- **WHEN** the queue flag is off
- **THEN** every play request gets an instant bot table

### Requirement: End-of-season guard
The matchmaker MUST NOT create a table when the time left in the player's season is less than the preset's maximum duration plus a 60-second buffer. The maximum duration is rounds × (20 + 10 + 120 + settle margin) seconds.

#### Scenario: Too close to season end
- **WHEN** 7 minutes remain in the player's season and they request a Quick game, whose maximum is about 8 minutes
- **THEN** no table is created and the response explains the season is closing
