import type { Metadata } from "next";
import { Suspense } from "react";
import { GameShell } from "@/components/table/GameShell";
import { PlayLobby, type LobbyState } from "@/components/table/PlayLobby";

export const metadata: Metadata = { title: "Choose your clash | jitu.fi" };

type Props = { searchParams: Promise<{ state?: string }> };

async function Lobby({ searchParams }: Props) {
  const { state } = await searchParams;
  const valid: LobbyState[] = ["ready", "season-closing", "active-table", "outside-k"];
  const initialState = valid.includes(state as LobbyState) ? state as LobbyState : "ready";
  return <PlayLobby initialState={initialState} />;
}

export default function PlayPage(props: Props) {
  return <GameShell><Suspense fallback={<p role="status">Preparing your clash…</p>}><Lobby {...props} /></Suspense></GameShell>;
}
