import test from "node:test";
import assert from "node:assert/strict";
import { startPlay } from "./play";

type Call = { url: string; auth: string | null };
const calls: Call[] = [];
const originalFetch = globalThis.fetch;
const originalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
test.after(() => {
  globalThis.fetch = originalFetch;
  if (originalStorage) Object.defineProperty(globalThis, "localStorage", originalStorage);
  else Reflect.deleteProperty(globalThis, "localStorage");
});
function stubFetch(reply: () => Response | Promise<Response>) {
  calls.length = 0;
  globalThis.fetch = (async (url: string, init?: RequestInit) => {
    calls.push({ url, auth: (init?.headers as Record<string, string>)?.Authorization ?? null });
    return reply();
  }) as typeof fetch;
}
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

test("connected wallet without stored session: ensureToken result is sent explicitly", async () => {
  stubFetch(() => json(200, { tableId: 7 }));
  const r = await startPlay("quick", async () => "fresh-token");
  assert.deepEqual(r, { ok: true, data: { tableId: 7 } });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].auth, "Bearer fresh-token");
});

test("valid reused session token is used as-is, one POST", async () => {
  stubFetch(() => json(200, { tableId: 3 }));
  let asked = 0;
  await startPlay("long", async () => { asked++; return "stored"; });
  assert.equal(asked, 1);
  assert.equal(calls[0].auth, "Bearer stored");
});

test("wrong-wallet/expired storage never authorises: token comes only from ensureToken", async () => {
  // Stale token in storage for another account must be ignored in favour of the returned one.
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: () => JSON.stringify({ token: "other-wallet", address: "0x" + "1".repeat(40), expiresAt: Date.now() / 1000 + 9999 }),
  };
  stubFetch(() => json(200, { tableId: 1 }));
  await startPlay("quick", async () => "mine");
  assert.equal(calls[0].auth, "Bearer mine");
});

test("rejected signature: friendly retryable error, no /play request", async () => {
  stubFetch(() => json(200, { tableId: 1 }));
  const r = await startPlay("quick", async () => { throw new Error("User rejected the request."); });
  assert.equal(r.ok, false);
  if (!r.ok) { assert.equal(r.code, "AUTH"); assert.match(r.message, /press Play again/); }
  assert.equal(calls.length, 0);
});

test("auth network failure maps to NETWORK", async () => {
  const r = await startPlay("quick", async () => { throw new TypeError("fetch failed"); });
  assert.equal(!r.ok && r.code, "NETWORK");
});

test("backend errors keep existing handling", async () => {
  stubFetch(() => json(409, { error: "ALREADY_AT_TABLE", tableId: 9 }));
  const r = await startPlay("quick", async () => "t");
  assert.equal(!r.ok && r.code, "ALREADY_AT_TABLE");
  assert.equal(!r.ok && r.tableId, 9);
  stubFetch(() => json(400, { error: "NO_POSITION" }));
  assert.equal((await startPlay("quick", async () => "t")).ok, false);
  stubFetch(() => { throw new TypeError("down"); });
  const n = await startPlay("quick", async () => "t");
  assert.equal(!n.ok && n.code, "NETWORK");
});

function memoryStorage(initial: Record<string, string> = {}) {
  const store = { ...initial };
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store[k] ?? null,
    setItem: (k: string, v: string) => { store[k] = v; },
    removeItem: (k: string) => { delete store[k]; },
  };
  return store;
}
const sessionFor = (token: string) => JSON.stringify({ token, address: "0x" + "2".repeat(40), expiresAt: Date.now() / 1000 + 9999 });

test("backend 401 on client-valid session clears it, next click signs again", async () => {
  const store = memoryStorage({ "jitu.session": sessionFor("rejected") });
  const ensure = async () => { const raw = store["jitu.session"]; return raw ? JSON.parse(raw).token as string : "re-signed"; };
  stubFetch(() => json(401, { error: "UNAUTHORIZED" }));
  const first = await startPlay("quick", ensure);
  assert.equal(!first.ok && first.code, "UNAUTHORIZED");
  assert.equal(store["jitu.session"], undefined);
  assert.equal(calls.length, 1, "no automatic retry or sign loop");
  stubFetch(() => json(200, { tableId: 5 }));
  const second = await startPlay("quick", ensure);
  assert.deepEqual(second, { ok: true, data: { tableId: 5 } });
  assert.equal(calls[0].auth, "Bearer re-signed");
});

test("401 never clears a different, newer stored session", async () => {
  const store = memoryStorage({ "jitu.session": sessionFor("newer") });
  stubFetch(() => json(401, {}));
  await startPlay("quick", async () => "older");
  assert.equal(JSON.parse(store["jitu.session"]).token, "newer");
});

test("non-401 errors keep the stored session", async () => {
  const store = memoryStorage({ "jitu.session": sessionFor("t") });
  stubFetch(() => json(400, { error: "NO_POSITION" }));
  await startPlay("quick", async () => "t");
  assert.ok(store["jitu.session"]);
});
