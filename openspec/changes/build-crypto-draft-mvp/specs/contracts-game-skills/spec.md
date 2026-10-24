# Spec Delta

## Purpose

Defines the skill cards players hold at a table and how they change a pick's scoring. Six skills each test a different decision: how sure you are (BOOST, INSURANCE), when to get out (LOCK), whether the trend turned (FLIP, SWAP), and how to slow down an opponent (FREEZE). Skills never touch principal.

## ADDED Requirements

### Requirement: Per-table skill hand
Each player's skill hand SHALL be scoped to a single table, keyed by tableId and player. A hand holds at most 3 skills. Skills from one table MUST NOT be usable at another. Bots hold and use skills like humans.

#### Scenario: Initial deal
- **WHEN** a table is created
- **THEN** each of the 4 players holds exactly 1 randomly chosen skill for that table

#### Scenario: Hand isolation
- **WHEN** a player who finished table A plays table B
- **THEN** skills left at table A are not in their hand at table B

### Requirement: Earning skills
Each round winner (see game-table) SHALL receive one random skill if their hand holds fewer than 3. A forfeit player never earns a skill.

#### Scenario: Winner with room
- **WHEN** a round winner holds 1 skill at settlement
- **THEN** they hold 2 skills afterwards

#### Scenario: Full hand
- **WHEN** a round winner already holds 3 skills
- **THEN** no skill is added

### Requirement: One skill per round
A player SHALL use at most one skill per round, whether a commit-time or a live skill. The skill is removed from the hand when it takes effect, and SkillUsed is emitted.

#### Scenario: Second skill in a round
- **WHEN** a player who revealed a BOOST tries to use LOCK in the same round
- **THEN** the call reverts

### Requirement: Commit-time skills are hidden
BOOST and INSURANCE SHALL be chosen in the commit as a pick index (boostIdx, insureIdx; 255 = none), so opponents cannot see them until Reveal. At most one of the two may be set. They take effect at reveal and revert the reveal if the player does not hold the skill.

#### Scenario: Both set
- **WHEN** a revealed commit sets both boostIdx and insureIdx
- **THEN** the reveal reverts

### Requirement: BOOST
A boosted pick SHALL count with weight 2 in the round's weighted average return.

#### Scenario: Boost changes the average
- **WHEN** the cap is 2 and a player's picks return +60 (boosted) and −20 bps
- **THEN** the round score is 2 × (2×60 − 20) / 3 = 66

### Requirement: INSURANCE
An insured pick's return SHALL be floored at 0. The floor applies last, after any live effect. A pick is void only if its return before the floor is 0, so an insured losing pick counts as 0 in the average and is not excluded.

#### Scenario: Insured loss
- **WHEN** the cap is 2 and a player's picks return +40 and −30 bps with the −30 pick insured
- **THEN** the round score is 2 × (40 + 0) / 2 = 40

### Requirement: Live skills
LOCK, FLIP, SWAP and FREEZE SHALL be usable only in Live, before the Live deadline. Each call carries a price update. The contract applies it and reads the current price, which MUST be no older than 5 seconds and no earlier than the round's Live start. A pick can carry at most one live effect, and a call on a pick that already has one reverts.

#### Scenario: After the deadline
- **WHEN** a player uses LOCK after the Live deadline but before settlement
- **THEN** the call reverts

#### Scenario: Stale price
- **WHEN** the supplied price is 10 seconds old
- **THEN** the call reverts

#### Scenario: Second effect on a pick
- **WHEN** a pick that was frozen is targeted by its owner's LOCK
- **THEN** the call reverts

### Requirement: LOCK
LOCK SHALL fix one of the caller's own picks at the current price, so settlement uses that price instead of the end price. PickLocked is emitted.

#### Scenario: Locked gain
- **WHEN** a player locks BTC Buy at +1.0% and BTC ends the round at −2.0%
- **THEN** that pick returns +100 bps

#### Scenario: Lock another player's pick
- **WHEN** a player tries to LOCK a pick they do not own
- **THEN** the call reverts

### Requirement: FLIP
FLIP SHALL reverse the direction of one of the caller's own picks from now on. The pick's return is the return from start to the flip price in the old direction, plus the return from the flip price to end in the new direction. Each segment is computed in bps and truncated separately. PickFlipped is emitted.

#### Scenario: Trend reversal
- **WHEN** BTC Buy is +30 bps at the flip and BTC then falls a further 20 bps
- **THEN** the pick returns +30 + 20 = +50 bps

### Requirement: SWAP
SWAP SHALL replace one of the caller's own picks with another table coin that the caller did not pick this round, with a direction the caller chooses. The return is the old pick's return from start to now, plus the new coin's return from now to end in the new direction. PickSwapped is emitted.

#### Scenario: Swap to a mover
- **WHEN** a player swaps ETH Buy (−10 bps so far) to SOL Buy and SOL then rises 40 bps
- **THEN** the pick returns −10 + 40 = +30 bps

#### Scenario: Swap to an owned coin
- **WHEN** a player swaps to a coin they already picked this round
- **THEN** the call reverts

### Requirement: FREEZE
FREEZE SHALL fix one opponent's pick at the current price, like a LOCK applied by the attacker. Each player can be frozen at most once per round. PickFrozen is emitted.

#### Scenario: Freeze a winner
- **WHEN** a player freezes an opponent's SOL Buy at +20 bps and SOL ends at +90 bps
- **THEN** that opponent's pick returns +20 bps

#### Scenario: Second freeze on a player
- **WHEN** a second player freezes the same opponent in the same round
- **THEN** the call reverts

### Requirement: Demo randomness disclosure
With the PseudoRandomness source, skill deals, coin draws and live durations SHALL be treated as predictable. This MUST be recorded as a known limitation in DECISIONS.md until a VRF source replaces it.

#### Scenario: Limitation documented
- **WHEN** a reviewer reads DECISIONS.md
- **THEN** it states that random outcomes are predictable with PseudoRandomness and names Pyth Entropy as the fix
