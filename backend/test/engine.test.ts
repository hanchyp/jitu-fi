import { eq } from "drizzle-orm";
import { pino } from "pino";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, migrateDb, type Db } from "../src/db/client.js";
import { tables } from "../src/db/schema.js";
import { GameEngine, logHashOf, type Timing } from "../src/engine/engine.js";
import type { EngineEvent, TableState } from "../src/engine/types.js";
import { PriceBook } from "../src/prices/book.js";
import { COINS, type CoinSymbol } from "../src/prices/feeds.js";

const log = pino({ level: "silent" });
const HUMAN = "0x00000000000000000000000000000000000000aa";
const BOTS = ["0x00000000000000000000000000000000000000b1", "0x00000000000000000000000000000000000000b2", "0x00000000000000000000000000000000000000b3"];
const TIMING: Timing = { commitMs: 20_000, revealMs: 10_000, liveMinSeconds: 60, liveMaxSeconds: 60 };
const T0 = 1_800_000_000_000;

let db: Db;
let book: PriceBook;
let events: { tableId: number; event: EngineEvent }[];

/** Publishes a price for every coin at the current (fake) time: base × (1 + bps/10000). */
function publish(bps: Partial<Record<CoinSymbol, number>> = {}) {
  const publishTime = Math.floor(Date.now() / 1000);
  for (const coin of COINS) book.push({ coin, price: BigInt(10_000 + (bps[coin] ?? 0)) * 1_000_000n, expo: -8, publishTime });
}

function engine() {
  // random() = 0 makes skill deals BOOST and keeps coin order deterministic.
  return new GameEngine({ db, book, log, timing: TIMING, random: () => 0, onEvent: (tableId, event) => events.push({ tableId, event }) });
}

const advance = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(async () => {
  vi.useFakeTimers({ now: T0, toFake: ["setTimeout", "clearTimeout", "Date"] });
  db = createDb(":memory:");
  await migrateDb(db);
  book = new PriceBook();
  events = [];
  publish();
});

afterEach(() => vi.useRealTimers());

const types = () => events.map((e) => e.event.type);

