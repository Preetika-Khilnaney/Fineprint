#!/usr/bin/env node
// Fineprint evaluation harness — runs every measurement on the held-out CUAD TEST split.
//   npm run eval            (full run, ~1–2 min)
// Writes src/data/evaluation.json (shown in the app's Evaluation view) and docs/EVALUATION.md.
import {writeFileSync, readFileSync, readdirSync, existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import os from 'node:os';
import {gzipSync} from 'node:zlib';
import {loadSplit, classificationItems, sentenceUnits, ROOT, fnv} from '../lib/datasets.js';
import {report, binary, bootstrap, percentile, rng} from '../lib/metrics.js';
import {classifyText, MODEL_INFO} from '../../src/engine/classifier.js';
import {hasSignal, detectSignals, SIGNALS} from '../../src/engine/signals.js';
import {EVAL_LABELS, projectToEval, SIGNAL_TO_CUAD} from '../../src/engine/ml/cuadMapping.js';
import {AGENTS, newAnalysis, runAll} from '../../src/engine/agents/12-orchestrator.js';
import {verify} from '../../src/engine/verification.js';
import {RULES} from '../../src/engine/rules.js';
import {SAMPLE_V1, SAMPLE_V2} from '../../src/data/samples.js';

const T0 = Date.now();
const log = (...a) => console.log(...a);
const r3 = x => +x.toFixed(3);
const test = loadSplit('test'), train = loadSplit('train'), val = loadSplit('val');
const E = {meta: {}, dataset: {}, classification: {}, signals: {}, pipeline: {}, verification: {}, robustness: {}, reliability: {}, web: {}};

/* ---------------- environment & dataset ---------------- */
E.meta = {generated: new Date().toISOString(), node: process.version, platform: `${os.platform()} ${os.arch()}`, cpu: os.cpus()[0]?.model?.trim() || 'unknown', cores: os.cpus().length,
  dataset: 'CUAD v1 — Contract Understanding Atticus Dataset (Hendrycks et al., NeurIPS 2021), CC BY 4.0', protocol: 'All tuning on TRAIN/VAL; every number below is computed on the held-out TEST split (102 contracts) unless stated.'};
const spans = s => s.reduce((a, c) => a + c.annotations.length, 0);
const words = t => (t.match(/\S+/g) || []).length;
E.dataset = {splits: {train: {contracts: train.length, spans: spans(train)}, val: {contracts: val.length, spans: spans(val)}, test: {contracts: test.length, spans: spans(test)}},
  testWords: {median: percentile(test.map(c => words(c.text)), 0.5), max: Math.max(...test.map(c => words(c.text)))}, categories: 41, mappedCategories: Object.keys(SIGNAL_TO_CUAD).length};
log('dataset', JSON.stringify(E.dataset.splits));

/* ---------------- 1. clause classification ---------------- */
const ci = classificationItems(test);
const gold = ci.items.map(i => i.label);
const preds = {};
for (const mode of ['rules', 'model', 'hybrid']) {
  const t = Date.now();
  preds[mode] = ci.items.map(i => projectToEval(classifyText(i.text, '', {mode}).cat));
  const rep = report(gold, preds[mode], EVAL_LABELS);
  const ciF1 = bootstrap(gold, preds[mode], (g, p) => report(g, p, EVAL_LABELS).macro.f1, {B: 500});
  const ciAcc = bootstrap(gold, preds[mode], (g, p) => g.filter((x, i) => x === p[i]).length / g.length, {B: 500});
  E.classification[mode] = {accuracy: r3(rep.accuracy), accuracyCI: ciAcc.map(r3), macro: {p: r3(rep.macro.precision), r: r3(rep.macro.recall), f1: r3(rep.macro.f1)}, macroF1CI: ciF1.map(r3),
    weightedF1: r3(rep.weighted.f1), perClass: rep.perClass.map(x => ({label: x.label, p: r3(x.precision), r: r3(x.recall), f1: r3(x.f1), n: x.support})), msPerClause: r3((Date.now() - t) / ci.items.length)};
  if (mode === 'hybrid') E.classification.confusion = {labels: EVAL_LABELS, matrix: rep.confusion};
  log(`classification ${mode.padEnd(6)} acc ${rep.accuracy.toFixed(3)} macro-F1 ${rep.macro.f1.toFixed(3)} [${ciF1.map(x => x.toFixed(3)).join(', ')}]`);
}
// McNemar's test (hybrid vs rules), continuity-corrected
{ let b = 0, c = 0; gold.forEach((g, i) => { const h = preds.hybrid[i] === g, r = preds.rules[i] === g; if (h && !r) b++; if (!h && r) c++; });
  const chi = (Math.abs(b - c) - 1) ** 2 / (b + c || 1);
  E.classification.mcnemar = {hybridOnlyCorrect: b, rulesOnlyCorrect: c, chi2: r3(chi), significant: chi > 10.83, note: 'χ² > 10.83 ⇒ p < 0.001'}; }
E.classification.items = {test: ci.items.length, excluded: ci.stats, labels: Object.fromEntries(EVAL_LABELS.map(l => [l, gold.filter(g => g === l).length]))};
E.classification.modelInfo = {type: 'Multinomial Naive Bayes (unigram+bigram)', features: MODEL_INFO.features, blend: MODEL_INFO.blend, trainedOn: MODEL_INFO.trainedOn};

/* ---------------- 2. risk signal detection ---------------- */
const ov = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));
const testSents = test.map(c => sentenceUnits(c.text));
function sigEval(id, cat, learned) {
  const g = [], p = []; let sp = 0, hit = 0, fired = 0, ok = 0;
  test.forEach((c, i) => {
    const gs = c.annotations.filter(a => a.cuad === cat);
    const f = testSents[i].filter(s => learned ? detectSignals(s.text).some(d => d.id === id) : !!hasSignal(id, s.text));
    g.push(c.present.includes(cat)); p.push(f.length > 0);
    sp += gs.length; hit += gs.filter(a => f.some(s => ov(s, a) > 0)).length; fired += f.length; ok += f.filter(s => gs.some(a => ov(s, a) > 0)).length;
  });
  const b = binary(g, p), sr = sp ? hit / sp : 0, spp = fired ? ok / fired : 0;
  return {contract: {p: r3(b.precision), r: r3(b.recall), f1: r3(b.f1), tp: b.tp, fp: b.fp, fn: b.fn, tn: b.tn}, span: {recall: r3(sr), precision: r3(spp), f1: r3(sr + spp ? 2 * sr * spp / (sr + spp) : 0)}, positives: g.filter(Boolean).length};
}
E.signals.perSignal = [];
for (const [id, cat] of Object.entries(SIGNAL_TO_CUAD)) {
  const pat = sigEval(id, cat, false), hyb = sigEval(id, cat, true);
  E.signals.perSignal.push({id, label: SIGNALS[id].label, cuad: cat, pattern: pat, hybrid: hyb});
  log(`signal ${id.padEnd(24)} contract F1 ${pat.contract.f1.toFixed(2)} → ${hyb.contract.f1.toFixed(2)} · span F1 ${pat.span.f1.toFixed(2)} → ${hyb.span.f1.toFixed(2)}`);
}
const avg = (k1, k2, k3) => r3(E.signals.perSignal.reduce((a, s) => a + s[k1][k2][k3], 0) / E.signals.perSignal.length);
E.signals.macro = {pattern: {contractP: avg('pattern', 'contract', 'p'), contractR: avg('pattern', 'contract', 'r'), contractF1: avg('pattern', 'contract', 'f1'), spanF1: avg('pattern', 'span', 'f1')},
  hybrid: {contractP: avg('hybrid', 'contract', 'p'), contractR: avg('hybrid', 'contract', 'r'), contractF1: avg('hybrid', 'contract', 'f1'), spanF1: avg('hybrid', 'span', 'f1')}};

