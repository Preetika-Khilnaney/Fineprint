// Clauses: outline, category chips, search and risk filters, plain-English toggle, reclassification.
import {CATS, RISKY_RE, fmtMoney} from '../../engine/index.js';
import {$, esc, badge, maxLvl} from '../dom.js';
import {S} from '../state.js';

export const highlightRisky = text => esc(text).replace(new RegExp(RISKY_RE.source, 'gi'), m => `<mark class="risk">${m}</mark>`);

export function renderClauses() {
  const A = S.A;
  const secs = {};
  A.clauses.forEach(c => { (secs[c.sec + '|' + c.secTitle] = secs[c.sec + '|' + c.secTitle] || {n: c.sec, t: c.secTitle, cs: []}).cs.push(c); });
  $('#tree').innerHTML = Object.values(secs).map(s => `<details open><summary><span class="sn">${esc(s.n)}</span>${esc(s.t)}</summary>${s.cs.map(c => `<button data-goto="${c.id}"><span class="rdot ${maxLvl(c.risks)}"></span>${esc(c.num)}</button>`).join('')}</details>`).join('');

  const counts = {}; A.clauses.forEach(c => (counts[c.cat] = (counts[c.cat] || 0) + 1));
  $('#catFilters').innerHTML = `<button class="chip ${!S.catFilter ? 'on' : ''}" data-cf="">All<span class="n">${A.clauses.length}</span></button>` +
    Object.entries(counts).map(([k, n]) => `<button class="chip ${S.catFilter === k ? 'on' : ''}" data-cf="${esc(k)}">${esc(k)}<span class="n">${n}</span></button>`).join('');
  $('#plainToggle').textContent = 'Plain English ' + (S.plain ? 'on' : 'off');
  renderClauseList();
}

export function renderClauseList() {
  const A = S.A, q = $('#q').value.trim().toLowerCase(), rf = $('#rf').value;
  const list = A.clauses.filter(c => (!S.catFilter || c.cat === S.catFilter)
    && (!q || (c.text + ' ' + c.cat + ' ' + c.num).toLowerCase().includes(q))
    && (rf === 'all' || (rf === 'high' && c.risks.some(r => r.level === 'high')) || (rf === 'medium' && c.risks.some(r => r.level !== 'low')) || (rf === 'any' && c.risks.length) || (rf === 'none' && !c.risks.length)));
  $('#clauseList').innerHTML = list.length ? list.map(c => {
    const f = c.fields;
    const chips = [...(f.days || []).map(d => d + ' days'), ...(f.months || []).map(d => d + ' months'), ...(f.years || []).map(d => d + ' years'), ...(f.percent || []).map(p => p + '%'), ...(f.money ? [fmtMoney(f.money)] : [])];
    return `<article class="clause" id="cl-${c.id}">
      <div class="chead"><span class="cnum">${esc(c.num)}</span><span class="pill">${esc(c.cat)}</span>${c.risks.map(r => badge(r.level)).join('')}
        <span class="muted small">${c.overridden ? 'Category set by you' : c.conf + '% confidence'}</span>
        <select class="reclass" data-reclass="${esc(c.num)}" aria-label="Change category of clause ${esc(c.num)}">${Object.keys(CATS).map(k => `<option ${k === c.cat ? 'selected' : ''}>${k}</option>`).join('')}</select></div>
      <div class="ctext">${highlightRisky(c.text)}</div>
      ${S.plain ? `<div class="plain"><b>In plain English</b>${esc(c.plain)}</div>` : ''}
      ${chips.length ? `<div class="fields">${chips.map(x => `<span class="pill num">${esc(x)}</span>`).join('')}</div>` : ''}
      ${c.risks.map(r => `<details class="why"><summary>${esc(r.issue)}</summary><p>${esc(r.why)}</p><p><b>Fix:</b> ${esc(r.rec)}</p>${r.fix ? `<div class="row mt16"><button class="btn b-lime sm" data-addrl="${r.id}">Open redline</button></div>` : ''}</details>`).join('')}
    </article>`;
  }).join('') : '<div class="empty">No clauses match these filters.</div>';
}
