// Plain Language Translator: rewrites legal phrasing into simple English from the reader's side.
import {reEsc} from './utils.js';

export const PL=[
 [/\bindemnify, defend and hold harmless\b/gi,'pay for the legal costs and losses of'],[/\bindemnify and hold harmless\b/gi,'cover the losses of'],[/\bhold harmless\b/gi,'protect'],
 [/\bin no event shall (\w+) be liable for\b/gi,'$1 will never have to pay for'],[/\bshall not\b/gi,'must not'],[/\bshall be\b/gi,'will be'],[/\bshall\b/gi,'must'],
 [/\bhereinafter\b/gi,''],[/\bnotwithstanding\b/gi,'despite'],[/\bin the event that\b/gi,'if'],[/\bprior to\b/gi,'before'],[/\bpursuant to\b/gi,'under'],[/\bforthwith\b/gi,'right away'],
 [/\bterminate this agreement\b/gi,'end the contract'],[/\bthis agreement\b/gi,'the contract'],[/\btermination\b/gi,'ending the contract'],
 [/\bmaterial breach\b/gi,'serious violation'],[/\bremains uncured\b/gi,'is not fixed'],[/\buncured\b/gi,'not fixed'],[/\bcured\b/gi,'fixed'],
 [/\bindirect, incidental, consequential or special damages\b/gi,'knock-on losses (like lost profits)'],[/\bconsequential\b/gi,'knock-on'],
 [/\btotal aggregate liability\b/gi,'maximum total payout'],[/\baggregate liability\b/gi,'maximum payout'],[/\bshall not exceed\b/gi,'is capped at'],
 [/\baccrue\b/gi,'build up'],[/\bperpetual, irrevocable, royalty-free license\b/gi,'permanent, free right that cannot be taken back'],
 [/\bvest exclusively in\b/gi,'belong only to'],[/\bcommercially reasonable efforts\b/gi,'a reasonable try (no firm promise)'],
 [/\bbinding arbitration\b/gi,'a private arbitrator instead of a court'],[/\bwaives\b/gi,'gives up'],[/\bupon\b/gi,'on'],[/\bcommences\b/gi,'starts'],
 [/\bsuccessive\b/gi,'back-to-back'],[/\bdisclaims all warranties, express or implied\b/gi,'makes no promises at all about quality'],
 [/\bwritten notice\b/gi,'notice in writing'],[/\bin confidence\b/gi,'secret'],[/\bthe then-current term\b/gi,'the current term'],[/\bthereof\b/gi,'of it'],[/\bherein\b/gi,'in the contract'],
];
export function toPlain(t,x,c){
  let s=t;if(s.replace(/[^A-Za-z]/g,'').length>20&&s===s.toUpperCase())s=s.toLowerCase().replace(/(^|\.\s+)([a-z])/g,(m,a,b)=>a+b.toUpperCase());
  PL.forEach(([re,w])=>s=s.replace(re,w));
  s=s.replace(new RegExp(`\\b${reEsc(x.us)}'s\\b`,'g'),'your').replace(new RegExp(`\\b${reEsc(x.us)}\\b`,'g'),'you');
  s=s.replace(/\byou must be liable\b/g,'you will have to pay').replace(/\byou must pay\b/g,'you must pay').replace(/\byou is\b/g,'you are').replace(/\byou has\b/g,'you have').replace(/\byou grants\b/g,'you give').replace(/\byou waives\b/g,'you give up').replace(/\s{2,}/g,' ').replace(/\s+,/g,',').trim();
  s=s.charAt(0).toUpperCase()+s.slice(1);
  if(c&&c.risks&&c.risks.length){const top=c.risks[0];s+=` Watch out: ${top.issue.toLowerCase()}.`}
  return s;
}
