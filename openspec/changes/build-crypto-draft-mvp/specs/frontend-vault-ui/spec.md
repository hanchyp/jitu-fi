# Spec Delta

## Purpose

Lets players get test mUSD, deposit it into the current season with a clear message that principal is safe, and claim principal plus yield once the season ends.

## ADDED Requirements

### Requirement: Faucet access
The deposit screen SHALL offer a faucet button that mints 1,000 mUSD. While the cooldown is active, it shows the remaining time.

#### Scenario: Cooldown active
- **WHEN** the user used the faucet 20 minutes ago
- **THEN** the button is disabled and shows about 40 minutes remaining

### Requirement: Deposit flow
The deposit screen SHALL show:
- a tenor choice ("1 week", "1 month"; demo lengths shown alongside), each with its enrollment countdown and current bonus pot including sponsor funds
- an amount input, enforcing a 10 mUSD minimum and the wallet balance
- a note that principal, base yield and bonus are all paid at maturity, and that a losing streak still returns principal plus base yield
- the weight cap

The user sends the deposit from their own wallet (they hold testnet MON). Deposit uses a permit signature when possible, and approve + deposit as a fallback. A user with an active position in another tenor sees why they cannot deposit.

#### Scenario: Permit deposit
- **WHEN** the user enters 100 mUSD and confirms
- **THEN** they sign a permit, the deposit is submitted, and their position shows 100 mUSD once indexed

#### Scenario: Enrollment closed
- **WHEN** the season has started
- **THEN** the deposit button is disabled with a message that enrollment is closed

### Requirement: Estimated earnings
While a season is Active, the position view SHALL show live estimated earnings from previewClaim (principal, base yield and bonus estimate), updated after each finished game, and the time to maturity.

#### Scenario: Estimate after a game
- **WHEN** the player's game finishes and its points are credited
- **THEN** the estimated bonus refreshes within a few seconds

### Requirement: Claim screen
After finalization, the claim screen SHALL show principal, base yield and bonus (from previewClaim), and the total. A single claim action transfers the funds.

#### Scenario: Successful claim
- **WHEN** the user claims a finalized season
- **THEN** the breakdown is replaced by a confirmation showing the amount received

#### Scenario: Shortfall season
- **WHEN** the season finalized with a shortfall
- **THEN** the screen explains that principal is repaid pro-rata and shows the reduced amount
