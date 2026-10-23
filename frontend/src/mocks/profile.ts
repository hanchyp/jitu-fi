// Dummy data shaped like GET /users/:addr/history (backend-data-api spec): the player's finished games,
// newest first, with per-round picks, skills and how many season points each game added, plus the
// current season summary. Scores are integer bps, computed with the DECISIONS.md rules so they add up:
// round score = cap × weighted average return of non-void picks (BOOST weighs 2, INSURANCE floors at 0),
// game score = Σ round scores ÷ Σ caps, season points = max(0, game score) over the first K games.
import { MOCK_NOW, VAULT_RULES, type SeasonTenor } from "./season";
import { POSITION_ACTIVE_WEEK } from "./position";
import type { COIN } from "@/lib/coins";

export type CoinSymbol = keyof typeof COIN;
export type SkillName = "BOOST" | "INSURANCE" | "LOCK" | "FLIP" | "SWAP" | "FREEZE";
export type PresetName = "Quick" | "Standard" | "Long" | "Marathon";
/** Who cast a skill: you or one of the house bots. */
export type Caster = "you" | "Bruno" | "Bera" | "Dex";

export type HistoryPick = {
  coin: CoinSymbol;
  /** The call that scored (after FLIP). */
  side: "buy" | "sell";
  /** The pick's return for its call, before INSURANCE. Integer bps. */
  returnBps: number;
  /** Moved less than 1 bps: neither right nor wrong, left out of the round score. */
  void: boolean;
  skills: { skill: SkillName; by: Caster }[];
  /** Set when SWAP replaced the original coin. */
  swappedFrom?: CoinSymbol;
};

export type HistoryRound = {
  round: number;
  cap: number;
  /** Didn't commit and reveal: scores 0 and can't win the round. */
  forfeit: boolean;
  roundScore: number;
  picks: HistoryPick[];
};

/** How the game's score reached season points. */
export type PointsCredit =
  | { kind: "counted"; gameNumber: number; points: number }
  | { kind: "outside-k" }
  | { kind: "after-end" };

export type HistoryGame = {
  tableId: number;
  seasonId: number;
  tenor: SeasonTenor;
  preset: PresetName;
  /** Unix seconds. */
  endedAt: number;
  /** Finish among the 4 seats (you + 3 house bots), by game score. */
  place: number;
  gameScore: number;
  credit: PointsCredit;
  rounds: HistoryRound[];
};

export type ProfileResponse = {
  address: string;
  /** The season your position is in. */
  season: { seasonId: number; tenor: SeasonTenor; seasonPoints: number; gamesCounted: number; countedGames: number };
  games: HistoryGame[];
};

export const PRESET_ROUNDS: Record<PresetName, number> = { Quick: 3, Standard: 5, Long: 7, Marathon: 10 };
const CAPS: Record<PresetName, number[]> = {
  Quick: [1, 2, 3],
  Standard: [1, 1, 2, 2, 3],
  Long: [1, 1, 2, 2, 3, 3, 4],
  Marathon: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5],
};

type PickInput = [coin: CoinSymbol, side: "buy" | "sell", returnBps: number, ...skills: { skill: SkillName; by: Caster }[]];
const mine = (skill: SkillName) => ({ skill, by: "you" as const });

const pick = ([coin, side, returnBps, ...skills]: PickInput, swappedFrom?: CoinSymbol): HistoryPick => ({
  coin,
  side,
  returnBps,
  void: returnBps === 0,
  skills,
  ...(swappedFrom ? { swappedFrom } : {}),
});

function round(index: number, cap: number, picks: HistoryPick[]): HistoryRound {
  const scored = picks.filter((p) => !p.void);
  let weights = 0;
  let sum = 0;
  for (const p of scored) {
    const w = p.skills.some((s) => s.skill === "BOOST") ? 2 : 1;
    const r = p.skills.some((s) => s.skill === "INSURANCE") ? Math.max(0, p.returnBps) : p.returnBps;
    weights += w;
    sum += w * r;
  }
  return { round: index + 1, cap, forfeit: picks.length === 0, roundScore: weights ? Math.trunc((cap * sum) / weights) : 0, picks };
}

