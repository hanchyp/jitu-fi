# Backend Plan

Status: **draft, not approved.** No backend code is written until this plan is agreed.
Owner: BE session. Contracts, `packages/shared`, `DECISIONS.md` and `tasks.md` belong to the SC session.

This plan follows the 2026-10-24 redesign agreed with SC: **the game runs in the backend.** The chain holds money (SeasonVault) and one result per finished game (GameManager.recordGame). There is no relayer, no EIP-712, no on-chain oracle, registry or randomness.

## 1. What the backend does

| Module | Job | Touches chain? |
|---|---|---|
| `config` | Zod-validated env, DEMO_MODE presets | no |
| `db` | Drizzle schema + migrations (SQLite via libsql, local and hosted) | no |
| `chain` | viem clients, ABIs, `sendTx` (nonce queue, gas = ceil(estimate × 115 / 100)) | yes |
| `indexer` | Mirrors vault + game events into the DB, WS logs + eth_getLogs backfill | read |
| `auth` | SIWE login, session cookie or bearer token | no |
| `prices` | Pyth Hermes stream (SSE), ~1 s ticks, price snapshots; mock random walk locally | no (HTTP) |
| `engine` | Tables, rounds, phases, coin draw, picks, skills, scoring | no |
| `bots` | 3 house-bot players inside the engine | no |
| `matchmaker` | POST /play: eligibility, one table per player, end-of-season guard | read (`isEligible`) |
| `keeper` | activate, finalize, demo season renewal + fundBonus, recordGame | write |
| `api` | REST + WebSocket rooms | no |

One Node process (design D14): Fastify, `ws`, viem ≥ 2.40, Drizzle, Zod, pino, vitest.

## 2. Game flow (off-chain engine)

```
POST /play ──▶ matchmaker ──▶ engine.createTable (1 human + 3 bots, deal 1 skill each)
                                   │
         ┌─────────────── round n ─┴──────────────────────────────┐
         │ start:   draw 8 coins + live duration 60–120 s          │
         │ commit   20 s  POST /tables/:id/picks {picks, skill?}  │
         │ reveal   10 s  backend shows every seat's picks        │
         │ live     60–120 s  start prices snapshotted;           │
         │          POST /tables/:id/skill (LOCK/FLIP/SWAP/FREEZE)│
         │ settle:  end prices → scores → winners → +1 skill      │
         └──────────────────────── repeat until last round ───────┘
                                   │
                      game score ──▶ keeper.recordGame (human seat only)
```

Design notes:
- **Plain submit, no hash or salt (owner, 2026-10-24).** During Commit a player posts their picks plus an optional BOOST/INSURANCE target. They may resubmit until the commit deadline (last one wins). The backend hides picks from the other seats (API and WS) until Reveal, then broadcasts all of them. There is no salt to lose, so "lost localStorage = forfeit" no longer applies. A player who submits nothing by the deadline forfeits the round. The phase names stay the same, so the UI flow (commit → reveal → live → settle) is unchanged; only the reveal step is automatic.
- **Timers:** one `setTimeout` per phase per table, plus a DB row with `phaseDeadline`. On restart the engine reloads open tables and resumes from `phase` + `phaseDeadline` (restart-safe).
- **Prices for scoring:** start price = Hermes price at live start, end price = price at the live deadline. Each is stored with its Pyth `publishTime` in `round_prices`. Live skills use the latest tick no older than 5 s.
- **Randomness:** `crypto.randomInt` on the server. This is no longer predictable from a blockhash, but players must trust the backend. That is a known limitation; `logHash` makes games auditable.
- **logHash:** keccak256 of the canonical JSON game log (coins, prices, picks, skills, scores). The log is served by `GET /tables/:id/log`, so anyone can recompute the hash and the score.

## 3. Scoring and skills

Rules from DECISIONS.md (2026-10-23), updated by SC on 2026-10-24:
- Round score = cap × weighted average return (bps) of non-void picks; void = |move| < 1 bps; BOOST weight ×2; truncation toward zero.
- Game score = Σ round scores ÷ Σ caps. recordGame rejects scores above 10,000 bps, so the engine clamps to min(score, 10,000) and logs a warning (agreed with SC and the owner). In practice this can't trigger: BOOST only reweights the average. There is no lower bound; a negative score credits 0 but still counts toward K.
- BOOST and INSURANCE are set at commit. LOCK is used on your own pick. **FREEZE, FLIP and SWAP attack an opponent's pick.**
  - FLIP: start→now in the old direction, now→end reversed.
  - SWAP: the attacker moves the pick onto a table coin the victim didn't pick; the victim keeps their direction.
  - At most 1 attack received per player per round; a locked pick can't be attacked; INSURANCE floors at 0 after attacks.
- Hand: 1 random skill at the start, +1 per round won, max 3, max 1 skill used per round.

