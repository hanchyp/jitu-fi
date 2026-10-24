# Spec Delta

## Purpose

Provides the testnet-only stablecoin (mUSD) players deposit, and the pluggable yield strategy the season vault parks principal in, with a mock implementation that simulates yield.

## ADDED Requirements

### Requirement: mUSD token
The system SHALL provide an ERC20 token named "Mock USD" with symbol "mUSD", 6 decimals, and EIP-2612 permit support.

#### Scenario: Token metadata
- **WHEN** a client reads name, symbol and decimals
- **THEN** it receives "Mock USD", "mUSD" and 6

#### Scenario: Permit approval
- **WHEN** a holder signs a valid EIP-2612 permit and anyone submits it
- **THEN** the spender allowance is set without the holder sending a transaction

### Requirement: Faucet with cooldown
Any address SHALL be able to mint 1,000 mUSD to itself through the faucet, at most once per hour per address.

#### Scenario: First faucet call
- **WHEN** an address calls the faucet for the first time
- **THEN** its balance increases by 1,000 mUSD (1_000_000_000 base units)

#### Scenario: Faucet during cooldown
- **WHEN** the same address calls the faucet again less than 1 hour later
- **THEN** the call reverts and no tokens are minted

### Requirement: Restricted minting
Only the faucet and holders of the minter role (the mock yield strategy) SHALL be able to mint mUSD.

#### Scenario: Unauthorized mint
- **WHEN** an address without the minter role calls the privileged mint
- **THEN** the call reverts

### Requirement: Yield strategy interface
The vault SHALL interact with yield only through a strategy interface exposing asset, deposit, withdrawAll and totalAssets, so the mock can later be replaced by a real lending adapter.

#### Scenario: Only the vault moves funds
- **WHEN** an address other than the configured vault calls deposit or withdrawAll on the strategy
- **THEN** the call reverts

### Requirement: Mock yield accrual
The mock strategy SHALL report totalAssets as principal plus accrued, where accrued = principal × aprBps × elapsed / (10000 × 365 days), using integer math.

#### Scenario: Accrual over time
- **WHEN** 1,000 mUSD is deposited at aprBps 1000 and 365 days elapse
- **THEN** totalAssets reports 1,100 mUSD

#### Scenario: Withdraw all
- **WHEN** the vault calls withdrawAll
- **THEN** the strategy mints the accrued amount, transfers its entire balance to the vault, and returns that amount

### Requirement: Configurable APR
The strategy admin SHALL be able to set aprBps, including very high demo values so yield becomes visible within a short demo season. The DEMO_MODE default is 17,520,000, which is about 10% per 30 minutes; the UI labels it simulated.

#### Scenario: Non-admin sets APR
- **WHEN** a non-admin calls the APR setter
- **THEN** the call reverts