/* ---------------- 3. end-to-end pipeline on test contracts ---------------- */
const lat = [], rows = [];
for (let k = 0; k < 2; k++) runAll(test[k].text, {juris: 'US'}); // warm-up (JIT)
for (const c of test) {
  const t = performance.now();
  const A = runAll(c.text, {juris: 'US'});
  const ms = performance.now() - t;
  lat.push(ms);
  rows.push({w: words(c.text), ms, clauses: A.clauses.length, cov: A.audit.coverage, findings: A.risks.length, audit: A.audit, A});
}
const tw = rows.reduce((a, r) => a + r.w, 0), tc = rows.reduce((a, r) => a + r.clauses, 0), tms = lat.reduce((a, b) => a + b, 0);
// least-squares fit ms = a + b·words
const mx = tw / rows.length, my = tms / rows.length;
const bfit = rows.reduce((a, r) => a + (r.w - mx) * (r.ms - my), 0) / rows.reduce((a, r) => a + (r.w - mx) ** 2, 0), afit = my - bfit * mx;
const ssr = rows.reduce((a, r) => a + (r.ms - (afit + bfit * r.w)) ** 2, 0), sst = rows.reduce((a, r) => a + (r.ms - my) ** 2, 0);
E.pipeline = {contracts: rows.length, latencyMs: {p50: r3(percentile(lat, 0.5)), p90: r3(percentile(lat, 0.9)), p95: r3(percentile(lat, 0.95)), p99: r3(percentile(lat, 0.99)), max: r3(Math.max(...lat)), mean: r3(my)},
  throughput: {wordsPerSec: Math.round(tw / (tms / 1000)), clausesPerSec: Math.round(tc / (tms / 1000)), contractsPerSec: r3(rows.length / (tms / 1000))},
  scaling: {msPerThousandWords: r3(bfit * 1000), interceptMs: r3(afit), r2: r3(1 - ssr / sst)},
  coverage: {median: r3(percentile(rows.map(r => r.cov), 0.5)), p10: r3(percentile(rows.map(r => r.cov), 0.1)), below80: rows.filter(r => r.cov < 0.8).length},
  clauses: {median: percentile(rows.map(r => r.clauses), 0.5), total: tc}, findings: {total: rows.reduce((a, r) => a + r.findings, 0), median: percentile(rows.map(r => r.findings), 0.5)},
  scatter: rows.map(r => [r.w, r3(r.ms)])};
