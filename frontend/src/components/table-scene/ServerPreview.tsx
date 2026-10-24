"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { TableScene } from "./TableScene";
import { fromTableState } from "./adapter-server";
import { serverFixture, SERVER_TICKS } from "./fixture-server";
import type { ServerPhase } from "./server-types";

const PHASES: ServerPhase[] = ["Commit", "Reveal", "Live", "Settled", "Finished"];

export function ServerPreview() {
  const params = useSearchParams();
  const phase = PHASES.find((p) => p.toLowerCase() === params.get("phase")?.toLowerCase()) ?? "Live";
  const view = params.get("view") === "2d" ? "2d" : "auto";
  const scene = fromTableState(serverFixture(phase), { ticks: SERVER_TICKS });
  return (
    <main className="flex h-[100svh] min-h-0 flex-col overflow-hidden bg-malam">
      <nav aria-label="Server fixture phase" className="flex shrink-0 flex-wrap gap-2 border-b-[3px] border-garis bg-dasar px-4 py-2 text-sm font-extrabold text-gading">
        <span className="self-center">Server fixture</span>
        {PHASES.map((p) => <Link key={p} href={`?source=server&phase=${p.toLowerCase()}&view=${view}`} aria-current={p === phase ? "page" : undefined}
          className={`rounded-full px-3 py-1 focus-visible:outline-2 focus-visible:outline-emas ${p === phase ? "bg-emas text-garis" : "bg-papan"}`}>{p.toLowerCase()}</Link>)}
      </nav>
      <div className="relative min-h-0 flex-1 overflow-hidden"><TableScene {...scene} view={view} className="h-full" /></div>
    </main>
  );
}
