// Agent 5 · Standard Template Comparison
// Compares the contract against the ideal templates and lists required clauses that are missing.
import {REQUIRED} from '../knowledge/categories.js';
import {STD} from '../knowledge/templates.js';

export const templateComparisonAgent = {
  key: 'compare',
  name: 'Template Comparison',
  description: 'Checks clauses against fair standards',
  run(A) {
    A.missing = REQUIRED.filter(([cat]) => !A.clauses.some(c => c.cat === cat)).map(([cat, level, dim]) => ({cat, level, dim}));
    A.present = Object.keys(STD).filter(cat => A.clauses.some(c => c.cat === cat));
    return `${A.present.length} compared · ${A.missing.length} missing`;
  },
};