log(`pipeline p50 ${E.pipeline.latencyMs.p50} ms · p95 ${E.pipeline.latencyMs.p95} ms · ${E.pipeline.throughput.wordsPerSec} words/s · coverage median ${E.pipeline.coverage.median}`);

/* ---------------- 4. verification & hallucination safeguards ---------------- */
const agg = {};
rows.forEach(r => r.audit.checks.forEach(k => { if (k.unit) return; (agg[k.id] ||= {name: k.name, passed: 0, total: 0}); agg[k.id].passed += k.passed; agg[k.id].total += k.total; }));
const allRisks = rows.flatMap(r => r.A.risks);
E.verification.production = {checks: Object.entries(agg).map(([id, v]) => ({id, name: v.name, passed: v.passed, total: v.total, rate: r3(v.total ? v.passed / v.total : 1)})),
  findings: allRisks.length, verified: allRisks.filter(r => r.status === 'verified').length, review: allRisks.filter(r => r.status === 'review').length,
  suppressed: rows.reduce((a, r) => a + r.audit.suppressed.length, 0), lowConfidenceDocs: rows.filter(r => r.audit.lowConfidence).length};

// Mutation testing: inject known hallucinations into real analyses and measure the catch rate.
function preVerify(text) { const A = newAnalysis(text, {juris: 'US'}); for (const a of AGENTS) { if (a.key === 'verify') break; a.run(A); } return A; }
const R = rng(2026), pick = arr => arr[Math.floor(R() * arr.length)];
const MUT = {
  phantom_evidence: {name: 'Finding cites text that is not in the contract', caught: r => r.status === 'suppressed', n: 0, c: 0},
  fabricated_figure: {name: 'Explanation contains an invented figure', caught: r => r.status !== 'verified' && r.verification.numbers === false, n: 0, c: 0},
  misattributed_rule: {name: 'Rule finding attached to an unrelated clause', caught: r => r.status !== 'verified' && r.verification.agreement === false, n: 0, c: 0},
  fact_contradiction: {name: 'Finding contradicts extracted facts', caught: r => r.status !== 'verified' && r.verification.consistent === false, n: 0, c: 0},
  false_absence: {name: 'Claims a clause is missing when it is present', caught: r => r.status !== 'verified' && r.verification.absenceVerified === false, n: 0, c: 0},
};
const signalRule = Object.entries({non_compete: 'non_compete', auto_renewal: 'auto_renewal', ip_overreach: 'ip_assignment', data_license: 'perpetual_licence', assignment_asym: 'anti_assignment'});
for (const c of test) {
  const A = preVerify(c.text); if (A.clauses.length < 5) continue;
  const inj = [];
  const base = {level: 'high', dim: 'legal', cat: 'General', ask: 'x', rec: 'x', fallback: 'x'};
  // phantom evidence: a clause that does not exist in the document
  const fake = {id: 'cfake', num: '99.9', sec: '99', secTitle: 'Fabricated', text: 'The Supplier shall pay the Customer a penalty of fifty million dollars for every late delivery.', cat: 'Payment Terms', conf: 90, risks: [], fields: {}};
  A.clauses.push(fake); inj.push({...base, id: 'm1', rule: 'unilateral_price', issue: 'Phantom penalty', clauseId: 'cfake', num: '99.9', text: fake.text, why: 'A penalty applies.', mut: 'phantom_evidence'});
  // fabricated figure in an explanation about a real clause
  const real = pick(A.clauses);
  inj.push({...base, id: 'm2', rule: 'sole_discretion', issue: 'Fabricated figure', clauseId: real.id, num: real.num, text: real.text, why: `This clause exposes ${A.ctx.us} to a penalty of 9,731,557 per breach.`, mut: 'fabricated_figure'});
  // misattributed rule: signal-backed rule on a clause where the signal is absent
  const [rid, sid] = pick(signalRule);
  const unrelated = A.clauses.find(q => !detectSignals(q.text).some(s => s.id === sid) && q.text.length > 60);
  if (unrelated) inj.push({...base, id: 'm3', rule: rid, issue: 'Misattributed', clauseId: unrelated.id, num: unrelated.num, text: unrelated.text, why: 'Restricts the reader.', mut: 'misattributed_rule'});
  // contradiction with facts (auto-renewal claimed where extraction found none)
  if (!A.facts.autoRenew) inj.push({...base, id: 'm4', rule: 'auto_renewal', issue: 'Contradiction', clauseId: real.id, num: real.num, text: real.text, why: 'The contract renews by itself.', mut: 'fact_contradiction'});
  // false absence: claim a category is missing although the document contains its terms
  const present = ['Confidentiality', 'Governing Law', 'Termination', 'Liability'].find(cat => A.clauses.some(q => q.cat === cat));
  if (present) inj.push({...base, id: 'm5', rule: 'missing_x', issue: `Missing ${present}`, cat: present, clauseId: null, num: null, text: '', missing: true, why: 'Absent.', mut: 'false_absence'});
  A.risks.push(...inj);
  verify(A);
  const all = [...A.risks, ...A.audit.suppressed.map(s => inj.find(i => i.rule === s.rule && i.num === s.num) || {})];
  for (const m of inj) { const r = inj.find(x => x.id === m.id); MUT[m.mut].n++; if (MUT[m.mut].caught(r)) MUT[m.mut].c++; }
}
const mutRows = Object.entries(MUT).map(([id, m]) => ({id, name: m.name, injected: m.n, caught: m.c, rate: r3(m.n ? m.c / m.n : 0)}));
const totN = mutRows.reduce((a, m) => a + m.injected, 0), totC = mutRows.reduce((a, m) => a + m.caught, 0);
E.verification.mutation = {types: mutRows, injected: totN, caught: totC, rate: r3(totC / totN)};
log(`mutation testing: caught ${totC}/${totN} (${(100 * totC / totN).toFixed(1)}%)`);

