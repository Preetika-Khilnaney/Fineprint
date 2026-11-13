// Report view: the structured review report.
import {REGION, execSummary, plainSummary} from '../../engine/index.js';
import {$, esc, badge, cap, maxLvl, titleCase} from '../dom.js';
import {S} from '../state.js';

export function renderReport() {
  const A = S.A, x = A.ctx, by = {};
  A.clauses.forEach(c => (by[c.cat] = by[c.cat] || []).push(c));
  $('#report').innerHTML = `
    <span class="muted small">Contract review report</span>
    <h2 class="title">${esc(A.title ? titleCase(A.title) : A.name)}</h2>
    <p class="muted">Reviewed for ${esc(x.us)} · ${REGION[A.juris]} · ${new Date(A.at).toLocaleString('en-GB', {dateStyle: 'long', timeStyle: 'short'})}</p>
    <h3>Executive summary</h3><p>${esc(execSummary(A))}</p>
    <div class="stats mt16">
      <div class="stat"><div class="v">${A.score}<span class="muted" style="font-size:15px"> / 100</span></div><div class="k">Risk score</div></div>
      ${Object.entries(A.dims).map(([k, v]) => `<div class="stat"><div style="padding:6px 0">${badge(v.level)}</div><div class="k">${cap(k)} risk</div></div>`).join('')}
    </div>
    <h3>Clause breakdown</h3>
    <ul>${Object.entries(by).map(([k, cs]) => `<li><b>${esc(k)}</b>: clauses ${cs.map(c => esc(c.num)).join(', ')} ${cs.some(c => c.risks.length) ? badge(maxLvl(cs.flatMap(c => c.risks))) : ''}</li>`).join('')}</ul>
    <h3>Risk analysis</h3>
    ${A.risks.map(r => `<div class="rk"><div class="row">${badge(r.level)}<b>${esc(r.issue)}</b><span class="muted small">${r.num ? 'Clause ' + esc(r.num) + ' · ' : ''}${esc(r.cat)} · ${r.dim}</span></div><p>${esc(r.why)}</p>${r.juris ? `<p class="small"><b>${REGION[A.juris]}:</b> ${esc(r.juris)}</p>` : ''}</div>`).join('')}
    <h3>Recommendations</h3>
    <ol>${A.risks.filter(r => r.rec).map(r => `<li>${esc(r.rec)}</li>`).join('')}</ol>
    <h3>Plain-language summary</h3><p>${esc(plainSummary(A))}</p>
    <p class="muted small mt20">Prepared by an automated legal assistant. This is not legal advice. Have qualified counsel review before signing.</p>`;
}
