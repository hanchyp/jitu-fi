# Proposal

## Why

Crypto speculation puts users' money at risk. **jitu.fi** makes it a gamified deposit instead. Its game mode is called Crypto Draft: principal is locked and always returned, and skill at a short trading game only changes how the yield is split. This is a hackathon MVP on Monad testnet. It uses Monad's ~300 ms blocks and cheap transactions so each table can run dozens of on-chain moves per minute. The repo is empty today, so this change plans the whole MVP: smart contracts, backend, frontend, shared code, and demo bots.

Source of truth is `CRYPTO_DRAFT_BUILD_SPEC.md`. Where it conflicts with the project context file (`CLAUDE.md`), the project context wins. In particular, these fixes are part of this change, along with the game and tokenomics redesign agreed on 2026-10-23 (recorded in `DECISIONS.md`):
- Late-points cutoff.
- Per-table skill hands.
- Shortfall handling.
- The known predictability limitation of `PseudoRandomness`.

## What Changes

**Smart contracts (`contracts/`, Foundry, Solidity ^0.8.24, OZ v5):**
- `MockUSD`: 6-decimal ERC20 with permit and an hourly faucet.
- `IYieldStrategy` and `MockYieldStrategy`: simulated APR, with a demo-mode high APR.
- `SeasonVault`: season lifecycle Enrollment → Active → Finalized, with one season per lock tenor (1 week, 1 month) and one active position per address. Deposits with a weight cap, a sponsor `fundBonus` for the bonus pot, a fee / base-yield / bonus-pot split, and an unpausable claim at maturity. Shortfall repays principal pro-rata.
- `GameManager`: 4-seat tables (MVP: 1 human + 3 house bots) with presets of 3, 5, 7 or 10 rounds and growing per-round pick caps. Each round is commit (20 s) → reveal (10 s) → live (random 60–120 s) → settle. Scoring is cap × weighted average return in bps, with moves under 1 bps void. Season points are the first K games' scores; bots earn none. EIP-712 meta-tx for commit and skills, a permissionless reveal, and per-table skill hands with six skills: BOOST, INSURANCE, LOCK, FLIP, SWAP, FREEZE. It writes season points only, has no token access, and refuses points at or after season end.
- `CoinRegistry`, `IPriceOracle` (a Pyth adapter and a mock), `IRandomness` (`PseudoRandomness`, demo only).
- Deploy scripts for anvil and Monad testnet. They export addresses and ABIs.

**Shared (`packages/shared/`):** game constants, a TS scoring library identical to the Solidity scoring, shared test vectors, ABIs and deployments.

**Backend (`backend/`, Node 20, Fastify, viem):**
- Matchmaker. It seats each player with 3 house bots at once, and skips table creation when the season has too little time left. A multi-human queue is designed but disabled.
- Relayer for signed commits and skills and for reveals. It supplies live-skill prices itself.
- Keeper for round phases, season activate/finalize, and demo season renewal.
- Indexer, REST API, WebSocket rooms, and the Pyth Hermes price proxy.
- Every tx uses an explicit gas limit of estimate × 1.15.

**Frontend (`frontend/`, Next.js App Router):**
- Pages: home, deposit (with faucet and tenor choice), play (preset choice), game table, leaderboard, claim, profile.
- No wallet popups during play. All game actions are signed with EIP-712 and relayed. Deposit, faucet and claim are ordinary wallet transactions.
- English UI, mobile-first, and a permanent "Testnet · simulation" banner.

**Bots (`bots/`):** house bots that fill 3 seats at every table without deposits or season points, a runner for local and testnet, and `pnpm e2e:local` from zero to claim.

## Capabilities

### New Capabilities
- `contracts-test-assets`: the mUSD test stablecoin with faucet, and the pluggable yield strategy with its mock implementation.
- `contracts-season-vault`: season lifecycle, deposits and weights, yield split, shortfall handling, and claims that protect principal.
- `contracts-game-table`: presets, the table lifecycle, commit-reveal rounds with random live durations, return-based scoring, round winners, EIP-712 meta-transactions, and first-K season-point accounting with the end-of-season cutoff.
- `contracts-game-skills`: the skill hand per table and the BOOST, INSURANCE, LOCK, FLIP, SWAP and FREEZE effects.
- `contracts-market-data`: the coin registry, price oracle (Pyth and mock), and randomness source.
- `shared-scoring`: off-chain scoring and constants that must match the contracts exactly.
- `backend-matchmaking`: play requests, instant bot tables, the disabled multi-human queue, and the end-of-season guard.
- `backend-relayer`: off-chain validation and gas-limited submission of signed player actions.
- `backend-keeper`: automated round-phase transitions, season activate/finalize, and demo season renewal.
- `backend-data-api`: the indexer, REST endpoints, WebSocket rooms, and live price stream.
- `frontend-vault-ui`: faucet, deposit, position view, and claim screens.
- `frontend-game-ui`: the play screen, game table screen, leaderboard, and profile.
- `frontend-app-shell`: the landing page, wallet connection, English UI text, the testnet banner, and mobile layout.
- `bots-demo-bots`: house bots for every table and a scripted player for end-to-end runs.

### Modified Capabilities
<!-- None: greenfield project, no existing specs. -->

## Impact

- New pnpm monorepo: `contracts/`, `backend/`, `frontend/`, `packages/shared/`, `bots/`, plus `DECISIONS.md` and `README.md`.
- External dependencies:
  - Monad testnet RPC/WS (chain 10143).
  - Pyth price feeds and Hermes. Addresses and feed IDs come from the official docs; otherwise they are `TODO_FILL_ME` and mocks are used.
  - OpenZeppelin v5, viem ≥ 2.40, wagmi, RainbowKit, Drizzle (SQLite/Postgres).
- Operational: relayer, keeper and matchmaker keys need well over 10 MON on testnet. Players use their own testnet MON for deposit, faucet and claim. Private keys live only in `.env`. Never deploy to mainnet (143).
- Requires Node.js 20+, pnpm and Foundry ≥ 1.8.0 on the dev machine.
