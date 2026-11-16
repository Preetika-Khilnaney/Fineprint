// Parsing, segmentation, classification and extraction logic used by agents 1–4.
import {reEsc,days,months,years,money,sentences} from './utils.js';
import {classifyText} from './classifier.js';

export function preprocess(raw){
  let t=raw.replace(/\r/g,'').replace(/ /g,' ').replace(/[“”]/g,'"').replace(/[‘’]/g,"'").replace(/\t/g,' ');
  t=t.replace(/([.;:])[ ]+(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)[ ]+(?=[A-Z"(])/g,'$1\n$2 ');
  t=t.replace(/([.;:])[ ]+(\d{1,2})\.?[ ]+([A-Z][A-Za-z&,\/\- ]{2,50}?)[ ]+(?=\d{1,2}\.\d)/g,'$1\n$2. $3\n');
  return t;
}
export function parse(raw){
  let lines=preprocess(raw).split('\n').map(s=>s.replace(/\s+/g,' ').trim()).filter(Boolean);
  // Drop page furniture from PDFs: page numbers and running headers/footers that repeat on every page.
  const freq={};lines.forEach(l=>{freq[l]=(freq[l]||0)+1});
  lines=lines.filter(l=>!/^(page\s+)?\d{1,4}(\s*(of|\/)\s*\d{1,4})?$/i.test(l)&&!/^page\s+\d+/i.test(l)&&!(freq[l]>2&&l.length<140&&!/^\d/.test(l)));
  const subRe=/^(\d{1,2}\.\d{1,2}(?:\.\d{1,2})?)[.)]?\s+(.+)$/;
  const secRe=/^(?:(?:section|article|clause)\s+)?(\d{1,2})[.):]?\s+([A-Z][A-Za-z&,'\/\- ]{2,60})$/i;
  const capRe=/^[A-Z][A-Z&,'\/\- ]{3,70}$/;
  let title='',preamble=[],sections=[],cur=null,auto=0;
  for(const line of lines){
    let m;
    if(!title&&!cur&&!preamble.length&&capRe.test(line)){title=line;continue}
    if((m=line.match(subRe))){
      if(!cur||cur.num!==m[1].split('.')[0]&&!cur.clauses.length&&!cur.body.length&&false){}
      if(!cur){cur={num:m[1].split('.')[0],title:'Section '+m[1].split('.')[0],clauses:[],body:[]};sections.push(cur)}
      cur.clauses.push({num:m[1],text:m[2]});continue;
    }
    if(/^(schedule|annex(?:ure)?|exhibit|appendix)\s+[A-Z0-9]{1,3}\b.{0,70}$/i.test(line)&&!/[.;]$/.test(line)||/^(signatures?|execution page)$/i.test(line)){cur={num:line.match(/^\w+\s+([A-Z0-9]{1,3})\b/i)?line.match(/^(\w)\w*\s+([A-Z0-9]{1,3})\b/i).slice(1).join('').toUpperCase():'SIG',title:line,clauses:[],body:[]};sections.push(cur);continue}
    if((m=line.match(secRe))&&line.split(' ').length<=9&&!/[.;,]$/.test(line)){cur={num:m[1],title:m[2].trim(),clauses:[],body:[]};sections.push(cur);continue}
    if(capRe.test(line)&&line.length<60&&line.split(' ').length<=7){auto++;cur={num:String(sections.length+1),title:line.charAt(0)+line.slice(1).toLowerCase(),clauses:[],body:[]};sections.push(cur);continue}
    if(cur){if(cur.clauses.length)cur.clauses[cur.clauses.length-1].text+=' '+line;else cur.body.push(line)}
    else preamble.push(line);
  }
  if(!sections.length){
    const paras=raw.split(/\n\s*\n/).map(p=>p.replace(/\s+/g,' ').trim()).filter(Boolean);
    preamble=paras.length>1?[paras.shift()]:[];
    paras.forEach((p,i)=>sections.push({num:String(i+1),title:'Part '+(i+1),clauses:[],body:[p]}));
  }
  return{title,preamble:preamble.join(' '),sections};
}
export function segment(P){
  const out=[];
  P.sections.forEach(s=>{
    if(s.clauses.length){s.clauses.forEach(c=>out.push({num:c.num,sec:s.num,secTitle:s.title,text:c.text.trim()}))}
    if(s.body.length){
      const ss=sentences(s.body.join(' '));
      const base=s.clauses.length?s.clauses.length:0;
      ss.forEach((t,i)=>out.push({num:`${s.num}.${base+i+1}`,sec:s.num,secTitle:s.title,text:t,synthetic:true}));
    }
  });
  return out.map((c,i)=>({...c,id:'c'+i,idx:i,risks:[],fields:{}}));
}
export function classify(cl,overrides={}){
  cl.forEach(c=>{
    const r=classifyText(c.text,c.secTitle);
    c.cat=overrides[c.num]||r.cat; c.conf=r.conf; c.catSource=overrides[c.num]?'user':r.source; c.overridden=!!overrides[c.num];
  });
}
export function findParties(text){
  const skip=/^(Agreement|Effective Date|Services|Fees|Term|Confidential Information|Customer Data|Deliverables|SOW|Schedule|Order|Initial Term)$/;
  const roles=[];let m;const re=/\(\s*(?:the\s+)?"([A-Z][A-Za-z ]{1,28})"\s*\)/g;
  while((m=re.exec(text))){if(!skip.test(m[1])&&!roles.includes(m[1]))roles.push(m[1])}
  if(roles.length<2){
    const known=['Vendor','Customer','Supplier','Client','Company','Contractor','Consultant','Provider','Service Provider','Buyer','Seller','Licensor','Licensee','Employer','Employee','Distributor','Purchaser'];
    known.map(k=>[k,(text.match(new RegExp('\\b'+k+'\\b','g'))||[]).length]).filter(x=>x[1]>1).sort((a,b)=>b[1]-a[1]).forEach(([k])=>{if(roles.length<2&&!roles.includes(k))roles.push(k)});
  }
  while(roles.length<2)roles.push(roles.length?'Other Party':'Party A');
  const legal=roles.slice(0,2).map(r=>{const mm=text.match(new RegExp(`(?:between|and)\\s+([A-Z][^,()"]{2,80}?)(?:,[^()"]{0,240})?\\s*\\(\\s*(?:the\\s+)?"${reEsc(r)}"`));return mm?mm[1].trim():''});
  return{roles:roles.slice(0,2),legal};
}
export function extract(A){
  const full=A.title+' '+A.preamble+' '+A.clauses.map(c=>c.text).join(' ');
  const {us,them}=A.ctx; const F={};
  F.parties=A.ctx.parties;
  const ed=full.match(/(?:as of|dated|effective)\s+(?:the\s+)?([A-Z][a-z]+ \d{1,2},? \d{4}|\d{1,2}(?:st|nd|rd|th)? (?:day of )?[A-Z][a-z]+,? \d{4})/);F.effective=ed?ed[1]:null;
  A.clauses.forEach(c=>{
    const f={};const d=days(c.text),mo=months(c.text),y=years(c.text);if(d.length)f.days=d;if(mo.length)f.months=mo;if(y.length)f.years=y;
    const pc=[...c.text.matchAll(/(\d+(?:\.\d+)?)\s*%/g)].map(x=>+x[1]);if(pc.length)f.percent=pc;
    const mon=money(c.text);if(mon)f.money=mon;c.fields=f;
  });
  const pay=A.clauses.filter(c=>c.cat==='Payment Terms');
  F.value=null;for(const c of pay){if(c.fields.money){F.value=c.fields.money;break}} if(!F.value){const m=money(full);if(m)F.value=m}
  F.paymentDays=null;for(const c of pay){const n=c.text.match(/\bnet\s*(\d+)/i);if(n){F.paymentDays=+n[1];break} if(/invoice/i.test(c.text)&&c.fields.days){F.paymentDays=c.fields.days[0];break}}
  const lf=full.match(/(\d+(?:\.\d+)?)\s*%\s*(?:per|a|each)\s*(month|annum|year)/i);F.lateFee=lf?{rate:+lf[1],per:/month/i.test(lf[2])?'month':'year'}:null;
  const it=full.match(/initial term of ([^.;]{1,40}?(?:years?|months?))/i);F.initialTerm=it?it[1].replace(/\s+/g,' '):null;
  const ar=A.clauses.find(c=>/automatic(?:ally)? renew/i.test(c.text));F.autoRenew=ar?{notice:(ar.fields.days||[])[0]||null}:null;
  const term=who=>{const re=new RegExp(`\\b(?:${reEsc(who)}|either party)\\b[^.;]{0,30}?may terminate`,'i');const cs=A.clauses.filter(c=>re.test(c.text));
    let conv=null,days_=null,cure=null;cs.forEach(c=>{if(/(at any time|for convenience|for any reason|without cause)/i.test(c.text)){conv=c;days_=(c.fields.days||[])[0]??days_} else if(/breach/i.test(c.text)){cure=(c.fields.days||[])[0]??cure}});
    return{conv,days:days_,cure,any:cs.length>0}};
  F.term={us:term(us),them:term(them)};
  const cf=A.clauses.find(c=>c.cat==='Confidentiality'&&/surviv/i.test(c.text));F.confYears=cf?((cf.fields.years||[])[0]||null):null;
  const gl=full.match(/governed by (?:and construed in accordance with )?the laws? of (?:the )?((?:State of )?[A-Z][A-Za-z ]+?)(?=[,.;]|\s+(?:and|without))/);F.law=gl?gl[1].trim():null;
  const dr=A.clauses.find(c=>/arbitrat/i.test(c.text))||A.clauses.find(c=>/courts? (?:of|in|at)/i.test(c.text)&&c.cat==='Dispute Resolution');
  F.dispute=dr?(/arbitrat/i.test(dr.text)?'Arbitration':'Courts'):null;
  const seat=dr&&dr.text.match(/(?:seated in|seat of arbitration (?:shall be|is)|courts (?:of|in|at)|venue (?:shall be|is|of))\s+(?:the\s+)?([A-Z][A-Za-z]+(?:[ ,]+[A-Z][A-Za-z]+){0,2})/);F.seat=seat?seat[1].replace(/,$/,''):null;
  const capC=A.clauses.filter(c=>c.cat==='Liability');
  const capFor=who=>{for(const c of capC){if(new RegExp(`\\b(?:${reEsc(who)}|each party|either party)(?:'s)?\\b[^.;]{0,40}(?:liability)[^.;]*?(?:shall not exceed|limited to|capped at)`,'i').test(c.text))return c.text.match(/(?:shall not exceed|limited to|capped at)\s+([^.;]{3,80})/i)[1];
    if(new RegExp(`\\b${reEsc(who)}\\b[^.;]{0,30}?\\b(?:shall|will|is|are|remains?)\\b[^.;]{0,15}\\bliable`,'i').test(c.text)&&/(any and all|without limit|unlimited)/i.test(c.text))return'Unlimited';}return capC.length?'Not stated':null};
  F.capUs=capFor(us);F.capThem=capFor(them);
  const nc=A.clauses.find(c=>c.cat==='Non-Compete'&&/(compet|similar)/i.test(c.text));F.nonCompete=nc?((nc.fields.years||[])[0]?nc.fields.years[0]+' years':'Yes'):null;
  A.facts=F;
}
