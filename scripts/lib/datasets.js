// Helpers that turn the processed CUAD splits into evaluation and training units.
import {readFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const P = join(ROOT, 'data', 'cuad', 'processed');

export function loadSplit(name) {
  const f = join(P, `${name}.json`);
  if (!existsSync(f)) { console.error(`Missing ${f}. Run: npm run data:cuad && npm run data:prepare`); process.exit(1); }
  return JSON.parse(readFileSync(f, 'utf8'));
}

export function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Sentence units with character offsets (abbreviation-aware, newline-aware). */
export function sentenceUnits(text) {
  const out = [];
  const re = /[^.;]+(?:[.;](?!\d)|$)/g;
  let m, buf = '', start = 0;
  const ABBR = /\b(?:Pvt|Ltd|Inc|Co|No|Nos|Mr|Mrs|Ms|Dr|St|Corp|Jr|Sr|vs|viz|e\.g|i\.e|U\.S|Sec|Art)\.$/;
  while ((m = re.exec(text)) && m[0].length) {
    if (!buf) start = m.index;
    buf += m[0];
    const t = buf.trim();
    if (ABBR.test(t) || t.length < 25) continue;
    out.push({start, end: start + buf.length, text: t.replace(/\s+/g, ' ')});
    buf = '';
  }
  if (buf.trim().length >= 25) out.push({start, end: start + buf.length, text: buf.trim().replace(/\s+/g, ' ')});
  return out;
}

const overlap = (a, b) => Math.max(0, Math.min(a.end, b.end) - Math.max(a.start, b.start));

/**
 * Clause classification items: annotated spans mapped to Fineprint labels, plus sampled
 * un-annotated sentences as the General class. Spans shorter than minLen or carrying
 * conflicting mapped labels are excluded and counted.
 */
export function classificationItems(contracts, {minLen = 40, negPerContract = 4} = {}) {
  const items = [], stats = {short: 0, conflict: 0, metadata: 0, negatives: 0};
  for (const c of contracts) {
    const byPos = new Map();
    for (const a of c.annotations) {
      if (a.fp === null) { stats.metadata++; continue; }
      if (a.text.trim().length < minLen) { stats.short++; continue; }
      const k = a.start + ':' + a.end;
      const prev = byPos.get(k);
      if (prev && prev.label !== a.fp) prev.conflict = true; else if (!prev) byPos.set(k, {text: a.text, label: a.fp, cuad: a.cuad, contract: c.id});
    }
    for (const it of byPos.values()) { if (it.conflict) { stats.conflict++; continue; } items.push(it); }
    const sents = sentenceUnits(c.text).filter(s => s.text.length >= 60 && s.text.length <= 700 && !c.annotations.some(a => overlap(s, a) > 0));
    sents.sort((x, y) => fnv(c.id + x.start) - fnv(c.id + y.start));
    sents.slice(0, negPerContract).forEach(s => { items.push({text: s.text, label: 'General', cuad: '(unannotated)', contract: c.id}); stats.negatives++; });
  }
  return {items, stats};
}

/** Sentence-level labels for a CUAD category inside one contract. */
export function labelledSentences(contract, cuadCat, minOverlap = 20) {
  const spans = contract.annotations.filter(a => a.cuad === cuadCat);
  return sentenceUnits(contract.text).map(s => ({...s, gold: spans.some(a => overlap(s, a) >= Math.min(minOverlap, a.end - a.start))}));
}
