// Memory view: saved contracts, matches for the current review, success rates by issue.
import {REGION} from '../../engine/index.js';
import {$, esc, fmtDate} from '../dom.js';
import {S} from '../state.js';
import {memAll} from '../memory.js';

export function renderMemory() {
  const A = S.A, m = memAll();
  $('#memCount').textContent = `${m.length} saved`;
  $('#memList').innerHTML = m.map(r => `<div class="mem"><div><span class="t">${esc(r.name)}</span>${r.example ? '<span class="tag">Example</span>' : ''}${r.id === A.memId ? '<span class="tag">Current</span>' : ''}
      <div class="muted small">${fmtDate(r.at)} · ${REGION[r.juris] || r.juris} · score ${r.score} · ${r.risks.length} risks · ${r.risks.filter(x => x.outcome && x.outcome !== 'Pending').length} outcomes</div></div>
      <div class="confirm" id="del-${r.id}">${r.id === A.memId ? '' : `<button class="btn ghost sm" data-delask="${r.id}">Delete</button>`}</div></div>`).join('');
  const mt = A.risks.filter(r => r.memory);
  $('#memMatches').innerHTML = mt.length ? mt.map(r => `<div class="ask"><span class="badge ok">${r.memory.sim}% match</span><div class="stack" style="gap:4px"><span class="t">${esc(r.issue)}${r.num ? ' · clause ' + esc(r.num) : ''}</span><span class="meta">Seen in ${esc(r.memory.name)}. Outcome: <b>${esc(r.memory.outcome)}</b>${r.memory.note ? ` (${esc(r.memory.note)})` : ''}.</span></div></div>`).join('') : '<div class="empty">No similar clauses in memory yet.</div>';
  const st = {};
  m.forEach(rec => rec.risks.forEach(p => { if (!p.outcome || p.outcome === 'Pending') return; const s = st[p.issue] = st[p.issue] || {n: 0, ok: 0}; s.n++; if (/success|partly/i.test(p.outcome)) s.ok++; }));
  const rows = Object.entries(st).sort((a, b) => b[1].n - a[1].n);
  $('#memStats').innerHTML = rows.length ? '<tr><th>Issue</th><th>Negotiated</th><th>Won or partly won</th></tr>' + rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td class="num">${v.n}</td><td class="num">${Math.round(100 * v.ok / v.n)}%</td></tr>`).join('') : '<tr><td class="muted">Record outcomes in Negotiate to build this table.</td></tr>';
}
