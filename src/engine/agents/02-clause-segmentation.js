// Agent 2 · Clause Segmentation
// Splits every section into atomic, numbered clauses (falls back to sentences for unnumbered text).
import {segment} from '../parsing.js';

export const clauseSegmentationAgent = {
  key: 'segment',
  name: 'Clause Segmentation',
  description: 'Splits the document into atomic clauses',
  run(A) { A.clauses = segment(A); return `${A.clauses.length} clauses`; },
};
