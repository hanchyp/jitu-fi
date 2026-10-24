// Off-chain Crypto Draft engine: tables, the commit → reveal → live → settle loop, skills and
// scoring. Every change is persisted as the table's JSON snapshot before events go out, so a
// restart resumes from the database (resume()).
import {
  checkLiveSkill,
  checkPicks,
  clampGameScore,
  COMMIT_SECONDS,
  gameScore,
  LIVE_MAX_SECONDS,
  LIVE_MIN_SECONDS,
  LIVE_SKILL_MAX_AGE_SECONDS,
  pickReturn,
  PRESETS,
  REVEAL_SECONDS,
  roundScore,
  roundWinners,
  SKILLS,
  spendSkill,
  awardSkill,
  type LiveSkill,
  type PickEffect,
  type PickInput,
  type PickSubmission,
  type PresetId,
  type RoundState,
} from "@jitu-fi/shared";
import { eq } from "drizzle-orm";
import { keccak256, toHex } from "viem";
import type { Db } from "../db/client.js";
import { tablePlayers, tables } from "../db/schema.js";
import type { Logger } from "../logger.js";
import type { PriceBook, PriceTick } from "../prices/book.js";
import { COINS, type CoinSymbol } from "../prices/feeds.js";
import { GameError, type EngineEvent, type PriceJson, type RoundJson, type TableState, type UsedSkill } from "./types.js";

export type Timing = { commitMs: number; revealMs: number; liveMinSeconds: number; liveMaxSeconds: number };

export const DEFAULT_TIMING: Timing = {
  commitMs: COMMIT_SECONDS * 1000,
  revealMs: REVEAL_SECONDS * 1000,
  liveMinSeconds: LIVE_MIN_SECONDS,
  liveMaxSeconds: LIVE_MAX_SECONDS,
};

export type EngineDeps = {
  db: Db;
  book: PriceBook;
  log: Logger;
  now?: () => number;
  /** Uniform in [0, 1). Server randomness: coin order, live duration, skill deals. */
  random?: () => number;
  timing?: Timing;
  onEvent?: (tableId: number, event: EngineEvent) => void;
};

export type CreateTable = { human: string; bots: string[]; seasonId: number; preset: PresetId };
export type SkillRequest = { skill: LiveSkill; targetSeat: number; targetCoin: string; swapTo?: string };

const toJson = (t: PriceTick): PriceJson => ({ price: t.price.toString(), expo: t.expo, publishTime: t.publishTime });

