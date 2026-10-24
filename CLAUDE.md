# Crypto Draft — Project Context for Claude Code

The full spec is in `CRYPTO_DRAFT_BUILD_SPEC.md` (Indonesian), which is the source of truth.
This file records decisions and corrections agreed on before the build started.
When the spec and this file conflict, **this file wins**.

## Project summary
- Brand: **jitu.fi**, built for a hackathon. "Crypto Draft" is the name of the game mode.
- Planning lives in OpenSpec: `openspec/changes/build-crypto-draft-mvp/` (proposal, specs, design, tasks). Work through `tasks.md` in order.
- Product: a "gamified deposit" on **Monad testnet only** (chain ID 10143). Never deploy to mainnet (143).
- Users deposit mUSD into a season vault. Principal is always returned in full.
- Yield minus a 15% fee is split 50/50:
  - **Base yield:** pro-rata by deposit.
  - **Bonus pot:** by season points × weight, where weight = min(principal, 1,000 mUSD).
- Game: 4 players, 3 rounds. Each player picks 3 of 8 coins, Buy or Sell each.
- Rounds go commit → reveal → live → settle. The contrarian multiplier and skills (GIFT_COIN, LOCK, SHIELD) affect scoring.

## Conventions
- Monorepo with pnpm workspaces: `contracts/` (Foundry ≥1.8.0), `backend/`, `frontend/`, `packages/shared/`, `bots/`.
- Code and comments in English. UI text in Indonesian via a simple i18n file.
- Integer money only. Stablecoin uses 6 decimals. Returns and scores are in bps.
- Work phase by phase (spec §10). Tests must be green before commit and before moving to the next phase. Commit messages look like `feat(contracts): ...`. Never add a `Co-Authored-By: Claude` (or any AI attribution) trailer to commits or PRs.
- Record every ambiguous design decision in `DECISIONS.md`, choosing the simplest safe option.
- Never guess third-party addresses (Pyth, Pyth Entropy, price feed IDs). Use official docs, or put `TODO_FILL_ME` in `.env` and use the mocks.
- Monad bills the gas **limit**, not gas used. Every backend tx sets an explicit gas limit of estimate × 1.15.

## Non-negotiable guardrails
No buy-in or entry fee. No spectator betting. Principal is never at risk. GameManager has no token access. Winners are decided by score ranking, never by lottery. `claim` can never be paused.

## Corrections to the spec (apply these)
1. **Late points can make claims exceed the bonus pot.** This is critical.
   - `finalize` snapshots `totalWeightedPoints`, but `claim` reads `seasonPoints` live.
   - Fix in GameManager: refuse to add season points when `block.timestamp >= season.end` or the season is Finalized.
   - Fix in the matchmaker: don't create tables when `end - now` is less than one full game's duration (~9 min in DEMO_MODE) plus a buffer.
   - Add an invariant test covering this.
2. **`skillHand` must be scoped per table:** `mapping(uint256 tableId => mapping(address => uint8[]))`.
3. **Shortfall case:** if the strategy returns less than `totalPrincipal`, set `baseYield = bonusPot = fee = 0` and repay principal pro-rata. Emit a `Shortfall` event.
4. **GIFT_COIN outcomes are predictable with `PseudoRandomness`.** Accept this for the demo, and list it in `DECISIONS.md` as a known limitation (fixed later by Pyth Entropy).

## Status
- Phase 0 (setup) is partly done. The pnpm workspace, `frontend/` (Next.js 16 + Tailwind, initialized only) and `backend/` (TypeScript skeleton, no code yet) build with `pnpm build`.
- `contracts/` has only a README. The Foundry scaffold waits until Foundry is installed.
- `packages/shared/` and `bots/` have not been created yet.
