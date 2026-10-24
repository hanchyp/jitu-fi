import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { GameShell } from "@/components/table/GameShell";
import { ServerTableGame } from "@/components/table/ServerTableGame";

export const metadata: Metadata = { title: "Arena table | jitu.fi" };

type Props = { params: Promise<{ id: string }> };

async function Table({ params }: Props) {
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  return <ServerTableGame key={id} id={Number(id)} />;
}

export default function TablePage(props: Props) {
  return <GameShell game><Suspense fallback={<p role="status">Preparing the arena…</p>}><Table {...props} /></Suspense></GameShell>;
}
