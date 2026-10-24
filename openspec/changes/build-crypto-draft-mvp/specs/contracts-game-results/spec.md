# Spec Delta

## Purpose

Records one result per finished Crypto Draft game on-chain and turns it into the season points the vault uses for the bonus pot. Added on 2026-10-24: the game engine runs in the backend (see contracts-game-table and contracts-game-skills for the rules), and this contract keeps the money rules on-chain. It never touches tokens.

## ADDED Requirements

### Requirement: Record a finished game
Only the result poster role SHALL be able to call recordGame(gameId, player, gameScore, logHash). gameScore is the game score in bps as defined in contracts-game-table. logHash is the keccak256 of the full game log, which the backend serves for audit. The player's season is vault.activeSeasonOf(player), and vault.isEligible must be true for it. GameRecorded is emitted with the game id, player, season, game score, credited points and log hash.

#### Scenario: Result recorded
- **WHEN** the keeper records a finished game for an eligible player
- **THEN** GameRecorded is emitted and the player's counted games for that season increase by 1

#### Scenario: Unauthorized poster
- **WHEN** an address without the result poster role calls recordGame
- **THEN** the call reverts

#### Scenario: Ineligible player
- **WHEN** the keeper records a game for an address with no Active position
- **THEN** the call reverts

### Requirement: Each game recorded once
A game id SHALL be recorded at most once.

#### Scenario: Duplicate game id
- **WHEN** the keeper records the same game id twice
- **THEN** the second call reverts

### Requirement: Score bound
A game score above MAX_GAME_SCORE (10,000 bps) SHALL revert. This limits the damage a leaked result poster key can do to the bonus pot.

#### Scenario: Absurd score
- **WHEN** the keeper records a game score of 50,000 bps
- **THEN** the call reverts

### Requirement: Season points from the first K games
A recorded game SHALL add max(0, gameScore) to the player's season points, but only for the player's first K recorded games in the season (K is set at deploy: 5, or 2 in DEMO_MODE). Each credit adds points × vault.weightOf(season, player) to seasonTotalWeighted. Later games are recorded with 0 credited points. Bots are never recorded.

#### Scenario: Negative game
- **WHEN** a counted game is recorded with score −40
- **THEN** 0 points are credited and the game still counts toward K

#### Scenario: Game after K
- **WHEN** a player's 3rd game is recorded with K = 2
- **THEN** their season points are unchanged

### Requirement: End-of-season cutoff
When block.timestamp ≥ season end or the season is Finalized, recordGame MUST NOT credit points. It emits PointsSkipped instead of reverting, so the keeper never gets stuck. This guarantees claims can never exceed the bonus pot.

#### Scenario: Late record
- **WHEN** the keeper records a game at or after the player's season end
- **THEN** PointsSkipped is emitted and seasonPoints and seasonTotalWeighted are unchanged

#### Scenario: Late points invariant
- **WHEN** an invariant test records games at random times around season end and finalizes
- **THEN** the sum of all bonus claims never exceeds bonusPot

### Requirement: No token access
The contract MUST NOT hold token approvals or call any token transfer function. Its only effect on the vault is the points it exposes through seasonPoints and seasonTotalWeighted.

#### Scenario: Static check
- **WHEN** the test suite inspects GameManager behavior
- **THEN** no code path calls transfer, transferFrom or approve on any token
