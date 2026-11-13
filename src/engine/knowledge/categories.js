// Legal clause categories with title and keyword signals, plus the clauses every commercial contract should have.
export const CATS={
 'Definitions':{t:['definition','interpretation'],k:[' means ','shall mean','refers to']},
 'Payment Terms':{t:['payment','fees','pricing','invoic','compensation','charges'],k:['invoice','fee','payable','pay ','late','interest','price','expense','reimburse','net ']},
 'Term & Renewal':{t:['term and renewal','duration','term of agreement','renewal'],k:['initial term','renew','commences','successive']},
 'Termination':{t:['termination'],k:['terminate','termination','uncured','material breach']},
 'Liability':{t:['liability','limitation'],k:['liable','liability','damages','consequential','aggregate','in no event']},
 'Indemnity':{t:['indemn'],k:['indemnify','hold harmless','defend']},
 'Confidentiality':{t:['confidential','non-disclosure'],k:['confidential','disclose','non-disclosure','proprietary information']},
 'IP Ownership':{t:['intellectual property','ownership','licen'],k:['intellectual property','license','licence','vest','derivative','copyright','patent','royalty']},
 'Data Protection':{t:['data protection','privacy','security','personal data'],k:['personal data','gdpr','dpdp','privacy','data protection','breach notification','security measures','processor','sub-processor']},
 'Service Levels':{t:['service level','sla','support','services and'],k:['uptime','availability','service level','response time','resolution time','efforts','service credit']},
 'Warranties':{t:['warrant'],k:['warrant','as is','merchantability','fitness for']},
 'Dispute Resolution':{t:['dispute','arbitration'],k:['arbitration','dispute','mediation','jury','tribunal','class action']},
 'Governing Law':{t:['governing law','jurisdiction','applicable law'],k:['governed by','laws of']},
 'Non-Compete':{t:['non-compete','non-solicit','restrictive','exclusivity'],k:['non-compete','solicit','shall not engage','compete','similar to the services','exclusive provider']},
 'Force Majeure':{t:['force majeure'],k:['force majeure','act of god','beyond its reasonable control']},
 'Assignment':{t:['assignment'],k:['assign','transfer this agreement','change of control']},
 'Amendments':{t:['amendment','modification','variation'],k:['amend','modify the terms','updated terms','modification']},
 'General':{t:['general','miscellaneous','boilerplate'],k:['entire agreement','severab','counterpart','waiver','notices','headings']},
};
export const REQUIRED=[['Payment Terms','medium','financial'],['Termination','high','legal'],['Liability','high','financial'],['Indemnity','low','financial'],['Confidentiality','high','legal'],['IP Ownership','medium','legal'],['Data Protection','high','legal'],['Governing Law','medium','legal'],['Dispute Resolution','medium','legal'],['Force Majeure','low','operational']];

