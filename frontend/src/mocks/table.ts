import { HOUSE_BOTS } from "@/lib/bots";
import { TABLE_COINS } from "@/lib/coins";

export type PresetId = "quick" | "standard" | "long" | "marathon";
export type Phase = "commit" | "reveal" | "live" | "results" | "finished";
export type CommitSkill = "BOOST" | "INSURANCE";
export type Pick = { symbol: string; direction: "Buy" | "Sell"; skill?: CommitSkill };
export type Player = { id: string; name: string; portrait: string; color: string; human: boolean };
export type Scenario = "default" | "forfeit" | "tie" | "void" | "insured-pick" | "outside-k" | "season-cutoff";
export type GamePreset = { id: PresetId; name: string; caps: number[]; description: string };

export const PRESETS: GamePreset[] = [
  { id: "quick", name: "Quick", caps: [1, 2, 3], description: "A short clash. Make every call count." },
  { id: "standard", name: "Standard", caps: [1, 1, 2, 2, 3], description: "Find your rhythm. Build your advantage." },
  { id: "long", name: "Long", caps: [1, 1, 2, 2, 3, 3, 4], description: "More rounds to turn the tables." },
  { id: "marathon", name: "Marathon", caps: [1, 1, 2, 2, 3, 3, 4, 4, 5, 5], description: "The full expedition. Go the distance." },
];

export const PLAYERS: Player[] = [
  { id: "you", name: "You", portrait: "/brand/jitu-crest.webp", color: "#DAAE4B", human: true },
  ...HOUSE_BOTS.map((bot) => ({ id: bot.short.toLowerCase(), name: bot.short, portrait: bot.portrait, color: bot.color, human: false })),
];

// Integer micro-dollars, with deterministic price paths. No market feed or random network data.
const PRICES = [67_420_000_000, 3_520_000_000, 172_640_000, 142_800, 598_200_000, 524_600, 28_960_000, 38_400];
const MOVES = [36, -24, 51, -17, 12, 0, -32, 43];
export const COINS = TABLE_COINS.map((coin, index) => ({
  ...coin, priceMicros: PRICES[index], moveBps: MOVES[index],
  history: Array.from({ length: 18 }, (_, step) => 30 + Math.sin(step * 0.8 + index) * 10 + step * (index % 2 ? -0.6 : 0.8)),
}));

export const DEMO_SEASON = { gamesPlayed: 1, countedGames: 2, label: "Week 01", remainingSeconds: 36 * 60 };
export const PHASES: Phase[] = ["commit", "reveal", "live", "results", "finished"];
export const SCENARIOS: Scenario[] = ["default", "forfeit", "tie", "void", "insured-pick", "outside-k", "season-cutoff"];
export const LIVE_SECONDS = [87, 73, 102, 64, 91, 118, 78, 96, 69, 110];

export function getPreset(value?: string): GamePreset {
  return PRESETS.find((preset) => preset.id === value) ?? PRESETS[0];
}

export function durationRange(preset: GamePreset) {
  const rounds = preset.caps.length;
  return `${Math.ceil(rounds * 90 / 60)}–${Math.ceil(rounds * 150 / 60)} min`;
}

export function botPicks(round: number, cap: number, scenario: Scenario): Record<string, Pick[]> {
  if (scenario === "tie") return Object.fromEntries(PLAYERS.slice(1).map((player) => [player.id, [{ symbol: "BTC", direction: "Buy" }]]));
  return Object.fromEntries(PLAYERS.slice(1).map((player, index) => [player.id,
    Array.from({ length: cap }, (_, i): Pick => ({
      symbol: COINS[(index * 2 + i + round) % COINS.length].symbol,
      direction: (index + i + round) % 2 ? "Sell" : "Buy",
      ...(index === 0 && round === 0 && i === 0 ? { skill: "BOOST" as const } : {}),
    })),
  ]));
}
