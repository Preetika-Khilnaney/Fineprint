// Legal Memory: past reviews stored in localStorage, matched to new risks by rule and text similarity.
import {jaccard, hash} from '../engine/index.js';
import {store, titleCase} from './dom.js';

const KEY = 'fineprint.memory.v1';

function seed() {
  const m = [
    {id: 'ex1', example: true, name: 'Acme Logistics MSA (example)', at: '2026-06-14T10:00:00Z', score: 71, juris: 'IN', risks: [
      {rule: 'unlimited_liability', level: 'high', issue: 'Unlimited liability exposure', cat: 'Liability', text: 'The Client shall be liable for any and all losses and damages arising under this Agreement without limitation.', outcome: 'Negotiated successfully', note: 'Capped at 1x annual fees'},
      {rule: 'auto_renewal', level: 'medium', issue: 'Automatic renewal with long opt-out window', cat: 'Term & Renewal', text: 'This Agreement shall automatically renew for successive one year terms unless notice is given ninety days prior.', outcome: 'Accepted as-is'},
      {rule: 'non_compete', level: 'high', issue: 'Post-termination restriction on your business', cat: 'Non-Compete', text: 'For two years after termination the Client shall not engage any provider offering similar services.', outcome: 'Negotiated successfully', note: 'Removed entirely'},
      {rule: 'one_sided_termination', level: 'high', issue: 'One-sided termination right', cat: 'Termination', text: 'Supplier may terminate this Agreement at any time for any reason upon fifteen days written notice.', outcome: 'Partly accepted', note: 'Notice raised to 60 days'}]},
    {id: 'ex2', example: true, name: 'Helios Analytics SaaS Order (example)', at: '2026-08-02T10:00:00Z', score: 58, juris: 'EU', risks: [
      {rule: 'weak_sla', level: 'medium', issue: 'Weak service level commitment', cat: 'Service Levels', text: 'Provider will use commercially reasonable efforts to make the platform available and does not guarantee uptime.', outcome: 'Negotiated successfully', note: '99.5% with credits'},
      {rule: 'data_license', level: 'high', issue: 'Unrestricted licence to your data', cat: 'IP Ownership', text: 'Customer grants Provider a perpetual, irrevocable license to use Customer Data for any purpose including product improvement.', outcome: 'Rejected by counterparty', note: 'Anonymised use accepted later'},
      {rule: 'unilateral_price', level: 'high', issue: 'Unilateral price increases', cat: 'Payment Terms', text: 'Provider may increase the subscription fees at any time upon notice.', outcome: 'Negotiated successfully', note: 'CPI cap agreed'}]},
  ];
  store.set(KEY, m);
  return m;
}

export const memAll = () => store.get(KEY, null) || seed();
export const memSet = m => store.set(KEY, m.slice(0, 40));

export function saveToMemory(A, docName) {
  const m = memAll();
  A.memId = 'm' + hash(A.raw);
  const prev = m.find(r => r.id === A.memId);
  const rec = {
    id: A.memId, name: A.title ? `${titleCase(A.title)} · ${docName}` : docName, at: A.at, score: A.score, juris: A.juris,
    risks: A.risks.map(r => ({rule: r.rule, level: r.level, issue: r.issue, cat: r.cat, text: r.text || r.issue,
      outcome: (prev && (prev.risks.find(p => p.rule === r.rule && p.text === (r.text || r.issue)) || {}).outcome) || 'Pending'})),
  };
  rec.risks.forEach((rr, i) => (A.risks[i].outcome = rr.outcome));
  const i = m.findIndex(r => r.id === A.memId);
  if (i >= 0) m[i] = rec; else m.unshift(rec);
  memSet(m);
}

export function attachMemory(A) {
  const m = memAll().filter(r => r.id !== 'm' + hash(A.raw));
  A.risks.forEach(r => {
    let best = null, bs = 0;
    m.forEach(rec => rec.risks.forEach(p => {
      const s = (p.rule === r.rule ? 0.55 : 0) + jaccard(p.text, r.text || r.issue) * 0.45;
      if (s > bs) { bs = s; best = {rec, p}; }
    }));
    r.memory = bs >= 0.5 ? {name: best.rec.name, outcome: best.p.outcome, note: best.p.note || '', sim: Math.round(bs * 100)} : null;
  });
}

export function setOutcome(A, riskId, val) {
  const r = A.risks.find(x => x.id === riskId); r.outcome = val;
  const m = memAll(); const rec = m.find(x => x.id === A.memId);
  if (rec) { const i = A.risks.indexOf(r); if (rec.risks[i]) rec.risks[i].outcome = val; memSet(m); }
}
