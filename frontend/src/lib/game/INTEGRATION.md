# Server table integration (M2)

Numeric `/table/:id` routes read backend state. `demo-*`, `?demo=1` and
`NEXT_PUBLIC_USE_MOCKS=1` retain the demo path. REST uses the SIWE session at
`jitu.session`; backend expiry is Unix seconds. Neither path performs chain writes.

The WebSocket subscribes to the table and prices, reconnects with capped
exponential backoff, and refetches a private snapshot after reconnect. Events
received during that fetch are buffered and reduced over the snapshot. Hidden
opponent picks remain absent until Reveal; submitted events reveal only seats.
Countdown uses `phaseDeadlineMs`, with HTTP Date clock adjustment when exposed.
Cross-origin servers must expose Date for that adjustment; otherwise the local
clock is used.

`toDemoState` adapts server state to existing arena/dock/result props. Scoring
uses shared bigint functions; price integers remain decimal strings until
formatting. Final scores and round outcomes come directly from backend results.
Server chart dialogs show the latest quote and explicitly mark history unavailable,
rather than inventing historical samples. The Live line compares round open and
latest quote only.

Build prerequisite: `pnpm --filter @jitu-fi/shared build`. Runtime imports use
shared `dist/config` and `dist/scoring`: shared source uses `.js` specifiers that
Next's current resolver does not map to TypeScript files. No dependencies or
configuration files changed.

Boundaries for coordinator integration:

- Server HUD defaults to 2D and offers the same 2D/3D toggle as the demo.
  Commit retains the interactive 2D arena. After first selection, the server
  scene stays mounted, hidden with visibility/inert through 2D and Commit.
  Current WebSocket prices become server scene ticks; unsupported WebGL and
  reduced motion reuse the 2D arena fallback.
- Result popup uses authoritative game scores but leaves season credit pending
  confirmation. M5 owns history/on-chain record evidence.
- `picks.ts` provides the requested minimal helper signatures; reconcile with
  the dedicated picks worker on merge.
- Actual deposited game and wallet flow were not run. No keys or chain-writing
  endpoints were used.

Validation:

```text
pnpm --filter @jitu-fi/shared build       PASS
pnpm --filter frontend lint             PASS
pnpm --filter frontend build            PASS
backend tsx table/scene/game tests      34 pass, 0 fail
GET /table/demo-quick                   HTTP 200
GET /table/7                            HTTP 200
```

The HTTP checks are route smoke checks, not browser interaction verification.
Demo state-machine, seat, skill, score and scene regression tests remain green.
Run tests from backend:

```sh
pnpm exec tsx --tsconfig ../frontend/tsconfig.json --test \
  ../frontend/src/lib/game/game.test.ts \
  ../frontend/src/components/table/*.test.ts \
  ../frontend/src/components/table-scene/*.test.ts
```

## Server skills and 3D (M4/M6)

The dock reads the private server hand (up to three cards), commit flags, Live
skill effects and round awards. Commit skills count toward the one-skill limit
in the mapped state. Live submissions return their promise to the picker, so
failed requests retain friendly target/deadline/session errors rather than
reporting success. Incoming bot attacks use the existing toast; dismissals are
scoped to the round. The reducer consumes spent cards and applies capped awards.

Fixture validation: 60 table/game/scene tests pass, including server skill/error
mapping. Shared build passes. Frontend build passes with a temporary dummy
`NEXT_PUBLIC_PRIVY_APP_ID`; without a configured ID, prerender fails in the
existing wallet provider. Lint reports only the existing LiveLanding/LiveClaim
render-time Date.now errors. Deposited gameplay and browser viewport checks were
not performed; the existing fixed arena layout and scene fallbacks are reused.
