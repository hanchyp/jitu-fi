# Spec Delta

## Purpose

Lets players play and deposit by signing messages only, with no wallet transaction popups and no MON needed. The backend validates signed payloads and submits them on-chain, paying the gas.

## ADDED Requirements

### Requirement: Relay endpoints
The backend SHALL accept signed typed data at POST /relay/commit, /relay/reveal, /relay/skill and /relay/deposit-permit. Each response returns the submitted transaction hash.

#### Scenario: Relayed commit
- **WHEN** a player posts a valid signed Commit
- **THEN** the relayer submits commitBySig and returns its tx hash

### Requirement: Off-chain pre-validation
Before submitting, the relayer SHALL verify:
- the payload schema
- the signer
- the chain id and verifying contract
- the deadline
- the expected nonce
- that the table is in the right phase

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

### Requirement: Nonce management and idempotent retry
The relayer SHALL serialize its own account nonces. A duplicate submission of the same signed payload MUST return the original tx hash instead of sending a second transaction.

#### Scenario: Duplicate request
- **WHEN** the same signed payload is posted twice
- **THEN** both responses carry the same tx hash and only one transaction is sent

#### Scenario: Concurrent payloads
- **WHEN** 10 payloads from different players arrive at once
- **THEN** all are submitted with consecutive relayer nonces and none is dropped
