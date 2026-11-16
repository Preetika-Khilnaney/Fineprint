// Agent 10 · Risk Scoring
// Weighted points per verified or review-flagged risk → 0–100 score (higher = riskier), dimension levels and a compliance %.
// Suppressed findings (failed grounding) never reach this agent.
import {REQUIRED} from '../knowledge/categories.js';

export const WEIGHTS = {high: 14, medium: 6, low: 2};

export const riskScoringAgent = {
  key: 'score',
  name: 'Risk Scoring',
  description: 'Scores financial, legal and operational risk',
  run(A) {
    const dims = {financial: 0, legal: 0, operational: 0};
    let pts = 0;
    A.risks.forEach(r => { pts += WEIGHTS[r.level]; dims[r.dim] += WEIGHTS[r.level]; });
    A.points = pts;
    A.score = Math.round(100 * (1 - Math.exp(-pts / 70)));
    A.dims = Object.fromEntries(Object.entries(dims).map(([k, v]) => [k, {pts: v, level: v >= 28 ? 'high' : v >= 10 ? 'medium' : 'low', pct: Math.min(100, Math.round(100 * (1 - Math.exp(-v / 35))))}]));
    let comp = 0;
    REQUIRED.forEach(([cat]) => {
      const has = A.clauses.some(c => c.cat === cat);
      const hi = A.risks.some(r => r.cat === cat && r.level === 'high' && !r.missing);
      comp += has ? (hi ? 0.5 : 1) : 0;
    });
    A.compliance = Math.round(100 * comp / REQUIRED.length);
    A.level = A.score >= 65 ? 'high' : A.score >= 35 ? 'medium' : 'low';
    return `${A.score}/100 · ${A.level}`;
  },
};
