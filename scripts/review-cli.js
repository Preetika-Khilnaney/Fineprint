#!/usr/bin/env node
// Review a contract from the terminal:
//   npm run review -- path/to/contract.txt [--region IN|US|EU|UK] [--for Customer] [--json]
import {readFileSync} from 'node:fs';
import {runAll} from '../src/engine/index.js';
import {SAMPLE_V1} from '../src/data/samples.js';

const args = process.argv.slice(2);
const flag = (n, d) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : d; };
const file = args.find(a => !a.startsWith('--') && !['IN', 'US', 'EU', 'UK'].includes(a) && a !== flag('--for'));
const text = file ? readFileSync(file, 'utf8') : SAMPLE_V1;
const A = runAll(text, {name: file || 'Sample v1', juris: flag('--region', 'IN'), persp: flag('--for', null)});

if (args.includes('--json')) { console.log(JSON.stringify(A.json, null, 2)); process.exit(0); }
console.log(A.md);
