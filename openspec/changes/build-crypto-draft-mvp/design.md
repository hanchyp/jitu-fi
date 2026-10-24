# Design

## Context

The repo is empty apart from the OpenSpec setup and an early landing page. See proposal.md (Why) for motivation. Requirements live in `specs/`. The detailed build reference is `CRYPTO_DRAFT_BUILD_SPEC.md`. Its corrections come from the project context file (`CLAUDE.md`), and its game and tokenomics rules were redesigned on 2026-10-23; that redesign wins over the spec and is logged in `DECISIONS.md`.

Monad testnet facts that shape the design:
- Chain 10143, ~300 ms blocks.
- `block.timestamp` has 1-second granularity.
- Monad bills the gas **limit**, not gas used.
- No `newPendingTransactions`.
- Contract size limit is 128 KB.
- EOAs keep a 10 MON reserve.

## Goals / Non-Goals

**Goals:**
- Principal safety holds structurally, by contract separation, not just by careful game code.
- A Quick game (3 rounds) takes at most ~8 minutes: 3 × (20 + 10 + up to 120 s + settle). Demo seasons last 15 minutes ("1 week") and 30 minutes ("1 month").
- A single judge can play a full game at any time against 3 house bots.
- No wallet popups during play. Deposit, faucet and claim are normal wallet transactions; users hold testnet MON.
- The full loop runs locally on anvil without any third-party address.

**Non-Goals:**
- Mainnet deployment, real lending protocols, real funds.
- Secure randomness (Pyth Entropy is stretch).
- Multi-human tables (designed, behind a disabled flag), auto-rollover of user positions, session signers or embedded wallets.
- Gasless faucet or claim.
- Production-grade auth beyond simple SIWE.

## Decisions

### D0. Off-chain game engine, one result per game (2026-10-24)
This overrides D5, D7–D11 and D13 wherever they place game logic on-chain. The backend runs tables, commit → reveal → live → settle, Pyth Hermes prices, randomness, skills and scoring with the `packages/shared` library. When a game finishes, the keeper calls `GameManager.recordGame(gameId, player, gameScore, logHash)` once for the human seat. On-chain, `GameManager` keeps only the money rules: first-K points, max(0, score), `MAX_GAME_SCORE`, the season cutoff (D3) and `seasonTotalWeighted` (D4). No oracle, registry, randomness or EIP-712 contracts are deployed. Deploy order becomes MockUSD → MockYieldStrategy → SeasonVault → GameManager. The trade-off (a trusted backend scores games) is logged in DECISIONS.md.

### D1. Monorepo layout and tooling
pnpm workspaces with `contracts/` (Foundry ≥ 1.8.0, Solidity ^0.8.24, OZ v5), `packages/shared/`, `backend/`, `frontend/` and `bots/`. `packages/shared` is built first. Every other TS package depends on it for constants, scoring, ABIs and deployments.
*Alternative:* separate repos. Rejected because the ABI and scoring drift would be constant.

### D2. Contract separation for principal safety
`SeasonVault` is the only contract holding tokens. `GameManager` writes points; the vault only reads them through `seasonPoints` and `seasonTotalWeighted`. Neither contract can move tokens on behalf of the other.
*Alternative:* a single contract. Rejected because a game bug could reach principal.

### D3. Season-points cutoff (correction 1)
`GameManager` reads the player's season end from the vault and checks `block.timestamp < end` and vault status ≠ Finalized before crediting points. Finalize uses the same boundary (`>= end`). If the check fails, the table still finishes and emits `PointsSkipped`, so settle never reverts and keepers never get stuck. The matchmaker also refuses tables when `end − now < presetMaxDuration + 60 s`. Both layers are needed: the contract check is the guarantee, and the matchmaker check stops players losing a game's points.

### D4. Weighted total computed incrementally
`seasonTotalWeighted += pointsDelta × vault.weightOf(season, player)`. Weight is fixed once the season is Active, because deposits close at start. With D3, the finalize snapshot equals the claim-time sum exactly.

### D5. Skill hands scoped per table (correction 2)
`mapping(uint256 tableId => mapping(address => uint8[])) skillHand`. Per-round skill-use flags, freeze-target flags and per-pick effects are keyed by `(tableId, round, player)`.

