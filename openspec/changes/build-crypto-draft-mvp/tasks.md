# Tasks

## 0. Setup (Phase 0)

- [ ] 0.1 Check dev tools (Node 20+, pnpm, Foundry ≥ 1.8.0, git) and verify `node -v`, `pnpm -v`, `forge --version` print supported versions
- [ ] 0.2 Init git repo and pnpm workspace (root package name `jitu-fi`; product name "jitu.fi" in README and UI; game mode keeps the name "Crypto Draft") (`contracts`, `backend`, `frontend`, `packages/shared`, `bots`) with root `.gitignore` excluding `.env`; verify `pnpm -r ls` lists all workspaces
- [ ] 0.3 Scaffold Foundry project in `contracts/` with OZ v5 and `solc ^0.8.24`; verify `forge build` succeeds
- [ ] 0.4 Scaffold `packages/shared` (TS, vitest), `backend` (Fastify skeleton), `frontend` (Next.js App Router + Tailwind), `bots` (TS); verify `pnpm -r build` succeeds
- [ ] 0.5 Add ESLint + Prettier + `forge fmt`, a root `pnpm check` script (lint + build + test), `.env.example` files with `TODO_FILL_ME` for Pyth values; verify `pnpm check` passes
- [ ] 0.6 Review `DECISIONS.md` (created during planning with the 2026-10-23 redesign) and finish the `README.md` skeleton; commit `chore: setup monorepo`

## 1. Core contracts: assets & vault (Phase 1)

- [ ] 1.1 Implement `MockUSD` (ERC20Permit, 6 decimals, 1h-cooldown faucet, MINTER_ROLE); verify unit tests for metadata, faucet, cooldown, unauthorized mint
- [ ] 1.2 Implement `IYieldStrategy` + `MockYieldStrategy` (onlyVault, aprBps setter incl. demo 17,520,000, accrual, withdrawAll mints accrued); verify accrual test (1,000 @ 10% × 365d = 1,100) and access-control reverts
- [ ] 1.3 Implement `SeasonVault` season creation (concurrent tenors), deposit / depositWithPermit, min deposit, weight cap, one active position per address (`activeSeasonOf`), pause-only-deposits; verify unit tests incl. post-start, below-minimum and second-tenor reverts
- [ ] 1.4 Implement `activate`, `isEligible`, `weightOf`; verify activation timing tests
- [ ] 1.5 Implement `fundBonus` and `finalize` with fee/base/bonus split, sponsor funds outside the fee, zero-points fallback, and Shortfall path (D6) using a points-source interface (mocked until GameManager exists); verify split, sponsor and shortfall tests
- [ ] 1.6 Implement `claim`, `previewClaim`, `sweepDust`; verify claim == preview, double-claim revert, claim-while-paused succeeds
- [ ] 1.7 Write vault invariant suite (Σclaims ≤ withdrawn − fee, claimant ≥ principal unless shortfall) with ≥ 10,000 runs; verify `forge test` green; commit `feat(contracts): season vault`

## 2. Game contracts (Phase 2)

- [ ] 2.1 Add game constants (presets + cap tables, phase durations, live range, skill ids, K, max ages) to `packages/shared/src/config.ts` and mirror them in a Solidity constants file; add a consistency test; verify it passes
- [ ] 2.2 Implement `CoinRegistry` (add/deactivate, active list); verify unit tests
- [ ] 2.3 Implement `IPriceOracle`, `MockPriceOracle`, `PythPriceOracle` (15s max age, reject ≤ 0); verify mock tests and Pyth adapter tests against a mock Pyth contract
- [ ] 2.4 Implement `IRandomness` + `PseudoRandomness` labelled NOT SECURE, DEMO ONLY; verify 8-distinct-coin draw test and live-duration-in-[60,120] fuzz
- [ ] 2.5 Write shared scoring test vectors (`packages/shared/test-vectors/scoring.json`) covering every preset, Sell, void picks, all six skills (BOOST, INSURANCE, LOCK, FLIP, SWAP, FREEZE), forfeits, tied winners, negative rounding, first-K season points
- [ ] 2.6 Implement TS scoring library in `packages/shared/src/scoring.ts`; verify vitest passes all vectors
- [ ] 2.7 Implement Solidity scoring library; verify Foundry test reads the same vector file and matches; add fuzz for retBps, weighted averages, FLIP/SWAP segments, ties
- [ ] 2.8 Implement `GameManager` table lifecycle: presets, createTable (MATCHMAKER_ROLE, house-bot registry, eligibility for humans, per-seat season, one unfinished table per human), startRound (coins + live duration), commit, permissionless reveal (cap, uniqueness), startLive (forfeit), settleRound chaining the next round, Finished with game scores; verify unit + revert-path tests
- [ ] 2.9 Implement first-K season points (max(0, gameScore), bots excluded) with end-of-season cutoff + `PointsSkipped` (D3) and incremental `seasonTotalWeighted` (D4); wire vault to GameManager; verify K-limit test, bot test, late-settle test and late-points invariant (Σ bonus claims ≤ bonusPot)
- [ ] 2.10 Implement per-table skill hands, round-winner skill rewards, commit-time BOOST and INSURANCE, and live LOCK, FLIP, SWAP, FREEZE with deadline and 5 s price checks (D10); verify skill tests incl. hand isolation, one skill per round, one live effect per pick, one freeze per target
- [ ] 2.11 Implement EIP-712 `commitBySig` and `useSkillBySig` with deadline and state-based replay protection (D9); verify relay, replay and expiry tests
- [ ] 2.12 Add "GameManager never transfers tokens" test, full-scenario test (deposit + sponsor fund → active → 1 Quick game with 3 bots → finalize → claim → balances), and `forge snapshot` check keeper calls < 2M gas and `forge build --sizes` < 128 KB; commit `feat(contracts): game manager`

## 3. Deploy (Phase 3)

- [ ] 3.1 Write `Deploy.s.sol` (deploy order per design, roles, cross-refs, house-bot registration, one funded demo season per tenor, mock oracle when Pyth is TODO_FILL_ME); verify `deploy:local` on anvil succeeds
- [ ] 3.2 Export ABIs and `packages/shared/src/deployments/<chainId>.json` (31337, 10143 only); verify shared package builds and imports addresses
- [ ] 3.3 Fill official Pyth address + feed IDs from docs (or keep TODO_FILL_ME and record in DECISIONS.md); verify `deploy:testnet` succeeds when keys are present, with chain id assertion refusing 143
- [ ] 3.4 Document deploy commands in README; commit `feat(contracts): deploy scripts`

## 4. Backend (Phase 4)

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
