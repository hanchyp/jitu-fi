# Spec Delta

## Purpose

Runs the on-chain Crypto Draft game: 4-player, 3-round tables with commit-reveal picks, oracle-priced scoring, and rank-based points. Each finished game's points go into the season score the vault uses for the bonus pot. The contract never touches tokens.

## ADDED Requirements

### Requirement: Table creation
Only the matchmaker role SHALL be able to create a table for a season with exactly 4 distinct players. Every player must pass vault.isEligible. The table starts in Waiting.

#### Scenario: Valid table
- **WHEN** the matchmaker creates a table with 4 eligible players
- **THEN** TableCreated is emitted and the table is Waiting

#### Scenario: Ineligible player
- **WHEN** one of the 4 players has no position in the season
- **THEN** the call reverts

#### Scenario: Unauthorized creator
- **WHEN** an address without the matchmaker role calls createTable
- **THEN** the call reverts

### Requirement: Round start
The keeper SHALL be able to start the next round on a table in Waiting or Settled. Starting picks 8 distinct coins at random from the active registry coins, sets phase Commit, and sets a 30-second deadline.

#### Scenario: Round started
- **WHEN** the keeper starts round 1
- **THEN** RoundStarted is emitted with 8 distinct coin ids and phase is Commit

### Requirement: Commit picks
During Commit and before the deadline, each player SHALL be able to submit commitHash = keccak256(abi.encode(tableId, round, player, coinIdx[3], dirs[3], salt)). Each player may commit once per round.

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
During Reveal (20 seconds), a player SHALL reveal coinIdx[3], dirs[3] and salt. The values must hash to their commit. The 3 coin indices must be unique and on the table.

#### Scenario: Valid reveal
- **WHEN** a player reveals values matching their commit
- **THEN** Revealed is emitted with the picks

#### Scenario: Hash mismatch
- **WHEN** a player reveals values that do not match the commit
- **THEN** the call reverts

#### Scenario: Duplicate coin
- **WHEN** a player reveals the same coin index twice
- **THEN** the call reverts

### Requirement: Live start and forfeit
After the reveal deadline, the keeper SHALL start Live with an oracle price update. Starting Live snapshots start prices for all 8 coins and sets a 120-second deadline. Players who did not both commit and reveal are marked forfeit for the round.

#### Scenario: Missing reveal
- **WHEN** a player committed but did not reveal and the keeper starts Live
- **THEN** that player is marked forfeit and LiveStarted is emitted with the start prices

### Requirement: Round scoring
On settle, each pick SHALL score retBps = (end − start) × 10000 / start. The sign is flipped for Sell, and a locked pick uses its locked price. pickScore = retBps × mult / 10000. mult is 10000 for gifted picks; otherwise 15000/12500/10000 when 1/2/3–4 revealed players picked the same coin and direction.

#### Scenario: Lone contrarian
- **WHEN** only one player picked ETH Sell and ETH falls 2%
- **THEN** that pick scores +300 bps (200 × 1.5)

#### Scenario: Crowded pick
- **WHEN** three players picked BTC Buy and BTC rises 1%
- **THEN** each of those picks scores +100 bps

### Requirement: Ranking and game points
Players SHALL be ranked by roundScoreBps, highest first. Forfeit players always rank below non-forfeit players. Rank points are 4/3/2/1, and tied players share the average of the ranks they occupy. Each player's game points increase by rankPoints × 10/15/20 for rounds 1/2/3, using an integer ×10 scale.

#### Scenario: Two-way tie
- **WHEN** two players tie for first in round 1
- **THEN** each receives 3.5 rank points, recorded as 35 game points ×10

#### Scenario: Forfeit ranks last
- **WHEN** a forfeit player would otherwise have the highest score
- **THEN** they are ranked below every non-forfeit player

### Requirement: Settlement and game end
After the Live deadline, the keeper SHALL settle the round with an oracle update. Settling snapshots end prices, scores, ranks, awards points and emits RoundSettled. After round 3 the table becomes Finished and GameFinished is emitted.

#### Scenario: Final round settled
- **WHEN** the keeper settles round 3
- **THEN** the table is Finished and GameFinished is emitted with each player's game points

#### Scenario: Early settle
- **WHEN** the keeper settles before the Live deadline
- **THEN** the call reverts

### Requirement: Season points with end-of-season cutoff
When a game finishes, the contract SHALL add each player's game points to their season points. It also adds points × weight to seasonTotalWeighted. When block.timestamp ≥ season end or the season is Finalized, points MUST NOT be credited. The game still finishes, and PointsSkipped is emitted. This guarantees claims can never exceed the bonus pot.

#### Scenario: Game finishes in time
- **WHEN** a game finishes before season end
- **THEN** seasonPoints and seasonTotalWeighted increase accordingly

#### Scenario: Game finishes after season end
- **WHEN** the final settle happens at or after season end
- **THEN** the table becomes Finished, PointsSkipped is emitted, and seasonPoints and seasonTotalWeighted are unchanged

#### Scenario: Late points invariant
- **WHEN** an invariant test settles games at random times around season end and finalizes
- **THEN** the sum of all bonus claims never exceeds bonusPot

### Requirement: Meta-transactions
Commit, reveal and useSkill SHALL each have a BySig variant that accepts an EIP-712 signature from the player. The signature covers player, tableId, round, the action fields, nonce and deadline, under this chain id and contract. Anyone may submit it.

#### Scenario: Relayed commit
- **WHEN** a relayer submits a valid signed Commit
- **THEN** the commit is recorded for the signing player and their nonce increments

#### Scenario: Replay
- **WHEN** the same signed payload is submitted twice
- **THEN** the second submission reverts

#### Scenario: Expired signature
- **WHEN** a signed payload is submitted after its deadline
- **THEN** the call reverts

### Requirement: No token access
The game contract MUST NOT hold token approvals and MUST NOT call any token transfer function. Its only effect on the vault is the points it exposes through views.

#### Scenario: Static check
- **WHEN** the test suite inspects GameManager behavior
- **THEN** no code path calls transfer, transferFrom or approve on any token
