import type { Metadata } from "next";
import { Suspense } from "react";
import { PlayLobby, type LobbyState } from "@/components/table/PlayLobby";
import { DemoTableGame } from "@/components/table/DemoTableGame";
import { GameShell } from "@/components/table/GameShell";
import { NewSeasonControl } from "@/components/table/NewSeasonControl";
import { getPreset } from "@/mocks/table";
import "./lobby.css";

export const metadata: Metadata = { title: "Choose your clash | jitu.fi" };

type Props = { searchParams: Promise<{ state?: string; demo?: string; preset?: string }> };

// Development only: /play?demo=1[&preset=standard] runs a local simulation with the N phase shortcut.
const DEV = process.env.NODE_ENV === "development";

async function Route({ searchParams }: Props) {
  const { state, demo, preset } = await searchParams;
  if (DEV && demo === "1") return <GameShell game><DemoTableGame preset={getPreset(preset)} /></GameShell>;
  const valid: LobbyState[] = ["ready", "season-closing", "active-table", "outside-k"];
  const initialState = valid.includes(state as LobbyState) ? state as LobbyState : "ready";
  return <main className="play-lobby"><PlayLobby initialState={initialState} preview={valid.includes(state as LobbyState)} /><NewSeasonControl /></main>;
}

export default function PlayPage(props: Props) {
  return <Suspense fallback={<main className="play-lobby"><p role="status">Preparing your clash…</p></main>}><Route {...props} /></Suspense>;
}
