# Smart contracts plan

Scope after the 2026-10-24 decision: the game engine runs in the backend, and only one result per finished game reaches the chain (see `DECISIONS.md`). Built with the MONSKILLS `scaffold` and `gas` guidance: Foundry + OpenZeppelin v5, verification through the devnads API (sourcify fallback), and a deploy run by the owner from a Foundry keystore.

## Contracts

| Contract | Role | Holds tokens |
|---|---|---|
| `MockUSD` | Testnet stablecoin "mUSD": ERC20 + ERC20Permit, 6 decimals, faucet | — |
| `MockYieldStrategy` | Parks each season's principal and simulates yield | Yes (per season) |
| `SeasonVault` | Deposits, seasons, yield split, claims | Yes |
| `GameManager` | Records one result per game, turns it into season points | **No, never** |

Interfaces: `IYieldStrategy`, `IPointsSource` (what the vault reads from the game), `ISeasonVault` (what the game reads from the vault).

Toolchain: Solidity 0.8.28, OpenZeppelin v5 (`forge install --no-git`), `contracts/` as a Foundry project inside the pnpm monorepo.

## MockUSD
- `name` "Mock USD", `symbol` "mUSD", `decimals` 6, EIP-2612 permit.
- `faucet()`: mints 1,000 mUSD to the caller, once per hour per address.
- `mint(to, amount)`: `MINTER_ROLE` only (the strategy, the deployer and the keeper, for sponsor funding).

## IYieldStrategy / MockYieldStrategy
- Accounts are **keyed by season id**: `deposit(seasonId, amount)`, `withdrawAll(seasonId) → amount`, `totalAssets(seasonId)`, `asset()`. Concurrent seasons (1 week and 1 month at once) would otherwise drain each other on `withdrawAll`. This deviates from the spec's key-less interface and is logged in `DECISIONS.md`.
- Only the vault may deposit or withdraw. The vault is set once by the admin.
- `totalAssets = principal + principal × aprBps × elapsed / (10,000 × 365 days)`.
- `withdrawAll` mints the accrued yield, sends the whole season balance to the vault and clears the account.
- `setAprBps` is admin-only. Demo value 17,520,000 (about 10% per 30 minutes, labelled "simulated" in the UI).

## SeasonVault
State per season: `enrollStart < start < end`, status `Enrollment → Active → Finalized`, `totalPrincipal`, `sponsorFunds`, and the finalize results (`returnedPrincipal`, `fee`, `baseYield`, `bonusPot`, `totalWeightedPoints`, `shortfall`), plus payout counters. Season ids start at 1; 0 means "none".

| Function | Who | Rule |
|---|---|---|
| `createSeason(enrollStart, start, end)` | `SEASON_MANAGER_ROLE` | Ordered timestamps; several tenors can overlap |
| `deposit(seasonId, amount)` / `depositWithPermit(...)` | Anyone | Enrollment and before `start`, ≥ 10 mUSD, not paused. One open position per address (`activeSeasonOf`); a new season only after the old one is Finalized. Permit pulls from and credits the permit owner |
| `activate(seasonId)` | Anyone | `now ≥ start`, once. Sends principal to the strategy |
| `fundBonus(seasonId, amount)` | Anyone | Before Finalized. Kept apart from principal, never charged the fee |
| `finalize(seasonId)` | Anyone | `now ≥ end`, once (activates first if nobody did). Withdraws, snapshots `seasonTotalWeighted` from the game, splits the yield |
| `claim(seasonId)` | Depositor | After Finalized, once. **Not pausable** |
| `previewClaim(seasonId, user)` | View | Exact after finalize, estimate before |
| `sweepDust(seasonId, to)` | Admin | Only after every depositor has claimed |
| `pause` / `unpause` | Admin | Stops deposits only |
| `setGame(game)` | Admin | Once |

Views for the game and UI: `activeSeasonOf(user)`, `isEligible(seasonId, user)` (position > 0 and Active), `weightOf(seasonId, user)` = min(principal, 1,000 mUSD), `principalOf`, `seasonEnd`, `seasonStatus`, `getSeason`.

