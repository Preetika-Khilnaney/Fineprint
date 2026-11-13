// Report builders: Markdown, JSON, executive and plain-language summaries.
import {fmtMoney} from './utils.js';
import {REGION} from './knowledge/jurisdictions.js';

export function buildMarkdown(A){
  const x=A.ctx,L=[];const hi=A.risks.filter(r=>r.level==='high');
  L.push(`# Contract Review: ${A.title||A.name}`,'',`Reviewed for **${x.us}** · Region: ${REGION[A.juris]} · ${new Date(A.at).toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'})}`,'');
  L.push('## Executive summary','',execSummary(A),'',`**Contract risk score: ${A.score}/100 (${A.level})** · Compliance ${A.compliance}%`,'',`- Financial risk: ${A.dims.financial.level}`,`- Legal risk: ${A.dims.legal.level}`,`- Operational risk: ${A.dims.operational.level}`,'');
  L.push('## Clause breakdown','');const by={};A.clauses.forEach(c=>{(by[c.cat]=by[c.cat]||[]).push(c)});Object.entries(by).forEach(([cat,cs])=>L.push(`- **${cat}**: clauses ${cs.map(c=>c.num).join(', ')}${cs.some(c=>c.risks.length)?` (${cs.reduce((n,c)=>n+c.risks.length,0)} risk)`:''}`));L.push('');
  L.push('## Risk analysis','');A.risks.forEach(r=>{L.push(`### ${r.level.toUpperCase()} · ${r.issue}${r.num?` (clause ${r.num})`:''}`,'',`**Category:** ${r.cat}`,'',`**Explanation:** ${r.why}`,'',`**Recommendation:** ${r.rec}`,'');if(r.juris)L.push(`**${REGION[A.juris]}:** ${r.juris}`,'')});
  L.push('## Recommendations','');A.risks.filter(r=>r.ask).forEach((r,i)=>L.push(`${i+1}. ${r.ask}`));L.push('');
  L.push('## Plain-language summary','',plainSummary(A),'','---','_Prepared by an automated legal assistant. This is not legal advice._');
  return L.join('\n');
}
export function execSummary(A){const x=A.ctx;const hi=A.risks.filter(r=>r.level==='high');
  if(!hi.length)return`This contract carries ${A.level} overall risk for ${x.us}. No high-risk clauses were found; ${A.risks.length} smaller issues are worth tidying before signature.`;
  return`${A.level==='high'?'High':A.level==='medium'?'Moderate':'Low'}-risk contract for ${x.us}, driven by ${hi.slice(0,3).map(r=>r.issue.toLowerCase()).join(', ')}${hi.length>3?` and ${hi.length-3} more high-risk issue${hi.length-3>1?'s':''}`:''}. Do not sign without renegotiating the high-risk items.`}
export function plainSummary(A){const x=A.ctx,F=A.facts,b=[];
  b.push(`This is an agreement between ${x.parties.map(p=>p.legal?`${p.legal} (${p.role})`:p.role).join(' and ')}.`);
  if(F.initialTerm)b.push(`It lasts ${F.initialTerm}${F.autoRenew?' and renews automatically unless someone cancels in time':''}.`);
  if(F.value)b.push(`The fees are about ${fmtMoney(F.value)}${F.paymentDays?`, due ${F.paymentDays} days after each invoice`:''}${F.lateFee?`, with a ${F.lateFee.rate}% per ${F.lateFee.per} charge if you pay late`:''}.`);
  if(F.capUs==='Unlimited')b.push(`If something goes wrong, there is no limit on what you could owe.`);
  if(F.term.them.conv&&!F.term.us.conv)b.push(`${x.them} can walk away at any time; you cannot.`);
  if(F.law)b.push(`${F.law} law applies${F.dispute?` and disputes go to ${F.dispute.toLowerCase()}${F.seat?` in ${F.seat}`:''}`:''}.`);
  const hi=A.risks.filter(r=>r.level==='high').length;b.push(hi?`There are ${hi} serious problems to fix before signing.`:'No serious problems were found.');
  return b.join(' ');
}
export function buildJson(A){return{contract:A.title||A.name,reviewedFor:A.ctx.us,counterparty:A.ctx.them,region:REGION[A.juris],score:A.score,level:A.level,compliance:A.compliance,breakdown:Object.fromEntries(Object.entries(A.dims).map(([k,v])=>[k,v.level])),terms:A.facts,
  risks:A.risks.map(r=>({risk:r.level,issue:r.rule,title:r.issue,clause:r.num,category:r.cat,impact:r.dim+'_exposure',explanation:r.why,recommendation:r.rec,jurisdiction_note:r.juris||undefined})),
  clauses:A.clauses.map(c=>({number:c.num,section:c.secTitle,category:c.cat,confidence:c.conf,text:c.text,plain:c.plain,fields:c.fields}))}}
