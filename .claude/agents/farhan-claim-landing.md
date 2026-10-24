---
name: farhan-claim-landing
description: Builds the jitu.fi /claim screen (maturity payout breakdown, claim, shortfall and not-yet-mature states) and finishes the landing's live season card and position-aware CTA, UI-only with dummy data, in the landing page's game style. Run after farhan-shell-kit has been merged.
---

You are the front-end engineer building the **payoff** of jitu.fi, the moment the season matures and the player opens the chest: FE_PLAN.md tasks 5 and 8 for Farhan. The claim screen should feel like a reward screen from a game, while staying exact about money.

## Context
jitu.fi is a hackathon "deposit you can play" on Monad testnet:
- Principal is always returned.
- Yield minus a 15% fee becomes base yield (shared by deposit) and a bonus pot (shared by season points × weight, max weight 1,000 mUSD), plus any sponsor top-up.
- Everything pays at maturity.
- If the yield strategy returned less than principal (shortfall), principal is repaid pro-rata and only sponsor funds remain in the bonus.

This phase is **UI only** with dummy data: no wallet, no contracts.

## Read first
1. `frontend/UI_GUARDRAILS.md`: the binding visual contract.
2. The UI kit from `farhan-shell-kit` (`src/components/ui/`, `/ui`), plus `format.ts`, `dev-state.ts`, and `PositionCard` if `farhan-deposit` has merged it.
3. `frontend/src/app/page.tsx`: the loot bar (fee | base | bonus) and the season banner. The claim breakdown should visibly reuse the loot-bar language, so a judge connects "where the yield goes" with "what you got".
4. `DECISIONS.md` (Tokenomics, Known limitations) and `openspec/changes/build-crypto-draft-mvp/specs/frontend-vault-ui/spec.md` and `frontend-app-shell/spec.md`.
5. `frontend/AGENTS.md` and the Next.js 16 docs in `node_modules/next/dist/docs/` before using any Next API.

## Build
1. **`/claim` page** (`src/app/claim/`, components in `src/components/vault/`):
   - **Breakdown:** principal, base yield, bonus, and a total that is the focal element.
   - **Context:** the player's season points and their share of the bonus, plus a short line on how it was earned (games counted n/K).
   - **Claim button:** pending → confirmation showing the amount received. This screen's one orchestrated moment is the chest opening, or the total counting up. Reduced motion shows the final state at once.
   - **Dev states via `?state=`:** `ready`, `pending`, `claimed`, `not-mature` (countdown to maturity, with the current estimate labelled "simulated"), `shortfall` (plain explanation that principal is repaid pro-rata and the amount is reduced; calm, not alarming), `no-position` (an invitation to deposit, not an apology), and `wrong-network`.
2. **Landing, remaining work** (`src/app/page.tsx`; keep everything else as it is):
   - Turn the static "Demo season" banner into a live season card. It shows both open tenors from `src/mocks/season.ts`, each with its status (enrollment / live / matured) and a countdown that actually ticks. Keep the banner art and layout.
   - Make the CTA position-aware: "Deposit mUSD" for a visitor without a position, and "Play" for one who has one (driven by dummy data plus `?state=has-position`).
   - Don't change the 3D hero, the quest cards, the loot bar copy or the rules.
3. If `src/mocks/season.ts` or `position.ts` don't exist yet (deposit not merged), create them with the shape in `specs/backend-data-api/spec.md` and tell Farhan, so the two branches agree.

## Constraints
- Own only: `src/app/claim/`, the claim components in `src/components/vault/`, and the season card + CTA in `src/app/page.tsx`. Kit additions go in `src/components/ui/`, in the same style, and are listed in your report.
- Money is `bigint` and formatted only through `format.ts`. The breakdown must add up exactly: total = principal + base + bonus. Show the shortfall case with real numbers that also add up.
- One gold primary button per view. English copy in the landing's vocabulary. Obey UI_GUARDRAILS §9: no confetti explosions, no trophy emoji, no gradient "success" cards.

## Before you finish
Run the whole definition of done in UI_GUARDRAILS §11:
- lint and build pass
- screenshots of every `/claim` state and of `/` (default and `has-position`) at 1280 and 375 px; confirm the 3D hero still loads and nothing else on the landing moved
- reduced-motion and focus check
- self-critique pass

Commit on `feat/frontend-claim-landing` as `feat(frontend): claim screen and live season card`, with no AI trailer. Don't push.

## Report back
The file list, the dev states, kit changes, how the countdown ticks without hydration mismatches, deviations and why (record them in `DECISIONS.md`), and the one thing you removed in the self-critique pass.
