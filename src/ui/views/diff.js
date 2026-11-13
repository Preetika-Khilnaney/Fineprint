// Clause diff: standard clause | contract clause | risk highlight.
import {STD, GOOD_RE, fillStd, wordDiff} from '../../engine/index.js';
import {$, esc, badge, maxLvl} from '../dom.js';
import {S} from '../state.js';
import {highlightRisky} from './clauses.js';

const hlGood = t => esc(t).replace(new RegExp(GOOD_RE.source, 'gi'), m => `<mark class="good">${m}</mark>`);
export const diffHtml = (a, b) => wordDiff(a, b).map(([op, w]) => op === '=' ? esc(w) : op === '+' ? `<ins>${esc(w)}</ins>` : `<del>${esc(w)}</del>`).join(' ');

export function renderDiff() {
  const A = S.A, x = A.ctx, cats = Object.keys(STD);
  const sel = $('#diffCat').value || '__risky';
  $('#diffCat').innerHTML = `<option value="__risky">Categories with risks</option><option value="__all">All categories</option>` + cats.map(c => `<option>${c}</option>`).join('');
  $('#diffCat').value = sel;
  $('#wdToggle').textContent = 'Word diff ' + (S.wordDiff ? 'on' : 'off');
  const show = cats.filter(cat => sel === '__all' || sel === cat || (sel === '__risky' && A.risks.some(r => r.cat === cat)));
  $('#diffList').innerHTML = show.map(cat => {
    const std = fillStd(STD[cat], x), cs = A.clauses.filter(c => c.cat === cat), rs = A.risks.filter(r => r.cat === cat);
    const contract = !cs.length ? '<p class="muted">Not in the contract.</p>'
      : S.wordDiff ? diffHtml(std, cs.map(c => c.text).join(' '))
      : cs.map(c => `<p style="margin-bottom:8px"><b>${esc(c.num)}</b> ${highlightRisky(c.text)}</p>`).join('');
    return `<div class="dcard"><div class="dcard-h"><h2>${esc(cat)}</h2>${rs.length ? badge(maxLvl(rs)) : badge('ok')}</div>
      <div class="dcols">
        <div class="std"><span class="colh">Standard clause</span>${hlGood(std)}</div>
        <div><span class="colh">Contract clause${S.wordDiff ? ' (changes vs standard)' : ''}</span>${contract}</div>
        <div><span class="colh">Risk</span>${rs.length ? rs.map(r => `<div class="dev">${badge(r.level)}<b>${esc(r.issue)}</b><p>${esc(r.rec)}</p></div>`).join('') + (rs.some(r => r.fix) ? `<a class="btn b-pink sm" href="#redline">Redline</a>` : '') : '<p class="ink2">Matches the standard.</p>'}</div>
      </div></div>`;
  }).join('') || '<div class="empty">No categories to show.</div>';
}