Finalize math (integer, 6-decimal units):
- **Normal:** yield = withdrawn − principal; fee = 15% of yield (sent to `feeRecipient`); baseYield = half of the rest; bonusPot = the other half + sponsor funds.
- **Shortfall** (withdrawn < principal): fee = baseYield = 0, bonusPot = sponsor funds only, `Shortfall` emitted; principal is repaid pro-rata.
- **No points** (`totalWeightedPoints = 0`): bonusPot moves into baseYield.

Claim = principal share + baseYield × principal / totalPrincipal + bonusPot × (points × weight) / totalWeightedPoints. Rounding dust stays in the vault.

Deviation from the spec: `sweepDust` drops the "30 days after finalize" branch. Sweeping while claims are open could pay the dust of one season out of another season's funds. Logged in `DECISIONS.md`.

## GameManager (results recorder)
- `recordGame(gameId, player, gameScore, logHash)`: `RESULT_POSTER_ROLE` (the keeper key).
  - Each `gameId` once; `gameScore ≤ MAX_GAME_SCORE` (10,000 bps).
  - Season = `vault.activeSeasonOf(player)`; the player must have a position (bots have none, so they can never be recorded).
  - At or after season end, or once Finalized: no points, emit `PointsSkipped`, don't revert.
  - Otherwise the season must be Active. The first K games (K set at deploy: 5, demo 2) credit max(0, score) to `seasonPoints` and add points × weight to `seasonTotalWeighted`. Later games are recorded with 0 credited.
  - Emits `GameRecorded(gameId, player, seasonId, gameScore, credited, logHash)`.
- Implements `IPointsSource`. No token calls, no approvals, no payable functions.

## Tests (`forge test` must be green before each commit)
- **MockUSD:** metadata, faucet amount, cooldown revert, unauthorized mint, permit.
- **Strategy:** accrual (1,000 @ 10% × 365 days = 1,100), per-season isolation, only-vault reverts, APR admin.
- **Vault:**
  - create-season ordering; deposit rules (after start, below minimum, second tenor, after old season Finalized); permit deposit credits the owner;
  - activation timing; normal split (1,000 → 1,100 gives fee 15, base 42.5, bonus 42.5); sponsor scenario (bonus 1,042.5); no-points fallback; shortfall (100 claims 90);
  - claim == preview; double claim; claim before finalize; claim while paused works, deposit while paused reverts; sweep rules.
- **GameManager:** poster-only, duplicate id, score bound, ineligible player, negative score counts toward K, K limit, late record skips, record after Finalized skips, weight math.
- **Full scenario:** two players deposit + sponsor funds → activate → games recorded → finalize → claims add up to principal + yield − fee + sponsor, minus dust.
- **Invariant:** random deposits, game records at random times around season end, finalize and claims. Σ bonus claims ≤ bonusPot, Σ claims ≤ withdrawn − fee + sponsor, every claimant ≥ principal unless shortfall, and the game never moves tokens.

## Deploy (`script/Deploy.s.sol`)
1. Refuse chain id 143.
2. Deploy MockUSD → MockYieldStrategy → SeasonVault → GameManager.
3. Wire up: strategy vault, minter roles (strategy, deployer, keeper), `vault.setGame`, the `SEASON_MANAGER_ROLE` and `RESULT_POSTER_ROLE` for the keeper, demo APR.
4. Create one season per tenor (demo: 2-minute enrollment, 15- and 30-minute seasons), and seed each bonus pot with 1,000 mUSD.
5. Write `contracts/deployments/<chainId>.json`.

Config through env: `DEMO_MODE`, `FEE_RECIPIENT`, `KEEPER_ADDRESS`, `POINTS_K`.

- **Local:** anvil + `forge script ... --broadcast`.
- **Testnet:** the owner runs it with `--account deployer` (keystore) against `https://testnet-rpc.monad.xyz`. Then verify each contract and list the addresses in the README.
