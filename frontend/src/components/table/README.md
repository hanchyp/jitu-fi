# Jeki: dummy game flow

Open `/play`, choose a preset, then play a demo table. Commit lasts 20 seconds,
Reveal lasts 10 seconds, Live varies between 60 and 120 seconds, and results
remain visible for 8 seconds. Locking picks simulates a pending request. The
timer continues automatically through every round to the final podium.

The game uses a fixed viewport and a 2D illustrated stone arena, with eight
selectable coins on its surface and four seats around the rim. The challenger
sits at the near edge. Revealed picks appear at their owners' seats, and winning
seats light up, including ties. A compact control dock stays at the lower rim
through every phase. No game phase adds page scrolling. In-game does not load
the 3D scene or require WebGL.

Click a table coin to open its chart dialog, then confirm Buy or Sell. Confirmation
adds or updates the pick and returns to the table; closing the dialog makes no
selection. The dialog also supports removing an existing pick. Chart and token
quotes share one simulated clock, with Live prices following the scoring path.
Once picks are locked, charts remain available with the action buttons disabled.

Picks form a separate hand beside each avatar, with no card frames. Your hand
shows coin icons, symbols and Buy/Sell; opponent hands show only Jitu crests
and a count during Commit, then flip
open at Reveal. Confirming a new pick pulses the central coin, creates a copy,
and deals the copy into your hand. Removing a pick or starting the next round
returns the copies to the central market. Reduced motion skips travel effects.

Coin visuals use two CSS 3D faces and rim slices over the 2D table. Reveal flips
from the Jitu reverse to the asset face, with a staggered lift, glint and soft
settle; hidden hands never receive a front-face asset. Dealt copies follow a
smooth curved path with eased lift/landing and a slight 3D tilt. No continuous
spin is applied, and reduced motion shows the final face without the flip.

Every screen size uses the interactive 2D table. Tap a seat for the full
pick/return breakdown. The lobby
keeps its cut-stone preset cards and landing-style arena preview.

Preview URLs:

- `/play?state=season-closing`
- `/play?state=active-table`
- `/play?state=outside-k`
- `/table/demo-quick?phase=reveal&scenario=insured-pick`
- `/table/demo-quick?phase=reveal&scenario=forfeit`
- `/table/demo-quick?phase=results&scenario=tie`
- `/table/demo-quick?phase=live&scenario=void`
- `/table/demo-quick?phase=finished&scenario=outside-k`
- `/table/demo-quick?phase=finished&scenario=season-cutoff`

Demo controls also switch phases/scenarios and pause the clock. Preview changes
reset the game and pause the timer; Resume timer runs from that preview.

Run the state-machine tests from the repo root using the existing backend TS runner:

```sh
pnpm --filter backend exec tsx --tsconfig ../frontend/tsconfig.json --test ../frontend/src/components/table/demo-engine.test.ts ../frontend/src/components/table/seat-hand.test.ts
pnpm --filter frontend lint
pnpm --filter frontend build
```

All data is local to `src/mocks/table.ts`; the reducer owns simulation state.
There are no wallet transactions, backend calls, or persisted season credits.
`/play` uses Farhan's shared shell. The fixed table keeps a compact local HUD
and hides the shared banner/nav/footer through `data-site-chrome` markers.
The arena wrapper imports the existing world without changing Mario's files;
his coin spirits, live skills, and price chart can consume table state through
props when available. No dependencies or shared package files were changed.

Game styles use explicit `jitu-game-` class names. The existing Tailwind/Turbopack
loader treats CSS modules as global CSS and drops their class exports, so the
game imports `game-styles.ts` and its scoped stylesheet instead.
