# Spec Delta

## Purpose

> **Scope change (2026-10-24):** the game engine runs in the backend. The rules below (presets, phases, scoring, winners, game score) still define the game, but the backend enforces them and only the final game score reaches the chain through `recordGame` (see contracts-game-results). Requirements about on-chain commit, reveal, live start, meta-transactions and roles apply to the backend engine and API instead. The season-points, cutoff and no-token-access requirements live in contracts-game-results.

Runs the on-chain Crypto Draft game. A table seats 4 players: for the MVP, 1 human and 3 house bots. The table plays a preset number of rounds. In each round players commit picks, reveal them, and watch a live window of random length, and every pick is scored by its real price return. Each human's finished-game score feeds the season points the vault uses for the bonus pot. The contract never touches tokens.

## ADDED Requirements

### Requirement: Game presets
The contract SHALL support four game presets. Each preset fixes the number of rounds and the maximum picks (cap) per round:

| Preset | Rounds | Caps per round | Σ caps |
|---|---|---|---|
| Quick | 3 | 1, 2, 3 | 6 |
| Standard | 5 | 1, 1, 2, 2, 3 | 9 |
| Long | 7 | 1, 1, 2, 2, 3, 3, 4 | 16 |
| Marathon | 10 | 1, 1, 2, 2, 3, 3, 4, 4, 5, 5 | 30 |

The cap tables MUST match the shared config.

#### Scenario: Cap lookup
- **WHEN** round 4 of a Long table starts
- **THEN** each player may pick at most 2 coins

### Requirement: Table creation
Only the matchmaker role SHALL be able to create a table with a preset and exactly 4 distinct seats. Each seat is either a registered house bot or a human for whom vault.isEligible is true. Each human seat records that player's season (vault.activeSeasonOf). A human already seated at an unfinished table MUST NOT be seated again. Each player is dealt 1 random skill, and TableCreated is emitted.

#### Scenario: One human and three bots
- **WHEN** the matchmaker creates a Quick table with 1 eligible human and 3 registered bots
- **THEN** TableCreated is emitted and the human's season is recorded for their seat

#### Scenario: Ineligible human
- **WHEN** a non-bot seat has no active position
- **THEN** the call reverts

#### Scenario: Already playing
- **WHEN** the matchmaker seats a human who is at an unfinished table
- **THEN** the call reverts

#### Scenario: Unauthorized creator
- **WHEN** an address without the matchmaker role calls createTable
- **THEN** the call reverts

### Requirement: Round start
Starting a round SHALL draw 8 distinct active registry coins and a live duration between 60 and 120 seconds (whole seconds) from the randomness source. It sets phase Commit with a 20-second deadline and emits RoundStarted with the coins, the cap and the live duration. The keeper starts round 1. Settling a round that is not the last starts the next round in the same transaction.

#### Scenario: Round 1 started
- **WHEN** the keeper starts round 1 of a new table
- **THEN** RoundStarted is emitted with 8 distinct coin ids, the round cap, and a live duration in [60, 120]

#### Scenario: Next round chained
- **WHEN** round 2 of a Standard table is settled
- **THEN** round 3 starts in the same transaction and RoundStarted is emitted

### Requirement: Commit picks
During Commit and before the deadline, each seated player SHALL be able to commit once per round with commitHash = keccak256(abi.encode(tableId, round, player, coinIdx[], dirs[], boostIdx, insureIdx, salt)). boostIdx and insureIdx are a pick index or 255 for none (see game-skills).

#### Scenario: Commit accepted
- **WHEN** a player commits before the deadline
- **THEN** Committed is emitted and the hash is stored for that table, round and player

#### Scenario: Non-player commit
- **WHEN** an address not seated at the table commits
- **THEN** the call reverts

#### Scenario: Late commit
- **WHEN** a player commits after the commit deadline
- **THEN** the call reverts

### Requirement: Reveal picks
Once the commit deadline passes, the round SHALL be in Reveal for 10 seconds. During Reveal, anyone SHALL be able to reveal a player's picks by submitting player, coinIdx[], dirs[], boostIdx, insureIdx and salt; the commit hash binds the player, so no signature is needed. The values must hash to the commit. The number of picks must be between 1 and the round cap, and the coin indices must be unique and on the table. A revealed boost or insurance consumes that skill from the player's hand and reverts if the player does not hold it.

#### Scenario: Valid reveal
- **WHEN** values matching a player's commit are revealed
- **THEN** Revealed is emitted with the picks

#### Scenario: Hash mismatch
- **WHEN** revealed values do not match the commit
- **THEN** the call reverts

#### Scenario: Too many picks
- **WHEN** a player reveals 3 picks in a round whose cap is 2
- **THEN** the call reverts

#### Scenario: Duplicate coin
- **WHEN** a player reveals the same coin index twice
- **THEN** the call reverts

