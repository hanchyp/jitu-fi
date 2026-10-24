"use client";

import { useSearchParams } from "next/navigation";
import { DEV_STATE_PARAM, pickDevState } from "./dev-state";

// Client-side dev-state hooks. Kept apart from dev-state.ts so server components can import that
// module without pulling in useSearchParams.

/** Client components. Needs a <Suspense> boundary above it. */
export function useDevState<S extends string>(states: readonly [S, ...S[]], fallback?: S): S {
  return pickDevState(useSearchParams().get(DEV_STATE_PARAM), states, fallback);
}

/** The raw `?state=` value, for shell-level states like the wrong-network overlay. */
export function useRawDevState(): string | null {
  return useSearchParams().get(DEV_STATE_PARAM);
}
