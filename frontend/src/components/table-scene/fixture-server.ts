import type { ServerPhase, ServerTableState, ServerTick } from "./server-types";

// Fixed API-shaped recording for offline previews; no network, wallet, or clock required.
export const SERVER_FIXTURE: ServerTableState = {
  id: 601, preset: "quick", seasonId: 1, createdAtMs: 1000000,
  phase: "Settled", phaseDeadlineMs: null, round: 1,
  seats: [0, 1, 2, 3].map((seat) => ({ seat, address: `fixture-seat-${seat}`, isBot: seat !== 0, handSize: 1 })),
  rounds: [{
    n: 1, cap: 1, coins: ["BTC", "ETH", "SOL", "MON"], liveDuration: 60,
    commitDeadlineMs: 1020000, revealDeadlineMs: 1030000, liveStartMs: 1030000, liveEndMs: 1090000,
    startPrices: {
      BTC: { price: "6000000000000", expo: -8, publishTime: 1030 },
      ETH: { price: "300000000000", expo: -8, publishTime: 1030 },
      SOL: { price: "15000000000", expo: -8, publishTime: 1030 },
      MON: { price: "2000000", expo: -8, publishTime: 1030 },
    },
    endPrices: {
      BTC: { price: "6006000000000", expo: -8, publishTime: 1090 },
      ETH: { price: "299700000000", expo: -8, publishTime: 1090 },
      SOL: { price: "15000000000", expo: -8, publishTime: 1090 },
      MON: { price: "2000000", expo: -8, publishTime: 1090 },
    },
    picks: { 0: [{ coin: "BTC", side: "Buy", boosted: true }], 1: [{ coin: "ETH", side: "Sell", insured: true }], 2: [{ coin: "SOL", side: "Buy" }], 3: [] },
    submitted: [0, 1, 2], skills: [],
    results: [
      { seat: 0, score: 10, forfeit: false, picks: [{ coin: "BTC", side: "Buy", raw: 10, ret: 10, void: false }] },
      { seat: 1, score: 10, forfeit: false, picks: [{ coin: "ETH", side: "Sell", raw: 10, ret: 10, void: false }] },
      { seat: 2, score: 0, forfeit: false, picks: [{ coin: "SOL", side: "Buy", raw: 0, ret: 0, void: true }] },
      { seat: 3, score: 0, forfeit: true, picks: [] },
    ], winners: [0, 1],
  }],
  gameScores: [10, 10, 0, 0], finishedAtMs: 1090000,
};

export const SERVER_TICKS: ServerTick[] = [
  { coin: "BTC", price: "6003000000000", expo: -8, publishTime: 1060 },
  { coin: "ETH", price: "299850000000", expo: -8, publishTime: 1060 },
];

export function serverFixture(phase: ServerPhase): ServerTableState {
  const state = structuredClone(SERVER_FIXTURE);
  state.phase = phase;
  if (phase !== "Finished") {
    delete state.gameScores;
    delete state.finishedAtMs;
  }
  if (phase !== "Settled" && phase !== "Finished") {
    delete state.rounds[0].results;
    delete state.rounds[0].winners;
    delete state.rounds[0].endPrices;
  }
  if (phase === "Commit") state.rounds[0].picks = { 0: state.rounds[0].picks[0] };
  return state;
}
