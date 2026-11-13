// Shared text utilities: number words, money, sentence splitting, similarity and word diff.
export const WORDN={one:1,two:2,three:3,four:4,five:5,six:6,seven:7,eight:8,nine:9,ten:10,eleven:11,twelve:12,fourteen:14,fifteen:15,eighteen:18,twenty:20,'twenty-four':24,thirty:30,'forty-five':45,forty:40,sixty:60,seventy:70,'seventy-two':72,ninety:90};
export const reEsc=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
export function numsBefore(text,unit){
  const words=Object.keys(WORDN).sort((a,b)=>b.length-a.length).join('|');
  const re=new RegExp(`(?:\\((\\d+(?:\\.\\d+)?)\\)|\\b(\\d+(?:\\.\\d+)?)|\\b(${words})\\b)\\s*(?:\\((\\d+(?:\\.\\d+)?)\\)\\s*)?(?:business\\s+|calendar\\s+|consecutive\\s+)?${unit}\\b`,'gi');
  const out=[];let m;while((m=re.exec(text))){out.push(m[1]?+m[1]:m[2]?+m[2]:m[4]?+m[4]:WORDN[m[3].toLowerCase()])}return out;
}
export const days=t=>numsBefore(t,'days?'), months=t=>numsBefore(t,'months?'), years=t=>numsBefore(t,'years?');
export const MONEY_RE=/(US\$|\$|USD|EUR|€|GBP|£|INR|₹|Rs\.?)\s?(\d[\d,]*(?:\.\d+)?)/;
export function money(t){const m=t.match(MONEY_RE);if(!m)return null;const sym={'US$':'$',$:'$',USD:'$',EUR:'€','€':'€',GBP:'£','£':'£',INR:'₹','₹':'₹','Rs':'₹','Rs.':'₹'}[m[1]]||m[1];return{cur:sym,amount:+m[2].replace(/,/g,'')}}
export function fmtMoney(v,mult=1){if(!v)return'';const n=v.amount*mult;return v.cur+(v.cur==='₹'?n.toLocaleString('en-IN'):n.toLocaleString('en-US'))}
export const words=t=>t.toLowerCase().match(/[a-z]{4,}/g)||[];
export function jaccard(a,b){const A=new Set(words(a)),B=new Set(words(b));if(!A.size||!B.size)return 0;let i=0;A.forEach(w=>{if(B.has(w))i++});return i/(A.size+B.size-i)}
export function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return(h>>>0).toString(36)}
export const sentences=t=>t.split(/(?<!\b(?:Pvt|Ltd|Inc|Co|No|Nos|Mr|Mrs|Ms|Dr|St|Corp|Jr|Sr|vs|viz|e\.g|i\.e)\.)(?<=[.;])\s+(?=[A-Z"(])/).map(s=>s.trim()).filter(Boolean);

export function wordDiff(a,b){
  const A=a.split(/\s+/).filter(Boolean).slice(0,500),B=b.split(/\s+/).filter(Boolean).slice(0,500);const n=A.length,m=B.length;
  const dp=Array.from({length:n+1},()=>new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)dp[i][j]=A[i].toLowerCase()===B[j].toLowerCase()?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]);
  const out=[];let i=0,j=0;while(i<n&&j<m){if(A[i].toLowerCase()===B[j].toLowerCase()){out.push(['=',B[j]]);i++;j++}else if(dp[i+1][j]>=dp[i][j+1]){out.push(['-',A[i]]);i++}else{out.push(['+',B[j]]);j++}}
  while(i<n)out.push(['-',A[i++]]);while(j<m)out.push(['+',B[j++]]);return out;
}
