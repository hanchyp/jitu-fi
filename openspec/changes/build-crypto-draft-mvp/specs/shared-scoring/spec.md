# Spec Delta

## Purpose

Gives the backend, frontend and bots one off-chain copy of the game constants and scoring rules. It produces exactly the same numbers as the contracts, so live scores in the UI match on-chain settlement.

## ADDED Requirements

### Requirement: Single source of game constants
A shared config SHALL define the game constants:
- players per table: 4; coins on the table: 8
- the four presets (Quick 3, Standard 5, Long 7, Marathon 10 rounds) with their per-round pick caps
- commit 20 s, reveal 10 s, live duration range 60–120 s
- live-skill price max age: 5 s; oracle max age: 15 s
- skill ids (BOOST, INSURANCE, LOCK, FLIP, SWAP, FREEZE) and the max hand size of 3
- counted games per season K: 5 (DEMO_MODE: 2)
- fee and base-yield bps, weight cap, minimum deposit
- season durations per tenor and enrollment windows, for production and demo

The contracts MUST mirror these values.

#### Scenario: Constant mismatch detected
- **WHEN** a contract constant differs from the shared config
- **THEN** the consistency test fails

### Requirement: Identical scoring
The TS scoring library SHALL compute, using only integer (bigint) math with Solidity's truncation toward zero:
- pick returns, including the effects of LOCK, FLIP, SWAP, FREEZE and the INSURANCE floor
- void detection (return 0 before the floor)
- round scores as cap × weighted average return, with BOOST weight 2
- round winners, including ties and forfeits
- game scores as Σ round scores / Σ caps
- season-point credits as max(0, gameScore) for the first K games

It is used for live scores in the UI and by the bots.

#### Scenario: Negative return rounding
- **WHEN** a pick has a negative return that does not divide evenly
- **THEN** the TS result equals the Solidity result (truncation toward zero)

#### Scenario: Live score matches settlement
- **WHEN** the UI computes a round score from the same prices the contract settles with
- **THEN** the two scores are equal

### Requirement: Shared test vectors
A shared scoring test-vector file SHALL be consumed by both the Foundry suite and the TS suite. It covers every preset, void picks, all six skills, forfeits, tied winners and negative rounding. Both suites MUST produce identical outputs for every vector.

#### Scenario: Cross-implementation check
- **WHEN** both test suites run over the vector file
- **THEN** every vector's returns, round scores, winners and game scores match the expected values in both

### Requirement: Deployment artifacts
The shared package SHALL export contract ABIs and per-chain deployment addresses for chains 31337 and 10143. It MUST NOT contain mainnet (143) addresses.

#### Scenario: Consumer import
- **WHEN** the backend imports the deployment for chain 10143
- **THEN** it receives the deployed vault, game manager and registry addresses
