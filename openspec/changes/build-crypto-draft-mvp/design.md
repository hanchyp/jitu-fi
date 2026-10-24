# Design

## Context

The repo is empty apart from the OpenSpec setup. See proposal.md (Why) for motivation. Requirements live in `specs/`. The detailed build reference is `CRYPTO_DRAFT_BUILD_SPEC.md`, and its corrections come from the project context file.

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
- One game is ~9 minutes (3 × (30 + 20 + 120) s), and a demo season is 30 minutes.
- No wallet popups and no MON needed to play.
- The full loop runs locally on anvil without any third-party address.

**Non-Goals:**
- Mainnet deployment, real lending protocols, real funds.
- Secure randomness (Pyth Entropy is stretch).
- SWAP and INVERT skills, multiple tenors, auto-rollover, session signers or embedded wallets, Spotlight Round (all stretch).
- Production-grade auth beyond simple SIWE.

## Decisions

### D1. Monorepo layout and tooling
pnpm workspaces with `contracts/` (Foundry ≥ 1.8.0, Solidity ^0.8.24, OZ v5), `packages/shared/`, `backend/`, `frontend/` and `bots/`. `packages/shared` is built first. Every other TS package depends on it for constants, scoring, ABIs and deployments.
*Alternative:* separate repos. Rejected because the ABI and scoring drift would be constant.

### D2. Contract separation for principal safety
`SeasonVault` is the only contract holding tokens. `GameManager` writes points; the vault only reads them through `seasonPoints` and `seasonTotalWeighted`. Neither contract can move tokens on behalf of the other.
*Alternative:* a single contract. Rejected because a game bug could reach principal.

### D3. Season-points cutoff (correction 1)
`GameManager` stores the season end (read from the vault when the table is created) and checks `block.timestamp < end` and vault status ≠ Finalized before crediting points. If the check fails, the table still finishes and emits `PointsSkipped`, so settle never reverts and keepers never get stuck. The matchmaker also refuses tables when `end − now < GAME_DURATION + BUFFER`, with BUFFER = 60 s. Both layers are needed: the contract check is the guarantee, and the matchmaker check stops players losing a game's points.

### D4. Weighted total computed incrementally
`seasonTotalWeighted += pointsDelta × vault.weightOf(season, player)`. Weight is fixed once the season is Active, because deposits close at start. With D3, the finalize snapshot equals the claim-time sum exactly.

### D5. Skill hands scoped per table (correction 2)
`mapping(uint256 tableId => mapping(address => uint8[])) skillHand`. Per-round usage flags and shield flags are keyed by `(tableId, round, player)`.

### D6. Shortfall (correction 3)
At finalize, if `total < totalPrincipal`, the vault records `returned = total`, sets fee, baseYield and bonusPot to 0, and emits `Shortfall`. Claim pays `principal × returned / totalPrincipal`. Rounding dust stays in the vault.

### D7. Scoring math
Everything uses int256 or bigint with Solidity truncation toward zero. Start and end prices for one coin share the same expo, so `retBps` is a pure ratio and needs no normalization. Rank ties use a ×10 scale: tied players get `sum(rankPoints of occupied ranks) × 10 / tiedCount`. Test vectors in `packages/shared/test-vectors/scoring.json` are read by Foundry (via `vm.readFile` + `vm.parseJson`) and by vitest.

### D8. Meta-transactions
`GameManager` inherits OZ `EIP712` and keeps one nonce per player. Each typed struct (`Commit`, `Reveal`, `UseSkill`) includes `nonce` and `deadline`. The `...BySig` functions recover the signer and run the same internal logic as the direct calls. Deposits use the ERC20Permit flow (`depositWithPermit`).

### D9. Oracle and randomness behind interfaces
`IPriceOracle` has two implementations: `PythPriceOracle` (`updatePriceFeeds` + `getPriceNoOlderThan(15 s)`) and `MockPriceOracle`. `IRandomness` uses `PseudoRandomness` (demo only). The deploy script selects the mock whenever `PYTH_CONTRACT_ADDRESS=TODO_FILL_ME`. Pyth feed IDs and addresses must come from official Pyth and Monad docs and are never guessed.

### D10. Backend shape
One Node process with modules `api`, `matchmaker`, `relayer`, `keeper`, `prices` and `indexer`. It uses Fastify, `ws`, viem ≥ 2.40, Drizzle (SQLite locally, Postgres when deployed), Zod and pino.
- A shared `sendTx` helper owns nonce sequencing and `gas = ceil(estimate × 115 / 100)`.
- The relayer, keeper and matchmaker each use their own key, so their nonce queues never collide.
- The keeper is a per-table state machine driven by on-chain state plus deadline timers. Restart-safety comes from re-deriving all state from chain reads.
- The indexer keeps `processed_blocks` and a unique key on (txHash, logIndex) for exactly-once storage.

### D11. Frontend shape
Next.js App Router with Tailwind, wagmi + viem, RainbowKit, TanStack Query, Zustand, Framer Motion and lightweight-charts.
- A typed WS client subscribes to `table:<id>` and `prices`.
- Live scores reuse `packages/shared` scoring, so UI and chain agree.
- Commit salts are persisted in `localStorage` before signing, so a reload during Reveal still auto-reveals.
- UI text is English, kept in plain constants next to each page (no i18n layer for the MVP).

### D12. Demo and test configuration
DEMO_MODE sets a 30-minute season, a 5-minute enrollment and a large mock APR, labelled "simulated". The e2e run uses a dedicated short config, with phase durations passed at deploy time, and uses anvil time warps where possible, so `pnpm e2e:local` stays within a few minutes.

## Risks / Trade-offs

- [PseudoRandomness is predictable, including GIFT_COIN outcomes] → Accepted for the demo, documented in DECISIONS.md, and kept behind `IRandomness` so Pyth Entropy can be swapped in later.
- [Keeper downtime stalls tables] → The keeper is idempotent and restart-safe, and phase functions are permissionless where safe (activate, finalize), so anyone can unstick a season.
- [Pyth addresses or feed IDs unavailable] → The mock oracle runs everything locally, and the testnet deploy is blocked until official values are filled in.
- [Gas billed on limit makes overestimation costly] → Estimate × 1.15 is applied everywhere, and `forge snapshot` keeps keeper calls under 2M gas.
- [Players lose local storage before Reveal] → They are treated as forfeit, and the UI warns them. This is the simplest safe option.
- [1-second timestamp granularity] → All phase durations are ≥ 20 s, so this is negligible.
- [GameManager size near 128 KB] → Scoring and ranking go in an internal library, and size is checked in CI with `forge build --sizes`.

## Migration Plan

Greenfield, so there is no migration. Deploy order: MockUSD → MockYieldStrategy → SeasonVault → CoinRegistry (seeded) → Oracle → Randomness → GameManager. After that, set the cross-references and roles, create the demo season, and write `packages/shared/src/deployments/<chainId>.json`. Rollback means redeploying and pointing env vars at the new addresses, since testnet state is disposable.

## Open Questions

- Exact Pyth contract address on Monad testnet and the feed IDs for the 12+ seed coins. These come from official docs during the deploy phase and are `TODO_FILL_ME` until then.
- Hosting for the backend and frontend demo (local machine or a cloud VM). This does not affect the code.
