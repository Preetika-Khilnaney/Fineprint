import {test} from 'node:test';
import assert from 'node:assert/strict';
import {runAll} from '../src/engine/index.js';
import {SAMPLE_V1, SAMPLE_V2} from '../src/data/samples.js';

test('v1 sample is parsed into sections and clauses', () => {
  const A = runAll(SAMPLE_V1, {juris: 'IN'});
  assert.equal(A.sections.length, 14);
  assert.equal(A.clauses.length, 29);
  assert.equal(A.ctx.us, 'Customer');
  assert.equal(A.ctx.them, 'Vendor');
});

test('v1 sample flags the expected high risks', () => {
  const A = runAll(SAMPLE_V1, {juris: 'IN'});
  const rules = A.risks.map(r => r.rule);
  for (const id of ['unlimited_liability', 'one_sided_termination', 'acceleration', 'ip_overreach', 'non_compete', 'missing_data_protection']) assert.ok(rules.includes(id), id);
  assert.equal(A.facts.capUs, 'Unlimited');
  assert.equal(A.facts.paymentDays, 30);
  assert.ok(A.score > 80);
});

test('v2 revision scores materially lower', () => {
  const a = runAll(SAMPLE_V1, {juris: 'IN'}), b = runAll(SAMPLE_V2, {juris: 'IN'});
  assert.ok(b.score < a.score - 30);
  assert.equal(b.missing.length, 0);
});

test('switching perspective changes who is protected', () => {
  const A = runAll(SAMPLE_V1, {juris: 'IN', persp: 'Vendor'});
  assert.equal(A.ctx.us, 'Vendor');
  assert.ok(!A.risks.some(r => r.rule === 'unlimited_liability'));
});

test('EU region raises missing data protection to high', () => {
  const A = runAll(SAMPLE_V1, {juris: 'EU'});
  assert.equal(A.risks.find(r => r.rule === 'missing_data_protection').level, 'high');
});
