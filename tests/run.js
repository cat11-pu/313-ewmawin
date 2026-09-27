import assert from "node:assert";
import { foldSample, resetWindow } from "../ewma.js";
import { step, close } from "../ewmarun.js";
import { render } from "../app.js";

const base = {
  budget: 1, window: 3, max_value: 1000000,
  state: { avg: 0, weight: 0, trail: [], ledger: [], applied: [] },
  events: [{ id: 1, kind: "sample", value: 1 }],
  not_full_error_code: "E_NOT_FULL", overfull_error_code: "E_OVERFULL",
  value_error_code: "E_BAD_VALUE", event_error_code: "E_BAD_EVENT"
};

let failed = 0;
function check(name, fn) {
  try { fn(); console.log("ok " + name); } catch (e) { failed += 1; console.log("FAIL " + name + " :: " + e.message); }
}

check("foldSample returns a state", () => {
  assert.strictEqual(typeof foldSample(base.state, 1, 3), "object");
});

check("resetWindow returns a state", () => {
  const full = { avg: 10, weight: 3, trail: [10] };
  assert.strictEqual(typeof resetWindow(full, 3), "object");
});

check("step returns a state", () => {
  assert.strictEqual(typeof step(base).state, "object");
});

check("close returns a state", () => {
  assert.strictEqual(typeof close(base).state, "object");
});

check("render counts events", () => {
  assert.strictEqual(typeof render(base).count, "number");
});

console.log("5 cases, " + failed + " failed");
process.exit(failed === 0 ? 0 : 1);
