# Spec Delta

## Purpose

Defines the skill cards players hold at a table (GIFT_COIN, LOCK, SHIELD) and how using them changes picks during the Live phase. This adds interaction between players without touching principal.

## ADDED Requirements

### Requirement: Per-table skill hand
Each player's skill hand SHALL be scoped to a single table, keyed by tableId and player. A hand holds at most 3 skills. Skills from one table MUST NOT be usable at another.

#### Scenario: Initial deal
- **WHEN** a table is created
- **THEN** each of the 4 players holds exactly 1 randomly chosen skill for that table

#### Scenario: Hand isolation
- **WHEN** a player seated at two tables uses a skill at table A
- **THEN** their hand at table B is unchanged

### Requirement: Catch-up skill
On round settlement, the last-ranked player SHALL receive one extra random skill if their hand holds fewer than 3.

#### Scenario: Last place with room
- **WHEN** the last-ranked player holds 1 skill at settlement
- **THEN** they hold 2 skills afterwards

#### Scenario: Full hand
- **WHEN** the last-ranked player already holds 3 skills
- **THEN** no skill is added

### Requirement: Skill use limits
A player SHALL be able to use a skill only during Live, only one they hold at that table, and at most once per round. The skill is removed from the hand on use and SkillUsed is emitted.

#### Scenario: Skill outside Live
- **WHEN** a player uses a skill during Commit
- **THEN** the call reverts

#### Scenario: Second skill in a round
- **WHEN** a player who already used a skill this round uses another
- **THEN** the call reverts

### Requirement: GIFT_COIN
GIFT_COIN SHALL add one extra pick to a target opponent. The pick uses a random table coin and a random direction, is flagged gifted, and uses multiplier ×1. Each player receives at most one gift per round. CoinGifted is emitted.

#### Scenario: Gift delivered
- **WHEN** a player gifts a coin to an opponent who has no gift this round
- **THEN** the opponent has 4 picks, the 4th flagged gifted, and CoinGifted is emitted

#### Scenario: Second gift to same target
- **WHEN** another player gifts the same target in the same round
- **THEN** the call reverts

### Requirement: LOCK
LOCK SHALL freeze one of the caller's own picks at the current oracle price, using a price update supplied with the call. That pick's settlement return uses the locked price instead of the end price. PickLocked is emitted.

#### Scenario: Locked pick at settle
- **WHEN** a player locks BTC at +1.0% and BTC ends the round at −2.0%
- **THEN** that pick scores from the +1.0% locked return

#### Scenario: Lock another player's pick
- **WHEN** a player tries to lock a pick they do not own
- **THEN** the call reverts

### Requirement: SHIELD
SHIELD SHALL protect its holder for the rest of the round. The next skill another player targets at them that round is cancelled, the attacker's skill is still consumed, and SkillBlocked is emitted.

#### Scenario: Gift blocked
- **WHEN** a shielded player is targeted by GIFT_COIN
- **THEN** no pick is added, SkillBlocked is emitted, and the shield is spent

### Requirement: Demo randomness disclosure
With the PseudoRandomness source, gift coin and direction outcomes SHALL be treated as predictable. This MUST be recorded as a known limitation in DECISIONS.md until a VRF source replaces it.

#### Scenario: Limitation documented
- **WHEN** a reviewer reads DECISIONS.md
- **THEN** it states that GIFT_COIN outcomes are predictable with PseudoRandomness and names Pyth Entropy as the fix
