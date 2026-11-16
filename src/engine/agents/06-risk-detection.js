// Agent 6 · Risk Detection
// Runs every rule over every clause, adds missing-clause risks and region-specific checks.
import {RULES} from '../rules.js';
import {detectSignals} from '../signals.js';

const ORDER = {high: 0, medium: 1, low: 2};

export const riskDetectionAgent = {
  key: 'detect',
  name: 'Risk Detection',
  description: 'Flags high, medium and low risks',
  run(A) {
    const x = A.ctx, F = A.facts, R = [];
    let k = 0;
    A.clauses.forEach(c => {
      c.risks = [];
      c.signals = detectSignals(c.text);
      RULES.forEach(rule => {
        let ok = false;
        try { ok = rule.test(c, x, F); } catch { ok = false; }
        if (ok && R.some(q => q.rule === rule.id && q.cat === c.cat)) ok = false; // one finding per rule per category
        if (ok) {
          const risk = {id: 'r' + (k++), rule: rule.id, level: rule.level, dim: rule.dim, issue: rule.issue, cat: c.cat, clauseId: c.id, num: c.num, text: c.text};
          R.push(risk); c.risks.push(risk);
        }
      });
    });
    A.missing.forEach(m => {
      const level = m.cat === 'Data Protection' && (A.juris === 'EU' || A.juris === 'UK') ? 'high' : m.level;
      R.push({id: 'r' + (k++), rule: 'missing_' + m.cat.toLowerCase().replace(/[^a-z]+/g, '_'), level, dim: m.dim, issue: `Missing ${m.cat.toLowerCase()} clause`, cat: m.cat, clauseId: null, num: null, text: '', missing: true});
    });
    if (F.paymentDays) {
      const payClause = (A.clauses.find(c => c.cat === 'Payment Terms') || {}).id;
      if (A.juris === 'EU' && F.paymentDays > 60) R.push({id: 'r' + (k++), rule: 'eu_payment_days', level: 'medium', dim: 'legal', issue: 'Payment term exceeds EU norm', cat: 'Payment Terms', clauseId: payClause, num: null, text: '', juris: true});
      if (A.juris === 'IN' && F.paymentDays > 45 && x.us === x.C) R.push({id: 'r' + (k++), rule: 'in_msme_days', level: 'low', dim: 'legal', issue: 'Payment term longer than MSME limit', cat: 'Payment Terms', clauseId: payClause, num: null, text: '', juris: true});
    }
    const ri = r => { const i = RULES.findIndex(q => q.id === r.rule); return i < 0 ? 99 : i; };
    R.sort((a, b) => ORDER[a.level] - ORDER[b.level] || ri(a) - ri(b));
    A.risks = R;
    const n = l => R.filter(r => r.level === l).length;
    return `${n('high')} high · ${n('medium')} med · ${n('low')} low`;
  },
};
