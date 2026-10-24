# UI guardrails

The visual contract every new screen must follow. It is extracted from the shipped landing page (`src/app/page.tsx`, `src/app/globals.css`, `src/components/ui/GameButton.tsx`), so new screens look like the same game. `DESIGN.md` explains *why*; this file says *exactly how*. If something you need is not covered here, copy the closest landing pattern and note it in `DECISIONS.md`.

## 1. Read before building
1. `frontend/DESIGN.md`: direction, tokens, motion and copy.
2. `frontend/src/app/page.tsx`: the reference implementation for boards, tiles, chips, stats and headings.
3. `DECISIONS.md`: game rules (what the screen must show) and earlier UI decisions.
4. `frontend/AGENTS.md`: Next.js 16 differs from older versions; read `node_modules/next/dist/docs/` before using a Next API.

## 2. Color: tokens only
Use only the Tailwind tokens from `globals.css`:

| Token | Role |
|---|---|
| `garis` | Every outline and hard shadow |
| `malam` | Page background, outer boards |
| `papan` / `papan-terang` | Raised tiles on navy; active or selected tile |
| `dasar` | Deep bands, skill chips, footer |
| `langit` | Secondary fills (base-yield bar) |
| `gading` | Section and page headings |
| `emas` / `emas-tua` | Primary CTA, key numbers, rewards; gold bevel |
| `zamrud` | Brand accent: skills, highlights. Never means "Buy" |
| `naik` / `turun` | Buy/Sell and positive/negative returns; `turun` also marks errors (the only negative color) |
| `kristal` / `kristal-terang` | The Monad crystal only. Never in UI chrome |

Body text is `text-white` at `/85`, `/75`, `/70`, `/60` or `/55` (all pass AA on navy). Never use the Tailwind default palette (`slate`, `gray`, `zinc`, `blue-500`, `purple-*`, and so on), and never write a raw hex outside `globals.css` except the ink shadow `#040B10` and gold bevel `#A17728`, which the landing already uses inside shadow classes.

## 3. Surfaces: copy these recipes

| Element | Classes (from the landing) |
|---|---|
| Board (section panel) | `rounded-[22px] border-[3px] border-garis bg-malam p-5 sm:p-6 shadow-[0_6px_0_0_#040B10]` |
| Hero board / feature card | same, with `bg-papan` and `shadow-[0_8px_0_0_#040B10]`; a quest-style card may tilt `md:-rotate-2`/`md:rotate-1` |
| Tile inside a board | `rounded-[14px] border-[3px] border-garis bg-papan px-3 py-2` (or `bg-dasar` for skills) |
| Stat badge | `rounded-[16px] border-[3px] border-garis bg-malam/90 px-4 py-3`; label `text-sm font-extrabold text-white/70`; value `font-display text-2xl text-emas` |
| Chip / small count | `font-display rounded-[7px] border-2 border-garis bg-emas px-1 text-sm text-garis` |
| Numbered marker (real sequences only) | gold circle `h-11 w-11 rounded-full border-[3px] border-garis bg-emas font-display` |
| Buttons | `GameButton` (links) and `GameActionButton` (actions) only. Variants `gold` (primary, one per view) and `night`; `size="icon"` for close/menu buttons. Never hand-roll an action button (segmented tabs and selectable coin cards are toggles, not buttons) |

- Shadows are **hard and solid**: `shadow-[0_Npx_0_0_#040B10]`. No blurred shadows, no `shadow-lg`.
- An inner top highlight is allowed on bars: `shadow-[inset_0_5px_0_0_rgb(255_255_255/0.25)]`.
- No glassmorphism. `backdrop-blur` exists only on the floating nav.
- No gradients, except dark overlays that keep text readable on top of art.
- Radii follow hierarchy: 26 (hero banner) > 22 (board) > 16 (stat) > 14 (tile, button) > 7 (chip).

## 4. Type
- `font-display` (Bree Serif) for headings, big numbers, chips and buttons. Add `title-outline` only to page and section titles (`text-4xl sm:text-5xl text-gading`).
- Nunito for everything else. Body text is `font-semibold leading-relaxed`; labels are `font-extrabold`. Never use font-light or normal weight for body text.
- Sentence case everywhere. No all-caps eyebrows or tracked-out labels. The one exception is skill names (BOOST, LOCK…), which the landing sets as names.
- Keep lines short: `max-w-xl` or `max-w-md` for paragraphs.

