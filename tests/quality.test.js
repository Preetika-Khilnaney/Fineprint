// Tests for the components added for accuracy and hallucination control:
// the Naive Bayes model, the hybrid classifier, the risk-signal detectors and the verification agent.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAll, newAnalysis, AGENTS, verify, detectSignals, classifyText, MODEL_INFO} from '../src/engine/index.js';
import {train, predict, tokenize} from '../src/engine/ml/naiveBayes.js';
import {SAMPLE_V1, SAMPLE_V2} from '../src/data/samples.js';

// Run every agent up to (not including) verification, so faults can be injected before the verifier sees them.
function preVerify(text) {
  const A = newAnalysis(text, {juris: 'IN'});
  for (const a of AGENTS) { if (a.key === 'verify') break; a.run(A); }
  return A;
}
const base = {level: 'high', dim: 'legal', cat: 'General', ask: 'x', rec: 'x', fallback: 'x'};

// ---------- Naive Bayes ----------
test('tokenizer drops stopwords and adds bigrams', () => {
  const t = tokenize('The Licensee shall not assign this Agreement');
  assert.ok(!t.includes('the'));
  assert.ok(t.includes('assign'));
  assert.ok(t.some(x => x.includes(' ') || x.includes('_')), 'expected at least one bigram');
});

test('Naive Bayes learns a separable toy problem', () => {
  const items = [];
  for (let i = 0; i < 30; i++) {
    items.push({text: `This agreement is governed by the laws of state ${i} and courts of that state`, label: 'Law'});
    items.push({text: `Customer shall pay each invoice within ${i + 10} days of receipt by wire transfer`, label: 'Pay'});
  }
  const m = train(items, {alpha: 1, maxFeatures: 200, minDf: 1});
  assert.equal(predict(m, 'governed by the laws of Delaware').label, 'Law');
  assert.equal(predict(m, 'pay the invoice within thirty days').label, 'Pay');
  const p = predict(m, 'pay the invoice').probs;
  const total = Object.values(p).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(total - 1) < 1e-6, 'probabilities sum to 1');
});

// ---------- Hybrid classifier ----------
test('trained model ships with CUAD provenance and tuned blend', () => {
  assert.ok(MODEL_INFO, 'model.js is present');
  assert.ok(MODEL_INFO.labels.includes('Governing Law'));
  assert.ok(MODEL_INFO.features > 1000);
  assert.equal(typeof MODEL_INFO.blend.w, 'number');
  assert.match(JSON.stringify(MODEL_INFO.trainedOn), /CUAD/i);
});

test('classifier reads ordinary clauses correctly', () => {
  assert.equal(classifyText('This Agreement shall be governed by and construed in accordance with the laws of the State of New York.').cat, 'Governing Law');
  assert.equal(classifyText('Neither party may assign this Agreement without the prior written consent of the other party.').cat, 'Assignment');
  assert.equal(classifyText('Licensee shall pay Licensor a royalty of five percent of Net Sales, payable quarterly.').cat, 'Payment Terms');
  // keywords match whole-word prefixes: "undisputed" must not count as a dispute clause
  assert.notEqual(classifyText('Customer shall pay all undisputed invoices within thirty (30) days of receipt.').cat, 'Dispute Resolution');
  assert.equal(classifyText('Customer shall pay all undisputed invoices within thirty (30) days of receipt.', 'Payment Terms').cat, 'Payment Terms');
});

test('a section heading anchors the category', () => {
  const r = classifyText('Each party shall defend and hold harmless the other party from third-party claims arising from its breach.', 'Indemnification');
  assert.equal(r.cat, 'Indemnity');
  assert.equal(r.source, 'heading');
});

test('rules-only and model-only modes are available for ablation', () => {
  const t = 'This Agreement shall be governed by the laws of England and Wales.';
  assert.equal(classifyText(t, '', {mode: 'rules'}).cat, 'Governing Law');
  assert.equal(classifyText(t, '', {mode: 'model'}).cat, 'Governing Law');
});

