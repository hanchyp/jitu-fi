import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  clampGameScore,
  gameScore,
  pickReturn,
  roundScore,
  roundWinners,
  seasonCredits,
  type PickEffect,
  type PickInput,
} from "../src/scoring.js";
import { PRESETS, type PresetId } from "../src/config.js";
import { awardSkill, checkLiveSkill, checkPicks, spendSkill, type RoundState } from "../src/skills.js";

type JsonPick = Omit<PickInput, "start" | "end" | "effect" | "coin"> & {
  coin?: string;
  start: string;
  end: string;
  effect?: Record<string, string>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Case = Record<string, any>;
type Vectors = Record<"pickReturns" | "rounds" | "winners" | "games" | "seasonCredits", Case[]> & {
  liveSkillChecks: { state: RoundState; cases: Case[] };
  pickChecks: { coins: string[]; cases: Case[] };
};

const vectors: Vectors = JSON.parse(readFileSync(new URL("../test-vectors/scoring.json", import.meta.url), "utf8"));

function toPick(p: JsonPick): PickInput {
  const e = p.effect;
  let effect: PickEffect | undefined;
  if (e?.kind === "SWAP") effect = { kind: "SWAP", price: BigInt(e.price!), newCoin: e.newCoin!, newStart: BigInt(e.newStart!), newEnd: BigInt(e.newEnd!) };
  else if (e) effect = { kind: e.kind as "LOCK" | "FREEZE" | "FLIP", price: BigInt(e.price!) };
  return { ...p, coin: p.coin ?? "BTC", start: BigInt(p.start), end: BigInt(p.end), effect };
}

describe("scoring vectors", () => {
  it.each(vectors.pickReturns)("pick: $name", ({ pick, expected }) => {
    expect(pickReturn(toPick(pick))).toEqual(expected);
  });

  it.each(vectors.rounds)("round: $name", ({ cap, picks, forfeit, expected }) => {
    expect(roundScore(cap, picks.map(toPick), forfeit)).toBe(expected);
  });

  it.each(vectors.winners)("winners: $name", ({ scores, expected }) => {
    expect(roundWinners(scores)).toEqual(expected);
  });

  it.each(vectors.games)("game: $name", ({ preset, roundScores, expected, clamped }) => {
    const score = gameScore(roundScores, PRESETS[preset.toLowerCase() as PresetId].caps);
    expect(score).toBe(expected);
    expect(clampGameScore(score)).toBe(clamped);
  });

  it.each(vectors.seasonCredits)("season: $name", ({ k, gameScores, expected }) => {
    expect(seasonCredits(gameScores, k)).toEqual(expected);
  });

  it.each(vectors.liveSkillChecks.cases)("live skill: $name", ({ req, expected }) => {
    expect(checkLiveSkill(vectors.liveSkillChecks.state as RoundState, req)).toBe(expected);
  });

  it.each(vectors.pickChecks.cases)("picks: $name", ({ phase, cap, hand, picks, expected }) => {
    expect(checkPicks(phase, vectors.pickChecks.coins, cap, hand, picks)).toBe(expected);
  });
});

describe("hands", () => {
  it("caps the hand at 3", () => {
    expect(awardSkill(["LOCK", "FLIP"], "SWAP")).toEqual(["LOCK", "FLIP", "SWAP"]);
    expect(awardSkill(["LOCK", "FLIP", "SWAP"], "BOOST")).toEqual(["LOCK", "FLIP", "SWAP"]);
  });

  it("spends one copy", () => {
    expect(spendSkill(["LOCK", "LOCK", "FLIP"], "LOCK")).toEqual(["LOCK", "FLIP"]);
    expect(() => spendSkill(["FLIP"], "LOCK")).toThrow();
  });
});
