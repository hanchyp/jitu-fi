import { PLAYERS, type Pick } from "@/mocks/table";
import { playerPicks, type DemoState } from "./demo-engine";

export type SeatHandView = { count: number; concealed: boolean; picks: Pick[] };

// Concealed hands expose their count only, including to labels and seat details.
export function seatHandView(state: DemoState, playerId: string): SeatHandView {
  const human = PLAYERS.find((player) => player.id === playerId)?.human ?? false;
  const picks = state.phase === "commit" && human ? state.picks : playerPicks(state)[playerId] ?? [];
  const concealed = state.phase === "commit" && !human;
  return { count: picks.length, concealed, picks: concealed ? [] : picks };
}
