#!/usr/bin/env node
// Builds deterministic train / validation / test splits from CUAD v1.
// Test  = CUAD's official test split (102 contracts).
// Train = CUAD's official train split minus a 15% validation hold-out chosen by a stable hash of the title.
//   npm run data:prepare
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {CUAD_TO_FINEPRINT} from '../../src/engine/ml/cuadMapping.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'data', 'cuad', 'raw');
const OUT = join(ROOT, 'data', 'cuad', 'processed');
mkdirSync(OUT, {recursive: true});

function fnv(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

function load(file) {
  const d = JSON.parse(readFileSync(join(RAW, file), 'utf8'));
  return d.data.map(doc => {
    const para = doc.paragraphs[0];
    const anns = [];
    for (const qa of para.qas) {
      const cuad = qa.id.split('__').pop().replace(/_\d+$/, '');
      for (const a of qa.answers) anns.push({cuad, fp: CUAD_TO_FINEPRINT[cuad] ?? null, start: a.answer_start, end: a.answer_start + a.text.length, text: a.text});
    }
    const present = [...new Set(para.qas.filter(q => q.answers.length).map(q => q.id.split('__').pop().replace(/_\d+$/, '')))];
    return {id: fnv(doc.title).toString(36), title: doc.title, text: para.context, annotations: anns, present};
  });
}

const trainAll = load('train_separate_questions.json');
const test = load('test.json');
const val = trainAll.filter(c => fnv(c.title) % 100 < 15);
const train = trainAll.filter(c => fnv(c.title) % 100 >= 15);

for (const [name, set] of [['train', train], ['val', val], ['test', test]]) writeFileSync(join(OUT, `${name}.json`), JSON.stringify(set));
const splits = {source: 'CUAD v1 (The Atticus Project, CC BY 4.0)', created: new Date().toISOString().slice(0, 10),
  counts: {train: train.length, val: val.length, test: test.length},
  train: train.map(c => c.title), val: val.map(c => c.title), test: test.map(c => c.title)};
writeFileSync(join(ROOT, 'data', 'cuad', 'splits.json'), JSON.stringify(splits, null, 1));
const n = s => s.reduce((a, c) => a + c.annotations.length, 0);
console.log(`train ${train.length} contracts / ${n(train)} spans · val ${val.length} / ${n(val)} · test ${test.length} / ${n(test)}`);
