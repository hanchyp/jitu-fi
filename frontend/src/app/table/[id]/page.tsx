import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/table/GameShell";
import { TableGame } from "@/components/table/TableGame";
import { OUTCOMES, type Outcome } from "@/components/table/demo-engine";
import { getPreset, PHASES, PRESETS, SCENARIOS, type Phase, type Scenario } from "@/mocks/table";

export const metadata: Metadata = { title: "Arena table | jitu.fi" };

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ preset?: string; phase?: string; scenario?: string; outcome?: string }>;
};

async function DemoTable({ params, searchParams }: Props) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  // UI-only tables have explicit demo IDs; arbitrary IDs must not look like real games.
  if (!PRESETS.some((preset) => id === `demo-${preset.id}`)) notFound();
  const preset = getPreset(id.replace("demo-", ""));
  const phase = PHASES.includes(query.phase as Phase) ? query.phase as Phase : "commit";
  const scenario = SCENARIOS.includes(query.scenario as Scenario) ? query.scenario as Scenario : "default";
  const outcome = OUTCOMES.includes(query.outcome as Outcome) ? query.outcome as Outcome : undefined;
  return <TableGame key={`${id}-${phase}-${scenario}-${outcome}`} preset={preset} initialPhase={phase} initialScenario={scenario} initialOutcome={outcome} preview={Boolean(query.phase)} />;
}

export default function TablePage(props: Props) {
  return <GameShell game><Suspense fallback={<p role="status">Preparing the arena…</p>}><DemoTable {...props} /></Suspense></GameShell>;
}
