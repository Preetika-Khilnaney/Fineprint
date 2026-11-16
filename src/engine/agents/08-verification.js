// Agent 8 · Verification & Grounding
// Independent checks on every finding before it can affect the score: verbatim evidence, figures traceable
// to the contract, agreement between two detectors, consistency with extracted facts and confirmed absence
// for missing clauses. Ungrounded findings are suppressed; weakly supported ones are marked for review.
import {verify} from '../verification.js';

export const verificationAgent = {
  key: 'verify',
  name: 'Verification',
  description: 'Grounds and cross-checks every finding',
  run(A) {
    const a = verify(A);
    return `${a.verified} verified · ${a.review} review · ${a.suppressed.length} suppressed`;
  },
};
