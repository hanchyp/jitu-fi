import { PLAYERS } from "@/mocks/table";
import { playerPicks, type DemoState } from "./demo-engine";

export type LiveSelection = {
  playerIndex: number;
  direction: number;
  step: number;
  coins: Record<string, { round: number; symbol: string }>;
};
export const initialLiveSelection: LiveSelection = { playerIndex: 0, direction: 1, step: 0, coins: {} };

export function liveSelectionReducer(selection: LiveSelection, action: { type: "player"; direction: -1 | 1 } | { type: "coin"; round: number; symbol: string }): LiveSelection {
  if (action.type === "player") return { ...selection, playerIndex: (selection.playerIndex + action.direction + PLAYERS.length) % PLAYERS.length, direction: action.direction, step: selection.step + 1 };
  return { ...selection, coins: { ...selection.coins, [PLAYERS[selection.playerIndex].id]: { round: action.round, symbol: action.symbol } } };
}

export function livePlayerView(state: DemoState, selection: LiveSelection) {
  const player = PLAYERS[selection.playerIndex];
  // This panel is Live-only, even if it is accidentally mounted during Commit.
  const picks = state.phase === "live" ? playerPicks(state)[player.id] : [];
  const selected = selection.coins[player.id];
  const pick = (selected?.round === state.round ? picks.find((item) => item.symbol === selected.symbol) : undefined) ?? picks[0];
  return { player, picks, pick };
}
