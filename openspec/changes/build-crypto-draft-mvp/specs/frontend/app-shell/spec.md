# Spec Delta

## Purpose

Provides the parts every screen shares: the landing page, wallet connection locked to Monad testnet, English UI text, a permanent testnet/simulation banner, and a mobile-first layout.

## ADDED Requirements

### Requirement: Landing page
The home route SHALL show:
- the pitch line
- a three-step explainer (Deposit → Play → Claim)
- the current season status with a countdown
- a call to action that goes to deposit or lobby, depending on whether the user has a position

#### Scenario: Visitor without position
- **WHEN** a connected wallet with no position opens /
- **THEN** the call to action leads to /deposit

### Requirement: Testnet-only wallet connection
The app SHALL connect wallets only on chain 10143 (or 31337 locally). If the wallet is on any other chain, the app prompts a switch and blocks actions until it is on a supported chain.

#### Scenario: Wrong network
- **WHEN** a wallet connected to chain 143 opens the app
- **THEN** a switch-network prompt is shown and deposit and game actions are disabled

### Requirement: English UI
All user-facing text SHALL be in English. Numbers and amounts are formatted with the en-US locale.

#### Scenario: Amount formatting
- **WHEN** an amount of 1234.5 mUSD is displayed
- **THEN** it renders as "1,234.5 mUSD"

### Requirement: Testnet and simulation banner
Every screen SHALL show a permanent "Testnet · simulation" banner. In DEMO_MODE, yield figures are labelled as simulated.

#### Scenario: Banner on game screen
- **WHEN** any route is open, including the game table
- **THEN** the banner is visible

### Requirement: Mobile-first layout
Every screen SHALL be fully usable at 375 px width, with no horizontal page scroll.

#### Scenario: Phone width
- **WHEN** the game table is viewed at 375 × 812
- **THEN** all coin cards, controls and timers are reachable without horizontal scrolling
