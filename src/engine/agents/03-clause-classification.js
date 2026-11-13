// Agent 3 · Clause Classification
// Scores each clause against category title and keyword signals. User overrides always win.
import {classify} from '../parsing.js';

export const clauseClassificationAgent = {
  key: 'classify',
  name: 'Clause Classification',
  description: 'Assigns each clause a legal category',
  run(A) {
    classify(A.clauses, A.overrides);
    A.cats = [...new Set(A.clauses.map(c => c.cat))];
    return `${A.cats.length} categories`;
  },
};
