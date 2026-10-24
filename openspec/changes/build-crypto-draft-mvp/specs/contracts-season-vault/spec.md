# Spec Delta

## Purpose

Holds players' principal for a fixed-tenor season, routes it to the yield strategy, splits the resulting yield into fee, guaranteed base yield and a skill-based bonus pot, and returns principal plus earnings on claim.

## ADDED Requirements

### Requirement: Season creation
The vault admin SHALL be able to create a season with enrollStart < start < end. The season starts in Enrollment status. Each season has its own id. A lock tenor is a season: several seasons with different lengths (for example "1 week" and "1 month") may run at the same time. In DEMO_MODE, "1 week" lasts 15 minutes, "1 month" lasts 30 minutes, and enrollment lasts 2 minutes.

#### Scenario: Two tenors at once
- **WHEN** the admin creates a 1-week season and a 1-month season with overlapping enrollment
- **THEN** both are in Enrollment with their own ids

#### Scenario: Valid season
- **WHEN** the admin creates a season with ordered timestamps
- **THEN** a SeasonCreated event is emitted and the season is in Enrollment

#### Scenario: Invalid ordering
- **WHEN** the admin creates a season with start ≥ end
- **THEN** the call reverts

### Requirement: Deposit during enrollment
A user SHALL be able to deposit mUSD into a season only while block.timestamp < start and the season is in Enrollment. Each deposit must be at least 10 mUSD. Deposits accumulate into one position per user per season.

#### Scenario: Deposit accepted
- **WHEN** a user deposits 100 mUSD during enrollment
- **THEN** their position principal increases by 100 mUSD, totalPrincipal increases by the same, and Deposited is emitted

#### Scenario: Deposit after start
- **WHEN** a user deposits at or after start
- **THEN** the call reverts

#### Scenario: Below minimum
- **WHEN** a user deposits 5 mUSD
- **THEN** the call reverts

### Requirement: One active position per address
An address SHALL hold a position in at most one season that is in Enrollment or Active, so the game knows which season a player's points belong to. Adding to the same season's position is allowed. The vault SHALL expose activeSeasonOf(user).

#### Scenario: Second tenor
- **WHEN** a user with a position in the 1-week season deposits into the 1-month season while the 1-week season is not Finalized
- **THEN** the call reverts

#### Scenario: After maturity
- **WHEN** the user's previous season is Finalized
- **THEN** they may deposit into a new season

### Requirement: Deposit with permit
The vault SHALL accept a deposit authorized by an EIP-2612 permit in the same call. Anyone may submit it, but funds always come from and are credited to the permit owner.

#### Scenario: Relayed permit deposit
- **WHEN** a relayer submits a valid permit signature and deposit for a user
- **THEN** the user's position is credited and the relayer's balance is unchanged

### Requirement: Bonus weight cap
A position's weight SHALL equal min(principal, 1,000 mUSD).

#### Scenario: Deposit above cap
- **WHEN** a user's principal is 5,000 mUSD
- **THEN** their weight is 1,000 mUSD

### Requirement: Season activation
Once block.timestamp ≥ start, anyone SHALL be able to activate the season. Activation sends totalPrincipal to the strategy and sets status to Active. It happens only once.

#### Scenario: Activation
- **WHEN** anyone calls activate after start
- **THEN** totalPrincipal is deposited to the strategy, status becomes Active, and SeasonActivated is emitted

#### Scenario: Early activation
- **WHEN** anyone calls activate before start
- **THEN** the call reverts

### Requirement: Eligibility view
The vault SHALL expose isEligible(seasonId, user). It is true only when the user has a non-zero position and the season is Active. The vault SHALL also expose weightOf(seasonId, user).

#### Scenario: Non-depositor
- **WHEN** isEligible is queried for an address with no position
- **THEN** it returns false

### Requirement: Sponsor bonus funding
Anyone SHALL be able to add mUSD to a season's bonus pot with fundBonus(seasonId, amount) before the season is Finalized. Sponsor funds are kept apart from principal and strategy yield, are never charged the fee, and are added to bonusPot at finalize, including in a shortfall. BonusFunded is emitted.

