// Multinomial Naive Bayes text classifier (unigrams + bigrams, Laplace smoothing).
// Trained offline on the CUAD training split (scripts/ml/train-classifier.js); weights ship as model.json.

const STOP = new Set('the of and to a in or any by for be is as such this that with on shall will its it are an at from which all other than under not may has have been each if no into upon their such these those within without whether thereof herein hereunder hereto party parties agreement'.split(' '));

export function tokenize(text) {
  const w = (text.toLowerCase().match(/[a-z][a-z'-]+/g) || []).map(t => t.replace(/'s$/, '')).filter(t => t.length > 2 && !STOP.has(t));
  const out = w.slice();
  for (let i = 0; i < w.length - 1; i++) out.push(w[i] + '_' + w[i + 1]);
  return out;
}

/** Train: items = [{text, label}]. Returns a compact, JSON-serialisable model. */
export function train(items, {alpha = 0.5, maxFeatures = 3000, minDf = 3} = {}) {
  const labels = [...new Set(items.map(i => i.label))].sort();
  const L = labels.length, li = Object.fromEntries(labels.map((l, i) => [l, i]));
  const df = new Map(), docs = items.map(i => tokenize(i.text));
  docs.forEach(toks => new Set(toks).forEach(t => df.set(t, (df.get(t) || 0) + 1)));
  // Rank features by class-discriminative chi-square-like score among those above minDf.
  const counts = new Map();
  docs.forEach((toks, d) => { const y = li[items[d].label]; new Set(toks).forEach(t => { if (df.get(t) < minDf) return; let c = counts.get(t); if (!c) counts.set(t, c = new Float64Array(L)); c[y]++; }); });
  const prior = new Float64Array(L); items.forEach(i => prior[li[i.label]]++);
  const N = items.length;
  const scored = [...counts.entries()].map(([t, c]) => {
    const n = df.get(t); let best = 0;
    for (let y = 0; y < L; y++) { const e = n * prior[y] / N; best = Math.max(best, (c[y] - e) ** 2 / (e + 1e-9)); }
    return [t, best];
  }).sort((a, b) => b[1] - a[1]).slice(0, maxFeatures);
  const vocab = scored.map(s => s[0]), vi = new Map(vocab.map((t, i) => [t, i]));
  const tf = Array.from({length: L}, () => new Float64Array(vocab.length));
  docs.forEach((toks, d) => { const y = li[items[d].label]; toks.forEach(t => { const j = vi.get(t); if (j !== undefined) tf[y][j]++; }); });
  const logp = tf.map(row => { const tot = row.reduce((a, b) => a + b, 0) + alpha * vocab.length; return Array.from(row, v => +Math.log((v + alpha) / tot).toFixed(2)); });
  const logPrior = Array.from(prior, p => +Math.log(p / N).toFixed(4));
  return {type: 'multinomial-nb', version: 1, alpha, labels, logPrior, vocab, logp};
}

let cache = null;
function index(model) { if (cache?.m === model) return cache.vi; const vi = new Map(model.vocab.map((t, i) => [t, i])); cache = {m: model, vi}; return vi; }

/** Posterior over labels for one text. Returns {label, probs: {label: p}}. */
export function predict(model, text) {
  const vi = index(model), toks = tokenize(text);
  const s = model.logPrior.slice();
  for (const t of toks) { const j = vi.get(t); if (j === undefined) continue; for (let y = 0; y < s.length; y++) s[y] += model.logp[y][j]; }
  const m = Math.max(...s), e = s.map(v => Math.exp(v - m)), z = e.reduce((a, b) => a + b, 0);
  const probs = Object.fromEntries(model.labels.map((l, i) => [l, e[i] / z]));
  const label = model.labels[s.indexOf(m)];
  return {label, probs, known: toks.some(t => vi.has(t))};
}
