// ewmarun.js：按处理预算处理并留账（基线：一律给空表）
import { foldSample, resetWindow } from "./ewma.js";

function codes(spec) {
  return {
    notFull: spec.not_full_error_code || "E_NOT_FULL",
    overfull: spec.overfull_error_code || "E_OVERFULL",
    badValue: spec.value_error_code || "E_BAD_VALUE",
    badEvent: spec.event_error_code || "E_BAD_EVENT"
  };
}

function fail(code) {
  const error = new Error(code);
  error.code = code;
  throw error;
}

function checkEventShape(event, badEvent) {
  if (!event || typeof event !== "object") fail(badEvent);
  if (event.kind !== "sample" && event.kind !== "roll") fail(badEvent);
  if (event.kind === "sample" && !("value" in event)) fail(badEvent);
}

function cloneState(state) {
  return {
    avg: state.avg,
    weight: state.weight,
    trail: state.trail.slice(),
    ledger: state.ledger.map(function (entry) { return Object.assign({}, entry); }),
    applied: state.applied.slice()
  };
}

function applyEvent(state, event, spec, codeSet) {
  if (event.kind === "sample") {
    const value = event.value;
    if (typeof value !== "number" || !Number.isInteger(value) || value < 0) fail(codeSet.badValue);
    if (value > spec.max_value) fail(codeSet.badValue);
    if (state.weight >= spec.window) fail(codeSet.overfull);
    const next = foldSample(state, value, spec.window);
    state.avg = next.avg;
    state.weight = next.weight;
    state.trail = next.trail;
  } else {
    if (state.weight < spec.window) fail(codeSet.notFull);
    const next = resetWindow(state, spec.window);
    state.weight = next.weight;
  }
  if (event.id !== undefined && state.applied.indexOf(event.id) === -1) {
    state.applied.push(event.id);
  }
}

function simplify(entry) {
  return entry.kind === "sample" ? ["sample", entry.value] : ["roll"];
}

export function step(spec) {
  const codeSet = codes(spec);
  const events = spec.events || [];
  for (const event of events) checkEventShape(event, codeSet.badEvent);
  const state = cloneState(spec.state);
  const backlog = state.ledger;
  state.ledger = [];
  let budget = spec.budget;
  let served = 0;
  let judged = 0;
  for (const entry of backlog) {
    if (budget <= 0) { state.ledger.push(entry); continue; }
    budget -= 1;
    applyEvent(state, entry, spec, codeSet);
    served += 1;
  }
  for (const event of events) {
    judged += 1;
    if (event.id !== undefined && state.applied.indexOf(event.id) !== -1) continue;
    if (budget <= 0) {
      state.ledger.push({ id: event.id, kind: event.kind, value: event.value });
      continue;
    }
    budget -= 1;
    applyEvent(state, event, spec, codeSet);
    served += 1;
  }
  return {
    state: state,
    served: served,
    ledger_before: state.ledger.length,
    ledger: state.ledger.map(simplify),
    judged: judged,
    judged_bound: events.length
  };
}

export function close(spec) {
  const codeSet = codes(spec);
  const state = cloneState(spec.state);
  const backlog = state.ledger;
  state.ledger = [];
  let catchup = 0;
  for (const entry of backlog) {
    applyEvent(state, entry, spec, codeSet);
    catchup += 1;
  }
  return { state: state, catchup: catchup };
}
