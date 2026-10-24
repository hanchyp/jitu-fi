# Spec Delta

## Purpose

House bots fill the 3 empty seats at every MVP table, so one player (a judge) can play a full game at any time. A scripted "human" player also drives the end-to-end test from an empty chain to a successful claim.

## ADDED Requirements

### Requirement: House bots
The backend SHALL run a pool of house-bot addresses registered in GameManager. Bots hold no deposit and never earn season points. They sign their actions with EIP-712 and go through the relayer, so only the relayer key needs MON.

#### Scenario: Bot seats filled
- **WHEN** the matchmaker creates a table for one player
- **THEN** 3 free bots from the pool are seated and marked busy until the table finishes

### Requirement: Bot play behavior
A bot SHALL commit every round with a random number of picks between 1 and the cap and random directions. It sometimes chooses BOOST or INSURANCE when held. It reveals in time and sometimes uses a held live skill (LOCK, FLIP, SWAP or FREEZE on the human) during Live. Bot choices use the shared scoring library and never read other players' commits.

#### Scenario: Bot respects the cap
- **WHEN** a bot commits in a round whose cap is 2
- **THEN** it picks 1 or 2 distinct table coins

#### Scenario: Bot uses FREEZE
- **WHEN** a bot holds FREEZE in Live and the human's best pick is in profit
- **THEN** the bot may freeze that pick through the relayer

### Requirement: Local and testnet modes
The bot runner SHALL support --local and --testnet. --local uses anvil and the mock oracle, moving prices by random walk. --testnet uses Monad testnet with real price feeds.

#### Scenario: Local price movement
- **WHEN** the runner runs with --local during Live
- **THEN** mock oracle prices change between start and settle

### Requirement: End-to-end test
A single command `pnpm e2e:local` SHALL:
1. start anvil
2. deploy the contracts, including the demo bonus funding
3. start the backend with its house bots
4. run a scripted player through faucet, deposit, K games against bots, finalize and claim

It succeeds only if the player receives at least their principal and the bots received no season points.

#### Scenario: Green e2e run
- **WHEN** `pnpm e2e:local` runs on a clean checkout
- **THEN** it exits 0 after the scripted player has claimed