## 5. Layout
- Page container: `mx-auto max-w-6xl px-4 sm:px-6`. Section rhythm: `py-20 sm:py-24`, or tighter (`py-10`) inside app screens.
- Mobile first: everything must work at **375 px** with no horizontal page scroll. Grids collapse to one column.
- Every screen sits inside the shared shell: testnet banner, nav and footer.
- One focal element per screen (the deposit amount, the claim total, the preset choice). Everything around it stays quiet.

## 6. Imagery and icons
- Reuse the art in `public/assets/landing/` (chest, treasure, shield, trophy, season banner, bot portraits) and `public/brand/`. Use `next/image` with honest `alt` text, or `alt=""` for decorative images.
- No icon library is installed. If you need an icon, draw a small inline SVG with a 2.5–3 px `garis` stroke and token fills, so it matches the outlined game style. **Never use emoji as icons.**
- No casino cues: no felt, chips, dice, roulette or slots.

## 7. Motion
- Use `motion/react`. One orchestrated moment per screen at most (for example, the claim total counting up). Beyond that, motion only answers user actions: press, open, confirm, state change.
- No fade-and-slide-up on every section, and no hover lift on every card.
- Reduced motion: the `initial` state is always the hidden state, and under `useReducedMotion()` the transition has zero duration (the landing's hydration fix). No idle loops.

## 8. Copy
- English, plain and a little playful, in the landing's vocabulary: "Principal Crystal", "house bots", "season points", "at maturity", "Buy/Sell" (never Up/Down).
- Numbers use en-US: "1,000 mUSD", "42.5". Money is `bigint` in 6-decimal units, formatted through `src/lib/format.ts`. Never use floats for money.
- Yield figures in demo mode carry a "simulated" label.
- Buttons are a verb, 1–3 words, with no arrow glyph and no exclamation mark. Errors say what happened and what to do.
- No lorem ipsum. Use realistic dummy data that fits the game rules in `DECISIONS.md`.

## 9. Banned "AI slop" patterns
- Rows of identical rounded cards with soft gray shadows.
- Gradient text, purple/indigo gradient washes, neon glows on UI.
- A big number + small label + gradient accent hero tile as the default for every stat.
- Emoji icons, `→` on buttons, all-caps eyebrows, `A · B · C` meta strings (the required "Testnet · simulation" banner is the only exception).
- Generic SaaS copy: "Welcome back!", "Unlock", "Seamless", "Supercharge", "Get started".
- `text-gray-*` or `bg-slate-*` anywhere.
- Decorative animations that run on their own.

## 10. Dummy data and dev states (UI-first phase)
- Dummy data lives in `src/mocks/<area>.ts`. Its shape mirrors what the backend will send (see `openspec/changes/build-crypto-draft-mvp/specs/backend-data-api/spec.md`).
- Components receive data through props and never import mocks themselves; pages import from `src/mocks/`.
- Each page exposes every state through `?state=<name>`, read with the shared helper in `src/lib/dev-state.ts`. The `DevStateBar` from `src/components/ui/` lists the states in development builds only.
- Actions (deposit, claim, connect) only move the UI through pending → success. No real transactions.

## 11. Definition of done for every screen
1. `pnpm --filter frontend lint` and `pnpm --filter frontend build` pass.
2. Start the `frontend` preview (`.claude/launch.json`) and take screenshots at 1280 px and 375 px of **every** dev state. Look at each one next to the landing and fix anything that doesn't look like the same game.
3. Check `prefers-reduced-motion` and keyboard focus (gold focus ring visible).
4. Self-critique pass: remove one decoration that doesn't earn its place.
5. Work on a branch `feat/frontend-<name>`, and commit as `feat(frontend): ...` **with no Co-Authored-By or other AI trailer**. Don't push or merge; Farhan reviews first.

## 12. Running Farhan's agents
The agents live in `.claude/agents/` (Claude Code subagents). Order:
1. **`farhan-shell-kit`** runs first and alone. Everything else builds on its layout, UI kit, `format.ts` and `dev-state.ts`.
2. After it is merged, run **`farhan-deposit`** and **`farhan-claim-landing`**. If they run at the same time, give each its own git worktree, so their branches don't collide in one checkout.
3. Run **`jitu-ui-reviewer`** on each finished branch before merging, and fix what it flags.

Example prompts in Claude Code:
- "Use the farhan-shell-kit agent to build the shell and UI kit."
- "Use the jitu-ui-reviewer agent to review branch feat/frontend-deposit."
