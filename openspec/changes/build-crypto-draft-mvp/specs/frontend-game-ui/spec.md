# Spec Delta

## Purpose

The player-facing game: choosing a preset, playing its rounds of picks against 3 bots with skills and live scoring and no wallet popups, then seeing the season leaderboard and personal history.

## ADDED Requirements

### Requirement: Play screen
The play screen SHALL let an eligible player choose a preset (Quick 3, Standard 5, Long 7 or Marathon 10 rounds), showing each preset's rounds, pick caps and approximate length. Pressing Play requests a table and opens /table/<id> once it is created. It also shows how many of the season's K counted games the player has used.

#### Scenario: Start a Quick game
- **WHEN** the player selects Quick and presses Play
- **THEN** the app navigates to /table/<id> for the new table

#### Scenario: Season closing
- **WHEN** the matchmaker refuses because the season is closing
- **THEN** the screen explains that no new games fit before maturity

### Requirement: Table header and coin board
The table screen SHALL show the round (n/total), the phase, a countdown in seconds to the phase deadline, this round's pick cap, and this round's live duration as soon as the round starts. It also shows 8 coin cards with symbol, live price and a mini sparkline.

#### Scenario: Round start
- **WHEN** round 3 of a Standard table starts with a live duration of 87 s
- **THEN** the header shows "Round 3/5", the Commit phase with a 20-second countdown, "Pick up to 2", and "Live 87s"

### Requirement: Commit without wallet popup
In Commit, the player SHALL choose 1 to cap distinct coins and toggle Buy or Sell for each, optionally apply a held BOOST or INSURANCE to one pick, then lock the choice. Locking creates a random salt and saves picks, skill choice and salt in local storage under table:round:address. The player signs a Commit message and the app sends it to the relayer, with no wallet transaction. Picking fewer coins than the cap is shown as a confidence play.

#### Scenario: Lock picks
- **WHEN** the player selects 1 coin with a direction and presses "Lock picks"
- **THEN** a typed-data signature is requested, the payload is relayed, and the UI shows the commit as pending until indexed

#### Scenario: Over the cap
- **WHEN** the cap is 2 and the player tries to select a third coin
- **THEN** the selection is refused

### Requirement: Automatic reveal
When Reveal starts, the app SHALL send the stored picks and salt to the relayer without user interaction. Once picks are indexed, it shows every player's picks and any BOOST or INSURANCE.

#### Scenario: Auto-reveal
- **WHEN** the phase changes to Reveal and stored picks exist
- **THEN** the reveal is relayed without user input

#### Scenario: Lost local storage
- **WHEN** stored picks are missing at Reveal
- **THEN** the player sees a notice that they will forfeit this round

### Requirement: Live scoring and skills
In Live, the screen SHALL show 4 player panels with scores computed by the shared scoring library from streamed prices, void picks marked, and a price chart. The skill hand offers held live skills (LOCK, FLIP, SWAP, FREEZE) with the right picker: own pick, own pick plus new coin and direction, or opponent pick. Each skill has its own visual effect, and skills are disabled once the live deadline passes.

#### Scenario: Live score update
- **WHEN** a price tick arrives
- **THEN** every panel's score updates using the shared scoring rules

#### Scenario: Frozen by a bot
- **WHEN** a PickFrozen event targets the player
- **THEN** the freeze animation plays on that pick and its return stops updating

### Requirement: Round and game results
After each round, the screen SHALL show every player's round score and the round winner(s), and a toast when the player earns a skill. After the last round it shows the final game scores, the season points credited (or that the game was outside the first K, or after the season cutoff), and a play-again action.

#### Scenario: Game over
- **WHEN** GameFinished is received
- **THEN** a podium with game scores, the credited season points and a "Play again" button is shown

### Requirement: Leaderboard and profile
The leaderboard screen SHALL rank human players in a season by points, with counted games n/K, weight and estimated bonus. The profile screen SHALL list the user's past games with per-round scores and skills used.

#### Scenario: Own rank highlighted
- **WHEN** a ranked user opens /leaderboard
- **THEN** their row is highlighted
