// Version comparison: risk delta and clause-by-clause changes.
import {$, esc, badge} from '../dom.js';
import {S} from '../state.js';
import {wordDiff} from '../../engine/index.js';

export function renderVersions() {
  if (!S.V2) return;
  const A = S.A, B = S.V2, key = r => r.rule + '|' + r.cat;
  const ka = new Set(A.risks.map(key)), kb = new Set(B.risks.map(key));
  const resolved = A.risks.filter(r => !kb.has(key(r))), added = B.risks.filter(r => !ka.has(key(r))), kept = B.risks.filter(r => ka.has(key(r)));
  const nums = [...new Set([...A.clauses.map(c => c.num), ...B.clauses.map(c => c.num)])].sort((a, b) => { const pa = a.split('.').map(Number), pb = b.split('.').map(Number); return pa[0] - pb[0] || (pa[1] || 0) - (pb[1] || 0); });
  const rows = nums.map(n => { const a = A.clauses.find(c => c.num === n), b = B.clauses.find(c => c.num === n); return {n, a, b, st: !a ? 'added' : !b ? 'removed' : a.text === b.text ? 'same' : 'changed'}; });
  const d = B.score - A.score, filt = $('#vfilter').value;
  const stCls = {added: 'ok', removed: 'high', changed: 'medium', same: 'low'};
  $('#vout').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="v">${A.score} → ${B.score}</div><div class="k">Risk score (${d <= 0 ? '' : '+'}${d})</div></div>
      <div class="stat"><div class="v">${resolved.length}</div><div class="k">Risks resolved</div></div>
      <div class="stat"><div class="v">${added.length}</div><div class="k">New risks</div></div>
      <div class="stat"><div class="v">${rows.filter(r => r.st !== 'same').length}</div><div class="k">Clauses changed</div></div>
    </div>
    <div class="two">
      <div class="callout"><b>Resolved in version 2</b><div class="stack" style="gap:8px;margin-top:10px">${resolved.map(r => `<span class="row">${badge(r.level)}${esc(r.issue)}</span>`).join('') || '<span class="muted">None</span>'}</div></div>
      <div class="callout"><b>Still open or new</b><div class="stack" style="gap:8px;margin-top:10px">${[...added.map(r => `<span class="row">${badge(r.level)}<b>New:</b> ${esc(r.issue)}</span>`), ...kept.map(r => `<span class="row">${badge(r.level)}${esc(r.issue)}</span>`)].join('') || '<span class="muted">None</span>'}</div></div>
    </div>
    <div class="mt20">${rows.filter(r => filt === 'all' || r.st !== 'same').map(r => `<div class="vrow">
      <div><b>${esc(r.n)}</b><br><span class="badge ${stCls[r.st]}">${r.st}</span></div>
      <div class="ink2">${r.a ? esc(r.a.text) : '<span class="muted">Not in v1</span>'}</div>
      <div>${r.st === 'changed' ? wordDiff(r.a.text, r.b.text).filter(([op]) => op !== '-').map(([op, w]) => op === '+' ? `<ins>${esc(w)}</ins>` : esc(w)).join(' ') : r.b ? esc(r.b.text) : '<span class="muted">Removed in v2</span>'}</div>
    </div>`).join('') || '<p class="muted">No clause changes.</p>'}</div>`;
}
