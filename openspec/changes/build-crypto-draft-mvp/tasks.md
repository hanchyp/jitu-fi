# Tasks

## 0. Setup (Phase 0)

- [ ] 0.1 Check dev tools (Node 20+, pnpm, Foundry ≥ 1.8.0, git) and verify `node -v`, `pnpm -v`, `forge --version` print supported versions
- [ ] 0.2 Init git repo and pnpm workspace (root package name `jitu-fi`; product name "jitu.fi" in README and UI; game mode keeps the name "Crypto Draft") (`contracts`, `backend`, `frontend`, `packages/shared`, `bots`) with root `.gitignore` excluding `.env`; verify `pnpm -r ls` lists all workspaces
- [x] 0.3 Scaffold Foundry project in `contracts/` with OZ v5 and `solc ^0.8.24`; verify `forge build` succeeds
- [ ] 0.4 Scaffold `packages/shared` (TS, vitest), `backend` (Fastify skeleton), `frontend` (Next.js App Router + Tailwind), `bots` (TS); verify `pnpm -r build` succeeds
- [ ] 0.5 Add ESLint + Prettier + `forge fmt`, a root `pnpm check` script (lint + build + test), `.env.example` files with `TODO_FILL_ME` for Pyth values; verify `pnpm check` passes
- [ ] 0.6 Review `DECISIONS.md` (created during planning with the 2026-10-23 redesign) and finish the `README.md` skeleton; commit `chore: setup monorepo`

## 1. Core contracts: assets & vault (Phase 1)

- [x] 1.1 Implement `MockUSD` (ERC20Permit, 6 decimals, 1h-cooldown faucet, MINTER_ROLE); verify unit tests for metadata, faucet, cooldown, unauthorized mint
- [x] 1.2 Implement `IYieldStrategy` + `MockYieldStrategy` (onlyVault, aprBps setter incl. demo 17,520,000, accrual, withdrawAll mints accrued); verify accrual test (1,000 @ 10% × 365d = 1,100) and access-control reverts
- [x] 1.3 Implement `SeasonVault` season creation (concurrent tenors), deposit / depositWithPermit, min deposit, weight cap, one active position per address (`activeSeasonOf`), pause-only-deposits; verify unit tests incl. post-start, below-minimum and second-tenor reverts
- [x] 1.4 Implement `activate`, `isEligible`, `weightOf`; verify activation timing tests
- [x] 1.5 Implement `fundBonus` and `finalize` with fee/base/bonus split, sponsor funds outside the fee, zero-points fallback, and Shortfall path (D6) using a points-source interface (mocked until GameManager exists); verify split, sponsor and shortfall tests
- [x] 1.6 Implement `claim`, `previewClaim`, `sweepDust`; verify claim == preview, double-claim revert, claim-while-paused succeeds
- [x] 1.7 Write vault invariant suite (Σclaims ≤ withdrawn − fee, claimant ≥ principal unless shortfall) with ≥ 10,000 runs; verify `forge test` green; commit `feat(contracts): season vault` (default profile runs 256 × 64 calls; the 10,000-run deep profile is `FOUNDRY_PROFILE=deep forge test`, run before 7.4)

## 2. Game results contract (Phase 2)

Re-scoped on 2026-10-24: the game engine runs in the backend and `GameManager` only records one result per finished game (see DECISIONS.md). Scoring, skills, prices and randomness move to `packages/shared` and the backend (Phase 4).

- [x] 2.1 Implement `GameManager` as a results recorder: `RESULT_POSTER_ROLE`, `recordGame(gameId, player, gameScore, logHash)`, one record per game id, `MAX_GAME_SCORE` = 10,000 bps, player season from `vault.activeSeasonOf`; verify unit + revert-path tests
- [x] 2.2 Implement first-K season points (max(0, gameScore), K set at deploy) with end-of-season cutoff + `PointsSkipped` (D3) and incremental `seasonTotalWeighted` (D4); wire vault to GameManager; verify K-limit test, negative-score test, late-record test and late-points invariant (Σ bonus claims ≤ bonusPot)
- [x] 2.3 Add "GameManager never transfers tokens" test and full-scenario test (deposit + sponsor fund → active → recordGame → finalize → claim → balances); commit `feat(contracts): game results`

## 3. Deploy (Phase 3)

- [x] 3.1 Write `Deploy.s.sol` (MockUSD → MockYieldStrategy → SeasonVault → GameManager, roles, cross-refs, one funded demo season per tenor, chain id assertion refusing 143); verify `deploy:local` on anvil succeeds
- [ ] 3.2 Export ABIs and `packages/shared/src/deployments/<chainId>.json` (31337, 10143 only); verify shared package builds and imports addresses
- [ ] 3.3 Deploy to Monad testnet with a Foundry keystore account (run by the owner), verify every contract on the explorer, and list the addresses in the README; commit `feat(contracts): deploy scripts`

## 4. Backend (Phase 4)

Since 2026-10-24 the backend also hosts the game engine: shared constants and scoring (`packages/shared`: presets, caps, skill ids, K; scoring test vectors for every preset, Sell, void picks, all six skills incl. FLIP/SWAP attacks, forfeits, ties, rounding), the table state machine, per-table skill hands, Pyth Hermes prices and house bots. Picks and skills arrive over the API with SIWE auth, so tasks 4.7 (relayer) and the EIP-712 parts of 5.5 no longer apply. The keeper sends one `recordGame` tx per finished game instead of two txs per round.