### D6. Shortfall (correction 3)
At finalize, if `total < totalPrincipal`, the vault records `returned = total`, sets fee and baseYield to 0, sets bonusPot to the sponsor funds only, and emits `Shortfall`. Claim pays `principal × returned / totalPrincipal` plus any bonus share. Rounding dust stays in the vault.

### D7. Presets, rounds and timing
Presets are Quick, Standard, Long and Marathon (3, 5, 7, 10 rounds). Per-round pick caps grow through the game: 1·2·3, 1·1·2·2·3, 1·1·2·2·3·3·4 and 1·1·2·2·3·3·4·4·5·5. Rounds run commit 20 s → reveal 10 s → live → settle. The live duration is drawn at `startRound` from [60, 120] whole seconds and emitted in `RoundStarted`, so players see it before picking. `settleRound` starts the next round in the same transaction, so the keeper sends two transactions per round.

### D8. Scoring math
Everything uses int256 or bigint with Solidity truncation toward zero.
- Pick return: `retBps = (end − start) × 10000 / start`, sign flipped for Sell. Start and end prices for one coin share the same expo, so no normalization is needed. Skills change the price segments (D10).
- Void: a pick whose return before the INSURANCE floor is 0 (moved under 1 bps) is excluded.
- Round score: `cap × Σ(wᵢ × retᵢ) / Σwᵢ` over non-void picks, with w = 2 for BOOST. All void or forfeit → 0. Picking fewer coins than the cap concentrates the score on the player's most confident calls.
- Round winners: the highest non-forfeit round score; every tied player is a winner.
- Game score: `Σ round scores / Σ caps`, so presets are comparable.
- Season points: `max(0, gameScore)` for each of the player's first K finished games in the season (K = 5, demo 2). Later games are practice. Counting the first K, rather than the best K, stops grinding and luck-farming.

Test vectors in `packages/shared/test-vectors/scoring.json` are read by Foundry (via `vm.readFile` + `vm.parseJson`) and by vitest.

### D9. Meta-transactions
`GameManager` inherits OZ `EIP712`. `Commit` and `UseSkill` carry a deadline. Replay is prevented by contract state (one commit per round, one skill per round), so there is no sequential nonce that a failed transaction could block. Reveal needs no signature: the commit hash binds the player, so anyone may reveal with the preimage. Deposits use the ERC20Permit flow (`depositWithPermit`), submitted by the user.

### D10. Skills
Six skills, at most one used per player per round, hand max 3:
- **BOOST** and **INSURANCE** are commit-time. Their pick index is inside the commit hash, they apply at reveal, and at most one of them is set per commit.
- **LOCK** (own pick, end price = now) is the live self skill. **FREEZE** (end price = now), **FLIP** (segment start→now in the old direction plus now→end in the reversed one) and **SWAP** (old coin start→now plus an attacker-chosen coin now→end, same direction) are attacks on an opponent's pick. Each player takes at most one attack per round, and a locked pick can't be attacked. Changed on 2026-10-24, see DECISIONS.md.
- Live skills are allowed only before the live deadline, with a price no older than 5 s and no earlier than live start. The backend supplies that price, not the client. A pick carries at most one live effect. The INSURANCE floor applies last.
- Hands: 1 random skill at table creation, plus 1 per round won, if there is room.

### D11. Oracle and randomness behind interfaces
`IPriceOracle` has two implementations: `PythPriceOracle` (`updatePriceFeeds` + `getPriceNoOlderThan`) and `MockPriceOracle`. `IRandomness` uses `PseudoRandomness` (demo only) for coin draws, live durations and skill deals. The deploy script selects the mock whenever `PYTH_CONTRACT_ADDRESS=TODO_FILL_ME`. Pyth feed IDs and addresses must come from official Pyth and Monad docs and are never guessed.

### D12. Tenors, sponsor pot and maturity
A lock tenor is a season, and several seasons (one per tenor) can be open at once. An address may hold only one position in an Enrollment or Active season (`activeSeasonOf`), so a player's points always belong to one season. `fundBonus(seasonId, amount)` lets a sponsor (the deploy script and keeper in demo) seed the bonus pot. Sponsor funds bypass the fee and survive a shortfall. Principal, base yield and bonus are all paid at maturity; the UI shows a live estimate from `previewClaim`.

