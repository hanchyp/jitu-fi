"use client";

import { Suspense, type ReactNode } from "react";
import { useDevState } from "@/lib/dev-state";

type DevStateSwitchProps<S extends string> = {
  /** The page's registered states, default first. */
  states: readonly [S, ...S[]];
  /** What to render for each state. The default state's view is also the prerender fallback. */
  views: Record<S, ReactNode>;
};

function Pick<S extends string>({ states, views }: DevStateSwitchProps<S>) {
  return <>{views[useDevState(states)]}</>;
}

/**
 * Renders one of several server-built views by `?state=`, for static pages (like the landing) that
 * should stay prerendered: the default view is the static shell, the requested one swaps in on the client.
 */
export function DevStateSwitch<S extends string>({ states, views }: DevStateSwitchProps<S>) {
  return (
    <Suspense fallback={views[states[0]]}>
      <Pick states={states} views={views} />
    </Suspense>
  );
}