function game(
  base: Omit<HistoryGame, "gameScore" | "credit" | "rounds">,
  rounds: HistoryPick[][],
  credit: { kind: "counted"; gameNumber: number } | { kind: "outside-k" } | { kind: "after-end" },
): HistoryGame {
  const caps = CAPS[base.preset];
  const built = rounds.map((picks, i) => round(i, caps[i], picks));
  const gameScore = Math.trunc(built.reduce((s, r) => s + r.roundScore, 0) / caps.reduce((s, c) => s + c, 0));
  return {
    ...base,
    gameScore,
    credit: credit.kind === "counted" ? { ...credit, points: Math.max(0, gameScore) } : credit,
    rounds: built,
  };
}

const minutesAgo = (m: number) => MOCK_NOW - m * 60;

const GAMES: HistoryGame[] = [
  game(
    { tableId: 1_042, seasonId: 4, tenor: "week", preset: "Quick", endedAt: minutesAgo(1), place: 2 },
    [
      [pick(["BTC", "buy", 212])],
      [pick(["ETH", "buy", 150]), pick(["SOL", "sell", 96, mine("FLIP")])],
      [pick(["MON", "buy", 300, mine("BOOST")]), pick(["DOGE", "sell", 48])],
    ],
    { kind: "counted", gameNumber: 1 },
  ),
  game(
    { tableId: 1_017, seasonId: 3, tenor: "month", preset: "Quick", endedAt: minutesAgo(1_452), place: 1 },
    [
      [pick(["ETH", "buy", 40])],
      [pick(["BTC", "sell", 22]), pick(["SOL", "sell", 18])],
      [pick(["MON", "buy", 75, mine("LOCK")])],
    ],
    { kind: "after-end" },
  ),
  game(
    { tableId: 1_011, seasonId: 3, tenor: "month", preset: "Long", endedAt: minutesAgo(1_470), place: 1 },
    [
      [pick(["BTC", "buy", 88])],
      [pick(["MON", "sell", 130])],
      [pick(["ETH", "buy", 75]), pick(["BNB", "sell", 31])],
      [pick(["SOL", "buy", 160, mine("LOCK")])],
      [pick(["DOGE", "sell", 42]), pick(["XRP", "buy", 9]), pick(["AVAX", "buy", -6, { skill: "FREEZE", by: "Dex" }])],
      [pick(["BTC", "buy", 210, mine("BOOST")]), pick(["ETH", "buy", 0])],
      [pick(["SOL", "sell", 95]), pick(["MON", "buy", 140])],
    ],
    { kind: "outside-k" },
  ),
  game(
    { tableId: 1_006, seasonId: 3, tenor: "month", preset: "Quick", endedAt: minutesAgo(1_489), place: 3 },
    [
      [pick(["SOL", "buy", -54])],
      [],
      [pick(["ETH", "sell", 12]), pick(["BTC", "sell", -30, { skill: "FREEZE", by: "Bera" }])],
    ],
    { kind: "counted", gameNumber: 2 },
  ),
  game(
    { tableId: 1_002, seasonId: 3, tenor: "month", preset: "Standard", endedAt: minutesAgo(1_501), place: 1 },
    [
      [pick(["XRP", "sell", 64])],
      [pick(["BNB", "buy", -22, mine("INSURANCE")])],
      [pick(["ETH", "buy", 118]), pick(["AVAX", "buy", 0])],
      [pick(["BTC", "sell", 41, { skill: "FREEZE", by: "Bera" }]), pick(["SOL", "buy", -15])],
      [pick(["DOGE", "buy", 190, mine("SWAP")], "MON")],
    ],
    { kind: "counted", gameNumber: 1 },
  ),
];

const current = (games: HistoryGame[]) => {
  const inSeason = games.filter((g) => g.seasonId === POSITION_ACTIVE_WEEK.seasonId);
  return {
    seasonId: POSITION_ACTIVE_WEEK.seasonId,
    tenor: POSITION_ACTIVE_WEEK.tenor,
    seasonPoints: inSeason.reduce((s, g) => s + (g.credit.kind === "counted" ? g.credit.points : 0), 0),
    gamesCounted: inSeason.filter((g) => g.credit.kind === "counted").length,
    countedGames: VAULT_RULES.countedGames,
  };
};

/** One counted game in the live 1-week season, plus last month's season: counted, beyond K and late games. */
export const PROFILE: ProfileResponse = { address: POSITION_ACTIVE_WEEK.address, season: current(GAMES), games: GAMES };

/** Deposited, no game finished yet. */
export const PROFILE_EMPTY: ProfileResponse = { address: POSITION_ACTIVE_WEEK.address, season: current([]), games: [] };
