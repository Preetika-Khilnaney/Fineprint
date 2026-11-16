// Verification & grounding checks ("checks and balances").
// Every finding must be traceable to the contract text, every figure in an explanation must come from
// the contract (or be recomputable from it), and independent detectors must agree before a finding is
// marked as verified. Findings that fail grounding are suppressed and never reach the score.
import {detectSignals, hasSignal} from './signals.js';
import {RISKY_RE} from './knowledge/templates.js';
import {CATS} from './knowledge/categories.js';

const norm = t => (t || '').replace(/\s+/g, ' ').trim().toLowerCase();
const nums = t => ((t || '').match(/\d[\d,]*(?:\.\d+)?/g) || []).map(n => n.replace(/,/g, '').replace(/\.0+$/, ''));

// Rules whose finding should be corroborated by an independent, perspective-neutral signal detector.
export const RULE_SIGNAL = {
  unlimited_liability: 'uncapped_liability', tiny_cap: 'liability_cap', one_sided_exclusion: 'liability_cap',
  one_sided_termination: 'termination_convenience', auto_renewal: 'auto_renewal', non_compete: 'non_compete',
  data_license: 'perpetual_licence', ip_overreach: 'ip_assignment', assignment_asym: 'anti_assignment',
};
// Rule-specific evidence patterns (used before generic fallbacks).
const EVIDENCE_RE = {
  foreign_seat: /(?:seated in|seat of arbitration|courts? (?:of|in|at)|venue)[^.;]{0,60}/i, unilateral_price: /may (?:increase|revise|change|adjust)[^.;]{0,80}/i,
  unilateral_amendment: /may (?:amend|modify|change|update)[^.;]{0,100}/i, broad_indemnity: /indemnify[^.;]{0,140}/i, notice_asymmetry: /may terminate[^.;]{0,140}/i,
  ambiguous_payment: /(?:as determined by|from time to time|sole discretion|reasonable expenses|promptly|as agreed)[^.;]{0,40}/i,
};
// Phrases that indicate an actual clause of each required category (used to confirm absence).
const ABSENCE_TERMS = {
  'Data Protection': ['data protection', 'data processing', 'gdpr', 'dpdp', 'personal data breach', 'security measures', 'processor', 'privacy policy', 'privacy laws'],
  'Force Majeure': ['force majeure', 'act of god', 'acts of god', 'beyond its reasonable control', 'beyond the reasonable control'],
  'Indemnity': ['indemnif', 'hold harmless'], 'Confidentiality': ['confidential'], 'Liability': ['liable', 'liability'],
  'Termination': ['terminate', 'termination'], 'Governing Law': ['governed by', 'laws of'], 'Dispute Resolution': ['arbitration', 'dispute', 'courts of'],
  'Payment Terms': ['invoice', 'payment', 'fees'], 'IP Ownership': ['intellectual property', 'license', 'licence'],
};
// Legal constants that a rule may cite (statutory limits), keyed by rule id.
const KB_CONSTANTS = {eu_payment_days: ['60', '2011', '7', '3', '5'], in_msme_days: ['45', '15', '16', '2006']};
// Figures derived from contract figures; the verifier recomputes them instead of trusting the text.
const DERIVED = {
  late_fee: c => { const m = c.text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:per|a|each)\s*month/i); return m ? [((Math.pow(1 + m[1] / 100, 12) - 1) * 100).toFixed(1)] : []; },
};
// Validated precision of the corroborating signal on CUAD (filled from evaluation results when available).
export const PRIOR = {verifiedRule: 0.9, unverifiedRule: 0.7, missing: 0.85, region: 0.9};

function sentencesOf(text) { return text.replace(/\s+/g, ' ').split(/(?<=[.;])\s+/).filter(s => s.length > 3); }

