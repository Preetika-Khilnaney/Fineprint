// Overview: KPIs, findings accordion, risk breakdown, clause map, missing clauses, key terms, categories.
import {fmtMoney, REGION} from '../../engine/index.js';
import {$, esc, badge, cap, maxLvl, ICONS} from '../dom.js';
import {S} from '../state.js';

const W = {high: 14, medium: 6, low: 2};
const lvlColor = l => l === 'high' ? 'var(--hi)' : l === 'medium' ? 'var(--med)' : 'var(--ok)';

export function renderOverview() {
  const A = S.A, x = A.ctx, F = A.facts;
  const title = A.title ? A.title.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()) : A.name;
  $('#ovMeta').innerHTML = `Welcome to your contract chambers. Now reviewing the <b>${esc(title)}</b> between ${esc(x.parties.map(p => p.legal || p.role).join(' and '))}${F.effective ? ', effective ' + esc(F.effective) : ''}.`;

  const n = l => A.risks.filter(r => r.level === l).length;
  $('#hRisk').textContent = `${A.score}/100`;
  $('#hRiskLvl').textContent = `${A.level} risk`; $('#hRiskLvl').className = 'pixtag ' + A.level;
  $('#hClauses').textContent = A.clauses.length;
  $('#hRedlines').textContent = `${A.risks.filter(r => r.fix).length} edits`;
  $('#hHigh').textContent = `${n('high')} high risks`; $('#hHigh').className = 'pixtag ' + (n('high') ? 'high' : 'low');
  $('#hCompliance').textContent = `${A.compliance}%`;
  const counts0 = {}; A.clauses.forEach(c => (counts0[c.cat] = (counts0[c.cat] || 0) + 1));
  const POS = [[2, 6, -28], [55, 2, 0], [40, 30, -12], [2, 52, 6], [52, 56, 8], [16, 80, -6], [54, 82, -10]];
  $('#pills').innerHTML = Object.entries(counts0).sort((a, b) => b[1] - a[1]).slice(0, POS.length)
    .map(([cat], i) => `<button class="pill-t" data-cat="${esc(cat)}" style="left:${POS[i][0]}%;top:${POS[i][1]}%;transform:rotate(${POS[i][2]}deg)">${esc(cat)}</button>`).join('');

  const tabs = [['all', 'All', A.risks.length], ['high', 'High', n('high')], ['medium', 'Medium', n('medium')], ['low', 'Low', n('low')]];
  $('#findFilters').innerHTML = tabs.map(([k, l, c]) => `<button class="${S.findFilter === k ? 'on' : ''}" data-ff="${k}">${l} <span class="muted num">${c}</span></button>`).join('');
  if (!S.open.size && A.risks[0]) S.open.add(A.risks[0].id);
  const list = A.risks.filter(r => S.findFilter === 'all' || r.level === S.findFilter);
  $('#findings').innerHTML = list.length ? list.map(findingRow).join('') : '<div class="empty" style="margin-top:16px">No findings at this level.</div>';

  $('#dims').innerHTML = Object.entries(A.dims).map(([k, v]) => `<div class="dim"><div class="top"><span>${cap(k)} risk</span>${badge(v.level)}</div><div class="meter"><i style="width:${v.pct}%;background:${lvlColor(v.level)}"></i></div></div>`).join('');

  $('#heat').innerHTML = A.clauses.map(c => `<button class="cell ${maxLvl(c.risks)}" data-goto="${c.id}" title="${esc(c.num + ' · ' + c.cat + (c.risks.length ? ' · ' + c.risks.map(r => r.issue).join(', ') : ''))}" aria-label="Clause ${esc(c.num)}">${esc(c.num.split('.')[0])}</button>`).join('');
  $('#heatCount').textContent = `${A.clauses.filter(c => c.risks.length).length} of ${A.clauses.length} flagged`;

  $('#missing').innerHTML = A.missing.length ? A.missing.map(m => {
    const r = A.risks.find(q => q.missing && q.cat === m.cat);
    return `<div class="miss"><span class="row">${esc(m.cat)} ${badge(r.level)}</span><button class="link" data-addrl="${r.id}">Add clause</button></div>`;
  }).join('') : '<p class="muted small">All standard clauses are present.</p>';

  const td = (v, warn) => v ? `<td>${esc(v)}${warn ? ' ' + badge(warn) : ''}</td>` : '<td class="muted">Not found</td>';
  const rows = [
    ['Parties', x.parties.map(p => p.legal ? `${p.legal} (${p.role})` : p.role).join(' · ')],
    ['Effective date', F.effective],
    ['Annual value', F.value ? fmtMoney(F.value) : null],
    ['Payment terms', F.paymentDays ? `Net ${F.paymentDays} days` : null],
    ['Late fee', F.lateFee ? `${F.lateFee.rate}% per ${F.lateFee.per}` : null, F.lateFee && F.lateFee.per === 'month' && F.lateFee.rate >= 1.5 ? 'medium' : null],
    ['Initial term', F.initialTerm],
    ['Auto-renewal', F.autoRenew ? `Yes${F.autoRenew.notice ? `, ${F.autoRenew.notice}-day opt-out` : ''}` : 'No'],
    [`${x.them} can terminate`, F.term.them.conv ? `Any time, ${F.term.them.days ?? '?'} days' notice` : F.term.them.any ? 'For cause only' : null, F.term.them.conv && !F.term.us.conv ? 'high' : null],
    [`${x.us} can terminate`, F.term.us.conv ? `Any time, ${F.term.us.days ?? '?'} days' notice` : F.term.us.cure ? `For cause, ${F.term.us.cure}-day cure` : F.term.us.any ? 'For cause only' : null],
    [`${x.us} liability cap`, F.capUs, F.capUs === 'Unlimited' ? 'high' : null],
    [`${x.them} liability cap`, F.capThem],
    ['Confidentiality', F.confYears ? `${F.confYears} years after termination` : null],
    ['Non-compete', F.nonCompete, F.nonCompete ? 'high' : null],
    ['Governing law', F.law],
    ['Disputes', F.dispute ? F.dispute + (F.seat ? ', ' + F.seat : '') : null],
  ];
  $('#facts').innerHTML = rows.map(([k, v, w]) => `<tr><td>${esc(k)}</td>${td(v, w)}</tr>`).join('');

  const counts = {}; A.clauses.forEach(c => (counts[c.cat] = (counts[c.cat] || 0) + 1));
  const cats = Object.keys(counts).map(cat => {
    const rs = A.risks.filter(r => r.cat === cat && !r.missing);
    const h = rs.filter(r => r.level === 'high').length * W.high, m = rs.filter(r => r.level === 'medium').length * W.medium, l = rs.filter(r => r.level === 'low').length * W.low;
    return {cat, n: counts[cat], h, m, l, t: h + m + l};
  }).sort((a, b) => b.t - a.t || b.n - a.n);
  const mx = Math.max(14, ...cats.map(r => r.t));
  $('#cbars').innerHTML = cats.map(r => `<button class="cbar" data-cat="${esc(r.cat)}"><span class="l">${esc(r.cat)}</span><span class="track">${r.h ? `<i style="width:${100 * r.h / mx}%;background:var(--hi)"></i>` : ''}${r.m ? `<i style="width:${100 * r.m / mx}%;background:var(--med)"></i>` : ''}${r.l ? `<i style="width:${100 * r.l / mx}%;background:var(--lo)"></i>` : ''}</span><span class="v">${r.t}</span></button>`).join('');
}

