# Spec Delta

## Purpose

Gives the backend, frontend and bots one off-chain copy of the game constants and scoring rules. It produces exactly the same numbers as the contracts, so live scores in the UI match on-chain settlement.

## ADDED Requirements

### Requirement: Single source of game constants
A shared config SHALL define the game constants:
- players: 4
- rounds: 3
- coins on the table: 8
- picks per player: 3
- phase durations
- contrarian multipliers
- rank points
- round multipliers
- fee and base-yield bps
- weight cap and minimum deposit
- season and enrollment durations for production and demo

The contracts MUST mirror these values.

#### Scenario: Constant mismatch detected
- **WHEN** a contract constant differs from the shared config
- **THEN** the consistency test fails

### Requirement: Identical scoring
The TS scoring library SHALL compute pick scores, round scores, ranks with tie averaging and forfeits, and game points ×10. It uses only integer (bigint) math and the same rounding as Solidity.

#### Scenario: Negative return rounding
- **WHEN** a pick has a negative return that does not divide evenly
- **THEN** the TS result equals the Solidity result (truncation toward zero)

### Requirement: Shared test vectors
A shared scoring test-vector file SHALL be consumed by both the Foundry suite and the TS suite. Both MUST produce identical outputs for every vector.

#### Scenario: Cross-implementation check
- **WHEN** both test suites run over the vector file
- **THEN** every vector's scores, ranks and points match the expected values in both

### Requirement: Deployment artifacts
The shared package SHALL export contract ABIs and per-chain deployment addresses for chains 31337 and 10143. It MUST NOT contain mainnet (143) addresses.

#### Scenario: Consumer import
- **WHEN** the backend imports the deployment for chain 10143
- **THEN** it receives the deployed vault, game manager and registry addresses
