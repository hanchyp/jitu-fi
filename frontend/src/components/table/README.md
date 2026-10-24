# Jeki: dummy game flow

Open `/play`, choose a preset, then play a demo table. Commit lasts 20 seconds,
Reveal lasts 10 seconds, Live varies between 60 and 120 seconds, and results
remain visible for 8 seconds. Locking picks simulates a pending request. The
timer continues automatically through every round to the final podium.

The game uses a fixed viewport and a 2D illustrated stone arena, with eight
selectable coins on its surface and four seats around the rim. The challenger
sits at the near edge. Revealed picks appear at their owners' seats, and winning
seats light up, including ties. A compact control dock stays at the lower rim
through every phase. No game phase adds page scrolling. The table stays 2D;
one shared WebGL canvas renders the landing's actual `world/Coin` geometry over
coin anchors, including animated copies. The reverse uses the Jitu crest.
Unsupported WebGL falls back to the existing CSS coin faces.

Click a table coin to open its chart dialog, then confirm Buy or Sell. Confirmation
adds or updates the pick and returns to the table; closing the dialog makes no
selection. The dialog also supports removing an existing pick. Chart and token
quotes share the live backend feed when all eight coins are available. Live starts
snapshot round opening prices; integer bps returns drive scoring. Disconnected or
incomplete feeds retain the deterministic simulation, identified in the HUD.
Once picks are locked, charts remain available with the action buttons disabled.

Picks form a separate hand beside each avatar, with no card frames. Your hand
shows coin icons, symbols and Buy/Sell; opponent hands show only Jitu crests
and a count during Commit, then flip
open at Reveal. Confirming a new pick pulses the central coin, creates a copy,
and deals the copy into your hand. Removing a pick or starting the next round
returns the copies to the central market. Reduced motion skips travel effects.

Fallback coin visuals use two CSS 3D faces and rim slices over the 2D table. Reveal flips
from the Jitu reverse to the asset face, with a staggered lift, glint and soft
settle; hidden hands never receive a front-face asset. Dealt copies follow a
smooth curved path with eased lift/landing and a slight 3D tilt. No continuous
spin is applied, and reduced motion shows the final face without the flip.

During Live, the center shows the player's sealed picks rather than the full
draft board. Tabs switch the focused pick; its 3D coin, direction, current quote,
return and price path remain visible. Quotes and returns use the same price source
as scoring. Live charts contain received history only (up to 15 minutes). Unsealed picks show a forfeit state instead of an active position.

The HUD's 2D/3D toggle (per tab, default 2D) swaps the board for the read-only
`TableView3D` scene during Reveal, Live and results. Commit always uses the 2D
board, because coin picking lives on its market. Once loaded, the 3D canvas stays
mounted but hidden through Commit and 2D selections. Live reserves separate rows
for opponent seats/hands, the live readout, and your seat; the crystal caption
stays above the dock. Every screen size uses the interactive 2D table. Tap a seat for the full
pick/return breakdown. The lobby
keeps its cut-stone preset cards and landing-style arena preview.

Dev-only local demo: `/play?demo=1` (optional `&preset=standard|long|marathon`,
default quick) runs `DemoTableGame` on the local reducer, with the normal timer.
Press `N` to advance one phase (final Results to Finished). Repeats, Ctrl/Meta/Alt,
typing in fields and open dialogs are ignored. No backend writes, wallet or chain
calls; production ignores the query.

Season managers (wallets holding `SEASON_MANAGER_ROLE` on the vault, checked on-chain by
the backend, Monad testnet only): `N` on `/table/[id]` ends the current phase of their own
table through the engine; `Shift+R` on `/play` opens a confirm dialog that creates a new
testnet season through the keeper. Other wallets get a permission error; nothing is sent
until the explicit action.

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
pnpm --filter frontend exec tsx --test src/components/table/demo-engine.test.ts src/components/table/seat-hand.test.ts src/components/table/live-picks.test.ts
pnpm --filter frontend lint
pnpm --filter frontend build
```

Game fixtures remain local to `src/mocks/table.ts`; the reducer owns demo state.
`lib/game/livePrices.ts` shares one reconnecting prices WebSocket across subscribers,
with at most one history sample per coin per second. Tests inject feed snapshots
through the reducer; omitting them retains the original simulation. There are no
wallet transactions or persisted season credits.
`/play` uses Farhan's shared shell. The fixed table keeps a compact local HUD
and hides the shared banner/nav/footer through `data-site-chrome` markers.
The arena wrapper imports the existing world without changing Mario's files;
coin spirits and skills consume the same table state through props. No dependencies or shared package files were changed.

Game styles use explicit `jitu-game-` class names. The existing Tailwind/Turbopack
loader treats CSS modules as global CSS and drops their class exports, so the
game imports `game-styles.ts` and its scoped stylesheet instead.


The dock mounts the compact `SkillHand` in Commit and Live. Its shared modal
picker adds BOOST/INSURANCE to a drafted pick (Clear skill undoes this before
locking), or casts LOCK on your pick and FREEZE/FLIP/SWAP on a rival. A sealed
commit skill counts as your one skill for the round. The one-card starting
hand and deterministic round-win rewards follow the start/deal limits. Rewards
cycle all six skills. Live previews start with LOCK/FLIP/SWAP; a normal Commit
hand starts with BOOST (INSURANCE in the insured-pick fixture).

`effects` uses stable owner/slot ids, separate from commit skills. Each live
cast records its original coin, side and cast progress. LOCK/FREEZE retain the
first segment; FLIP/SWAP add separately truncated price-relative segments.
SWAP preserves the victim's side and cannot use their original/current round
coins. One live effect per pick and one attack per victim apply to bots too.
A bot with an unused skill attacks an eligible human at 40% of Live, rotating
FREEZE, FLIP and SWAP across rounds. Tie/void fixtures skip bot attacks so those
previews retain their purpose. Reload still resets everything.

Round bursts and final confetti use the shipped table-fx assets, held static
under reduced motion. Earned-card and incoming-attack notices own a dock row,
so they cannot cover the near seat. Finished shows simulated season credits,
See your rank, Game details and Play again, with no automatic redirect.
`/leaderboard?highlight=you` identifies the existing own row;
`/profile?game=latest` expands the latest sample game. These destinations remain
fixtures, and the table explicitly says the demo result is not saved.

Additional rules/segment/adapter tests:

```sh
pnpm --filter backend exec tsx --tsconfig ../frontend/tsconfig.json --test ../frontend/src/components/table/*.test.ts ../frontend/src/components/table-scene/*.test.ts
```