/* ---------------- 5. robustness ---------------- */
const perturb = {
  lowercase: t => t.toLowerCase(), uppercase: t => t.toUpperCase(),
  whitespace: t => t.replace(/ /g, (m, i) => (i % 7 === 0 ? '\n  ' : ' ')),
  ocr_noise_2pct: t => { const g = rng(fnv(t)); return t.split('').map(ch => (/[a-z]/i.test(ch) && g() < 0.02 ? String.fromCharCode(97 + Math.floor(g() * 26)) : ch)).join(''); },
  truncated_60pct: t => t.slice(0, Math.max(40, Math.floor(t.length * 0.6))),
};
const baseF1 = E.classification.hybrid.macro.f1;
E.robustness = {base: baseF1, perturbations: Object.entries(perturb).map(([id, f]) => {
  const p = ci.items.map(i => projectToEval(classifyText(f(i.text), '').cat));
  const f1 = report(gold, p, EVAL_LABELS).macro.f1;
  return {id, macroF1: r3(f1), delta: r3(f1 - baseF1)};
})};
log('robustness', E.robustness.perturbations.map(p => `${p.id} ${p.delta >= 0 ? '+' : ''}${p.delta}`).join(' · '));

/* ---------------- 6. reliability ---------------- */
let identical = 0;
const sig = A => JSON.stringify([A.score, A.risks.map(r => [r.rule, r.num, r.status]), A.clauses.map(c => c.cat)]);
for (const r of rows) if (sig(runAll(test[rows.indexOf(r)].text, {juris: 'US'})) === sig(r.A)) identical++;
const s1 = runAll(SAMPLE_V1, {juris: 'IN'}), s2 = runAll(SAMPLE_V2, {juris: 'IN', persp: s1.ctx.us});
E.reliability = {determinism: {identical, runs: rows.length, rate: r3(identical / rows.length)},
  regression: {sampleV1: {score: s1.score, high: s1.risks.filter(r => r.level === 'high').length, findings: s1.risks.length}, sampleV2: {score: s2.score, findings: s2.risks.length}},
  rules: RULES.length, signals: Object.keys(SIGNALS).length};

