// Agent 4 · Key Information Extraction
// Pulls structured fields: fees, payment days, late fees, notice periods, caps, term, law, dispute seat.
import {extract} from '../parsing.js';

export const informationExtractionAgent = {
  key: 'extract',
  name: 'Information Extraction',
  description: 'Pulls money, dates and notice periods',
  run(A) {
    A.ctx.juris = A.juris;
    extract(A);
    const n = Object.values(A.facts).filter(v => v !== null && v !== undefined).length;
    return `${n} key terms`;
  },
};
