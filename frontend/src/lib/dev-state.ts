/**
 * Dev states: every screen exposes its states through `?state=<name>` (UI_GUARDRAILS §10).
 *
 * Register a page's states as a const tuple, first entry = default:
 *   export const STATES = ["ready", "cooldown", "enrollment-closed"] as const;
 *
 * Server component page (Next 16 with cacheComponents: `searchParams` is runtime data, so read it
 * below a <Suspense> boundary and keep the page itself synchronous):
 *   export default function Page({ searchParams }: PageProps<"/deposit">) {
 *     return (
 *       <main className="flex-1">
 *         <Suspense fallback={<DepositSkeleton />}>
 *           <Deposit searchParams={searchParams} />
 *         </Suspense>
 *         <DevStateBar states={STATES} />
 *       </main>
 *     );
 *   }
 *   async function Deposit({ searchParams }) { const state = await readDevState(searchParams, STATES); ... }
 *
 * Client component: `const state = useDevState(STATES)`, with a <Suspense> boundary above it
 * (useSearchParams suspends during prerendering). The hooks are defined in the "use client" module
 * `./use-dev-state` and re-exported here, so server components can import this file without
 * pulling useSearchParams into the server graph.
 */

export type SearchParams = Record<string, string | string[] | undefined>;

export const DEV_STATE_PARAM = "state";

/** Shell-level state that works on every page: shows the wrong-network overlay. */
export const WRONG_NETWORK_STATE = "wrong-network";

/** Picks the requested state if the page registered it; otherwise the fallback (first state). */
export function pickDevState<S extends string>(
  raw: string | string[] | null | undefined,
  states: readonly [S, ...S[]],
  fallback: S = states[0],
): S {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (states as readonly string[]).includes(value ?? "") ? (value as S) : fallback;
}

/** Server components: pass the page's `searchParams` promise. Call it under <Suspense>. */
export async function readDevState<S extends string>(
  searchParams: Promise<SearchParams>,
  states: readonly [S, ...S[]],
  fallback?: S,
): Promise<S> {
  return pickDevState((await searchParams)[DEV_STATE_PARAM], states, fallback);
}

export { useDevState, useRawDevState } from "./use-dev-state";
