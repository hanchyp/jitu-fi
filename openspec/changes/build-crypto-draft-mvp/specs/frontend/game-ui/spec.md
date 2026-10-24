# Spec Delta

## Purpose

The player-facing game: finding a table, playing three rounds of picks, reveals and skills with live scoring and no wallet popups, then seeing the season leaderboard and personal history.

## ADDED Requirements

### Requirement: Lobby
The lobby screen SHALL let an eligible player search for a table. It shows queue status and queued players, and opens the table screen automatically when a table is formed.

#### Scenario: Auto-enter table
- **WHEN** the matchmaker forms a table that includes the player
- **THEN** the app navigates to /table/<id>

### Requirement: Table header and coin board
The table screen SHALL show the round (n/3), phase, a countdown to the phase deadline, and the round multiplier. It also shows 8 coin cards with symbol, live price and a mini sparkline.

#### Scenario: Phase countdown
- **WHEN** the table enters Commit
- **THEN** the header shows "Ronde 1/3", the Commit phase, and a 30-second countdown

### Requirement: Commit without wallet popup
In Commit, the player SHALL choose 3 distinct coins and toggle Buy or Sell for each, then lock the choice. Locking creates a random salt and saves picks and salt in local storage under table:round:address. The player signs a Commit message and the app sends it to the relayer, with no wallet transaction.

#### Scenario: Lock picks
- **WHEN** the player selects 3 coins with directions and presses "Kunci pilihan"
- **THEN** a typed-data signature is requested, the payload is relayed, and the UI shows the commit as pending until indexed

#### Scenario: Fewer than 3 coins
- **WHEN** the player has selected 2 coins
- **THEN** the lock button is disabled

### Requirement: Automatic reveal
When Reveal starts, the app SHALL reveal from stored picks and salt without user interaction. Once picks are indexed, it shows every player's picks with contrarian badges ×1,5, ×1,25 or ×1.

#### Scenario: Auto-reveal
- **WHEN** the phase changes to Reveal and stored picks exist
- **THEN** a signed Reveal is relayed without user input

#### Scenario: Lost local storage
- **WHEN** stored picks are missing at Reveal
- **THEN** the player sees a notice that they will forfeit this round

### Requirement: Live scoring and skills
In Live, the screen SHALL show 4 player panels with scores computed by the shared scoring library from streamed prices, plus a price chart. The skill hand offers usable skills with a target picker. GIFT_COIN, LOCK and SHIELD each have their own visual effect.

#### Scenario: Live score update
- **WHEN** a price tick arrives
- **THEN** every panel's score updates using the shared scoring rules

#### Scenario: Shield blocks
- **WHEN** a SkillBlocked event arrives
- **THEN** the shield-block animation plays on the protected player's panel

### Requirement: Round and game results
After each round, the screen SHALL show the ranking and points. The last-ranked player gets an extra-skill toast. After round 3 it shows a podium, the season points earned, and a play-again action.

#### Scenario: Game over
- **WHEN** GameFinished is received
- **THEN** a podium with final points and a "Main lagi" button is shown

### Requirement: Leaderboard and profile
The leaderboard screen SHALL rank season players by points, with weight and estimated bonus. The profile screen SHALL list the user's past games with per-round scores.

#### Scenario: Own rank highlighted
- **WHEN** a ranked user opens /leaderboard
- **THEN** their row is highlighted
