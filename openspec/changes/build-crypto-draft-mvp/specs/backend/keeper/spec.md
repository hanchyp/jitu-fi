# Spec Delta

## Purpose

Drives every time-based on-chain transition, so tables progress through their phases and seasons activate and finalize without anyone acting manually.

## ADDED Requirements

### Requirement: Table phase scheduling
For each open table, the keeper SHALL call startRound, then startLive once the reveal deadline passes, then settleRound once the live deadline passes. It repeats this until the table is Finished.

#### Scenario: Full game driven
- **WHEN** a table is created and players act normally
- **THEN** the keeper drives all 3 rounds to Finished without manual calls

#### Scenario: Nobody reveals
- **WHEN** no player reveals in a round
- **THEN** the keeper still starts Live and settles the round, with every player marked forfeit

### Requirement: Oracle updates for price-dependent calls
Before startLive and settleRound, the keeper SHALL fetch fresh price update data for the table's 8 coins. It attaches the data and pays the update fee.

#### Scenario: Live start priced
- **WHEN** the keeper starts Live
- **THEN** the transaction includes update data no older than the oracle's max age

### Requirement: Season activation and finalization
The keeper SHALL call activate once a season's start time passes and finalize once its end time passes.

#### Scenario: Season ends
- **WHEN** a season's end time passes
- **THEN** the keeper finalizes it and the season becomes Finalized

### Requirement: Idempotent, restart-safe operation
Before every transaction, the keeper SHALL read on-chain state and skip transitions already done. After a restart it resumes all open tables and seasons from chain state. It uses the same explicit gas-limit rule as the relayer.

#### Scenario: Restart mid-round
- **WHEN** the keeper restarts while a table is in Live
- **THEN** it resumes and settles the round once, without duplicate transactions
