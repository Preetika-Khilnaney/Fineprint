// Hybrid clause classifier: transparent keyword rules blended with a Naive Bayes model trained on CUAD.
//   final(k) = w · rules(k) + (1 − w) · NB(k)
// The blend weight w and the abstention threshold were tuned on the CUAD validation split.
import {CATS} from './knowledge/categories.js';
import {predict} from './ml/naiveBayes.js';
import MODEL from './ml/model.js';

const coveredCache = new WeakMap();
const covered = m => { let c = coveredCache.get(m); if (!c) coveredCache.set(m, c = new Set(m.labels.filter(l => l !== 'General'))); return c; };

/** Keyword rule scores for every category (heading keywords ×3, body keywords ×2, capped at 3 hits each). */
const wordify = x => ' ' + String(x).toLowerCase().replace(/[^a-z0-9%$§]+/g, ' ') + ' ';
const KEYS = new Map();
const KEY = k => KEYS.get(k) ?? (KEYS.set(k, ' ' + wordify(k).trim() + (/\s$/.test(k) ? ' ' : '')), KEYS.get(k));

export function scoreRules(text, secTitle = '') {
  // Keywords match at word starts only, so "dispute" does not fire inside "undisputed".
  const t = wordify(text), st = wordify(secTitle);
  return Object.entries(CATS).map(([cat, d]) => {
    let s = 0, title = 0;
    d.t.forEach(k => { if (st.includes(KEY(k))) { s += 3; title += 3; } });
    d.k.forEach(k => { const n = t.split(KEY(k)).length - 1; s += Math.min(n, 3) * 2; });
    return [cat, s, title];
  }).sort((a, b) => b[1] - a[1]);
}

/**
 * Classify one clause.
 * mode: 'hybrid' (default), 'rules' or 'model' — the latter two exist for ablation studies.
 * Decision order (each step is a guard against over-confident model output):
 *   1. Heading anchor  — an explicit section heading for a specific category wins.
 *   2. Scope guard     — if the strongest rule evidence points to a category the model was never
 *                        trained on (e.g. Indemnity, Force Majeure), the rules decide.
 *   3. Blend           — otherwise rule and model scores are combined with weight w.
 * Returns {cat, conf (0–100), source, rulesTop, modelTop}.
 */
export function classifyText(text, secTitle = '', {mode = 'hybrid', model = MODEL, w = model?.blend?.w ?? 1, tau = model?.blend?.tau ?? 4} = {}) {
  const rules = scoreRules(text, secTitle);
  const S = rules.reduce((a, r) => a + r[1], 0);
  const r = Object.fromEntries(rules.map(([c, s]) => [c, S ? s / S : 0]));
  const rulesTop = rules[0][1] > 0 ? rules[0][0] : 'General';
  const rulesConf = rules[0][1] ? Math.round(100 * rules[0][1] / (rules[0][1] + (rules[1][1] || 0) + 1)) : 30;
  if (mode === 'rules' || !model) return {cat: rulesTop, conf: rulesConf, source: 'rules', rulesTop, modelTop: null};

  const nb = predict(model, text);
  const COVERED = covered(model);
  if (mode === 'hybrid') {
    const heading = rules.filter(x => x[2] > 0 && x[0] !== 'General').sort((a, b) => b[2] - a[2] || b[1] - a[1])[0];
    if (heading) return {cat: heading[0], conf: Math.max(rulesConf, 85), source: 'heading', rulesTop, modelTop: nb.label};
    if (!COVERED.has(rulesTop) && rulesTop !== 'General' && rules[0][1] >= tau) return {cat: rulesTop, conf: rulesConf, source: 'rules', rulesTop, modelTop: nb.label};
  }
  const p = nb.probs, wr = mode === 'model' ? 0 : w;
  const uncoveredR = Object.keys(r).filter(c => !COVERED.has(c)).reduce((a, c) => a + r[c], 0);
  const f = {};
  for (const c of Object.keys(CATS)) {
    if (COVERED.has(c)) f[c] = wr * r[c] + (1 - wr) * (p[c] || 0);
    else f[c] = wr * r[c] + (1 - wr) * (p.General || 0) * (uncoveredR ? r[c] / uncoveredR : 0);
  }
  f.General = (1 - wr) * (p.General || 0) * (uncoveredR ? 0 : 1) + wr * (S ? 0 : 1);
  const ranked = Object.entries(f).sort((a, b) => b[1] - a[1]);
  const tot = ranked.reduce((a, x) => a + x[1], 0) || 1;
  const [cat, top] = ranked[0];
  const conf = Math.round(100 * top / tot);
  const source = mode === 'model' ? 'model' : (cat === rulesTop && cat === nb.label ? 'rules+model' : cat === rulesTop ? 'rules' : 'model');
  return {cat, conf, source, rulesTop, modelTop: nb.label};
}

export const MODEL_INFO = MODEL ? {labels: MODEL.labels, features: MODEL.vocab.length, blend: MODEL.blend, trainedOn: MODEL.trainedOn} : null;
