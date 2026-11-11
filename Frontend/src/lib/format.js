export function percent(x) {
  if (x >= 0.999) return ">99.9%";
  if (x <= 0.001) return "<0.1%";
  return `${(x * 100).toFixed(1)}%`;
}

export function wholePercent(x) {
  return `${Math.round(x * 100)}%`;
}
