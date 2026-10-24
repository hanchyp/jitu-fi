import assert from "node:assert/strict";
import test from "node:test";
import { getPreset } from "../../mocks/table";
import { createDemo, demoReducer } from "./demo-engine";
import { isNextPhaseKey } from "./demo-shortcut";

const empty = { querySelector: () => null };
const key = (extra: Partial<Parameters<typeof isNextPhaseKey>[0]> = {}) => ({ key: "n", repeat: false, ctrlKey: false, metaKey: false, altKey: false, target: null, ...extra });

test("N advances; repeats, modifiers, editable targets and open dialogs are ignored", () => {
  assert.equal(isNextPhaseKey(key(), empty), true);
  assert.equal(isNextPhaseKey(key({ key: "N" }), empty), true);
  assert.equal(isNextPhaseKey(key({ key: "m" }), empty), false);
  assert.equal(isNextPhaseKey(key({ repeat: true }), empty), false);
  for (const mod of ["ctrlKey", "metaKey", "altKey"] as const) assert.equal(isNextPhaseKey(key({ [mod]: true }), empty), false);
  const input = { closest: (s: string) => s.includes("input") ? {} : null } as unknown as EventTarget;
  assert.equal(isNextPhaseKey(key({ target: input }), empty), false);
  assert.equal(isNextPhaseKey(key({ target: { isContentEditable: true } as unknown as EventTarget }), empty), false);
  assert.equal(isNextPhaseKey(key(), { querySelector: (s) => s.includes("dialog[open]") ? {} : null }), false);
});

test("advance steps one phase at a time and finishes after the last results", () => {
  const preset = getPreset("quick");
  let state = createDemo(preset);
  const seen: string[] = [];
  for (let i = 0; i < preset.caps.length * 4; i++) { state = demoReducer(state, { type: "advance", now: i }); seen.push(state.phase); }
  assert.deepEqual(seen.slice(0, 4), ["reveal", "live", "results", "commit"]);
  assert.equal(state.phase, "finished");
  assert.equal(state.round, preset.caps.length - 1);
  assert.equal(demoReducer(state, { type: "advance", now: 99 }).phase, "finished");
});
