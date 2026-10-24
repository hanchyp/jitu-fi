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
