// Overview: KPIs, findings accordion, risk breakdown, clause map, missing clauses, key terms, categories.
import {fmtMoney, REGION} from '../../engine/index.js';
import {$, esc, badge, cap, maxLvl, ICONS} from '../dom.js';
import {S} from '../state.js';
import {drawSprites} from '../pixel.js';

const W = {high: 14, medium: 6, low: 2};
const lvlColor = l => l === 'high' ? 'var(--hi)' : l === 'medium' ? 'var(--med)' : 'var(--ok)';

export function renderOverview() {
  const A = S.A, x = A.ctx, F = A.facts;
  const title = A.title ? A.title.toLowerCase().replace(/(^|\s)\S/g, m => m.toUpperCase()) : A.name;
  $('#ovMeta').innerHTML = `Now reviewing the <b>${esc(title)}</b> between ${esc(x.parties.map(p => p.legal || p.role).join(' and '))}${F.effective ? ', effective ' + esc(F.effective) : ''}, from the side of <b>${esc(x.us)}</b>.`;

  const n = l => A.risks.filter(r => r.level === l).length;
  const au = A.audit, verified = au.verified, total = A.risks.length;
  // Six identical stat tiles: label + arrow, sprite in a fixed frame, value, caption.
  const TILES = [
    {label: 'Risk score', sprite: 'scales', href: '#findingsCard', tint: 1, val: A.score, unit: '/100', cap: `${cap(A.level)} risk`, dot: A.level},
    {label: 'Clauses', sprite: 'scroll', href: '#clauses', tint: 2, val: A.clauses.length, cap: `${A.clauses.filter(c => c.risks.length).length} flagged`, dot: ''},
    {label: 'High risks', sprite: 'gavel', href: '#negotiate', tint: 3, val: n('high'), cap: `${n('medium')} medium · ${n('low')} low`, dot: n('high') ? 'high' : 'ok'},
    {label: 'Redlines', sprite: 'quill', href: '#redline', tint: 4, val: A.risks.filter(r => r.fix).length, cap: 'Suggested edits', dot: ''},
    {label: 'Compliance', sprite: 'court', href: '#diff', tint: 5, val: A.compliance, unit: '%', cap: `${A.missing.length} clause${A.missing.length === 1 ? '' : 's'} missing`, dot: A.compliance >= 80 ? 'ok' : A.compliance >= 50 ? 'medium' : 'high'},
    {label: 'Verified', sprite: 'lens', href: '#evaluation', tint: 1, val: verified, unit: `/${total}`, cap: au.review ? `${au.review} need review` : 'All findings grounded', dot: au.review ? 'medium' : 'ok'},
  ];
  $('#stats').innerHTML = TILES.map(t => `<a class="stile tint-${t.tint}" href="${t.href}" ${t.href.startsWith('#findings') ? 'data-scroll="findingsCard"' : ''}>
      <div class="stile-top"><span class="pixlabel">${t.label}</span><span class="go" aria-hidden="true">↗</span></div>
      <div class="stile-art"><canvas data-sprite="${t.sprite}"></canvas></div>
      <div class="stile-val">${t.val}${t.unit ? `<small>${t.unit}</small>` : ''}</div>
      <div class="stile-cap">${t.dot ? `<i class="dot ${t.dot}"></i>` : ''}${esc(t.cap)}</div></a>`).join('');
  drawSprites($('#stats'));

  $('#trust').innerHTML = au.checks.map(k => {
    const ok = k.unit ? k.passed >= 80 : k.passed === k.total, warn = !ok && (k.unit ? k.passed >= 60 : k.rate >= 0.5);
    return `<li><span class="ic ${ok ? '' : warn ? 'warn' : 'bad'}">${ok ? '✓' : '!'}</span><span>${esc(k.name)}</span><span class="v">${k.unit ? k.passed + '%' : k.passed + '/' + k.total}</span></li>`;
  }).join('') + (au.lowConfidence ? '<li><span class="ic bad">!</span><span><b>Low-confidence review.</b> Check the structure of this document manually.</span><span></span></li>' : '');

  $('#trustFoot').innerHTML = `<b>${verified}</b> of ${total} findings verified · ${au.review} need review · ${au.suppressed.length} suppressed. Every finding links to the exact words in the contract.`;
  const counts0 = {}; A.clauses.forEach(c => (counts0[c.cat] = (counts0[c.cat] || 0) + 1));
  $('#pills').innerHTML = Object.entries(counts0).sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([cat, k]) => `<button class="pill-t" data-cat="${esc(cat)}">${esc(cat)}<span class="n">${k}</span></button>`).join('');

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

