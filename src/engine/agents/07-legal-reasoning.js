// Agent 7 · Legal Reasoning
// Explains *why* each risk matters using the contract's own figures, adds a fix, a negotiation ask and a region note.
import {RULES, MISSING_WHY} from '../rules.js';
import {JN} from '../knowledge/jurisdictions.js';
import {STD, fillStd} from '../knowledge/templates.js';

export const legalReasoningAgent = {
  key: 'reason',
  name: 'Legal Reasoning',
  description: 'Explains why each risk matters',
  run(A) {
    const x = A.ctx, F = A.facts;
    A.risks.forEach(r => {
      const rule = RULES.find(q => q.id === r.rule);
      const c = A.clauses.find(q => q.id === r.clauseId);
      if (rule) {
        r.why = rule.why(x, c, F); r.rec = rule.rec(x, F); r.fix = rule.fix(x, c);
        r.ask = rule.ask(x); r.fallback = rule.fallback; r.before = c.text;
        r.juris = (JN[r.rule] || {})[A.juris] || null;
      } else if (r.missing) {
        r.why = (MISSING_WHY[r.cat] || (() => 'This standard protection is absent.'))(x);
        r.rec = `Add a ${r.cat.toLowerCase()} clause based on the standard template.`;
        r.fix = fillStd(STD[r.cat] || '', x); r.ask = `Add a ${r.cat.toLowerCase()} clause.`;
        r.fallback = 'Accept a shorter version that covers the core obligations.'; r.before = '';
        r.juris = r.cat === 'Data Protection' ? JN.missing_data_protection[A.juris] : null;
      } else if (r.rule === 'eu_payment_days') {
        r.why = `Payment is due ${F.paymentDays} days after invoice. The Late Payment Directive limits business-to-business payment terms to 60 days unless expressly agreed and not grossly unfair to the creditor.`;
        r.rec = 'Shorten the payment period to 60 days or less.'; r.ask = 'Shorten payment terms to 60 days.';
        r.fallback = 'Keep the term if it is expressly agreed and documented.'; r.juris = 'EU Directive 2011/7/EU, Article 3(5).'; r.fix = null;
      } else if (r.rule === 'in_msme_days') {
        r.why = `Payment is due ${F.paymentDays} days after invoice. If ${x.V} is a registered micro or small enterprise, Section 15 of the MSMED Act, 2006 requires payment within 45 days, with compound interest on delays.`;
        r.rec = `Confirm ${x.V}'s MSME status and align the payment term to 45 days if it applies.`; r.ask = 'Confirm MSME status before signing.';
        r.fallback = '—'; r.juris = 'MSMED Act, 2006, Sections 15–16.'; r.fix = null;
      }
    });
    return `${A.risks.length} explanations`;
  },
};
