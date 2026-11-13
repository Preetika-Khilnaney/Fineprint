// Single mutable app state shared across views.
export const S = {
  A: null,              // current analysis (see engine/agents/11-orchestrator.js)
  V2: null,             // analysis of version 2 (Versions view)
  docName: 'Sample · Vendor agreement v1',
  decisions: {},        // redline id -> 'accept' | 'reject'
  edits: {},            // redline id -> custom wording
  open: new Set(),      // expanded findings
  findFilter: 'all',
  catFilter: null,
  plain: true,
  wordDiff: false,
  running: false,
  emailText: '',
};
export const OUTCOMES = ['Pending', 'Negotiated successfully', 'Partly accepted', 'Accepted as-is', 'Rejected by counterparty', 'Walked away'];
