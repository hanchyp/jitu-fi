import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getPreset, PLAYERS } from "../../mocks/table";
import { createDemo } from "./demo-engine";
import { seatHandView } from "./seat-hand";
import { SeatHand } from "./SeatHand";

const quick = getPreset("quick");
const onInspect = () => {};

test("opponent Commit hands disclose only their count, including in rendered markup", () => {
  const state = { ...createDemo(quick), round: 2 };
  const player = PLAYERS[1];
  const hand = seatHandView(state, player.id);
  assert.equal(hand.count, 3);
  assert.equal(hand.concealed, true);
  assert.deepEqual(hand.picks, []);
  const markup = renderToStaticMarkup(createElement(SeatHand, { state, player, onInspect }));
  assert.equal((markup.match(/aria-label="Hidden pick"/g) ?? []).length, 3);
  assert.doesNotMatch(markup, /data-hand-coin|data-hand-direction|Buy|Sell|BTC|ETH|SOL|DOGE|XRP|BNB|AVAX|MON/);
  assert.doesNotMatch(markup, /jitu-coin3dFront/);
});

test("your unlocked hand shows each chosen coin and direction", () => {
  const state = { ...createDemo(quick), picks: [{ symbol: "BTC", direction: "Sell" as const }] };
  assert.equal(state.locked, false);
  assert.equal(seatHandView(state, "you").count, 1);
  const markup = renderToStaticMarkup(createElement(SeatHand, { state, player: PLAYERS[0], onInspect }));
  assert.match(markup, /data-hand-coin="BTC"/);
  assert.match(markup, /data-hand-direction="Sell"/);
  assert.match(markup, /You: Sell BTC/);
});

test("Reveal opens opponents' coin symbols and directions", () => {
  const state = createDemo(quick, "reveal");
  for (const player of PLAYERS.slice(1)) {
    const hand = seatHandView(state, player.id);
    assert.equal(hand.concealed, false);
    assert.equal(hand.picks.length, hand.count);
    const markup = renderToStaticMarkup(createElement(SeatHand, { state, player, onInspect }));
    assert.match(markup, /data-hand-coin=/);
    assert.match(markup, /data-hand-direction=/);
    assert.match(markup, /jitu-coin3dFront/);
    assert.match(markup, /jitu-coin3dBack/);
    assert.doesNotMatch(markup, /Hidden pick/);
  }
});

test("a human forfeit reveals no hand", () => {
  const state = createDemo(quick, "reveal", "forfeit");
  assert.equal(seatHandView(state, "you").count, 0);
});
