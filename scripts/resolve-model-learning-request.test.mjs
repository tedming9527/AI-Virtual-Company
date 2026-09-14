import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
const parse = (s) => {
  const run = spawnSync(process.execPath, ['scripts/resolve-model-learning-request.mjs', s], { encoding: 'utf8' });
  assert.ok([0, 1].includes(run.status), run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(run.status, result.errors.length ? 1 : 0);
  return result;
};
test('pooled budgets preserve donors but assign one executor', () => {
  const r = parse('启用监督者监督辛澈，授权每位同事10%的spark额度给辛澈');
  assert.equal(r.contract.aggregate_percent, 80);
  assert.equal(r.contract.executor_count, 1);
  assert.equal(r.contract.execution, 'supervised_single_owner');
  assert.equal(r.contract.model, 'gpt-5.3-codex-spark');
});
test('ordinary per-role learning requires dependency assessment', () => {
  const r = parse('每位同事10%的spark额度');
  assert.equal(r.contract.executor_count, 8);
  assert.equal(r.contract.execution, 'supervised_dependency_batches');
  assert.equal(r.contract.allocation_mode, 'cap');
});
test('single executor is separate from supervisor and needs a receipt', () => {
  const r = parse('启用陈知行监督，让辛澈使用10% Spark');
  assert.equal(r.status, 'planned');
  assert.deepEqual(r.contract.executor_ids, ['ai-engineer']);
  assert.deepEqual(r.contract.supervisor.ids, ['chief-of-staff']);
  assert.equal(r.contract.aggregate_percent, 10);
  assert.equal(r.dispatch_status, 'requires_dispatch_receipt');
});
for (const scope of ['全员', '全部人员', '所有同事']) test(`${scope} ordinary budget is total`, () => {
  const r = parse(`${scope}使用10% Spark`);
  assert.equal(r.contract.budget_scope, 'total');
  assert.equal(r.contract.aggregate_percent, 10);
  assert.equal(r.contract.executor_count, 8);
});
test('named list each allocation and arbitrary pooled recipient', () => {
  const r = parse('辛澈和陆行远各10% Luna额度交给苏映雪和顾清妍');
  assert.equal(r.contract.aggregate_percent, 20);
  assert.equal(r.contract.budget_donor_count, 2);
  assert.deepEqual(r.contract.executor_ids, ['design-master', 'test-expert']);
});
test('total pooled budget is never multiplied', () => {
  const r = parse('全员总预算10% Spark给陆行远');
  assert.equal(r.contract.aggregate_percent, 10);
  assert.equal(r.contract.executor_count, 1);
});
test('explicit target and parallel survive', () => {
  const r = parse('辛澈和陆行远目标10% Terra，并行');
  assert.equal(r.contract.allocation_mode, 'target');
  assert.equal(r.contract.execution, 'supervised_asynchronous_parallel_batches');
});
for (const request of [
  '让张三使用10% Spark',
  '启用张三监督，让辛澈使用10% Spark',
  '辛澈和张三各10% Spark',
  '全员每人总预算10% Spark',
  '全员10% Spark和Luna',
  '全员10% Spark，预算20%',
  '全员10% Spark，辛澈使用10% Spark',
  '全员10% Spark给张三',
  '全员最多目标10% Spark',
  '全员10% Spark，串行并行',
  '每位同事20% Spark',
  '让辛澈使用0% Spark',
  '请研究辛澈的方案，使用10% Spark'
]) test(`reject ambiguity: ${request}`, () => {
  const r = parse(request);
  assert.equal(r.status, 'invalid');
  assert.ok(r.errors.length);
  assert.equal(r.dispatch_status, 'not_dispatched');
});
test('missing percentage remains incomplete with no invented allocation', () => {
  const r = parse('启用陈知行监督，让辛澈使用 Spark');
  assert.equal(r.status, 'incomplete');
  assert.equal(r.contract.aggregate_percent, null);
  assert.deepEqual(r.missing, ['percentage']);
});
test('supervised person with no model or budget is explicitly incomplete', () => {
  const r = parse('启用监督者监督辛澈');
  assert.equal(r.status, 'incomplete');
  assert.deepEqual(r.contract.executor_ids, ['ai-engineer']);
  assert.equal(r.contract.aggregate_percent, null);
});
test('registered comma-separated list is supported', () => {
  const r = parse('辛澈，陆行远每人10% Luna');
  assert.equal(r.contract.executor_count, 2);
  assert.equal(r.contract.aggregate_percent, 20);
});
test('prose goal does not turn a budget cap into a spending target', () => {
  assert.equal(parse('辛澈使用10% Spark，目标是研究解析器').contract.allocation_mode, 'cap');
});
test('prose deliverable recipient is not a budget executor', () => {
  const r = parse('辛澈使用10% Spark，写报告给陆行远');
  assert.deepEqual(r.contract.executor_ids, ['ai-engineer']);
});
test('each using a budget in a named list means per-person allocation', () => {
  const r = parse('辛澈、陆行远各使用10% Luna预算');
  assert.equal(r.status, 'planned');
  assert.equal(r.contract.budget_scope, 'per_person');
  assert.equal(r.contract.aggregate_percent, 20);
});
test('pooling with 将 and 集中给 preserves all donors', () => {
  const r = parse('将每位同事各10%的Spark预算集中给辛澈调研');
  assert.equal(r.status, 'planned');
  assert.equal(r.contract.budget_donor_count, 8);
  assert.equal(r.contract.executor_count, 1);
  assert.equal(r.contract.aggregate_percent, 80);
});
test('explicit total overrides 每位 participant range', () => {
  const r = parse('每位同事使用总计20% Spark预算');
  assert.equal(r.status, 'planned');
  assert.equal(r.contract.budget_scope, 'total');
  assert.equal(r.contract.aggregate_percent, 20);
});
test('explicit each allocation still conflicts with total allocation', () => {
  assert.equal(parse('每位同事各使用总计20% Spark预算').status, 'invalid');
});
for (const request of [
  '全员使用10% Spark 学习，每位同事写一份总结',
  '全员使用10% Spark，任务是给每个人讲解',
  '全员使用10% Spark 学习每位同事写的总结',
  '全员使用10% Spark，目标10份报告，总计两轮复核'
]) test(`deliverable prose cannot modify allocation: ${request}`, () => {
  const r = parse(request);
  assert.equal(r.status, 'planned');
  assert.equal(r.contract.budget_scope, 'total');
  assert.equal(r.contract.aggregate_percent, 10);
  assert.equal(r.contract.allocation_mode, 'cap');
});
test('pooled recipient across a clause preserves percentage-bound allocation', () => {
  const r = parse('每位同事各10% Spark预算，集中给辛澈调研');
  assert.equal(r.status, 'planned');
  assert.equal(r.contract.aggregate_percent, 80);
  assert.deepEqual(r.contract.executor_ids, ['ai-engineer']);
});
test('unrelated prose and incidental model fragments do not match', () => {
  assert.equal(parse('解释辛澈写的计划').matched, false);
  assert.equal(parse('console.log 是什么').matched, false);
});
test('explicit serial and caps remain distinct', () => {
  const r = parse('每位同事最多8%的luna额度，不并行');
  assert.equal(r.contract.allocation_mode, 'cap');
  assert.equal(r.contract.execution, 'supervised_serial');
});
test('依次学习 is an explicit serial instruction', () => {
  assert.equal(parse('全员8% Luna，依次学习').contract.execution, 'supervised_serial');
});