/** Pick a verbatim evidence span for a clause-level risk. */
export function evidenceFor(risk, clause) {
  const flat = clause.text.replace(/\s+/g, ' ');
  const own = EVIDENCE_RE[risk.rule] && flat.match(EVIDENCE_RE[risk.rule]);
  if (own) return own[0];
  const sig = RULE_SIGNAL[risk.rule] && hasSignal(RULE_SIGNAL[risk.rule], clause.text);
  if (sig) return sig;
  const m = clause.text.replace(/\s+/g, ' ').match(new RegExp(RISKY_RE.source, 'i'));
  if (m) return m[0];
  const words = risk.issue.toLowerCase().match(/[a-z]{5,}/g) || [];
  const best = sentencesOf(clause.text).map(s => [s, words.filter(w => s.toLowerCase().includes(w.slice(0, 6))).length]).sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : clause.text.slice(0, 160);
}

export function verify(A) {
  const doc = norm(A.raw);
  const docNums = new Set(nums(A.raw));
  const factNums = new Set(nums(JSON.stringify(A.facts || {})));
  const checks = {grounding: [0, 0], numbers: [0, 0], agreement: [0, 0], consistency: [0, 0], absence: [0, 0]};
  const suppressed = [];

  for (const r of A.risks) {
    const c = A.clauses.find(q => q.id === r.clauseId);
    const v = {grounded: null, numbers: null, agreement: null, consistent: true, absenceVerified: null, notes: []};

    // 1. Evidence grounding: the quoted evidence must exist verbatim in the clause and the clause in the document.
    if (c && !r.missing) {
      r.evidence = evidenceFor(r, c);
      v.grounded = norm(c.text).includes(norm(r.evidence)) && doc.includes(norm(c.text).slice(0, 80));
      checks.grounding[1]++; if (v.grounded) checks.grounding[0]++; else v.notes.push('Evidence not found in the contract text.');
    }
    // 2. Absence verification for missing-clause findings: re-scan the whole document independently.
    if (r.missing) {
      const kws = ABSENCE_TERMS[r.cat] || (CATS[r.cat]?.k || []).filter(k => k.trim().length > 5);
      const hits = kws.filter(k => doc.includes(k.trim().toLowerCase()));
      v.absenceVerified = hits.length === 0;
      r.evidence = v.absenceVerified ? `No clause or sentence mentions ${r.cat.toLowerCase()} terms.` : `Possible mention: "${hits[0].trim()}"`;
      checks.absence[1]++; if (v.absenceVerified) checks.absence[0]++; else v.notes.push(`The document mentions "${hits[0].trim()}"; the clause may exist under another heading.`);
    }
    // 3. Numeric fidelity: every figure in the explanation must appear in the contract, the extracted facts,
    //    the cited statute, or be recomputable from contract figures.
    if (r.why) {
      const allowed = new Set([...(c ? nums(c.text) : []), ...docNums, ...factNums, ...(KB_CONSTANTS[r.rule] || []), ...(c && DERIVED[r.rule] ? DERIVED[r.rule](c) : [])]);
      const claimed = nums(r.why);
      const bad = claimed.filter(n => !allowed.has(n));
      v.numbers = bad.length === 0;
      checks.numbers[1]++; if (v.numbers) checks.numbers[0]++; else v.notes.push(`Unsupported figure(s) in explanation: ${bad.join(', ')}.`);
    }
    // 4. Dual-detector agreement: the rule and an independent signal detector must both fire.
    if (c && RULE_SIGNAL[r.rule]) {
      v.agreement = detectSignals(c.text).some(s => s.id === RULE_SIGNAL[r.rule]);
      checks.agreement[1]++; if (v.agreement) checks.agreement[0]++; else v.notes.push('The independent signal detector did not corroborate this finding.');
    }
    // 5. Cross-agent consistency with the extracted facts.
    const F = A.facts || {};
    if (r.rule === 'unlimited_liability' && F.capUs && !/unlimited|not stated/i.test(F.capUs)) { v.consistent = false; v.notes.push(`Extraction found a cap for ${A.ctx.us}: ${F.capUs}.`); }
    if (r.rule === 'one_sided_termination' && F.term?.us?.conv) { v.consistent = false; v.notes.push(`Extraction found a convenience exit for ${A.ctx.us} too.`); }
    if (r.rule === 'auto_renewal' && !F.autoRenew) { v.consistent = false; v.notes.push('Extraction found no automatic renewal.'); }
    checks.consistency[1]++; if (v.consistent) checks.consistency[0]++;

    // Confidence and status
    let conf = r.missing ? PRIOR.missing : r.juris === true ? PRIOR.region : (v.agreement === false ? PRIOR.unverifiedRule : PRIOR.verifiedRule);
    if (v.numbers === false) conf *= 0.6;
    if (!v.consistent) conf *= 0.5;
    if (v.absenceVerified === false) conf *= 0.5;
    if (c && c.conf < 50 && c.catSource !== 'user') { conf *= 0.9; v.notes.push(`Clause category confidence is low (${c.conf}%).`); }
    r.confidence = +conf.toFixed(2);
    r.verification = v;
    r.status = v.grounded === false ? 'suppressed' : (conf >= 0.75 && v.consistent && v.numbers !== false ? 'verified' : 'review');
    if (r.status === 'suppressed') suppressed.push(r);
  }
  A.risks = A.risks.filter(r => r.status !== 'suppressed');
  A.clauses.forEach(c => { c.risks = c.risks.filter(r => r.status !== 'suppressed'); });

  // 6. Coverage: share of the document's words that ended up inside analysed clauses.
  const dw = (A.raw.match(/[A-Za-z]{3,}/g) || []).length || 1;
  const cw = A.clauses.reduce((a, c) => a + (c.text.match(/[A-Za-z]{3,}/g) || []).length, 0) + ((A.preamble || '') + ' ' + (A.title || '')).split(/\s+/).length;
  const coverage = Math.min(1, cw / dw);
  // 7. Classification confidence.
  const lowConf = A.clauses.filter(c => c.conf < 50 && c.catSource !== 'user').length;
  // 8. Structure sanity: does this look like a contract at all?
  const looksLikeContract = A.clauses.length >= 5 && A.ctx.parties.length >= 2;

  const pct = ([a, b]) => (b ? a / b : 1);
  A.audit = {
    checks: [
      {id: 'grounding', name: 'Evidence grounded in contract text', passed: checks.grounding[0], total: checks.grounding[1]},
      {id: 'numbers', name: 'Figures traceable to the contract or statute', passed: checks.numbers[0], total: checks.numbers[1]},
      {id: 'agreement', name: 'Rule corroborated by independent detector', passed: checks.agreement[0], total: checks.agreement[1]},
      {id: 'consistency', name: 'Consistent with extracted facts', passed: checks.consistency[0], total: checks.consistency[1]},
      {id: 'absence', name: 'Missing clauses confirmed by full-text scan', passed: checks.absence[0], total: checks.absence[1]},
      {id: 'coverage', name: 'Document text covered by analysed clauses', passed: Math.round(coverage * 100), total: 100, unit: '%'},
      {id: 'classification', name: 'Clauses classified with confidence ≥ 50%', passed: A.clauses.length - lowConf, total: A.clauses.length},
      {id: 'structure', name: 'Document recognised as a two-party contract', passed: looksLikeContract ? 1 : 0, total: 1},
    ].map(k => ({...k, rate: pct([k.passed, k.total])})),
    suppressed: suppressed.map(r => ({rule: r.rule, issue: r.issue, num: r.num})),
    verified: A.risks.filter(r => r.status === 'verified').length,
    review: A.risks.filter(r => r.status === 'review').length,
    coverage, lowConfidence: !looksLikeContract || coverage < 0.8,
  };
  return A.audit;
}
