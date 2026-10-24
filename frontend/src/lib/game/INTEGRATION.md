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

- Server view currently uses the interactive 2D arena. Demo 2D/3D toggle remains
  unchanged; M6 can connect its server scene adapter to `ServerTableGame`.
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