/* ---------------- 7. web bundle ---------------- */
const dist = join(ROOT, 'dist', 'assets');
if (existsSync(dist)) {
  const files = readdirSync(dist).map(f => ({f, raw: statSync(join(dist, f)).size, gz: gzipSync(readFileSync(join(dist, f))).length}));
  const sum = re => files.filter(x => re.test(x.f)).reduce((a, x) => ({raw: a.raw + x.raw, gz: a.gz + x.gz}), {raw: 0, gz: 0});
  const main = files.filter(x => /^index-.*\.js$/.test(x.f)).reduce((a, x) => ({raw: a.raw + x.raw, gz: a.gz + x.gz}), {raw: 0, gz: 0});
  E.web = {appJsKB: {raw: Math.round(main.raw / 1024), gzip: Math.round(main.gz / 1024)}, cssKB: {raw: Math.round(sum(/\.css$/).raw / 1024), gzip: Math.round(sum(/\.css$/).gz / 1024)},
    lazyKB: {raw: Math.round((sum(/\.(m?js)$/).raw - main.raw) / 1024), gzip: Math.round((sum(/\.(m?js)$/).gz - main.gz) / 1024)}, note: 'PDF and DOCX readers load lazily only when a file is uploaded.'};
} else E.web = {note: 'Run npm run build before npm run eval to include bundle sizes.'};

E.meta.durationSec = r3((Date.now() - T0) / 1000);
writeFileSync(join(ROOT, 'src', 'data', 'evaluation.json'), JSON.stringify(E));
writeFileSync(join(ROOT, 'docs', 'EVALUATION.md'), (await import('./render-report.js')).render(E));
log(`wrote src/data/evaluation.json and docs/EVALUATION.md in ${E.meta.durationSec}s`);