// ---------- Risk signals ----------
test('signal detectors fire on clear wording and stay quiet on neutral text', () => {
  const has = (t, id) => detectSignals(t).some(s => s.id === id);
  assert.ok(has('In no event shall either party\'s aggregate liability exceed the fees paid in the twelve months preceding the claim.', 'liability_cap'));
  assert.ok(has('This Agreement shall automatically renew for successive one-year terms unless either party gives notice of non-renewal.', 'auto_renewal'));
  assert.ok(has('Neither party may assign this Agreement without the prior written consent of the other party.', 'anti_assignment'));
  assert.ok(!has('The parties will meet quarterly to review service performance.', 'liability_cap'));
  assert.ok(!has('The parties will meet quarterly to review service performance.', 'auto_renewal'));
});

test('every signal hit carries verbatim evidence', () => {
  const text = 'Customer shall be liable for any and all damages arising out of this Agreement, without limitation.';
  for (const s of detectSignals(text)) assert.ok(text.toLowerCase().includes(s.evidence.toLowerCase()), s.id);
});

// ---------- Verification agent ----------
test('every finding on the samples is grounded and verified or flagged', () => {
  for (const sample of [SAMPLE_V1, SAMPLE_V2]) {
    const A = runAll(sample, {juris: 'IN'});
    assert.ok(A.audit, 'audit present');
    assert.equal(A.audit.checks.length, 8);
    for (const r of A.risks) {
      assert.ok(['verified', 'review'].includes(r.status), r.issue);
      assert.ok(r.confidence > 0 && r.confidence <= 1);
      if (!r.missing) assert.ok(sample.replace(/\s+/g, ' ').toLowerCase().includes(r.evidence.replace(/\s+/g, ' ').toLowerCase()), `evidence for ${r.issue}`);
    }
  }
});

test('verifier suppresses a finding that cites text not in the contract', () => {
  const A = preVerify(SAMPLE_V1);
  const fake = {id: 'cfake', num: '99.9', sec: '99', secTitle: 'Fabricated', text: 'The Supplier shall pay a penalty of fifty million dollars per late delivery.', cat: 'Payment Terms', conf: 90, risks: [], fields: {}};
  A.clauses.push(fake);
  const r = {...base, id: 'm1', rule: 'unilateral_price', issue: 'Phantom', clauseId: 'cfake', num: '99.9', text: fake.text, why: 'A penalty applies.'};
  A.risks.push(r);
  verify(A);
  assert.equal(r.status, 'suppressed');
  assert.ok(!A.risks.includes(r));
  assert.ok(A.audit.suppressed.some(x => x.rule === r.rule && x.num === '99.9'));
});

test('verifier flags an invented figure', () => {
  const A = preVerify(SAMPLE_V1);
  const c = A.clauses[3];
  const r = {...base, id: 'm2', rule: 'sole_discretion', issue: 'Invented', clauseId: c.id, num: c.num, text: c.text, why: 'Exposes Customer to a penalty of 9,731,557 per breach.'};
  A.risks.push(r);
  verify(A);
  assert.equal(r.verification.numbers, false);
  assert.notEqual(r.status, 'verified');
});

test('verifier flags a rule attached to an unrelated clause', () => {
  const A = preVerify(SAMPLE_V1);
  const c = A.clauses.find(q => q.cat === 'Definitions');
  const r = {...base, id: 'm3', rule: 'non_compete', issue: 'Misattributed', clauseId: c.id, num: c.num, text: c.text, why: 'Restricts the reader.'};
  A.risks.push(r);
  verify(A);
  assert.equal(r.verification.agreement, false);
  assert.notEqual(r.status, 'verified');
});

test('verifier flags a "missing clause" claim when the clause exists', () => {
  const A = preVerify(SAMPLE_V1);
  const r = {...base, id: 'm5', rule: 'missing_x', issue: 'Missing Governing Law', cat: 'Governing Law', clauseId: null, num: null, text: '', missing: true, why: 'Absent.'};
  A.risks.push(r);
  verify(A);
  assert.equal(r.verification.absenceVerified, false);
  assert.notEqual(r.status, 'verified');
});

test('analysis is deterministic', () => {
  const a = runAll(SAMPLE_V1, {juris: 'IN'}), b = runAll(SAMPLE_V1, {juris: 'IN'});
  assert.deepEqual(a.risks.map(r => [r.rule, r.num, r.status, r.confidence]), b.risks.map(r => [r.rule, r.num, r.status, r.confidence]));
});
