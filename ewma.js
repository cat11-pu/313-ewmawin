// ewma.js：滑动平均的单步（基线：一律原样返回）
export function foldSample(state, value, window) {
  const prevWeight = state.weight;
  const weight = Math.min(prevWeight + 1, window);
  const avg = Math.floor((state.avg * prevWeight + value) / weight);
  return Object.assign({}, state, {
    avg: avg,
    weight: weight,
    trail: state.trail.concat([avg])
  });
}

export function resetWindow(state, window) {
  return Object.assign({}, state, { weight: 0 });
}