function findingRow(r) {
  const A = S.A, c = A.clauses.find(q => q.id === r.clauseId), open = S.open.has(r.id);
  return `<div class="f-row ${open ? 'open' : ''}">
    <button class="f-head" data-toggle="${r.id}" aria-expanded="${open}">${badge(r.level)}<span class="f-title">${esc(r.issue)}</span><span class="f-ref">${r.missing ? 'Missing' : 'Clause ' + esc(r.num || '—')} · ${esc(r.cat)}</span>${ICONS.chev}</button>
    ${open ? `<div class="f-body">
      ${c ? `<div class="quote">${esc(c.text)}</div>` : ''}
      <div><div class="lbl">Why it matters</div><p>${esc(r.why)}</p></div>
      <div><div class="lbl">Recommendation</div><p>${esc(r.rec)}</p></div>
      ${r.juris ? `<div><div class="lbl">${REGION[A.juris]}</div><p>${esc(r.juris)}</p></div>` : ''}
      ${r.memory ? `<div class="memnote">Seen before in <b>${esc(r.memory.name)}</b>. Outcome: <b>${esc(r.memory.outcome)}</b>${r.memory.note ? ` (${esc(r.memory.note)})` : ''}.</div>` : ''}
      <div class="row" style="gap:16px">${r.fix ? `<button class="btn b-lime sm" data-addrl="${r.id}">Open redline</button>` : ''}${c ? `<button class="link" data-goto="${c.id}">View clause</button>` : ''}<a class="link" href="#negotiate">Negotiation ask</a></div>
    </div>` : ''}
  </div>`;
}
