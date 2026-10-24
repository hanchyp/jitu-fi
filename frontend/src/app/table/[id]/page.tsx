import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/table/GameShell";
import { ServerTableGame } from "@/components/table/ServerTableGame";
import { TableGame } from "@/components/table/TableGame";
import { OUTCOMES, type Outcome } from "@/components/table/demo-engine";
import { getPreset, PHASES, SCENARIOS, type Phase, type Scenario } from "@/mocks/table";

export const metadata: Metadata = { title: "Arena table | jitu.fi" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string; phase?: string; scenario?: string; outcome?: string; demo?: string }>;
};

async function DemoTable({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  if (/^\d+$/.test(id) && query.demo !== "1" && process.env.NEXT_PUBLIC_USE_MOCKS !== "1") return <ServerTableGame key={id} id={Number(id)} />;
  // UI-only tables have explicit demo IDs; arbitrary IDs must not look like real games.
  if (!id.startsWith("demo-") && query.demo !== "1" && process.env.NEXT_PUBLIC_USE_MOCKS !== "1") notFound();
  const preset = getPreset(query.preset || id.replace("demo-", ""));
  const phase = PHASES.includes(query.phase as Phase) ? query.phase as Phase : "commit";
  const scenario = SCENARIOS.includes(query.scenario as Scenario) ? query.scenario as Scenario : "default";
  const outcome = OUTCOMES.includes(query.outcome as Outcome) ? query.outcome as Outcome : undefined;
  return <TableGame key={`${id}-${phase}-${scenario}-${outcome}`} preset={preset} initialPhase={phase} initialScenario={scenario} initialOutcome={outcome} preview={Boolean(query.phase)} />;
}

export default function TablePage(props: Props) {
  return <GameShell game><Suspense fallback={<p role="status">Preparing the arena…</p>}><DemoTable {...props} /></Suspense></GameShell>;
}