### Requirement: Live start and forfeit
After the reveal deadline, the keeper SHALL start Live with an oracle price update. Starting Live snapshots start prices for all 8 coins and sets the deadline to now + the round's live duration. Players who did not both commit and reveal are marked forfeit for the round.

#### Scenario: Missing reveal
- **WHEN** a player committed but was not revealed and the keeper starts Live
- **THEN** that player is marked forfeit and LiveStarted is emitted with the start prices

### Requirement: Round scoring
On settle, each pick SHALL get a return in bps from its effective prices: retBps = (end − start) × 10000 / start, truncated toward zero. The sign is flipped for Sell. Skills may change the effective prices or segments (see game-skills). A pick whose retBps is 0, meaning the price moved less than 1 bps, is void and excluded. The round score is cap × Σ(wᵢ × retᵢ) / Σwᵢ over non-void picks, truncated toward zero, where wᵢ is 2 for a boosted pick and 1 otherwise. A round where every pick is void scores 0. A forfeit player scores 0.

#### Scenario: Single confident pick
- **WHEN** the round cap is 3 and a player's only pick, BTC Buy, returns +50 bps
- **THEN** the round score is 150

#### Scenario: Mixed picks
- **WHEN** the round cap is 3 and a player's picks return +50, +20 and −30 bps
- **THEN** the round score is 3 × 40 / 3 = 40

#### Scenario: Void pick excluded
- **WHEN** a player picks ETH (+60 bps) and DOGE (moves less than 1 bps) with cap 2
- **THEN** DOGE is void and the round score is 2 × 60 = 120

### Requirement: Round winner
After scoring, the non-forfeit player(s) with the highest round score SHALL be the round winners. Ties make every tied player a winner. Each winner holding fewer than 3 skills receives one random skill. RoundSettled is emitted with every player's round score and the winners.

#### Scenario: Tied winners
- **WHEN** two players tie for the highest round score
- **THEN** both are winners and each receives a skill if their hand has room

### Requirement: Game score
The game score SHALL be Σ round scores / Σ caps of the preset, truncated toward zero. It is a weighted average return in bps, so games of different lengths are comparable. After the final round the table becomes Finished, and GameFinished is emitted with each player's game score.

#### Scenario: Final round settled
- **WHEN** the keeper settles the last round of a Quick table
- **THEN** the table is Finished and GameFinished is emitted with game scores = Σ round scores / 6

#### Scenario: Early settle
- **WHEN** the keeper settles before the Live deadline
- **THEN** the call reverts

### Requirement: Season points from the first K games
When a game finishes, each human seat SHALL add max(0, gameScore) to their season points, but only for that player's first K finished games in the season (K = 5, or 2 in DEMO_MODE). Each credit also adds points × weight to seasonTotalWeighted. Bot seats never earn season points.

#### Scenario: Sixth game
- **WHEN** a player finishes their 6th game in a season with K = 5
- **THEN** their season points are unchanged

#### Scenario: Negative game
- **WHEN** a player finishes a counted game with score −40
- **THEN** 0 points are credited and the game still counts toward K

#### Scenario: Bot seat
- **WHEN** a game with 3 bots finishes
- **THEN** no bot address gains season points

### Requirement: End-of-season cutoff
When block.timestamp ≥ season end or the season is Finalized, points MUST NOT be credited. The game still finishes, and PointsSkipped is emitted. This guarantees claims can never exceed the bonus pot.

#### Scenario: Game finishes after season end
- **WHEN** the final settle happens at or after the human's season end
- **THEN** the table becomes Finished, PointsSkipped is emitted, and seasonPoints and seasonTotalWeighted are unchanged

#### Scenario: Late points invariant
- **WHEN** an invariant test settles games at random times around season end and finalizes
- **THEN** the sum of all bonus claims never exceeds bonusPot

### Requirement: Meta-transactions
Commit and useSkill SHALL each have a BySig variant that accepts an EIP-712 signature from the player, covering player, tableId, round, the action fields and a deadline, under this chain id and contract. Replay is prevented by contract state: a player commits once per round and uses at most one skill per round. Anyone may submit.

#### Scenario: Relayed commit
- **WHEN** a relayer submits a valid signed Commit
- **THEN** the commit is recorded for the signing player

#### Scenario: Replay
- **WHEN** the same signed payload is submitted twice
- **THEN** the second submission reverts

#### Scenario: Expired signature
- **WHEN** a signed payload is submitted after its deadline
- **THEN** the call reverts

### Requirement: No token access
The game contract MUST NOT hold token approvals and MUST NOT call any token transfer function. Its only effect on the vault is the points it exposes through views. It may receive native MON only to pay oracle update fees.

#### Scenario: Static check
- **WHEN** the test suite inspects GameManager behavior
- **THEN** no code path calls transfer, transferFrom or approve on any token
