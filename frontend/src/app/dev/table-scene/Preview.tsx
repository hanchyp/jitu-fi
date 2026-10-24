"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useReducer } from "react";
import { TableScene, TableView3D } from "@/components/table-scene";
import { createDemo, demoReducer } from "@/components/table/demo-engine";
import { COINS, getPreset } from "@/mocks/table";
import { FIXTURE_SEATS, useFixtureTable } from "@/components/table-scene/fixture";
import type { TablePhase, TableSceneProps } from "@/components/table-scene";

const PHASES: TablePhase[] = ["commit", "reveal", "live", "result"];
const VIEWS: NonNullable<TableSceneProps["view"]>[] = ["auto", "3d", "2d"];
/** Special states: Bera forfeits the round, or the final podium sprays confetti. */
const STATES = ["normal", "forfeit", "final"] as const;
type State = (typeof STATES)[number];

const FORFEIT_SEATS = FIXTURE_SEATS.map((s) => (s.id === "bera" ? { ...s, forfeit: true } : s));

function pick<T extends string>(value: string | null, options: readonly T[], fallback: T) {
  return options.find((o) => o === value) ?? fallback;
}

function FixtureScene({ phase, view, state }: { phase: TablePhase; view: TableSceneProps["view"]; state: State }) {
  const table = useFixtureTable(phase, state === "forfeit" ? FORFEIT_SEATS : FIXTURE_SEATS);
  return <TableScene {...table} phase={phase} view={view} celebrate={state === "final"} className="h-full" />;
}

// ?source=demo: Jeki's demo reducer on its own timer, drawn through <TableView3D>. Your pick is
// made and locked automatically each round so the seats always have spirits.
function DemoScene({ preset }: { preset: string }) {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => createDemo(getPreset(preset)));
  useEffect(() => {
    dispatch({ type: "tick", now: Date.now() });
    const timer = setInterval(() => dispatch({ type: "tick", now: Date.now() }), 200);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (state.phase !== "commit") return;
    dispatch({ type: "select", symbol: COINS[state.round % COINS.length].symbol });
    dispatch({ type: "lock", now: Date.now() });
  }, [state.phase, state.round]);
  return (
    <>
      <p className="absolute left-4 top-3 z-10 rounded-full bg-dasar px-3 py-1 text-sm font-extrabold text-gading">
        Demo · round {state.round + 1}/{state.preset.caps.length} · {state.phase} · {state.remaining}s
      </p>
      <TableView3D state={state} fallback={<p className="p-6 text-gading">3D is off (no WebGL or reduced motion).</p>} />
    </>
  );
}

export function Preview() {
  const params = useSearchParams();
  if (params.get("source") === "demo") {
    return (
      <main className="relative h-[100svh] overflow-hidden bg-malam">
        <DemoScene preset={params.get("preset") ?? "quick"} />
      </main>
    );
  }
  return <FixturePreview />;
}

function FixturePreview() {
  const params = useSearchParams();
  const phase = pick(params.get("phase"), PHASES, "live");
  const view = pick(params.get("view"), VIEWS, "auto");
  const state = pick(params.get("state"), STATES, "normal");
  const href = (next: Partial<{ phase: TablePhase; view: string; state: State }>) =>
    `?${new URLSearchParams({ phase, view, state, ...next })}`;

  return (
    <main className="flex min-h-[100svh] flex-col bg-malam">
      <div className="flex flex-wrap items-center gap-2 border-b-[3px] border-garis bg-dasar px-4 py-2 text-sm font-extrabold">
        <span className="font-display text-base text-gading">Table scene</span>
        {PHASES.map((p) => (
          <Link key={p} href={href({ phase: p })} className={`rounded-full px-3 py-1 ${p === phase ? "bg-emas text-garis" : "bg-papan"}`}>
            {p}
          </Link>
        ))}
        <span className="mx-1 text-white/40">|</span>
        {VIEWS.map((v) => (
          <Link key={v} href={href({ view: v })} className={`rounded-full px-3 py-1 ${v === view ? "bg-zamrud text-garis" : "bg-papan"}`}>
            {v}
          </Link>
        ))}
        <span className="mx-1 text-white/40">|</span>
        {STATES.map((st) => (
          <Link
            key={st}
            // The final podium is a result-phase view.
            href={href(st === "final" ? { state: st, phase: "result" } : { state: st })}
            className={`rounded-full px-3 py-1 ${st === state ? "bg-gading text-garis" : "bg-papan"}`}
          >
            {st}
          </Link>
        ))}
      </div>
      <div className="relative flex-1">
        {/* Remounting restarts the fixture round from the chosen phase. */}
        <div className="absolute inset-0 overflow-y-auto">
          <FixtureScene key={`${phase}-${state}`} phase={phase} view={view} state={state} />
        </div>
      </div>
    </main>
  );
}
