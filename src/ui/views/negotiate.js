// Negotiation assistant: leverage, prioritised asks with fallbacks, outcome tracking, draft message.
import {fmtMoney} from '../../engine/index.js';
import {$, esc, titleCase} from '../dom.js';
import {S, OUTCOMES} from '../state.js';

const PRIO = {high: 'Must-have', medium: 'Should-have', low: 'Nice-to-have'};

export function renderNegotiate() {
  const A = S.A, x = A.ctx, F = A.facts, asks = A.risks.filter(r => r.ask);
  const lev = [];
  if (F.initialTerm && /two|three|four|five|\b[2-9]\b/i.test(F.initialTerm)) lev.push(`Your ${F.initialTerm} commitment is valuable to ${x.them}. Offer to keep it in exchange for a liability cap and mutual termination rights.`);
  if (F.value) lev.push(`At ${fmtMoney(F.value)} a year this is a significant account. Ask for the terms ${x.them} gives its enterprise customers.`);
  const won = asks.filter(r => r.memory && /success/i.test(r.memory.outcome));
  if (won.length) lev.push(`Memory shows similar asks succeeded before. Lead with: ${won.slice(0, 3).map(r => r.issue.toLowerCase()).join('; ')}.`);
  lev.push('Send all must-haves together. Trade nice-to-haves only for must-haves.');
  $('#leverage').innerHTML = `<b>Strategy</b><ul>${lev.map(l => `<li>${esc(l)}</li>`).join('')}</ul>`;
  $('#asks').innerHTML = asks.map(r => `<div class="ask">
      <span class="badge ${r.level}">${PRIO[r.level]}</span>
      <div class="stack" style="gap:6px">
        <span class="t">${esc(r.ask)}</span>
        <span class="meta">${esc(r.issue)}${r.num ? ' · clause ' + esc(r.num) : ''}</span>
        <span class="fb"><b>Fallback:</b> ${esc(r.fallback)}</span>
        ${r.memory ? `<span class="memnote">${esc(r.memory.outcome)} in ${esc(r.memory.name)}</span>` : ''}
        <label class="inline" for="oc-${r.id}">Outcome <select id="oc-${r.id}" data-oc="${r.id}">${OUTCOMES.map(o => `<option ${o === (r.outcome || 'Pending') ? 'selected' : ''}>${o}</option>`).join('')}</select></label>
      </div></div>`).join('') || '<div class="empty">Nothing to negotiate. The contract matches the standards.</div>';
  renderEmail();
}

export function renderEmail() {
  const A = S.A, x = A.ctx, firm = $('#tone').value === 'firm';
  let asks = A.risks.filter(r => r.ask);
  if ($('#mustOnly').checked) asks = asks.filter(r => r.level === 'high');
  const them = x.parties.find(q => q.role === x.them), us = x.parties.find(q => q.role === x.us) || {};
  const nHigh = Math.max(1, asks.filter(r => r.level === 'high').length);
  const body = [
    `Subject: ${A.title ? titleCase(A.title) : 'Agreement'}: requested changes`, '',
    `Dear ${them && them.legal ? them.legal : x.them} team,`, '',
    firm ? 'We have completed our review of the draft agreement and cannot sign it in its current form. We need the following changes:'
         : 'Thank you for sending the draft agreement. We are keen to move forward, and our review raised a few points we would like to work through with you:', '',
    ...asks.map((r, i) => `${i + 1}. ${r.ask}${r.num ? ` (clause ${r.num})` : ''}`), '',
    firm ? `Items 1 to ${nHigh} are conditions of signature. We can send marked-up wording for each.` : 'We have suggested wording for each point and would be happy to walk through it on a call this week.', '',
    'Kind regards,', '[Your name]', us.legal || x.us,
  ].join('\n');
  $('#email').textContent = body;
  S.emailText = body;
}
