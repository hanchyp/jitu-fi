export type ProfileRound = { round: number; score: number; picks: number; skill?: string };
export type ProfileGame = { id: string; preset: string; score: number; placed: number; playedAt: string; rounds: ProfileRound[] };

export const PROFILE_GAMES: readonly ProfileGame[] = [
  {
    id: "quick-042",
    preset: "Quick 3",
    score: 7_640,
    placed: 2,
    playedAt: "Today, 14:32",
    rounds: [
      { round: 1, score: 1_830, picks: 1, skill: "BOOST" },
      { round: 2, score: 2_240, picks: 2 },
      { round: 3, score: 3_570, picks: 2, skill: "FLIP" },
    ],
  },
  {
    id: "standard-041",
    preset: "Standard 5",
    score: 5_230,
    placed: 3,
    playedAt: "Yesterday, 19:08",
    rounds: [
      { round: 1, score: 980, picks: 1 }, { round: 2, score: 1_470, picks: 2, skill: "INSURANCE" }, { round: 3, score: 2_780, picks: 3 },
    ],
  },
];