- [ ] 4.1 Set up config (Zod-validated env), pino logging, viem clients, Drizzle schema + migrations (`seasons, positions, tables, table_players, rounds, picks, skills_used, round_results, season_points, processed_blocks`); verify migration runs on SQLite
- [ ] 4.2 Implement shared `sendTx` helper (per-key nonce queue, gas = ceil(estimate × 1.15)); verify unit test of gas limit math and concurrent nonce ordering
- [ ] 4.3 Implement indexer (WS logs + eth_getLogs backfill, exactly-once by txHash+logIndex); verify integration test of downtime backfill on anvil
- [ ] 4.4 Implement REST endpoints with Zod validation; verify API tests incl. 400 on bad address
- [ ] 4.5 Implement WS rooms (`table:<id>`, `prices`, `lobby:<preset>` for the disabled queue) and SIWE auth for play; verify WS test receives a Revealed broadcast
- [ ] 4.6 Implement prices module (Hermes proxy, ~1 s ticks, update data on demand; mock-oracle driver in local mode); verify unit tests with a mocked Hermes
- [ ] 4.7 Implement relayer endpoints (commit, reveal, skill) with off-chain pre-validation, backend-supplied live-skill prices, per-address rate limits and idempotent dedupe; verify tests for wrong phase, bad signature, ignored client price, duplicate payload
- [ ] 4.8 Implement keeper per-table state machine (2 tx per round) + season activate/finalize + DEMO season renewal and funding, restart-safe; verify restart-mid-round test sends no duplicate tx
- [ ] 4.9 Implement matchmaker (POST /play with preset, eligibility, one table per player, instant table with 3 house bots, disabled multi-human queue, end-of-season guard) and the in-backend house-bot players; verify tests incl. "7 min left → no Quick table"
- [ ] 4.10 Integration test on anvil: 1 player + 3 house bots via API complete 1 Quick game; commit `feat(backend): ...`

## 5. Frontend (Phase 5)

- [ ] 5.1 App shell: providers (wagmi/RainbowKit limited to 10143/31337), English UI text, en-US number formatting, testnet banner, mobile layout; verify wrong-network prompt and banner render in a component test
- [ ] 5.2 Landing page `/` with pitch, 3 steps, season status + countdown, CTA routing; verify CTA test
  - Started early, ahead of phase order. Done so far: game-style static landing per `frontend/DESIGN.md` (3D "Arena Jitu" title screen with the Monad-mark crystal, camera fly-in and pointer parallax, static fallback without WebGL; quest cards, yield loot bar, demo season banner, rules). Still open: live season status and countdown from the backend, CTA routing by position (deposit or play), the CTA test, and copy that still describes the old rules ("Pick 3 coins", x1.5 contrarian).
- [ ] 5.3 `/deposit`: faucet with cooldown, tenor choice with bonus pots, amount validation, permit deposit with approve fallback, enrollment-closed and other-tenor states, estimated earnings; verify locally against anvil
- [ ] 5.4 `/play`: preset picker, counted games n/K, Play → table, season-closing message; verify against local backend
- [ ] 5.5 `/table/[id]` Commit: header with round n/total, cap and live duration, coin board, 1..cap picks + Buy/Sell, optional BOOST/INSURANCE, salt in localStorage, EIP-712 sign + relay; verify commit lands on-chain locally
- [ ] 5.6 `/table/[id]` Reveal: auto-reveal, missing-salt forfeit notice, reveal animation showing picks and commit-time skills; verify auto-reveal after page reload
- [ ] 5.7 `/table/[id]` Live: player panels with shared-scoring live scores and void markers, price chart, skill hand with pickers for LOCK, FLIP, SWAP, FREEZE and their animations; verify live score equals settled score at round end
- [ ] 5.8 Round results with winners, earned-skill toast, final podium with credited season points (or first-K / cutoff notice) + "Play again"
- [ ] 5.9 `/leaderboard` (humans, n/K, estimated bonus), `/claim` (breakdown + shortfall message), `/profile`; verify manually: deposit → play 1 game → leaderboard → claim on local stack; update the landing page and How to play tutorial to the new rules; commit `feat(frontend): ...`

## 6. Bots & E2E (Phase 6)

- [ ] 6.1 Implement the bot runner (house-bot strategy shared with the backend, plus a scripted player doing faucet → deposit → play) with `--local` (random-walk mock prices) and `--testnet`; verify the scripted player finishes a game against 3 bots locally
- [ ] 6.2 Implement `pnpm e2e:local` (anvil → deploy with short config → backend → scripted player plays K games → finalize → claim, assert ≥ principal and no bot points); verify it exits 0 from clean checkout; commit `feat(bots): ...`

## 7. Demo polish (Phase 7)

- [ ] 7.1 DEMO_MODE config (2-min enrollment, 15-min and 30-min tenors, K = 2, APR 17,520,000 labelled "simulated", sponsor-funded pot); verify a demo season runs end to end with 1 human + 3 bots
- [ ] 7.2 Animation polish and on-chain tx counter/explorer links on table screen
- [ ] 7.3 Write README demo section + 3-minute demo script; verify demo can be rerun from README on a fresh machine
- [ ] 7.4 Run the security checklist (vault invariants ≥ 10k runs, claim unpausable, no token access in GameManager, EIP-712 replay protection, commit binds table/round/player, oracle staleness incl. 5 s live-skill limit, skills blocked after the live deadline, explicit gas limits, no keys committed, banner on all screens) and tick each item

## Workflow follow-up

- Archive this change with `/opsx:archive` once all phases are complete and reviewed.
