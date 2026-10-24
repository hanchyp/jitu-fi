import type { EngineEvent, TableState } from "./types";

/** Events never invent hidden picks. GET supplies private state after reconnect. */
export function tableReducer(state: TableState, event: EngineEvent): TableState {
  if (event.type === "gameFinished") return { ...state, phase: "Finished", phaseDeadlineMs: null, gameScores: event.gameScores };
  if (state.phase === "Finished") return state;
  if (event.type === "roundStarted") {
    if (event.round <= state.round && state.rounds.some((r) => r.n === event.round)) return state;
    return { ...state, phase: "Commit", round: event.round, phaseDeadlineMs: event.commitDeadlineMs, rounds: [...state.rounds, { n: event.round, cap: event.cap, coins: event.coins, liveDuration: event.liveDuration, commitDeadlineMs: event.commitDeadlineMs, picks: {}, skills: [] }] };
  }
  if (event.round !== state.round) return state;
  const current = state.rounds.find((r) => r.n === event.round);
  if (!current) return state;
  let round = { ...current };
  let next = { ...state };
  switch (event.type) {
    case "picksSubmitted": round.submitted = [...new Set([...(round.submitted ?? []), event.seat])]; break;
    case "revealed":
      if (state.phase !== "Commit") return state;
      round = { ...round, picks: event.picks, revealDeadlineMs: event.revealDeadlineMs };
      next = { ...next, phase: "Reveal", phaseDeadlineMs: event.revealDeadlineMs, seats: state.seats.map((seat) => {
        const spent = event.picks[seat.seat]?.find((p) => p.boosted || p.insured);
        if (!spent || !seat.hand) return seat;
        const hand = [...seat.hand]; const index = hand.indexOf(spent.boosted ? "BOOST" : "INSURANCE");
        if (index >= 0) hand.splice(index, 1);
        return { ...seat, hand, handSize: hand.length };
      }) }; break;
    case "liveStarted":
      if (state.phase === "Live" || round.results) return state;
      round = { ...round, startPrices: event.startPrices, liveStartMs: event.liveStartMs, liveEndMs: event.liveEndMs };
      next = { ...next, phase: "Live", phaseDeadlineMs: event.liveEndMs }; break;
    case "skillUsed": {
      if (round.skills.some((s) => s.seat === event.skill.seat)) return state;
      round.skills = [...round.skills, event.skill];
      next.seats = state.seats.map((seat) => {
        if (seat.seat !== event.skill.seat) return seat;
        const hand = seat.hand && [...seat.hand]; const index = hand?.indexOf(event.skill.skill) ?? -1;
        if (hand && index >= 0) hand.splice(index, 1);
        return { ...seat, hand, handSize: hand?.length ?? Math.max(0, (seat.handSize ?? 1) - 1) };
      }); break;
    }
    case "roundSettled":
      if (round.results) return state;
      round = { ...round, results: event.results, winners: event.winners, awarded: event.awarded };
      next.seats = state.seats.map((seat) => {
        const award = event.awarded.find((a) => a.seat === seat.seat);
        if (!award) return seat;
        const hand = seat.hand && (seat.hand.length < 3 ? [...seat.hand, award.skill] : seat.hand);
        return { ...seat, hand, handSize: hand?.length ?? Math.min(3, (seat.handSize ?? 0) + 1) };
      }); break;
  }
  return { ...next, rounds: state.rounds.map((r) => r.n === round.n ? round : r) };
}
