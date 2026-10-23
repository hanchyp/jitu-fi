export type LeaderboardRow = {
  rank: number;
  name: string;
  points: number;
  games: number;
  countedGames: number;
  weight: number;
  estimatedBonus: number;
  isYou?: boolean;
};

export type LeaderboardSeason = { tenor: "1 week" | "1 month"; rows: LeaderboardRow[] };

export const LEADERBOARDS: readonly LeaderboardSeason[] = [
  {
    tenor: "1 week",
    rows: [
      { rank: 1, name: "Bera", points: 8_420, games: 2, countedGames: 2, weight: 980, estimatedBonus: 84.2 },
      { rank: 2, name: "You", points: 7_640, games: 2, countedGames: 2, weight: 750, estimatedBonus: 76.4, isYou: true },
      { rank: 3, name: "Dex", points: 7_110, games: 3, countedGames: 2, weight: 620, estimatedBonus: 71.1 },
      { rank: 4, name: "Bruno", points: 6_980, games: 2, countedGames: 2, weight: 500, estimatedBonus: 69.8 },
    ],
  },
  { tenor: "1 month", rows: [] },
];
