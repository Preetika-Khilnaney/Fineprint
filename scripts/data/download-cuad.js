#!/usr/bin/env node
// Downloads CUAD v1 (CC BY 4.0, The Atticus Project) and extracts it to data/cuad/raw.
//   npm run data:cuad
import {mkdirSync, writeFileSync, existsSync} from 'node:fs';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import AdmZip from 'adm-zip';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAW = join(ROOT, 'data', 'cuad', 'raw');
const URL = 'https://github.com/TheAtticusProject/cuad/raw/main/data.zip';

if (existsSync(join(RAW, 'CUADv1.json')) && !process.argv.includes('--force')) {
  console.log('CUAD already present in data/cuad/raw (use --force to re-download).');
  process.exit(0);
}
mkdirSync(RAW, {recursive: true});
const local = process.argv.find(a => a.endsWith('.zip'));
let buf;
if (local) { buf = (await import('node:fs')).readFileSync(local); console.log('Using local archive', local); }
else {
  console.log('Downloading', URL);
  const res = await fetch(URL);
  if (!res.ok) { console.error(`Download failed: HTTP ${res.status}. Download data.zip manually from ${URL} and run: npm run data:cuad -- path/to/data.zip`); process.exit(1); }
  buf = Buffer.from(await res.arrayBuffer());
}
const zip = new AdmZip(buf);
for (const e of zip.getEntries()) {
  if (!/^(CUADv1|test|train_separate_questions)\.json$/.test(e.entryName)) continue;
  writeFileSync(join(RAW, e.entryName), e.getData());
  console.log('  extracted', e.entryName);
}
console.log('Done. Next: npm run data:prepare');
