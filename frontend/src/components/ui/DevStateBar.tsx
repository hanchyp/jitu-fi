"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { DEV_STATE_PARAM, WRONG_NETWORK_STATE } from "@/lib/dev-state";
import { chipClass } from "./Chip";

type DevStateBarProps = {
  /** The page's registered states, default first (the same tuple passed to readDevState/useDevState). */
  states: readonly string[];
};

/**
 * Development-only switcher listing a page's `?state=` values as chips, plus the shell's
 * wrong-network state. Renders nothing in production builds.
 */
export function DevStateBar({ states }: DevStateBarProps) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <Suspense fallback={null}>
      <Bar states={states} />
    </Suspense>
  );
}

function Bar({ states }: DevStateBarProps) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [open, setOpen] = useState(true);
  const current = params.get(DEV_STATE_PARAM) ?? states[0];
  const all = states.includes(WRONG_NETWORK_STATE) ? states : [...states, WRONG_NETWORK_STATE];

  const hrefFor = (state: string) => {
    const next = new URLSearchParams(params.toString());
    if (state === states[0]) next.delete(DEV_STATE_PARAM);
    else next.set(DEV_STATE_PARAM, state);
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  return (
    <nav
      aria-label="Dev states"
      className="fixed bottom-3 right-3 z-[58] max-w-[calc(100vw-1.5rem)] rounded-[16px] border-[3px] border-garis bg-dasar px-3 py-2 shadow-[0_4px_0_0_#040B10] sm:max-w-md"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-extrabold text-white/70">
          Dev state <span className="text-white">{current}</span>
        </p>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-sm font-extrabold text-emas hover:text-white"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>
      {open && (
        <ul className="mt-2 flex flex-wrap gap-1.5">
          {all.map((state) => (
            <li key={state}>
              <Link
                href={hrefFor(state)}
                scroll={false}
                aria-current={state === current ? "true" : undefined}
                className={`${chipClass(state === current ? "gold" : "night")} !h-7 hover:bg-papan-terang hover:text-white aria-[current]:hover:bg-emas aria-[current]:hover:text-garis`}
              >
                {state}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </nav>
  );
}
