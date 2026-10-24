// Run: pnpm --filter frontend exec tsx --test src/app/play/play.test.ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { getRunningTable, getSessionAddress, postPlay } from "../../lib/game/play";

test("play requests, running table, and friendly errors", async () => {
  const originalFetch = globalThis.fetch;
  const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
  const address = `0x${"a".repeat(40)}`;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: { getItem: () => JSON.stringify({ token: "test-session", address, expiresAt: Date.now() / 1000 + 60 }) } });
  try {
    assert.equal(getSessionAddress(), address);
    globalThis.fetch = async (url, options) => {
      assert.match(String(url), /\/play$/);
      assert.equal(options?.method, "POST");
      assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer test-session");
      assert.deepEqual(JSON.parse(options?.body as string), { preset: "quick" });
      return Response.json({ tableId: 12 });
    };
    assert.deepEqual(await postPlay("quick"), { ok: true, data: { tableId: 12 } });
    for (const code of ["NO_POSITION", "SEASON_NOT_ACTIVE", "NOT_ELIGIBLE", "SEASON_CLOSING", "ALREADY_AT_TABLE", "UNAUTHORIZED", "UNEXPECTED"]) {
      globalThis.fetch = async () => Response.json({ error: code, tableId: 12 }, { status: 400 });
      const result = await postPlay("quick");
      assert.equal(result.ok, false);
      if (!result.ok) {
        assert.equal(result.code, code === "UNEXPECTED" ? "UNKNOWN" : code);
        assert.ok(result.message.length > 0);
        assert.equal(result.tableId, 12);
      }
    }
    globalThis.fetch = async () => Response.json({}, { status: 401 });
    assert.deepEqual(await postPlay("quick"), { ok: false, code: "UNAUTHORIZED", message: "Sign in to play" });
    globalThis.fetch = async () => { throw new TypeError("offline"); };
    const offline = await postPlay("quick");
    assert.ok(!offline.ok && offline.code === "NETWORK");
    for (const tableId of [null, 12]) {
      globalThis.fetch = async (url) => {
        assert.ok(String(url).endsWith(`/users/${address}/table`));
        return Response.json({ tableId });
      };
      assert.deepEqual(await getRunningTable(address), { ok: true, data: { tableId } });
    }
    globalThis.fetch = async () => Response.json({ tableId: "javascript:alert(1)" });
    assert.equal((await postPlay("quick")).ok, false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
    else Reflect.deleteProperty(globalThis, "localStorage");
  }
});
