import type { HistoryGame } from "@/lib/game/history";

/** Final rank of `id`: 1 + players strictly ahead, so ties share a rank. */
export function rankOf(scores: Record<string, number>, id: string) {
  return 1 + Object.values(scores).filter((score) => score > scores[id]).length;
}

export type ResultOutcome = { rank: number; shared: boolean; title: string; tip?: string; medal: string | null; particles: number };

/** End-of-game popup copy and celebration size for your final rank. */
export function finalOutcome(scores: Record<string, number>, id = "you"): ResultOutcome {
  const rank = rankOf(scores, id);
  const shared = rank === 1 && Object.keys(scores).some((other) => other !== id && scores[other] === scores[id]);
  return {
    rank, shared,
    title: shared ? "Shared victory" : rank === 1 ? "Victory!" : rank <= 3 ? "Well played" : "Good game",
    tip: rank > 3 ? "Fewer picks = more confidence per call." : undefined,
    medal: rank <= 3 ? `/assets/stats/medal-${rank}.webp` : null,
    particles: rank === 1 ? 14 : rank <= 3 ? 10 : 0,
  };
}

export const EXPLORER_TX = "https://testnet.monadexplorer.com/tx/";

/** Season credit + on-chain record copy for a finished server game; `game` undefined = not loaded yet. */
export function recordLines(game: Pick<HistoryGame, "credit" | "recordStatus" | "recordTxHash"> | undefined, countedGames: number) {
  const status = game?.recordStatus;
  const final = status === "recorded" || status === "skipped" || status === "failed";
  const { credit } = game ?? {};
  const credited = credit && (status === "recorded" || status === "skipped" || credit.kind !== "counted");
  const credit_ = !credit || !final && credit.kind === "counted" && !credited ? "Recording your result on-chain…"
    : credit.kind === "counted" ? `+${credit.points ?? 0} season points · Game ${credit.gameNumber ?? "?"}/${countedGames}`
      : credit.kind === "outside-k" ? `Outside your first ${countedGames} games: no points` : "Season ended: no points";
  const note = status === "failed" ? "On-chain record failed. Your principal is unaffected."
    : status === "skipped" ? "Result not recorded on-chain." : null;
  return { credit: credit_, note, txUrl: game?.recordTxHash ? `${EXPLORER_TX}${game.recordTxHash}` : null, done: final };
}
