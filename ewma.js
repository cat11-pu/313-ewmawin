// ewma.js：滑动平均的单步（纯函数，不改入参）
export function foldSample(state, value, window) {
  const prevWeight = state.weight || 0;
  const nextWeight = Math.min(prevWeight + 1, window);
  const nextAvg = Math.floor(((state.avg || 0) * prevWeight + value) / nextWeight);
  const trail = (state.trail || []).concat(nextAvg);
  return Object.assign({}, state, { avg: nextAvg, weight: nextWeight, trail });
}

export function resetWindow(state, window) {
  return Object.assign({}, state, { weight: 0 });
}
