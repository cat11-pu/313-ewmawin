// ewmarun.js：按处理预算处理事件，用尽就连着压账，收尾不限预算清账
import { foldSample, resetWindow } from "./ewma.js";

function makeError(spec, codeKey, fallback) {
  const code = (spec && spec[codeKey]) || fallback;
  const error = new Error(code);
  error.code = code;
  return error;
}

function startState(spec) {
  const source = (spec && spec.state) || {};
  return {
    avg: Number(source.avg) || 0,
    weight: source.weight || 0,
    trail: Array.isArray(source.trail) ? source.trail.slice() : [],
    ledger: Array.isArray(source.ledger) ? source.ledger.map((row) => row.slice()) : [],
    applied: Array.isArray(source.applied) ? source.applied.slice() : []
  };
}

function tupleKey(tuple) {
  return JSON.stringify(tuple);
}

function toTuple(event, spec) {
  if (event === null || typeof event !== "object" || Array.isArray(event)) {
    throw makeError(spec, "event_error_code", "E_BAD_EVENT");
  }
  if (event.kind === "roll") {
    return ["roll"];
  }
  if (event.kind === "sample") {
    if (!Object.prototype.hasOwnProperty.call(event, "value")) {
      throw makeError(spec, "event_error_code", "E_BAD_EVENT");
    }
    const value = event.value;
    if (typeof value !== "number" || !Number.isInteger(value)
        || value < 0 || value > spec.max_value) {
      throw makeError(spec, "value_error_code", "E_BAD_VALUE");
    }
    return ["sample", value];
  }
  throw makeError(spec, "event_error_code", "E_BAD_EVENT");
}

function applyTuple(state, tuple, window, spec) {
  if (tuple[0] === "roll") {
    if (state.weight !== window) {
      throw makeError(spec, "not_full_error_code", "E_NOT_FULL");
    }
    return resetWindow(state, window);
  }
  if (state.weight === window) {
    throw makeError(spec, "overfull_error_code", "E_OVERFULL");
  }
  return foldSample(state, tuple[1], window);
}

function drain(spec, unlimited) {
  const state = startState(spec);
  const events = Array.isArray(spec.events) ? spec.events : [];
  const incoming = events.map((event) => toTuple(event, spec));
  const bound = state.ledger.length + incoming.length;

  const queue = state.ledger.concat(incoming);
  let remaining = Number.isInteger(spec.budget) ? spec.budget : 0;
  let served = 0;
  let index = 0;

  while (index < queue.length) {
    if (!unlimited && remaining <= 0) {
      break;
    }
    const tuple = queue[index];
    index += 1;
    const key = tupleKey(tuple);
    if (state.applied.indexOf(key) !== -1) {
      continue;
    }
    if (!unlimited) {
      remaining -= 1;
    }
    const next = applyTuple(state, tuple, spec.window, spec);
    state.avg = next.avg;
    state.weight = next.weight;
    state.trail = next.trail;
    state.applied.push(key);
    served += 1;
  }

  state.ledger = queue.slice(index);
  return { state, served, bound };
}

export function step(spec) {
  const result = drain(spec, false);
  return {
    state: result.state,
    served: result.served,
    ledger_before: result.state.ledger.length,
    ledger: result.state.ledger.map((row) => row.slice()),
    judged: result.served + result.state.ledger.length,
    judged_bound: result.bound
  };
}

export function close(spec) {
  const result = drain(Object.assign({}, spec, { events: [] }), true);
  return { state: result.state, catchup: result.served };
}
