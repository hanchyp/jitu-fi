import { PRESETS } from "../../../../packages/shared/dist/config";
import { pickReturn, roundScore, roundWinners, type PickInput } from "../../../../packages/shared/dist/scoring";
import { PLAYERS, type Pick } from "@/mocks/table";
import type { DemoPick, DemoState, RoundResult } from "@/components/table/demo-engine";
import type { PriceJson, RoundJson, TableState } from "./types";
export const seatId = (seat: number) => PLAYERS[seat]?.id ?? String(seat);
export type ServerView = {
  picks: Record<string, DemoPick[]>; result: RoundResult; gameScores?: Record<string, number>;
  moves: Record<string, number>; prices: Record<string, PriceJson>; startPrices: Record<string, PriceJson>; coins: string[];
};
export function toDemoState(table: TableState, now: number, prices: Record<string, PriceJson> = {}): DemoState {
  const round = table.rounds.find((r) => r.n === table.round)!;
  const resultOf = (r: RoundJson): RoundResult => ({ scores: Object.fromEntries((r.results ?? []).map((s) => [seatId(s.seat), s.score])), winners: (r.winners ?? []).map(seatId), forfeited: (r.results ?? []).filter((s) => s.forfeit).map((s) => seatId(s.seat)) });
  const quotes = { ...round.startPrices, ...prices, ...(round.results ? round.endPrices : {}) };
  const moves: Record<string, number> = {};
  for (const coin of round.coins) {
    const start = round.startPrices?.[coin]; const end = quotes[coin];
    moves[coin] = start && end && BigInt(start.price) > BigInt(0) ? pickReturn({ coin, side: "Buy", start: BigInt(start.price), end: BigInt(end.price) }).ret : 0;
  }
  const effects: DemoState["effects"] = {};
  const all: Record<string, DemoPick[]> = {};
  const scores: { seat: number; score: number; forfeit: boolean }[] = [];
  for (const seat of table.seats) {
    const id = seatId(seat.seat);
    const submitted = table.phase === "Commit" && seat.seat !== 0 ? [] : round.picks[seat.seat] ?? [];
    const inputs: PickInput[] = [];
    all[id] = submitted.map((p, index) => {
      const used = round.skills.find((s) => s.targetSeat === seat.seat && s.targetCoin === p.coin);
      const start = round.startPrices?.[p.coin]; const end = quotes[p.coin];
      let input: PickInput | undefined;
      if (start && end && BigInt(start.price) > BigInt(0)) {
        input = { ...p, start: BigInt(start.price), end: BigInt(end.price) };
        if (used && BigInt(used.price) > BigInt(0)) {
          if (used.skill === "SWAP") {
            const newEnd = used.swapTo && quotes[used.swapTo];
            if (newEnd && used.swapPrice && BigInt(used.swapPrice) > BigInt(0)) input.effect = { kind: "SWAP", price: BigInt(used.price), newCoin: used.swapTo!, newStart: BigInt(used.swapPrice), newEnd: BigInt(newEnd.price) };
          } else input.effect = { kind: used.skill, price: BigInt(used.price) };
        }
        inputs.push(input);
      }
      const settled = round.results?.find((s) => s.seat === seat.seat)?.picks[index];
      const returns = settled ?? (input ? pickReturn(input) : { raw: 0, ret: 0, void: true });
      if (used) effects[`${id}:${index}`] = { skill: used.skill, by: seatId(used.seat), progress: 0, originalSymbol: p.coin, originalDirection: p.side, swapSymbol: used.swapTo };
      return { symbol: used?.swapTo ?? p.coin, direction: used?.skill === "FLIP" ? p.side === "Buy" ? "Sell" : "Buy" : p.side, skill: p.boosted ? "BOOST" : p.insured ? "INSURANCE" : undefined, live: effects[`${id}:${index}`], serverReturn: returns };
    });
    scores.push({ seat: seat.seat, score: roundScore(round.cap, inputs, !submitted.length), forfeit: !submitted.length });
  }
  const result = round.results ? resultOf(round) : { scores: Object.fromEntries(scores.map((s) => [seatId(s.seat), s.score])), winners: roundWinners(scores).map(seatId), forfeited: scores.filter((s) => s.forfeit).map((s) => seatId(s.seat)) };
  const preset = PRESETS[table.preset];
  const phase = table.phase === "Finished" ? "finished" : round.results ? "results" : table.phase.toLowerCase() as DemoState["phase"];
  const attack = [...round.skills].reverse().find((s) => s.targetSeat === 0 && s.seat !== 0 && s.skill !== "LOCK");
  return {
    preset: { id: table.preset, name: preset.name, caps: [...preset.caps], description: "" }, phase, round: table.round - 1, scenario: "default",
    remaining: Math.max(0, Math.ceil(((table.phaseDeadlineMs ?? now) - now) / 1000)), deadline: table.phaseDeadlineMs ?? 0, marketTick: 0,
    picks: (round.picks[0] ?? []).map((p): Pick => ({ symbol: p.coin, direction: p.side, skill: p.boosted ? "BOOST" : p.insured ? "INSURANCE" : undefined })),
    locked: Boolean(round.picks[0]?.length), lockingUntil: 0, hand: table.seats.find((s) => s.seat === 0)?.hand?.slice(0, 3) ?? [], effects,
    usedSkills: [...new Set([...round.skills.map((s) => seatId(s.seat)), ...Object.entries(round.picks).filter(([, picks]) => picks.some((p) => p.boosted || p.insured)).map(([seat]) => seatId(Number(seat)))])], incoming: attack ? { skill: attack.skill as "FREEZE" | "FLIP" | "SWAP", casterName: PLAYERS[attack.seat]?.name ?? "Opponent", symbol: attack.targetCoin as "BTC", heldBps: 0, swapSymbol: attack.swapTo as "BTC" | undefined } : null,
    history: table.rounds.filter((r) => r.results).map(resultOf), earned: table.rounds.flatMap((r) => (r.awarded ?? []).filter((a) => a.seat === 0).map((a) => a.skill)), toast: (round.awarded ?? []).filter((a) => a.seat === 0).map((a) => `You earned ${a.skill}`).join(" · "), error: "", paused: false,
    server: { picks: all, result, gameScores: table.gameScores && Object.fromEntries(table.gameScores.map((score, seat) => [seatId(seat), score])), moves, prices: quotes, startPrices: round.startPrices ?? {}, coins: round.coins },
  };
}
