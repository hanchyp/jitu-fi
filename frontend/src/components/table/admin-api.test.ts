// Run: pnpm --filter frontend exec tsx --test src/components/table/admin-api.test.ts
import assert from "node:assert/strict";
import test from "node:test";
import { adminErrorMessage, adminPost } from "./admin-api";

test("admin calls sign in on demand, surface role errors and forget rejected sessions", async () => {
  const originalFetch = globalThis.fetch;
  let stored: string | null = JSON.stringify({ token: "t1" });
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => stored, removeItem: () => { stored = null; } } });
  try {
    globalThis.fetch = async (url, options) => {
      assert.match(String(url), /\/admin\/seasons$/);
      assert.equal((options?.headers as Record<string, string>).authorization, "Bearer t1");
      return Response.json({ seasonId: 9, hash: "0xabc", tenor: "week" });
    };
    assert.deepEqual(await adminPost("/admin/seasons", { tenor: "week" }, async () => "t1"), { seasonId: 9, hash: "0xabc", tenor: "week" });

    globalThis.fetch = async () => Response.json({ error: "NOT_SEASON_MANAGER", message: "this wallet does not hold SEASON_MANAGER_ROLE" }, { status: 403 });
    const forbidden = await adminPost("/admin/seasons", {}, async () => "t1").catch((e) => e);
    assert.equal(adminErrorMessage(forbidden), "this wallet does not hold SEASON_MANAGER_ROLE");
    assert.notEqual(stored, null);

    globalThis.fetch = async () => Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
    const expired = await adminPost("/admin/seasons", {}, async () => "t1").catch((e) => e);
    assert.match(adminErrorMessage(expired), /Session expired/);
    assert.equal(stored, null);

    let fetched = false;
    globalThis.fetch = async () => { fetched = true; return Response.json({}); };
    const rejected = await adminPost("/admin/seasons", {}, async () => { throw new Error("User rejected"); }).catch((e) => e);
    assert.match(adminErrorMessage(rejected), /Sign-in didn’t finish/);
    assert.equal(fetched, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
