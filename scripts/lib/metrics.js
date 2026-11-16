// Standard classification metrics: confusion matrix, per-class precision / recall / F1,
// macro, weighted and micro averages, and percentile-bootstrap confidence intervals.

export function confusion(gold, pred, labels) {
  const idx = Object.fromEntries(labels.map((l, i) => [l, i]));
  const m = labels.map(() => labels.map(() => 0));
  gold.forEach((g, i) => { m[idx[g]][idx[pred[i]] ?? idx.General]++; });
  return m;
}

export function report(gold, pred, labels) {
  const m = confusion(gold, pred, labels);
  const per = labels.map((l, i) => {
    const tp = m[i][i], fp = m.reduce((a, r, j) => a + (j !== i ? r[i] : 0), 0), fn = m[i].reduce((a, v, j) => a + (j !== i ? v : 0), 0);
    const p = tp + fp ? tp / (tp + fp) : 0, r = tp + fn ? tp / (tp + fn) : 0, f = p + r ? 2 * p * r / (p + r) : 0;
    return {label: l, precision: p, recall: r, f1: f, support: tp + fn};
  });
  const n = gold.length, correct = gold.filter((g, i) => g === pred[i]).length;
  const withSupport = per.filter(x => x.support > 0);
  const macro = k => withSupport.reduce((a, x) => a + x[k], 0) / withSupport.length;
  const weighted = k => per.reduce((a, x) => a + x[k] * x.support, 0) / n;
  return {n, accuracy: correct / n, macro: {precision: macro('precision'), recall: macro('recall'), f1: macro('f1')},
    weighted: {precision: weighted('precision'), recall: weighted('recall'), f1: weighted('f1')}, perClass: per, confusion: m, labels};
}

export function binary(gold, pred) {
  let tp = 0, fp = 0, fn = 0, tn = 0;
  gold.forEach((g, i) => { if (g && pred[i]) tp++; else if (!g && pred[i]) fp++; else if (g) fn++; else tn++; });
  const p = tp + fp ? tp / (tp + fp) : 0, r = tp + fn ? tp / (tp + fn) : 0;
  return {tp, fp, fn, tn, precision: p, recall: r, f1: p + r ? 2 * p * r / (p + r) : 0, specificity: tn + fp ? tn / (tn + fp) : 0};
}

/** Deterministic PRNG for reproducible bootstraps. */
export function rng(seed = 42) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

/** 95% percentile-bootstrap CI for a statistic over paired (gold, pred) samples. */
export function bootstrap(gold, pred, stat, {B = 1000, seed = 7} = {}) {
  const r = rng(seed), n = gold.length, vals = [];
  for (let b = 0; b < B; b++) {
    const g = [], p = [];
    for (let i = 0; i < n; i++) { const j = Math.floor(r() * n); g.push(gold[j]); p.push(pred[j]); }
    vals.push(stat(g, p));
  }
  vals.sort((a, b) => a - b);
  return [vals[Math.floor(0.025 * B)], vals[Math.floor(0.975 * B)]];
}

export function percentile(arr, q) { const a = [...arr].sort((x, y) => x - y); if (!a.length) return 0; const i = (a.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); }