**Where scoring lives (needs a decision):** the frontend needs the same math for live scores. Proposal: `packages/shared/src/scoring.ts` + `test-vectors/scoring.json`, used by both the backend and the frontend. SC owns `packages/shared`, so either SC writes it, or BE writes it in that folder with SC's OK. The Solidity scoring library is dropped, since the game is no longer on-chain. SC is fine with BE writing `packages/shared/src/scoring.ts` + `packages/shared/test-vectors/*` if the owner assigns it; SC keeps `packages/shared/src/deployments/*` and the ABI exports. The vectors must cover the attack rules: one attack per target per round, a locked pick is immune, INSURANCE floors last.

## 4. Data model (Drizzle)

From chain logs (indexer, idempotent on `txHash + logIndex`):
- `seasons` (id, tenor, enrollStart, start, end, status, totalPrincipal, bonusPot, sponsorFunds, finalize split fields, shortfall flag)
- `positions` (seasonId, address, principal, weight, claimed, claim amounts)
- `game_results` (gameId, player, seasonId, gameScore, credited, skipped, logHash, txHash)
- `bonus_fundings`, `processed_logs`, `indexer_cursor`

Written by the engine:
- `tables` (id, preset, status, humanAddress, seasonId, currentRound, phase, phaseDeadline, createdAt, finishedAt, gameScore, recordTxHash, recordStatus)
- `table_players` (tableId, seat, address, isBot)
- `rounds` (tableId, n, cap, coins[8], liveDuration, liveStart, liveEnd)
- `round_prices` (tableId, round, coin, startPrice, endPrice, publishTimes)
- `picks` (coin, side, boosted, insured, submittedAt)
- `skill_hands`, `skills_used` (skill, user, targetPlayer, targetPick, price, at)
- `round_results` (player, roundScore, forfeit, won)
- `sessions` (SIWE nonce, address, expiry)

`season_points` is not stored. It is read from chain (`seasonPoints`, `gamesCounted`) or rebuilt from `game_results`.

## 5. API

REST (Zod-validated, bigint as decimal strings):
- `GET /seasons/current` → `CurrentSeasonsResponse` (frontend `mocks/season.ts`)
- `GET /seasons/:id/leaderboard` → `LeaderboardResponse` (humans only)
- `GET /users/:addr/position` → `PositionResponse` incl. previewClaim
- `GET /users/:addr/history` → games grouped by season
- `GET /tables/:id`, `GET /tables/:id/log`
- `POST /auth/nonce`, `POST /auth/verify` (SIWE)
- `POST /play {preset}` → `{tableId}` or an error carrying the running table id
- `POST /tables/:id/picks` (Commit phase, resubmittable), `POST /tables/:id/skill` (Live phase) (SIWE-authenticated, phase-checked, idempotent, rate-limited)

WebSocket rooms: `table:<id>` (round start, phase change, reveals, skills, results, game end), `prices` (ticks for coins at active tables), `lobby:<preset>` (disabled queue).

The response shapes follow the frontend mocks (`frontend/src/mocks/*.ts`), so the UI switches from mocks to real data without type changes. If these types move to `packages/shared`, both sides import them.

## 6. Keeper

- Loop every ~5 s, reading chain state before every tx (idempotent):
  - `activate(id)` when `now ≥ start` and the season is still in Enrollment
  - `finalize(id)` when `now ≥ end` and the season is still Active
  - DEMO_MODE only: when a tenor's season leaves Enrollment, `createSeason` the next one and `fundBonus` it
- recordGame queue: finished tables with `recordStatus = pending` → `recordGame`. A retry on restart is safe because duplicate `gameId`s revert, and we treat "already recorded" as success.
  - `gameId = keccak256(abi.encode(GAME_ID_SALT, tableId))`. `GAME_ID_SALT` is a bytes32 env value generated once per deployment, so a DB reset that restarts tableIds at 1 doesn't collide with recorded games.
  - Final outcomes, never retried: success, `AlreadyRecorded`, `PointsSkipped` (season ended), `SeasonNotActive`. Only RPC/nonce/gas errors are retried.
- Keys: keeper (SEASON_MANAGER + RESULT_POSTER roles, funded with > 10 MON). The matchmaker needs no key now, since tables aren't on-chain. The relayer key is gone.

## 7. Matchmaker

- SIWE-authenticated `POST /play {preset}`.
- `vault.isEligible(activeSeasonOf(user), user)` must be true, and the season must be Active: recordGame reverts with `SeasonNotActive` during Enrollment, so a game played then could never be recorded.
- One unfinished table per human (DB check).
- End-of-season guard: refuse when `end − now < rounds × (20 + 10 + 120 + 5) + 60` s.
- Queue flag off: instant table with 3 bots. The queue code path exists but is disabled.

## 8. Build order (replaces tasks 4.1–4.10)

