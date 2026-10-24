import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb, migrateDb } from "../src/db/client.js";
import { processedLogs, seasons, tables } from "../src/db/schema.js";

async function freshDb() {
  const db = createDb(":memory:");
  await migrateDb(db);
  return db;
}

describe("migrations", () => {
  it("create every table", async () => {
    const db = await freshDb();
    const rows = await db.all<{ name: string }>(sql`select name from sqlite_master where type = 'table'`);
    const names = rows.map((r) => r.name).filter((n) => !n.startsWith("__") && !n.startsWith("sqlite"));
    expect(names.sort()).toEqual(
      [
        "bonus_fundings", "game_results", "indexer_cursor", "picks", "positions", "processed_logs",
        "round_prices", "round_results", "rounds", "seasons", "sessions", "siwe_nonces",
        "skill_hands", "skills_used", "table_players", "tables",
      ].sort(),
    );
  });

  it("are idempotent", async () => {
    const db = await freshDb();
    await expect(migrateDb(db)).resolves.toBeUndefined();
  });

  it("round-trip uint256 amounts as strings", async () => {
    const db = await freshDb();
    const huge = (2n ** 255n).toString();
    await db.insert(seasons).values({ id: 1, enrollStart: 1, start: 2, end: 3, status: "Enrollment", bonusPot: huge });
    const [row] = await db.select().from(seasons);
    expect(BigInt(row!.bonusPot)).toBe(2n ** 255n);
    expect(row!.shortfall).toBe(false);
  });

  it("reject a duplicate processed log", async () => {
    const db = await freshDb();
    const log = { txHash: "0xabc", logIndex: 0, blockNumber: 10 };
    await db.insert(processedLogs).values(log);
    await expect(db.insert(processedLogs).values(log)).rejects.toThrow();
  });

  it("default a new table to no pending record", async () => {
    const db = await freshDb();
    const [row] = await db
      .insert(tables)
      .values({ preset: "Quick", status: "Running", humanAddress: "0x1", seasonId: 1, phase: "Waiting", createdAtMs: 0 })
      .returning();
    expect(row!.id).toBe(1);
    expect(row!.recordStatus).toBe("none");
  });
});
