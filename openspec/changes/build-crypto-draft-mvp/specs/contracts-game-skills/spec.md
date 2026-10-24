# Spec Delta

## Purpose

> **Scope change (2026-10-24):** skills are enforced by the backend game engine, not by a contract. Live skills use the backend's Pyth Hermes price at the moment of use; the "carries a price update" wording no longer applies.

Defines the skill cards players hold at a table and how they change a pick's scoring. Six skills each test a different decision. Three help yourself: how sure you are (BOOST, INSURANCE) and when to get out (LOCK). Three attack an opponent's pick: stop it (FREEZE), reverse it (FLIP) or move it onto another coin (SWAP). Skills never touch principal.

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
LOCK, FLIP, SWAP and FREEZE SHALL be usable only in Live, before the Live deadline. Each call carries a price update. The contract applies it and reads the current price, which MUST be no older than 5 seconds and no earlier than the round's Live start. A pick can carry at most one live effect, and a call on a pick that already has one reverts. LOCK targets the caller's own pick. FREEZE, FLIP and SWAP are attacks: they target an opponent's pick, never the caller's own, and each player can be hit by at most one attack per round.

#### Scenario: Lock blocks attacks
- **WHEN** a player has locked their BTC pick and an opponent tries to FLIP it
- **THEN** the call reverts

#### Scenario: Second attack on a player
- **WHEN** a player was frozen this round and another opponent tries to SWAP one of their picks
- **THEN** the call reverts

#### Scenario: Attack own pick
- **WHEN** a player tries to FLIP their own pick
- **THEN** the call reverts

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
FLIP SHALL reverse the direction of one opponent's pick from now on: Buy becomes Sell and Sell becomes Buy. The pick's return is the return from start to the flip price in the old direction, plus the return from the flip price to end in the new direction. Each segment is computed in bps and truncated separately. PickFlipped is emitted with the attacker and the target.

#### Scenario: Flip a rising pick
- **WHEN** a player flips an opponent's BTC Buy at +30 bps and BTC then rises a further 20 bps
- **THEN** the opponent's pick returns +30 − 20 = +10 bps

#### Scenario: Flip backfires
- **WHEN** a player flips an opponent's BTC Buy at +30 bps and BTC then falls 20 bps
- **THEN** the opponent's pick returns +30 + 20 = +50 bps

### Requirement: SWAP
SWAP SHALL move one opponent's pick onto another table coin that the opponent did not pick this round. The attacker chooses the coin; the pick keeps the opponent's direction. The return is the old coin's return from start to now, plus the new coin's return from now to end in that direction. PickSwapped is emitted with the attacker, the target and the new coin.

#### Scenario: Swap onto a falling coin
- **WHEN** a player swaps an opponent's ETH Buy (+25 bps so far) onto DOGE and DOGE then falls 40 bps
- **THEN** the opponent's pick returns +25 − 40 = −15 bps

#### Scenario: Swap onto a coin the target holds
- **WHEN** a player swaps an opponent's pick onto a coin that opponent already picked this round
- **THEN** the call reverts

### Requirement: FREEZE
FREEZE SHALL fix one opponent's pick at the current price, like a LOCK applied by the attacker. PickFrozen is emitted.

#### Scenario: Freeze a winner
- **WHEN** a player freezes an opponent's SOL Buy at +20 bps and SOL ends at +90 bps
- **THEN** that opponent's pick returns +20 bps

### Requirement: Insurance softens attacks
The INSURANCE floor SHALL apply after any attack, so an insured pick never scores below 0 because of a FLIP or SWAP.

#### Scenario: Insured pick flipped
- **WHEN** an opponent flips an insured BTC Buy at +10 bps and BTC then rises 50 bps
- **THEN** the raw return is +10 − 50 = −40 bps and the pick scores 0

### Requirement: Demo randomness disclosure
With the PseudoRandomness source, skill deals, coin draws and live durations SHALL be treated as predictable. This MUST be recorded as a known limitation in DECISIONS.md until a VRF source replaces it.

#### Scenario: Limitation documented
- **WHEN** a reviewer reads DECISIONS.md
- **THEN** it states that random outcomes are predictable with PseudoRandomness and names Pyth Entropy as the fix
