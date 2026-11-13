// Redline: suggested edits with accept / reject / edit, and the rebuilt contract.
import {$, esc, badge} from '../dom.js';
import {S} from '../state.js';
import {diffHtml} from './diff.js';

export function redlineItems() {
  const seen = new Set();
  return S.A.risks.filter(r => r.fix).filter(r => { const k = r.clauseId || 'add_' + r.cat; if (seen.has(k)) return false; seen.add(k); return true; });
}

export function revisedText() {
  const A = S.A, rep = {}, adds = [];
  redlineItems().forEach(r => { if (S.decisions[r.id] !== 'accept') return; const t = S.edits[r.id] ?? r.fix; if (r.clauseId) rep[r.clauseId] = t; else adds.push({cat: r.cat, t}); });
  const L = [], marks = new Set();
  if (A.title) L.push(A.title, ''); if (A.preamble) L.push(A.preamble, '');
  A.sections.forEach(s => {
    L.push(`${s.num}. ${s.title}`);
    A.clauses.filter(c => c.sec === s.num && c.secTitle === s.title).forEach(c => { const nt = rep[c.id]; L.push(`${c.num} ${nt ?? c.text}`); if (nt) marks.add(L.length - 1); });
    L.push('');
  });
  let n = Math.max(0, ...A.sections.map(s => +s.num || 0));
  adds.forEach(a => { n++; L.push(`${n}. ${a.cat}`); marks.add(L.length - 1); L.push(`${n}.1 ${a.t}`); marks.add(L.length - 1); L.push(''); });
  return {text: L.join('\n').trim(), lines: L, marks};
}

export function renderRevised() {
  const R = revisedText();
  $('#revised').innerHTML = R.lines.map((l, i) => R.marks.has(i) ? `<span class="chg">${esc(l)}</span>` : esc(l)).join('\n');
}

export function renderRedline() {
  const items = redlineItems();
  const acc = items.filter(r => S.decisions[r.id] === 'accept').length, rej = items.filter(r => S.decisions[r.id] === 'reject').length;
  $('#rlSummary').textContent = `${items.length} suggested edits · ${acc} accepted · ${rej} rejected. Accepted edits flow into the revised contract on the right.`;
  $('#rlList').innerHTML = items.map(r => {
    const d = S.decisions[r.id] || '', after = S.edits[r.id] ?? r.fix;
    return `<article class="rl ${d === 'accept' ? 'accepted' : d === 'reject' ? 'rejected' : ''}" id="rl-${r.id}">
      <div class="row between"><span class="row">${badge(r.level)}<h3>${esc(r.issue)}</h3></span><span class="muted small">${r.clauseId ? 'Replace clause ' + esc(r.num) : 'Add new clause'}</span></div>
      <div class="diff">${r.before ? diffHtml(r.before, after) : `<ins>${esc(after)}</ins>`}</div>
      <details><summary>Edit the suggested wording</summary><textarea rows="4" id="ed-${r.id}" data-edit="${r.id}">${esc(after)}</textarea></details>
      <div class="row">
        <button class="btn b-lime sm" data-dec="accept" data-rid="${r.id}">${d === 'accept' ? '✓ Accepted' : 'Accept'}</button>
        <button class="btn b-pink sm" data-dec="reject" data-rid="${r.id}">${d === 'reject' ? 'Rejected' : 'Reject'}</button>
        ${d ? `<button class="link" data-dec="" data-rid="${r.id}">Undo</button>` : ''}
      </div></article>`;
  }).join('') || '<div class="empty">No edits needed.</div>';
  renderRevised();
}