### D13. House bots
For the MVP every table is 1 human + 3 house bots. Bots are backend-held addresses registered in `GameManager`. They need no deposit, skip the eligibility check, and never earn season points, so they cannot dilute the bonus pot. They sign EIP-712 like players and go through the relayer, so only the relayer key needs MON.

### D14. Backend shape
One Node process with modules `api`, `matchmaker`, `relayer`, `keeper`, `prices`, `indexer` and `bots`. It uses Fastify, `ws`, viem ≥ 2.40, Drizzle (SQLite locally, Postgres when deployed), Zod and pino.
- A shared `sendTx` helper owns nonce sequencing and `gas = ceil(estimate × 115 / 100)`.
- The relayer, keeper and matchmaker each use their own key, so their nonce queues never collide.
- The keeper is a per-table state machine driven by on-chain state plus deadline timers. Restart-safety comes from re-deriving all state from chain reads. In DEMO_MODE it also creates and funds the next season of each tenor.
- The indexer keeps `processed_blocks` and a unique key on (txHash, logIndex) for exactly-once storage.

### D15. Frontend shape
Next.js App Router with Tailwind, wagmi + viem, RainbowKit, TanStack Query, Zustand, `motion` and lightweight-charts.
- A typed WS client subscribes to `table:<id>` and `prices`.
- Live scores reuse `packages/shared` scoring, so UI and chain agree.
- Commit salts are persisted in `localStorage` before signing, so a reload during Reveal still auto-reveals.
- UI text is English, kept in plain constants next to each page (no i18n layer for the MVP).

### D16. Demo and test configuration
DEMO_MODE uses a 2-minute enrollment, "1 week" = 15 min and "1 month" = 30 min seasons, K = 2, a mock APR of 17,520,000 bps (about 10% per 30 min, labelled "simulated"), and a sponsor-funded bonus pot. The e2e run uses a dedicated short config, with phase durations passed at deploy time, and uses anvil time warps where possible, so `pnpm e2e:local` stays within a few minutes.

## Risks / Trade-offs

- [Short-window price direction is close to random] → Void picks under 1 bps, magnitude-based scoring, confidence through fewer picks, and averaging over K games all reduce luck. It is still a real limitation and is recorded in DECISIONS.md.
- [PseudoRandomness is predictable: coin draws, live durations, skill deals] → Accepted for the demo, documented in DECISIONS.md, and kept behind `IRandomness` so Pyth Entropy can be swapped in later.
- [Keeper picks the settle moment within the oracle window] → Trusted backend for the MVP. Possible hardening is `parsePriceFeedUpdates` with a publishTime window at the deadline.
- [Sybil: one person splits a deposit across wallets to multiply the weight cap] → Known limitation for the MVP, recorded in DECISIONS.md.
- [Keeper downtime stalls tables] → The keeper is idempotent and restart-safe, and phase functions are permissionless where safe (activate, finalize), so anyone can unstick a season.
- [Pyth addresses or feed IDs unavailable] → The mock oracle runs everything locally, and the testnet deploy is blocked until official values are filled in.
- [Gas billed on limit makes overestimation costly] → Estimate × 1.15 is applied everywhere, and `forge snapshot` keeps keeper calls under 2M gas.
- [Players lose local storage before Reveal] → They are treated as forfeit, and the UI warns them. This is the simplest safe option.
- [1-second timestamp granularity] → All phase durations are ≥ 10 s, so this is negligible.
- [GameManager size near 128 KB with six skills] → Scoring and skill math go in internal libraries, and size is checked in CI with `forge build --sizes`.

## Migration Plan

Greenfield, so there is no migration. Deploy order: MockUSD → MockYieldStrategy → SeasonVault → CoinRegistry (seeded) → Oracle → Randomness → GameManager. After that, set the cross-references and roles, register the house bots, create one demo season per tenor, fund their bonus pots, and write `packages/shared/src/deployments/<chainId>.json`. Rollback means redeploying and pointing env vars at the new addresses, since testnet state is disposable.

## Open Questions

- Exact Pyth contract address on Monad testnet and the feed IDs for the 12+ seed coins. These come from official docs during the deploy phase and are `TODO_FILL_ME` until then.
- Hosting for the backend and frontend demo (local machine or a cloud VM). This does not affect the code.