function highlight(text, ev) {
  if (!ev) return esc(text);
  const flat = text.replace(/\s+/g, ' '), i = flat.toLowerCase().indexOf(ev.replace(/\s+/g, ' ').toLowerCase());
  if (i < 0) return esc(flat);
  return esc(flat.slice(0, i)) + '<mark>' + esc(flat.slice(i, i + ev.replace(/\s+/g, ' ').length)) + '</mark>' + esc(flat.slice(i + ev.replace(/\s+/g, ' ').length));
}

function checkChips(r) {
  const v = r.verification || {}, out = [];
  if (v.grounded !== null && v.grounded !== undefined) out.push([v.grounded, 'Evidence found in text']);
  if (v.absenceVerified !== null && v.absenceVerified !== undefined) out.push([v.absenceVerified, v.absenceVerified ? 'Absence confirmed' : 'Possible mention found']);
  if (v.numbers !== null && v.numbers !== undefined) out.push([v.numbers, 'Figures traceable']);
  if (v.agreement !== null && v.agreement !== undefined) out.push([v.agreement, 'Second detector agrees']);
  out.push([v.consistent !== false, 'Consistent with extracted facts']);
  return `<div class="vchecks">${out.map(([ok, t]) => `<span class="${ok ? 'ok' : 'no'}">${t}</span>`).join('')}</div>`;
}

function findingRow(r) {
  const A = S.A, c = A.clauses.find(q => q.id === r.clauseId), open = S.open.has(r.id);
  const vb = r.status === 'verified' ? `<span class="vbadge">✓ Verified</span>` : `<span class="vbadge review">Needs review</span>`;
  return `<div class="f-row ${open ? 'open' : ''}">
    <button class="f-head" data-toggle="${r.id}" aria-expanded="${open}">${badge(r.level)}<span class="f-title">${esc(r.issue)}</span><span class="f-right"><span class="f-ref">${r.missing ? 'Missing' : 'Clause ' + esc(r.num || '—')}</span>${vb}</span>${ICONS.chev}</button>
    ${open ? `<div class="f-body">
      ${c ? `<div class="quote">${highlight(c.text, r.evidence)}</div>` : ''}
      <div><div class="lbl">Why it matters</div><p>${esc(r.why)}</p></div>
      <div><div class="lbl">Recommendation</div><p>${esc(r.rec)}</p></div>
      ${typeof r.juris === 'string' ? `<div><div class="lbl">${REGION[A.juris]}</div><p>${esc(r.juris)}</p></div>` : ''}
      <div><div class="lbl">Verification · confidence ${Math.round((r.confidence || 0) * 100)}%</div>${checkChips(r)}${(r.verification?.notes || []).length ? `<p class="mt16 small">${esc(r.verification.notes.join(' '))}</p>` : ''}</div>
      ${r.memory ? `<div class="memnote">Seen before in <b>${esc(r.memory.name)}</b>. Outcome: <b>${esc(r.memory.outcome)}</b>${r.memory.note ? ` (${esc(r.memory.note)})` : ''}.</div>` : ''}
      <div class="row" style="gap:16px">${r.fix ? `<button class="btn b-lime sm" data-addrl="${r.id}">Open redline</button>` : ''}${c ? `<button class="link" data-goto="${c.id}">View clause</button>` : ''}<a class="link" href="#negotiate">Negotiation ask</a></div>
    </div>` : ''}
  </div>`;
}
