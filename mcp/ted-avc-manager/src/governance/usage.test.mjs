import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeUsage, validateUsageEvent, proposeGovernance } from './usage.js';
import { mergeScore } from './score.js';

const asset = { source: 'general', type: 'knowledge', id: 'example', version: '1.0.0', bundleSha256: 'a'.repeat(64) };
const event = (eventId, taskId, signal, value) => ({ schema: 'avc.asset-usage.v2', eventId, asset, taskId, signal,
  observedAt: '2026-10-13T00:00:00.000Z', ...(value === undefined ? {} : { value }),
  ...(['outcome', 'feedback'].includes(signal) ? { attribution: 'verified', evidenceId: `proof-${eventId}` } : {}),
  ...(signal === 'feedback' ? { answerSha256: 'b'.repeat(64) } : {}) });

test('zero or sparse empirical data never becomes verified quality', () => {
  assert.equal(mergeScore({ llm: 5, empirical: { sampleSize: 0 } }).quality, null);
  assert.equal(mergeScore({ llm: 5, empirical: { sampleSize: 19, successRate: 1, avgScore: 5 } }).quality, null);
  assert.equal(mergeScore({ llm: 4, empirical: { sampleSize: 20, successRate: 1, avgScore: 5 } }).quality, 4.6);
});

test('rollup deduplicates events and tasks without treating delivery as adoption', () => {
  const rows = [event('e1', 't1', 'delivered'), event('e1', 't1', 'delivered'), event('e2', 't1', 'delivered'),
    event('e3', 't1', 'model-reported'), event('e4', 't2', 'outcome', 'success')];
  const result = summarizeUsage(rows, { from: '2026-10-12T00:00:00Z', through: '2026-10-14T00:00:00Z' });
  const row = Object.values(result.assets)[0];
  assert.equal(result.eventCount, 4);
  assert.equal(row.delivered, 1);
  assert.equal(row.adopted, 0);
  assert.equal(row.modelReported, 1);
  assert.equal(row.sampleSize, 1);
  assert.equal(proposeGovernance(result)[0].action, 'audit');
});

test('rejects free text and unverified feedback', () => {
  assert.throws(() => validateUsageEvent({ ...event('e1', 't1', 'delivered'), prompt: 'private' }), /不允许字段/);
  assert.throws(() => validateUsageEvent({ ...event('e2', 't1', 'feedback', 5), attribution: 'model-reported' }), /归因证据/);
  assert.throws(() => validateUsageEvent({ ...event('e3', 't1', 'feedback', 5), asset: { ...asset, id: '/private/path' } }), /资产身份/);
});
test('invalid numeric evidence cannot be promoted into an apparently sufficient score',()=>{
  for(const llm of [NaN,Infinity,-Infinity,'5'])assert.throws(()=>mergeScore({llm}),/有限数字/);
  for(const empirical of [{sampleSize:Infinity},{sampleSize:20.5},{sampleSize:'20'},{sampleSize:20,successRate:NaN},{sampleSize:20,avgScore:Infinity}])assert.throws(()=>mergeScore({llm:5,empirical}),/无效/);
});
test('native date-versioned knowledge can enter governance without silently relabeling its release',()=>{
  const dated={...event('dated','t1','delivered'),asset:{...asset,version:'2026-10-13'}};
  assert.equal(validateUsageEvent(dated).asset.version,'2026-10-13');
  assert.equal(Object.values(summarizeUsage([dated],{from:'2026-10-12',through:'2026-10-14'}).assets)[0].delivered,1);
  assert.throws(()=>validateUsageEvent({...dated,asset:{...dated.asset,version:'2026-02-30'}}),/无效/);
});
