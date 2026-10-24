import assert from "node:assert/strict";
import test from "node:test";
import { commitErrorMessage, toPickSubmissions, validatePicks, type Skill } from "./picks";
import type { Pick } from "../../mocks/table";

const coins = ["BTC", "ETH", "SOL"];
const hand: Skill[] = ["BOOST", "INSURANCE"];
const opts = { cap: 2, coins, hand };

test("maps picks with flags in stable order", () => {
  const picks: Pick[] = [
    { symbol: "BTC", direction: "Buy", skill: "BOOST" },
    { symbol: "ETH", direction: "Sell" },
  ];
  assert.deepEqual(toPickSubmissions(picks), [
    { coin: "BTC", side: "Buy", boosted: true },
    { coin: "ETH", side: "Sell" },
  ]);
  assert.deepEqual(toPickSubmissions([{ symbol: "SOL", direction: "Sell", skill: "INSURANCE" }]), [
    { coin: "SOL", side: "Sell", insured: true },
  ]);
});

test("validate ok", () => {
  assert.deepEqual(validatePicks([{ symbol: "BTC", direction: "Buy", skill: "BOOST" }], opts), { ok: true });
});

test("validate failures", () => {
  const b = (symbol: string, skill?: Pick["skill"]): Pick => ({ symbol, direction: "Buy", ...(skill ? { skill } : {}) });
  const code = (p: Pick[], o = opts) => {
    const r = validatePicks(p, o);
    return r.ok ? "ok" : r.code;
  };
  assert.equal(code([]), "EMPTY");
  assert.equal(code([b("BTC"), b("ETH"), b("SOL")]), "OVER_CAP");
  assert.equal(code([b("BTC"), b("BTC")]), "DUPLICATE_COIN");
  assert.equal(code([b("DOGE")]), "COIN_NOT_ON_TABLE");
  assert.equal(code([b("BTC", "BOOST"), b("ETH", "INSURANCE")]), "TWO_COMMIT_SKILLS");
  assert.equal(code([b("BTC", "BOOST")], { ...opts, hand: [] }), "NOT_IN_HAND");
});

test("error messages", () => {
  for (const c of ["WRONG_PHASE", "NO_PICKS", "OVER_CAP", "DUPLICATE_COIN", "COIN_NOT_ON_TABLE", "TWO_COMMIT_SKILLS", "NOT_IN_HAND", "UNAUTHORIZED"]) {
    const m = commitErrorMessage({ error: c, message: "raw" });
    assert.ok(m.length > 10 && !m.includes(c) && !m.includes("{"), c);
    assert.equal(commitErrorMessage(new Error(c)), m);
  }
  assert.match(commitErrorMessage(new TypeError("fetch failed")), /Network/);
  assert.match(commitErrorMessage({ error: "INTERNAL" }), /try again/);
  assert.match(commitErrorMessage(null), /try again/);
});
