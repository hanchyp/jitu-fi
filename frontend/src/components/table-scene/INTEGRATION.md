# 3D board for the demo table

`<TableView3D>` draws the 3D coin-spirits scene from the same `DemoState` that drives
`ArenaTable`, so a 3D/2D toggle needs no new state.

`TableGame.tsx` loads the scene on the first 3D selection, then keeps it mounted
for the table's lifetime. The absolute `.jitu-table-stage3d` layer uses
`visibility: hidden`, `aria-hidden`, and `inert` while 2D is selected or Commit
is active. Its parent retains its size while the interactive 2D arena is shown.
Do not conditionally remove the scene, key it by countdown/phase/round, or use
`display: none`: toggles and phase transitions must retain the same canvas.
The table renders directly with toon materials and glow meshes. The shared
screen-space postprocessing composer produced intermittent black frames during
timer updates even with a stable canvas; it is intentionally omitted here.

## Props

- `state: DemoState`: the reducer state, passed as is. The view is read-only and never dispatches.
- `fallback?: ReactNode`: drawn when 3D is off. Default `null`.
- `className?: string`: extra classes. The view fills its parent (`h-full w-full`, no minimum height), so
  give the parent a size, e.g. Jeki's fixed table stage.

## What it shows

`fromDemoState(state)` (`adapter.ts`, tested in `adapter.test.ts`) maps:

- Seats: You, Bruno, Bera, Dex, on the podiums of their `PLAYERS` colors.
- Phase: commit, reveal and live map one to one; results and finished show the result podium, and
  finished adds confetti with the game scores and game winners.
- Picks: `playerPicks`, with `coinMove` as the return (the scoring path). Moves under 1 bps are void
  from Live on. BOOST and INSURANCE show as skill effects. Opponents' picks are empty during commit.
- Winners: the round's `winners` (ties give several), and a forfeit when your hand was not sealed.
- Ridges: each picked coin's price path from the round open up to the current Live progress.

## Fallbacks

- Loading: a dark pulse fills the stage while WebGL is checked and the 3D chunk loads (client only, no SSR).
- No WebGL, reduced motion, or a crash in the 3D scene: `fallback`.

Preview without the table page: `/dev/table-scene?source=demo&preset=quick`.

## Server state

`<TableView3D source="server" state={tableState} options={{ ticks }} />` accepts the
JSON snapshot returned by `engine.view()`. Omit `source` (or use `"demo"`) to retain
the original demo behavior. `fromTableState(state, { ticks })` is the pure adapter;
its local transport mirror is `server-types.ts`, independent of `lib/game`.

Seat IDs remain `you`, `bruno`, `bera`, `dex`. Commit suppresses rival picks even
if an unfiltered snapshot reaches the adapter. Reveal opens them. Settled uses
server round results/winners; Finished uses game scores/winners and celebrates.
The backend currently immediately starts the next round after settlement; the
adapter also supports a synthetic `Settled` snapshot for a result presentation.

Live `ticks` are an oldest-first array of `{ coin, price, expo, publishTime }`
from the current round. Keep received history in the data layer; the adapter
filters ticks outside the Live window and uses the latest for segment returns.
Ridges use the opening quote, received ticks, and authoritative settlement quote.
Only rendered price coordinates use floating point. Returns use bigint division,
truncated toward zero, including independently truncated FLIP/SWAP segments.
Because `@jitu-fi/shared` does not resolve from frontend, this adapter mirrors its
`scoring.ts` return formula locally. Settled raw returns and scores are authoritative.
`returnBps` retains the price-direction sign: the scene applies Buy/Sell itself;
INSURANCE does not erase the raw visual loss. BOOST remains a visual skill mark.

`ServerPreview` provides all five phase switches and a fixed no-network API-shaped
fixture (`fixture-server.ts`) for `/dev/table-scene?source=server&view=2d`.