describe("GameEngine", () => {
  it("plays a Quick game to Finished and queues the human result", async () => {
    const e = engine();
    const table = await e.createTable({ human: HUMAN, bots: BOTS, seasonId: 1, preset: "quick" });
    expect(table.seats.map((s) => s.hand)).toEqual([["BOOST"], ["BOOST"], ["BOOST"], ["BOOST"]]);

    // Round 1 (cap 1): human Buys BTC with BOOST; bot 1 Sells BTC; bots 2–3 forfeit.
    await e.submitPicks(table.id, HUMAN, [{ coin: "BTC", side: "Buy", boosted: true }]);
    await e.submitPicks(table.id, BOTS[0]!, [{ coin: "BTC", side: "Sell" }]);
    await advance(20_000); // → Reveal
    await advance(10_000); // → Live, start prices snapshotted at 10,000
    await advance(30_000);
    publish({ BTC: 50 }); // BTC +50 bps before the deadline
    await advance(30_000); // → settle round 1, start round 2

    const r1 = e.get(table.id)!.rounds[0]!;
    expect(r1.results!.map((r) => r.score)).toEqual([50, -50, 0, 0]);
    expect(r1.results!.map((r) => r.forfeit)).toEqual([false, false, true, true]);
    expect(r1.winners).toEqual([0]);
    expect(e.get(table.id)!.seats[0]!.hand).toEqual(["BOOST"]); // spent BOOST, won a new one

    // Rounds 2 and 3: nobody picks.
    for (let i = 0; i < 2; i++) await advance(20_000 + 10_000 + 60_000);

    const done = e.get(table.id)! as TableState;
    expect(done.phase).toBe("Finished");
    expect(done.gameScores).toEqual([8, -8, 0, 0]); // 50 / 6 and −50 / 6, truncated toward zero
    expect(types().filter((t) => t === "roundSettled")).toHaveLength(3);
    expect(types().at(-1)).toBe("gameFinished");

    const [row] = await db.select().from(tables).where(eq(tables.id, table.id));
    expect(row!.status).toBe("Finished");
    expect(row!.gameScore).toBe(8);
    expect(row!.recordStatus).toBe("pending");
    expect(row!.logHash).toBe(logHashOf(JSON.parse(row!.state)));
  });

  it("plays a practice game (seasonId 0) to Finished without queueing recordGame", async () => {
    const e = engine();
    const table = await e.createTable({ human: HUMAN, bots: BOTS, seasonId: 0, preset: "quick" });
    expect(table.practice).toBe(true);
    await e.submitPicks(table.id, HUMAN, [{ coin: "BTC", side: "Buy" }]);
    for (let i = 0; i < 3; i++) await advance(20_000 + 10_000 + 60_000);
    expect(e.get(table.id)!.phase).toBe("Finished");
    const [row] = await db.select().from(tables).where(eq(tables.id, table.id));
    expect(row!.status).toBe("Finished");
    expect(row!.seasonId).toBe(0);
    expect(row!.recordStatus).toBe("none");
    expect(JSON.parse(row!.state).practice).toBe(true);
  });

  it("hides other seats' picks during Commit and shows them at Reveal", async () => {
    const e = engine();
    const table = await e.createTable({ human: HUMAN, bots: BOTS, seasonId: 1, preset: "quick" });
    await e.submitPicks(table.id, BOTS[0]!, [{ coin: "ETH", side: "Buy" }]);
    const view = e.view(table.id, HUMAN);
    expect(view.rounds[0]!.picks).toEqual({});
    expect((view.rounds[0] as { submitted?: number[] }).submitted).toEqual([1]);
    expect(view.seats[1]!.hand).toBeUndefined();
    expect(view.seats[0]!.hand).toEqual(["BOOST"]);

    await advance(20_000);
    const revealed = events.find((x) => x.event.type === "revealed")!.event;
    expect(revealed.type === "revealed" && revealed.picks["1"]).toEqual([{ coin: "ETH", side: "Buy" }]);
  });

  it("rejects bad submissions", async () => {
    const e = engine();
    const table = await e.createTable({ human: HUMAN, bots: BOTS, seasonId: 1, preset: "quick" });
    await expect(e.submitPicks(table.id, HUMAN, [{ coin: "BTC", side: "Buy" }, { coin: "ETH", side: "Buy" }])).rejects.toMatchObject({ code: "OVER_CAP" });
    await expect(e.submitPicks(table.id, HUMAN, [{ coin: "BTC", side: "Buy", insured: true }])).rejects.toMatchObject({ code: "NOT_IN_HAND" });
    await expect(e.submitPicks(table.id, "0x0000000000000000000000000000000000000999", [{ coin: "BTC", side: "Buy" }])).rejects.toMatchObject({ code: "NOT_SEATED" });
    await advance(20_000);
    await expect(e.submitPicks(table.id, HUMAN, [{ coin: "BTC", side: "Buy" }])).rejects.toMatchObject({ code: "WRONG_PHASE" });
  });

  it("applies a FREEZE attack with the backend's live price", async () => {
    const e = engine();
    const table = await e.createTable({ human: HUMAN, bots: BOTS, seasonId: 1, preset: "quick" });
    e.get(table.id)!.seats[1]!.hand = ["FREEZE"];
    await e.submitPicks(table.id, HUMAN, [{ coin: "SOL", side: "Buy" }]);
    await advance(30_000); // → Live

    await expect(e.useSkill(table.id, HUMAN, { skill: "FREEZE", targetSeat: 1, targetCoin: "SOL" })).rejects.toMatchObject({ code: "NOT_IN_HAND" });
    // Prices are 30 s old: too stale for a live skill.
    await advance(30_000);
    await expect(e.useSkill(table.id, BOTS[0]!, { skill: "FREEZE", targetSeat: 0, targetCoin: "SOL" })).rejects.toMatchObject({ code: "PRICE_STALE" });

    publish({ SOL: 20 });
    const used = await e.useSkill(table.id, BOTS[0]!, { skill: "FREEZE", targetSeat: 0, targetCoin: "SOL" });
    expect(used.price).toBe((10_020n * 1_000_000n).toString());
    await expect(e.useSkill(table.id, BOTS[0]!, { skill: "FREEZE", targetSeat: 0, targetCoin: "SOL" })).rejects.toMatchObject({ code: "ALREADY_USED_SKILL" });

    publish({ SOL: 90 });
    await advance(30_000); // settle
    expect(e.get(table.id)!.rounds[0]!.results![0]!.score).toBe(20); // frozen at +20, not +90
  });

  it("resumes a table mid-Live after a restart and settles it once", async () => {
    const first = engine();
    const table = await first.createTable({ human: HUMAN, bots: BOTS, seasonId: 1, preset: "quick" });
    await first.submitPicks(table.id, HUMAN, [{ coin: "ETH", side: "Sell" }]);
    await advance(30_000); // → Live
    first.stop(); // the process dies

    const second = engine();
    expect(await second.resume()).toBe(1);
    publish({ ETH: -40 });
    await advance(60_000);
    const state = second.get(table.id)!;
    expect(state.round).toBe(2);
    expect(state.rounds[0]!.results![0]!.score).toBe(40);
    expect(events.filter((x) => x.event.type === "roundSettled")).toHaveLength(1);
  });
});

describe("HouseBots", () => {
  it("bots play a full Quick game with the human absent", async () => {
    const { HouseBots, HOUSE_BOTS } = await import("../src/engine/bots.js");
    let e!: GameEngine;
    let seed = 7;
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const bots = new HouseBots({ engine: { get: (id: number) => e.get(id), submitPicks: (...a: Parameters<GameEngine["submitPicks"]>) => e.submitPicks(...a), useSkill: (...a: Parameters<GameEngine["useSkill"]>) => e.useSkill(...a) } as unknown as GameEngine, log, random });
    e = new GameEngine({ db, book, log, timing: TIMING, random, onEvent: (id, ev) => { events.push({ tableId: id, event: ev }); bots.handle(id, ev); } });
    const table = await e.createTable({ human: HUMAN, bots: [...HOUSE_BOTS], seasonId: 1, preset: "quick" });
    for (let s = 0; s < 3 * 90; s++) {
      if (s % 2 === 0) publish({ BTC: s % 7, ETH: -(s % 5), SOL: s % 3 });
      await advance(1_000);
    }
    const done = e.get(table.id)!;
    expect(done.phase).toBe("Finished");
    const botPicks = done.rounds.flatMap((r) => [1, 2, 3].map((seat) => r.picks[seat]?.length ?? 0));
    expect(botPicks.every((n) => n >= 1)).toBe(true);
    expect(done.rounds[0]!.results![0]!.forfeit).toBe(true);
    bots.stop();
  });
});
