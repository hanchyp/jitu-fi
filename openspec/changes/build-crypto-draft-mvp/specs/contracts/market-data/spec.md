# Spec Delta

## Purpose

Supplies the game with its coin universe, trustworthy prices, and a randomness source. Each sits behind an interface so the mock used in tests and the real provider used on testnet are interchangeable.

## ADDED Requirements

### Requirement: Coin registry
The registry SHALL store coins as symbol, price feed id and active flag. The admin may add coins and deactivate them. At deploy it is seeded with at least 12 liquid coins whose feed ids come from official Pyth documentation.

#### Scenario: Deactivated coin
- **WHEN** the admin deactivates a coin
- **THEN** it is never selected for new rounds

#### Scenario: Seed size
- **WHEN** the deploy script finishes
- **THEN** the registry holds at least 12 active coins

### Requirement: Unknown feed ids are never guessed
If an official feed id or oracle address cannot be confirmed, configuration SHALL use the placeholder TODO_FILL_ME and the deployment SHALL use the mock oracle.

#### Scenario: Missing Pyth address
- **WHEN** PYTH_CONTRACT_ADDRESS is TODO_FILL_ME at deploy
- **THEN** the deploy script wires the mock oracle and logs a warning

### Requirement: Price oracle interface
The oracle SHALL expose updateFee(data), a payable update(data), and getPrice(feedId), which returns price, expo and publishTime. The game pays the update fee from the value its keeper sends.

#### Scenario: Fee forwarding
- **WHEN** the keeper calls startLive with update data and the required fee
- **THEN** the oracle is updated and prices are read in the same transaction

### Requirement: Stale and invalid prices rejected
The oracle SHALL reject a price older than 15 seconds and any price ≤ 0.

#### Scenario: Stale price
- **WHEN** a price's publishTime is more than 15 seconds old
- **THEN** reading it reverts

#### Scenario: Non-positive price
- **WHEN** a feed reports price 0
- **THEN** reading it reverts

### Requirement: Mock oracle
A mock oracle SHALL let its admin set prices directly. It is used by unit tests, anvil and local bots, and its update fee is zero.

#### Scenario: Set and read
- **WHEN** the admin sets ETH to 3000 with expo −8
- **THEN** getPrice for ETH returns 3000, −8 and the current timestamp

### Requirement: Randomness source
Randomness SHALL come through an interface. The MVP implementation derives values from keccak256 of the previous blockhash, tableId, round and a nonce. Its code MUST be labelled NOT SECURE, DEMO ONLY.

#### Scenario: Distinct coin draws
- **WHEN** two rounds are started on the same table
- **THEN** each draw yields 8 distinct registry coins
