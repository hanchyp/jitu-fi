// House bots: seats 1–3 at every MVP table. They follow the same rules as humans through the
// engine API, never hold a deposit, and are never recorded on-chain.
import { ATTACK_SKILLS, type LiveSkill, type PickSubmission } from "@jitu-fi/shared";
import type { Logger } from "../logger.js";
import type { GameEngine } from "./engine.js";
import type { EngineEvent } from "./types.js";

/** Fixed off-chain identities (frontend `lib/bots.ts`: Bruno, Dex, Bera). They sign nothing. */
export const HOUSE_BOTS = [
  "0x000000000000000000000000000000000000b001",
  "0x000000000000000000000000000000000000b002",
  "0x000000000000000000000000000000000000b003",
] as const;

export type BotDeps = { engine: GameEngine; log: Logger; random?: () => number };

export class HouseBots {
  private readonly random: () => number;
  private readonly timers = new Set<ReturnType<typeof setTimeout>>();

  constructor(private readonly deps: BotDeps) {
    this.random = deps.random ?? Math.random;
  }

  /** Wire into the engine's event stream. */
  handle = (tableId: number, event: EngineEvent) => {
    if (event.type === "roundStarted") this.onRoundStarted(tableId, event);
    else if (event.type === "liveStarted") this.onLiveStarted(tableId, event);
  };

  stop() {
    for (const t of this.timers) clearTimeout(t);
    this.timers.clear();
  }

  private later(ms: number, fn: () => Promise<unknown>) {
    const timer = setTimeout(() => {
      this.timers.delete(timer);
      fn().catch((err) => this.deps.log.debug({ err: (err as Error).message }, "bot action skipped"));
    }, ms);
    this.timers.add(timer);
  }

  private int(min: number, max: number) {
    return min + Math.floor(this.random() * (max - min + 1));
  }

  private pickOne<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)]!;
  }

  private onRoundStarted(tableId: number, event: Extract<EngineEvent, { type: "roundStarted" }>) {
    const state = this.deps.engine.get(tableId);
    if (!state) return;
    const window = Math.max(1_000, event.commitDeadlineMs - Date.now() - 3_000);
    for (const seat of state.seats.filter((s) => s.isBot)) {
      const coins = [...event.coins].sort(() => this.random() - 0.5).slice(0, this.int(1, event.cap));
      const picks: PickSubmission[] = coins.map((coin) => ({ coin, side: this.random() < 0.5 ? "Buy" : "Sell" }));
      if (seat.hand.includes("BOOST") && this.random() < 0.5) picks[0]!.boosted = true;
      else if (seat.hand.includes("INSURANCE") && this.random() < 0.5) picks[0]!.insured = true;
      this.later(this.int(1_000, window), () => this.deps.engine.submitPicks(tableId, seat.address, picks));
    }
  }

  private onLiveStarted(tableId: number, event: Extract<EngineEvent, { type: "liveStarted" }>) {
    const state = this.deps.engine.get(tableId);
    if (!state) return;
    const liveMs = event.liveEndMs - event.liveStartMs;
    for (const seat of state.seats.filter((s) => s.isBot)) {
      const live = seat.hand.filter((s): s is LiveSkill => s === "LOCK" || ATTACK_SKILLS.includes(s));
      if (live.length === 0 || this.random() < 0.4) continue;
      const skill = this.pickOne(live);
      this.later(this.int(Math.min(10_000, liveMs / 4), Math.max(liveMs - 8_000, liveMs / 2)), async () => {
        const now = this.deps.engine.get(tableId);
        const round = now?.rounds[now.round - 1];
        if (!now || !round || now.phase !== "Live" || now.round !== event.round || Date.now() >= round.liveEndMs!) return;
        if (skill === "LOCK") {
          const own = round.picks[seat.seat];
          if (!own?.length) return;
          await this.deps.engine.useSkill(tableId, seat.address, { skill, targetSeat: seat.seat, targetCoin: this.pickOne(own).coin });
          return;
        }
        const victims = Object.entries(round.picks).filter(([s, p]) => Number(s) !== seat.seat && p.length > 0);
        if (victims.length === 0) return;
        const [victimSeat, victimPicks] = this.pickOne(victims);
        const target = this.pickOne(victimPicks);
        const swapTo = skill === "SWAP" ? round.coins.find((c) => !victimPicks.some((p) => p.coin === c)) : undefined;
        await this.deps.engine.useSkill(tableId, seat.address, { skill, targetSeat: Number(victimSeat), targetCoin: target.coin, swapTo });
      });
    }
  }
}