/** JSON with sorted keys, so the same state always hashes the same. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v,
  );
}

export function logHashOf(state: TableState): `0x${string}` {
  return keccak256(toHex(canonicalJson(state)));
}

export class GameEngine {
  private readonly states = new Map<number, TableState>();
  private readonly timers = new Map<number, ReturnType<typeof setTimeout>>();
  private readonly queues = new Map<number, Promise<unknown>>();
  private readonly now: () => number;
  private readonly random: () => number;
  private readonly timing: Timing;

  constructor(private readonly deps: EngineDeps) {
    this.now = deps.now ?? Date.now;
    this.random = deps.random ?? Math.random;
    this.timing = deps.timing ?? DEFAULT_TIMING;
  }

  // ---------- Public API ----------

  async createTable({ human, bots, seasonId, preset }: CreateTable): Promise<TableState> {
    if (bots.length !== 3) throw new GameError("BAD_SEATS", "a table seats 1 human and 3 bots");
    const createdAtMs = this.now();
    const seats = [human, ...bots].map((address, seat) => ({
      seat,
      address: address.toLowerCase(),
      isBot: seat > 0,
      hand: [this.randomSkill()],
    }));
    const draft: Omit<TableState, "id"> = {
      preset, seasonId, createdAtMs, phase: "Commit", phaseDeadlineMs: null, round: 0, seats, rounds: [],
    };
    const [row] = await this.deps.db
      .insert(tables)
      .values({ preset, status: "Running", humanAddress: seats[0]!.address, seasonId, phase: "Commit", createdAtMs, state: "{}" })
      .returning({ id: tables.id });
    const state: TableState = { id: row!.id, ...draft };
    await this.deps.db.insert(tablePlayers).values(seats.map((s) => ({ tableId: state.id, seat: s.seat, address: s.address, isBot: s.isBot })));
    this.states.set(state.id, state);
    await this.run(state.id, () => this.startRound(state, 1));
    return state;
  }

  /** Reloads every running table and re-arms its phase timer. */
  async resume(): Promise<number> {
    const rows = await this.deps.db.select().from(tables).where(eq(tables.status, "Running"));
    for (const row of rows) {
      const state = JSON.parse(row.state) as TableState;
      this.states.set(state.id, state);
      this.schedule(state);
    }
    return rows.length;
  }

  submitPicks(tableId: number, address: string, picks: PickSubmission[]): Promise<void> {
    return this.run(tableId, async () => {
      const state = this.state(tableId);
      const seat = this.seatOf(state, address);
      const round = this.current(state);
      const error = checkPicks(state.phase === "Finished" ? "Settled" : state.phase, round.coins, round.cap, seat.hand, picks);
      if (error) throw new GameError(error);
      // Last submission before the commit deadline wins.
      round.picks[seat.seat] = picks.map(({ coin, side, boosted, insured }) => ({
        coin, side, ...(boosted ? { boosted: true } : {}), ...(insured ? { insured: true } : {}),
      }));
      await this.persist(state);
      this.emit(state, { type: "picksSubmitted", round: round.n, seat: seat.seat });
    });
  }

  useSkill(tableId: number, address: string, req: SkillRequest): Promise<UsedSkill> {
    return this.run(tableId, async () => {
      const state = this.state(tableId);
      const seat = this.seatOf(state, address);
      const round = this.current(state);
      const nowMs = this.now();
      if (state.phase === "Live" && nowMs >= round.liveEndMs!) throw new GameError("LIVE_DEADLINE_PASSED");
      const error = checkLiveSkill(this.skillState(state), { seat: seat.seat, ...req });
      if (error) throw new GameError(error);

      const price = this.livePrice(round, req.targetCoin, nowMs);
      const used: UsedSkill = {
        seat: seat.seat, skill: req.skill, targetSeat: req.targetSeat, targetCoin: req.targetCoin,
        price: price.price.toString(), atMs: nowMs,
      };
      if (req.skill === "SWAP") {
        used.swapTo = req.swapTo!;
        used.swapPrice = this.livePrice(round, req.swapTo!, nowMs).price.toString();
      }
      seat.hand = spendSkill(seat.hand, req.skill);
      round.skills.push(used);
      await this.persist(state);
      this.emit(state, { type: "skillUsed", round: round.n, skill: used });
      return used;
    });
  }

  /**
   * Admin skip: ends the current phase now through the same transition its timer runs. False when the
   * table already left `expected` (stale or repeated request), so one request moves at most one phase.
   */
  skipPhase(tableId: number, expected: { phase: TableState["phase"]; round: number }): Promise<boolean> {
    return this.run(tableId, async () => {
      const state = this.state(tableId);
      if (state.phase === "Finished" || state.phase !== expected.phase || state.round !== expected.round) return false;
      // Live ends now, so settle prices at the actual end.
      if (state.phase === "Live") this.current(state).liveEndMs = this.now();
      await this.advance(tableId, expected);
      return true;
    });
  }

  /** A seat's view: other seats' picks stay hidden during Commit, and other hands show only their size. */
  view(tableId: number, viewer?: string) {
    const state = this.state(tableId);
    const me = viewer ? state.seats.find((s) => s.address === viewer.toLowerCase())?.seat : undefined;
    return {
      ...state,
      seats: state.seats.map((s) => ({ ...s, hand: s.seat === me ? s.hand : undefined, handSize: s.hand.length })),
      rounds: state.rounds.map((r, i) => {
        const hidden = i === state.rounds.length - 1 && state.phase === "Commit";
        if (!hidden) return r;
        const picks = Object.fromEntries(Object.entries(r.picks).filter(([seat]) => Number(seat) === me));
        return { ...r, picks, submitted: Object.keys(r.picks).map(Number) };
      }),
    };
  }

  get(tableId: number): TableState | undefined {
    return this.states.get(tableId);
  }

  /** Runs a callback after every queued action of a table (tests and shutdown). */
  async idle(tableId: number) {
    await this.queues.get(tableId)?.catch(() => {});
  }

  stop() {
    for (const timer of this.timers.values()) clearTimeout(timer);
    this.timers.clear();
  }

  // ---------- Phase machine ----------

  private async startRound(state: TableState, n: number) {
    const cap = PRESETS[state.preset].caps[n - 1]!;
    const nowMs = this.now();
    const round: RoundJson = {
      n,
      cap,
      coins: this.shuffle([...COINS]),
      liveDuration: this.randomInt(this.timing.liveMinSeconds, this.timing.liveMaxSeconds),
      commitDeadlineMs: nowMs + this.timing.commitMs,
      picks: {},
      skills: [],
    };
    state.rounds.push(round);
    state.round = n;
    this.setPhase(state, "Commit", round.commitDeadlineMs);
    await this.persist(state);
    this.emit(state, { type: "roundStarted", round: n, cap, coins: round.coins, liveDuration: round.liveDuration, commitDeadlineMs: round.commitDeadlineMs });
  }

  private async closeCommit(state: TableState) {
    const round = this.current(state);
    // BOOST and INSURANCE are spent when the picks lock in.
    for (const [seat, picks] of Object.entries(round.picks)) {
      const s = state.seats[Number(seat)]!;
      if (picks.some((p) => p.boosted)) s.hand = spendSkill(s.hand, "BOOST");
      if (picks.some((p) => p.insured)) s.hand = spendSkill(s.hand, "INSURANCE");
    }
    round.revealDeadlineMs = this.now() + this.timing.revealMs;
    this.setPhase(state, "Reveal", round.revealDeadlineMs);
    await this.persist(state);
    this.emit(state, { type: "revealed", round: round.n, picks: round.picks, revealDeadlineMs: round.revealDeadlineMs });
  }

  private async startLive(state: TableState) {
    const round = this.current(state);
    const nowMs = this.now();
    round.startPrices = {};
    for (const coin of round.coins) {
      const tick = this.deps.book.latest(coin as CoinSymbol);
      if (tick) round.startPrices[coin] = toJson(tick);
      else this.deps.log.warn({ tableId: state.id, coin }, "no start price; picks on this coin are void");
    }
    round.liveStartMs = nowMs;
    round.liveEndMs = nowMs + round.liveDuration * 1000;
    this.setPhase(state, "Live", round.liveEndMs);
    await this.persist(state);
    this.emit(state, { type: "liveStarted", round: round.n, startPrices: round.startPrices, liveStartMs: nowMs, liveEndMs: round.liveEndMs });
  }

  private async settle(state: TableState) {
    const round = this.current(state);
    const deadline = Math.floor(round.liveEndMs! / 1000);
    round.endPrices = {};
    for (const coin of round.coins) {
      // Last good price at or before the deadline (owner decision), else the newest one.
      const tick = this.deps.book.atOrBefore(coin as CoinSymbol, deadline) ?? this.deps.book.latest(coin as CoinSymbol);
      if (tick) round.endPrices[coin] = toJson(tick);
    }

    round.results = state.seats.map(({ seat }) => {
      const submitted = round.picks[seat] ?? [];
      const inputs = submitted.map((p) => this.pickInput(round, seat, p));
      const picks = submitted.map((p, i) => {
        const input = inputs[i];
        const r = input ? pickReturn(input) : { raw: 0, ret: 0, void: true };
        return { coin: p.coin, side: p.side, ...r };
      });
      const forfeit = submitted.length === 0;
      const valid = inputs.filter((x): x is PickInput => x !== null);
      return { seat, score: roundScore(round.cap, valid, forfeit), forfeit, picks };
    });
    round.winners = roundWinners(round.results);
    round.awarded = [];
    for (const seat of round.winners) {
      const s = state.seats[seat]!;
      if (s.hand.length >= 3) continue;
      const skill = this.randomSkill();
      s.hand = awardSkill(s.hand, skill);
      round.awarded.push({ seat, skill });
    }

    const last = round.n === PRESETS[state.preset].caps.length;
    if (last) await this.finish(state);
    else await this.persist(state);
    this.emit(state, { type: "roundSettled", round: round.n, results: round.results, winners: round.winners, awarded: round.awarded });
    if (last) this.emit(state, { type: "gameFinished", gameScores: state.gameScores! });
    else await this.startRound(state, round.n + 1);
  }

  private async finish(state: TableState) {
    const caps = PRESETS[state.preset].caps;
    state.gameScores = state.seats.map(({ seat }) => gameScore(state.rounds.map((r) => r.results!.find((x) => x.seat === seat)!.score), caps));
    state.finishedAtMs = this.now();
    this.setPhase(state, "Finished", null);
    const human = state.gameScores[0]!;
    const clamped = clampGameScore(human);
    if (clamped !== human) this.deps.log.warn({ tableId: state.id, score: human }, "game score clamped to MAX_GAME_SCORE");
    await this.persist(state, { status: "Finished", finishedAtMs: state.finishedAtMs, gameScore: clamped, logHash: logHashOf(state), recordStatus: "pending" });
  }

  /** Builds the scoring input for a pick, applying the live effect that targets it. */
  private pickInput(round: RoundJson, seat: number, pick: PickSubmission): PickInput | null {
    const start = round.startPrices?.[pick.coin];
    const end = round.endPrices?.[pick.coin] ?? start;
    if (!start || !end) return null;
    const used = round.skills.find((s) => s.targetSeat === seat && s.targetCoin === pick.coin);
    let effect: PickEffect | undefined;
    if (used?.skill === "SWAP") {
      const newEnd = round.endPrices?.[used.swapTo!]?.price ?? used.swapPrice!;
      effect = { kind: "SWAP", price: BigInt(used.price), newCoin: used.swapTo!, newStart: BigInt(used.swapPrice!), newEnd: BigInt(newEnd) };
    } else if (used) {
      effect = { kind: used.skill, price: BigInt(used.price) };
    }
    return { coin: pick.coin, side: pick.side, boosted: pick.boosted, insured: pick.insured, start: BigInt(start.price), end: BigInt(end.price), effect };
  }

  // ---------- Helpers ----------

  private livePrice(round: RoundJson, coin: string, nowMs: number): PriceTick {
    const tick = this.deps.book.fresh(coin as CoinSymbol, Math.floor(nowMs / 1000), LIVE_SKILL_MAX_AGE_SECONDS);
    if (!tick || tick.publishTime < Math.floor(round.liveStartMs! / 1000)) throw new GameError("PRICE_STALE");
    if (!round.startPrices?.[coin]) throw new GameError("PRICE_STALE");
    return tick;
  }

  private skillState(state: TableState): RoundState {
    const round = this.current(state);
    const seats: Record<number, RoundState["seats"][number]> = {};
    for (const s of state.seats) {
      const picks = round.picks[s.seat] ?? [];
      seats[s.seat] = {
        hand: s.hand,
        usedSkill: picks.some((p) => p.boosted || p.insured) || round.skills.some((u) => u.seat === s.seat),
        attacked: round.skills.some((u) => u.targetSeat === s.seat && u.skill !== "LOCK"),
        picks: picks.map((p) => ({ coin: p.coin, effect: round.skills.find((u) => u.targetSeat === s.seat && u.targetCoin === p.coin)?.skill })),
      };
    }
    return { phase: state.phase === "Finished" ? "Settled" : state.phase, coins: round.coins, seats };
  }

  private setPhase(state: TableState, phase: TableState["phase"], deadline: number | null) {
    state.phase = phase;
    state.phaseDeadlineMs = deadline;
    this.schedule(state);
  }

  private schedule(state: TableState) {
    clearTimeout(this.timers.get(state.id));
    this.timers.delete(state.id);
    if (state.phaseDeadlineMs === null || state.phase === "Finished") return;
    const delay = Math.max(0, state.phaseDeadlineMs - this.now());
    const expected = { phase: state.phase, round: state.round };
    this.timers.set(
      state.id,
      setTimeout(() => {
        this.timers.delete(state.id);
        void this.run(state.id, () => this.advance(state.id, expected)).catch((err) =>
          this.deps.log.error({ err, tableId: state.id }, "phase transition failed"),
        );
      }, delay),
    );
  }

  private async advance(tableId: number, expected: { phase: TableState["phase"]; round: number }) {
    const state = this.states.get(tableId);
    // A stale timer (state already moved on) does nothing, so transitions happen once.
    if (!state || state.phase !== expected.phase || state.round !== expected.round) return;
    if (state.phase === "Commit") await this.closeCommit(state);
    else if (state.phase === "Reveal") await this.startLive(state);
    else if (state.phase === "Live") await this.settle(state);
  }

  /** Serializes all actions on one table. */
  private run<T>(tableId: number, fn: () => Promise<T>): Promise<T> {
    const prev = this.queues.get(tableId) ?? Promise.resolve();
    const next = prev.catch(() => {}).then(fn);
    this.queues.set(tableId, next);
    return next;
  }

  private async persist(state: TableState, extra: Partial<typeof tables.$inferInsert> = {}) {
    await this.deps.db
      .update(tables)
      .set({ state: JSON.stringify(state), phase: state.phase, phaseDeadlineMs: state.phaseDeadlineMs, currentRound: state.round, ...extra })
      .where(eq(tables.id, state.id));
  }

  private emit(state: TableState, event: EngineEvent) {
    try {
      this.deps.onEvent?.(state.id, event);
    } catch (err) {
      this.deps.log.error({ err, tableId: state.id }, "event listener failed");
    }
  }

  private state(tableId: number): TableState {
    const state = this.states.get(tableId);
    if (!state) throw new GameError("TABLE_NOT_RUNNING");
    return state;
  }

  private current(state: TableState): RoundJson {
    const round = state.rounds[state.round - 1];
    if (!round) throw new GameError("NO_ROUND");
    return round;
  }

  private seatOf(state: TableState, address: string) {
    const seat = state.seats.find((s) => s.address === address.toLowerCase());
    if (!seat) throw new GameError("NOT_SEATED");
    return seat;
  }

  private randomInt(min: number, max: number) {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  private randomSkill() {
    return SKILLS[this.randomInt(0, SKILLS.length - 1)]!;
  }

  private shuffle<T>(items: T[]): T[] {
    for (let i = items.length - 1; i > 0; i--) {
      const j = this.randomInt(0, i);
      [items[i], items[j]] = [items[j]!, items[i]!];
    }
    return items;
  }
}
