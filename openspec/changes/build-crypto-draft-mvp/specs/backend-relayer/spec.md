# Spec Delta

## Purpose

> **Scope change (2026-10-24):** dropped. Players send picks and skills to the backend API with SIWE auth; nothing is relayed on-chain during play.

Lets players play by signing messages only, with no wallet transaction popups during a game. The backend validates signed payloads and submits them on-chain, paying the gas. Deposits, the faucet and claims stay ordinary wallet transactions: the user has testnet MON.

## ADDED Requirements

### Requirement: Relay endpoints
The backend SHALL accept signed typed data at POST /relay/commit and /relay/skill, and reveal data at POST /relay/reveal. Each response returns the submitted transaction hash. Reveal needs no signature, because the commit hash already binds the player.

#### Scenario: Relayed commit
- **WHEN** a player posts a valid signed Commit
- **THEN** the relayer submits commitBySig and returns its tx hash

#### Scenario: Reveal without signature
- **WHEN** the frontend posts a player's picks and salt during Reveal
- **THEN** the relayer submits reveal for that player and returns its tx hash

### Requirement: Live skill prices supplied by the backend
For a live skill, the relayer SHALL attach fresh price update data from the prices module itself, not data from the client, and pay the oracle fee.

#### Scenario: Client price ignored
- **WHEN** a skill request includes client-supplied price data
- **THEN** the relayer discards it and attaches its own update no older than the 5-second skill limit

### Requirement: Off-chain pre-validation
Before submitting, the relayer SHALL verify:
- the payload schema
- the signer, where a signature is required
- the chain id and verifying contract
- the deadline
- that the table is in the right phase and the action is still allowed (one commit per round, one skill per round, skill held)

An invalid payload is rejected with a 4xx error and no transaction is sent.

#### Scenario: Wrong phase
- **WHEN** a Reveal payload arrives while the table is in Commit
- **THEN** the request returns 4xx and no transaction is sent

#### Scenario: Bad signature
- **WHEN** a payload's signature does not recover to the claimed player
- **THEN** the request returns 4xx and no transaction is sent

### Requirement: Explicit gas limit
Every transaction the backend sends SHALL set an explicit gas limit of the estimate × 1.15, because Monad bills the gas limit.

#### Scenario: Gas limit applied
- **WHEN** the relayer submits any transaction
- **THEN** its gas limit equals ceil(estimatedGas × 115 / 100)

### Requirement: Nonce management, idempotency and rate limits
The relayer SHALL serialize its own account nonces. A duplicate submission of the same payload MUST return the original tx hash instead of sending a second transaction. Requests are rate-limited per player address.

#### Scenario: Duplicate request
- **WHEN** the same signed payload is posted twice
- **THEN** both responses carry the same tx hash and only one transaction is sent

#### Scenario: Concurrent payloads
- **WHEN** 10 payloads from different players arrive at once
- **THEN** all are submitted with consecutive relayer nonces and none is dropped
