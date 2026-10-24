import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayLobby, type LobbyState } from "@/components/table/PlayLobby";
import "./lobby.css";

export const metadata: Metadata = { title: "Choose your clash | jitu.fi" };

type Props = { searchParams: Promise<{ state?: string }> };

async function Lobby({ searchParams }: Props) {
  const { state } = await searchParams;
  const valid: LobbyState[] = ["ready", "season-closing", "active-table", "outside-k"];
  const initialState = valid.includes(state as LobbyState) ? state as LobbyState : "ready";
  return <PlayLobby initialState={initialState} />;
}

export default function PlayPage(props: Props) {
  return <main className="play-lobby"><Suspense fallback={<p role="status">Preparing your clash…</p>}><Lobby {...props} /></Suspense></main>;
}