#### Scenario: Demo pot seeded
- **WHEN** the deploy script funds a demo season with 1,000 mUSD and the strategy yields 100 mUSD on 1,000 mUSD principal
- **THEN** at finalize the fee is 15 mUSD, baseYield is 42.5 mUSD, and bonusPot is 1,042.5 mUSD

#### Scenario: Funding a finalized season
- **WHEN** anyone calls fundBonus on a Finalized season
- **THEN** the call reverts

### Requirement: Season finalization and yield split
After end, anyone SHALL be able to finalize once. Finalizing withdraws everything from the strategy. If the total exceeds totalPrincipal, the vault takes fee = 15% of yield and sends it to feeRecipient. baseYield is 50% of the remainder and bonusPot gets the rest plus sponsor funds. The vault snapshots totalWeightedPoints from the game contract. Points are cut off with the same boundary finalize uses (block.timestamp ≥ end).

#### Scenario: Normal yield
- **WHEN** totalPrincipal is 1,000 mUSD and the strategy returns 1,100 mUSD
- **THEN** fee is 15 mUSD, baseYield is 42.5 mUSD, bonusPot is 42.5 mUSD, and SeasonFinalized is emitted

#### Scenario: No points earned
- **WHEN** totalWeightedPoints is 0 at finalize
- **THEN** bonusPot is added to baseYield and bonusPot becomes 0

#### Scenario: Early finalize
- **WHEN** anyone calls finalize before end
- **THEN** the call reverts

### Requirement: Shortfall handling
If the strategy returns less than totalPrincipal, finalize SHALL set fee and baseYield to 0, set bonusPot to the sponsor funds only, and emit a Shortfall event. Each claim then repays principal × returned / totalPrincipal, plus any bonus share.

#### Scenario: Strategy loss
- **WHEN** totalPrincipal is 1,000 mUSD and the strategy returns 900 mUSD
- **THEN** Shortfall is emitted, no fee is paid, and a user with 100 mUSD principal can claim 90 mUSD

### Requirement: Claim
Principal, base yield and bonus SHALL all be paid at maturity; nothing is claimable before finalization. After a season is Finalized, each depositor SHALL be able to claim once. A claim pays principal + baseYield × principal / totalPrincipal + bonusPot × (points × weight) / totalWeightedPoints. Points are read from the game contract.

#### Scenario: Successful claim
- **WHEN** a depositor claims after finalization
- **THEN** they receive principal plus base and bonus shares, and Claimed is emitted

#### Scenario: Double claim
- **WHEN** the same depositor claims a second time
- **THEN** the call reverts

#### Scenario: Claim before finalize
- **WHEN** a depositor claims while the season is Active
- **THEN** the call reverts

### Requirement: Claim preview
The vault SHALL expose previewClaim(seasonId, user). It returns the principal, base and bonus amounts the user would receive. Before finalization it uses current strategy assets and points as an estimate.

#### Scenario: Preview matches claim
- **WHEN** previewClaim is read after finalization and the user then claims
- **THEN** the transferred amount equals the previewed total

### Requirement: Claim cannot be paused
The pause mechanism SHALL stop only new deposits. Claim MUST remain callable while paused, and no admin function may move user principal.

#### Scenario: Claim while paused
- **WHEN** the admin pauses the vault and a depositor claims a finalized season
- **THEN** the claim succeeds

#### Scenario: Deposit while paused
- **WHEN** the vault is paused and a user deposits
- **THEN** the call reverts

### Requirement: Dust sweep
The admin SHALL be able to sweep rounding dust from a finalized season. This is allowed only after every depositor has claimed, or 30 days after finalization.

#### Scenario: Premature sweep
- **WHEN** the admin sweeps while unclaimed positions remain and fewer than 30 days have passed
- **THEN** the call reverts

### Requirement: Solvency invariants
For every finalized season, the sum of claims SHALL NOT exceed the amount withdrawn from the strategy minus the fee. Every claimant outside a shortfall SHALL receive at least their principal. The game contract MUST NOT be able to trigger any token transfer.

#### Scenario: Invariant fuzzing
- **WHEN** the Foundry invariant suite runs ≥ 10,000 fuzz runs of random deposits, points, finalize and claims
- **THEN** none of the invariants is violated
