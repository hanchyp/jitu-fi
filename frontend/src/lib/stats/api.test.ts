import assert from "node:assert/strict";
import { test } from "node:test";
import { fetchHistory, fetchLeaderboard, fetchSeasons, parseStatsJson, sessionAddress } from "./api";

test("stats reads preserve money precision, history credit and cancellation", async () => {
  const amount = "900719925474099312345";
  assert.deepEqual(parseStatsJson(`{"weight":"${amount}","previewClaim":{"principal":"7","baseYield":"2","bonus":"1"}}`), {
    weight: BigInt(amount), previewClaim: { principal: BigInt(7), baseYield: BigInt(2), bonus: BigInt(1) },
  });
  for (const value of ["1.5", "-1", "1e6", 100]) assert.throws(() => parseStatsJson(JSON.stringify({ bonusPot: value })));
  const original = globalThis.fetch;
  const signal = new AbortController().signal;
  const requests: string[] = [];
  const games = ["counted", "outside-k", "after-end"].map((kind) => ({ credit: { kind }, rounds: [{ picks: [{ side: "sell" }] }], recordStatus: "recorded", recordTxHash: `0x${"1".repeat(64)}` }));
  globalThis.fetch = async (url, options) => {
    assert.equal(options?.signal, signal);
    const path = new URL(String(url)).pathname;
    requests.push(path);
    return new Response(JSON.stringify(path.endsWith("/history") ? { address: "0x123", games } : path.endsWith("/position") ? { position: null } : path.endsWith("/leaderboard") ? { bonusPot: amount, entries: [{ weight: "1", estimatedBonus: "2" }] } : { seasons: [{ bonusPot: amount }] }));
  };
  try {
    assert.equal((await fetchSeasons(signal)).seasons[0].bonusPot, BigInt(amount));
    const board = await fetchLeaderboard(9, signal);
    assert.equal(board.entries[0].estimatedBonus, BigInt(2));
    const history = await fetchHistory("0x123", signal);
    assert.equal(history.season, null);
    assert.deepEqual(history.games, games);
    assert.ok(requests.includes("/seasons/9/leaderboard"));
    globalThis.fetch = async () => new Response(JSON.stringify({ seasonId: 8, tenor: "week", countedGames: 2, principal: amount }));
    const positioned = await fetchHistory("0x123", signal);
    assert.equal(positioned.season?.seasonId, 8);
    assert.equal(sessionAddress(), null); // Node has no localStorage.
    globalThis.fetch = async () => new Response("unavailable", { status: 503 });
    await assert.rejects(fetchLeaderboard(9), /Stats unavailable/);
    globalThis.fetch = async (_url, options) => { options?.signal?.throwIfAborted(); return new Response("{}"); };
    const aborted = AbortSignal.abort();
    await assert.rejects(fetchHistory("0x123", aborted));
  } finally {
    globalThis.fetch = original;
  }
});
