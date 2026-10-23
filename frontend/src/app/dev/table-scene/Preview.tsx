"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TableScene } from "@/components/table-scene";
import { useFixtureTable } from "@/components/table-scene/fixture";
import type { TablePhase, TableSceneProps } from "@/components/table-scene";

const PHASES: TablePhase[] = ["commit", "reveal", "live", "result"];
const VIEWS: NonNullable<TableSceneProps["view"]>[] = ["auto", "3d", "2d"];

function pick<T extends string>(value: string | null, options: readonly T[], fallback: T) {
  return options.find((o) => o === value) ?? fallback;
}

function FixtureScene({ phase, view }: { phase: TablePhase; view: TableSceneProps["view"] }) {
  const table = useFixtureTable(phase);
  return <TableScene {...table} phase={phase} view={view} className="h-full" />;
}

export function Preview() {
  const params = useSearchParams();
  const phase = pick(params.get("phase"), PHASES, "live");
  const view = pick(params.get("view"), VIEWS, "auto");
  const href = (next: Partial<{ phase: TablePhase; view: string }>) =>
    `?${new URLSearchParams({ phase, view, ...next })}`;

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
      </div>
      <div className="relative flex-1">
        {/* Remounting restarts the fixture round from the chosen phase. */}
        <div className="absolute inset-0 overflow-y-auto">
          <FixtureScene key={phase} phase={phase} view={view} />
        </div>
      </div>
    </main>
  );
}
