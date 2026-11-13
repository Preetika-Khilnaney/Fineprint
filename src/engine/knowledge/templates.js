// "Ideal" standard clauses used by the Template Comparison agent. {C} = customer side, {V} = supplier side.
export const STD={
 'Payment Terms':'{C} shall pay undisputed invoices within thirty (30) days of receipt. Late amounts accrue interest at the lesser of 1% per month or the maximum rate permitted by law. Fees are fixed for the initial term; any increase requires sixty (60) days\' notice and is capped at 5% per year.',
 'Term & Renewal':'The initial term is twelve (12) months. The Agreement renews for one (1) year terms only by mutual written agreement, and either party may decline renewal with thirty (30) days\' notice.',
 'Termination':'Either party may terminate for convenience on sixty (60) days\' written notice, or for material breach not cured within thirty (30) days of notice. On termination, {C} pays only for Services delivered through the termination date.',
 'Liability':'Neither party is liable for indirect or consequential damages. Each party\'s total aggregate liability is capped at the Fees paid in the twelve (12) months preceding the claim, except for fraud, wilful misconduct, breach of confidentiality and indemnified claims.',
 'Indemnity':'Each party shall indemnify the other against third-party claims to the extent caused by its own negligence, wilful misconduct or breach of this Agreement. {V} shall indemnify {C} against claims that the Services infringe third-party intellectual property.',
 'Confidentiality':'Each party shall protect the other\'s Confidential Information with at least reasonable care, use it only to perform this Agreement, and keep it confidential for five (5) years after termination, and indefinitely for trade secrets.',
 'IP Ownership':'Each party keeps its pre-existing intellectual property. {C} owns Customer Data and all deliverables paid for under this Agreement. {V} receives a limited licence to use Customer Data only to provide the Services.',
 'Data Protection':'{V} shall process personal data only on {C}\'s documented instructions, maintain appropriate technical and organisational security measures, notify {C} of any personal data breach within seventy-two (72) hours, and sign a data processing agreement.',
 'Service Levels':'{V} guarantees 99.9% monthly availability, with response within one (1) hour for critical incidents. Missed targets earn service credits of up to 10% of monthly Fees, and repeated misses allow {C} to terminate.',
 'Warranties':'{V} warrants that the Services will perform materially as described, will be provided with professional skill and care, and will comply with applicable laws.',
 'Dispute Resolution':'The parties will first attempt good-faith negotiation for thirty (30) days, then mediation, then binding arbitration seated in a mutually agreed neutral venue.',
 'Governing Law':'This Agreement is governed by the laws of the jurisdiction where {C} is established.',
 'Non-Compete':'Neither party may solicit the other\'s employees for twelve (12) months after termination. Nothing restricts {C}\'s choice of other suppliers.',
 'Force Majeure':'Neither party is liable for delay caused by events beyond its reasonable control, provided it notifies the other promptly. Either party may terminate if the event lasts more than sixty (60) days.',
 'Assignment':'Neither party may assign this Agreement without the other\'s prior written consent, not to be unreasonably withheld, except to a successor in a merger or sale of substantially all assets.',
 'Amendments':'This Agreement may be amended only by a written document signed by authorised representatives of both parties.',
};
export const GOOD_RE=/(either party|each party|neither party|mutual(?:ly)?|shall not exceed|capped at|limited to|twelve \(12\) months|99\.\d+%|service credits?|written consent|signed by|good[- ]faith|reasonable care|not to be unreasonably withheld|seventy-two \(72\) hours|data processing agreement|thirty \(30\) days|sixty \(60\) days)/gi;
export const RISKY_RE=/(any and all|without limitation|at any time|for any reason|sole (?:and absolute )?discretion|perpetual|irrevocable|regardless of the cause|vest(?:s)? exclusively in|automatically renew|immediately due and payable|remainder of the (?:then-current )?term|commercially reasonable efforts|does not guarantee|"?as is"?|disclaims all warranties|waives? any right to a jury trial|class action|by posting|without [a-z']{0,12} ?consent|\d+(?:\.\d+)?% per month|for any purpose|one \(1\) month|ninety \(90\) days|seven \(7\) days)/gi;


export function fillStd(t,x){return t.replace(/\{C\}/g,x.C).replace(/\{V\}/g,x.V)}
