// Agent 8 · Plain Language Translator
import {toPlain} from '../plainLanguage.js';

export const plainLanguageAgent = {
  key: 'plain',
  name: 'Plain Language',
  description: 'Rewrites clauses in simple English',
  run(A) { A.clauses.forEach(c => { c.plain = toPlain(c.text, A.ctx, c); }); return `${A.clauses.length} rewritten`; },
};