| # | Task | Depends on | Verify |
|---|---|---|---|
| B1 | config, pino, Drizzle schema + migrations (SQLite) | – | migration test |
| B2 | prices module (Hermes SSE + mock walk) | – | unit tests with mocked Hermes |
| B3 | scoring + skills lib + test vectors in `packages/shared` (BE, owner-assigned) | SC's `packages/shared` scaffold | vitest on the vectors, incl. attack rules |
| B4 | engine: table/round state machine, timers, restart | B1, B2, B3 | fake-timer tests, incl. restart mid-Live |
| B5 | house bots | B4 | a 3-bot game finishes |
| B6 | SIWE auth + REST + WS rooms | B1, B4 | API tests (400 on bad address, reveal broadcast) |
| B7 | matchmaker | B6, ABIs (or stub) | ineligible, already-at-table, 7-min guard |
| B8 | `sendTx` + indexer | ABIs from SC | gas math, nonce order, anvil backfill test |
| B9 | keeper (activate, finalize, renewal, recordGame) | B8, deployed contracts | restart-safety test |
| B10 | end-to-end on anvil: 1 player + 3 bots finish a Quick game, recordGame lands | all | integration test |

B1, B2, B4–B6 need nothing from SC. B3 waits for SC's `packages/shared` scaffold; until then the engine can stub the scoring call. B7–B9 use a local ABI stub (`backend/src/chain/abi.ts`, written from the event list SC sent) until `packages/shared` exports the real ABIs.

Contracts status (SC, 2026-10-24): branch `refs/heads/feat/contracts` in the main checkout (f598162, 4801796, a550135), not merged or pushed. ABIs come from `contracts/out/<Contract>.sol/<Contract>.json` after `forge build`. Deterministic addresses on a fresh anvil (dev key #0):

| Contract | Address |
|---|---|
| MockUSD | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| MockYieldStrategy | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| SeasonVault | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| GameManager | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |

Seasons 1 (week) and 2 (month) are created at deploy time, each with a 1,000 mUSD sponsor pot. The deploy script writes `contracts/deployments/<chainId>.json`. The user runs the testnet deploy with their keystore; SC will send those addresses.

## 9. Env and keys

`DATABASE_URL`, `GAME_ID_SALT` (bytes32, once per deployment), `RPC_URL`, `RPC_WS_URL` (Monad testnet public RPC is fine), `CHAIN_ID` (10143 or 31337; refuse 143), `KEEPER_PRIVATE_KEY`, `PYTH_HERMES_URL` (public, no key), `PRICE_FEED_IDS` (defaults to the official IDs in §12), `SIWE_DOMAIN`, `SESSION_SECRET`, `DEMO_MODE`, `MULTI_HUMAN_QUEUE=false`.

## 10. Known limitations / risks

- **Trusted backend:** the server picks coins, live durations and prices, and computes scores. Mitigation: a public game log + `logHash` on-chain lets anyone re-verify.
- **Keeper key leak** lets an attacker post fake scores (≤ 10,000 bps, only for depositors). That shifts the bonus split, but never principal or base yield.
- **Hermes outage** during Live: the round settles at the last good price (decided, §12). A long outage makes that round mostly void.
- **Hidden picks rely on the backend:** picks are secret only because the API withholds them until Reveal (no commit hash). Acceptable, since the backend already runs the game.

## 11. Open questions

None. The plan is waiting for the owner's go-ahead to build.

## 12. Decided (owner, 2026-10-24)

- **Plain submit instead of commit → reveal** (§2): picks are hidden by the backend until Reveal, with no hash or salt.
- **BE writes the scoring lib** in `packages/shared/src/scoring.ts` + `packages/shared/test-vectors/*` (§3). SC keeps the rest of `packages/shared`.
- **Out-of-range game scores are clamped by the engine** to min(score, 10,000) bps with a warning before recordGame. recordGame's revert stays as a backstop.
- **Hermes outage:** a round settles at the last good price per coin (the newest tick before the deadline), and its `publishTime` is stored in `round_prices` and the game log.
- **Coins:** the frontend's 8. Official Pyth feed IDs, read from the Hermes API (`/v2/price_feeds`, symbol `Crypto.<X>/USD`) on 2026-10-24:

| Coin | Feed ID |
|---|---|
| BTC | `0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43` |
| ETH | `0xff61491a931112ddf1bd8147cd1b641375f79f5825126d665480874634fd0ace` |
| SOL | `0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d` |
| DOGE | `0xdcef50dd0a4cd2dcc17e45df1676dcb336a11a61c69df7a0299b0150c672d25c` |
| BNB | `0x2f95862b045670cd22bee3114c39763a4a08beeb663b145d283c31d7d1101c4f` |
| XRP | `0xec5d399846a9209f3fe5881d70aae9268c94339ff9817e8d18ff19fa05eea1c8` |
| AVAX | `0x93da3352f9f1d105fdfe4971cfa80e9dd777bfc5d0f683ebb6e1294b92137bb7` |
| MON | `0x31491744e2dbf6df7fcf4ac0820d18a609b49076d45066d3568424e62f686cd1` |

Every table therefore deals all 8 coins, so the "draw 8 coins" step is just the fixed list (shuffled for display).

## 13. Build notes

- **SQLite (libsql) everywhere, no Postgres** (B1). Drizzle schemas are dialect-specific, so supporting Postgres too would mean a second schema. A hosted demo uses a SQLite file on the VM (or Turso, which speaks libsql). `@libsql/client` ships prebuilt binaries, so Windows needs no native build.
- uint256 amounts and Pyth prices are stored as decimal strings; timestamps ending in `Ms` are milliseconds, the rest are unix seconds.
