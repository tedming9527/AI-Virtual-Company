import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './codex-company-takeover-hook.mjs';

const platformFooter = '以上内容由 Ted 公司提供；任务主责：陈知行；实际执行者：platform agent';
const roleAugmentedFooter = '以上内容由 Ted 公司提供；任务主责：陈知行；实际执行者：platform agent；岗位能力参考：陈知行 · 路由官（Chief of Staff）（资料增强，非本人参与）';
const employeeFooter = '以上内容由 Ted 公司的陈知行等人为您提供';

test('session start receives mandatory takeover context', async () => {
  const result = await handle({ hook_event_name: 'SessionStart', session_id: 'session_1' });
  assert.match(result.output.hookSpecificOutput.additionalContext, /TED_CODEX_PLATFORM_TAKEOVER_V1/);
  assert.match(result.output.hookSpecificOutput.additionalContext, /bootstrap 已通过/);
  assert.doesNotMatch(result.output.hookSpecificOutput.additionalContext, /公司平台接管门禁已通过/);
});

test('per-prompt hook events are intentionally ignored after consolidation', async () => {
  assert.deepEqual((await handle({ hook_event_name: 'UserPromptSubmit', session_id: 'session_1', prompt: '公司治理任务' })).output, {});
});

test('an unsupported supervision claim is stopped', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message: `本任务已受监管。\n\n${platformFooter}` });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /task_not_registered/);
});

test('a missing company signature is stopped before other exit checks', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: '已完成。' });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /缺少与执行证据一致的尾注/);
});

test('negative wording is not mistaken for a supervision claim', async () => {
  for (const last_assistant_message of [`本任务尚未受监管。\n\n${platformFooter}`, `不得宣称已受监管。\n\n${platformFooter}`, `当前无法持续监督。\n\n${platformFooter}`]) {
    const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message });
    assert.deepEqual(result.output, {});
  }
});

const failedBootstrap = () => ({ status: 1, stderr: 'fixture_bootstrap_failure' });

test('bootstrap failure does not block session start without task semantics', async () => {
  const result = await handle(
    { hook_event_name: 'SessionStart', session_id: 'session_1' },
    { bootstrapRunner: failedBootstrap }
  );
  assert.equal(result.blocked, undefined);
  assert.match(result.output.hookSpecificOutput.additionalContext, /公司工作流暂不可用/);
});

test('bootstrap failure lets an ordinary final response finish without a company signature', async () => {
  const result = await handle(
    {
      hook_event_name: 'Stop',
      session_id: 'session_1',
      last_assistant_message: '普通任务已完成。'
    },
    { bootstrapRunner: failedBootstrap }
  );
  assert.deepEqual(result.output, {});
});

test('bootstrap failure stops unsupported supervision or takeover success claims', async () => {
  for (const last_assistant_message of ['本任务已受监管。', '公司初始化已完成。', '公司平台接管门禁已通过。', '顾清妍已评审本次结果。']) {
    const result = await handle(
      { hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message },
      { bootstrapRunner: failedBootstrap }
    );
    assert.equal(result.blocked, true);
    assert.match(result.reason, /无法支持当前回复中的公司接管、员工分配或监管成功声明/);
  }
});

test('a route-derived dynamic signature with an owner name passes the tail-line check', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message: `本任务已受监管。\n\n${platformFooter}` });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /task_not_registered/);
});

test('a signature with an empty or malformed owner name is rejected', async () => {
  for (const msg of [
    '已完成。\n\n以上内容由 Ted 公司的等人为您提供',
    '已完成。\n\n以上内容由 Ted 公司为您提供',
    '已完成。\n\n以上内容由 Ted 公司的陈知行等人'
  ]) {
    const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: msg });
    assert.equal(result.output.decision, 'block');
    assert.match(result.output.reason, /缺少与执行证据一致的尾注/);
  }
});

test('a positive named-employee participation claim needs the separate identity gate', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `顾清妍已评审本次结果。\n\n${employeeFooter}` });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /可信员工身份回执门禁/);
});

test('a frozen employee requirement blocks completion until all receipts verify', async () => {
  const result = await handle(
    { hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `任务暂未完成。\n\n${platformFooter}` },
    { participationChecker: async () => ({ claim_allowed: false, reason: 'required_employee_receipt_missing' }) }
  );
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /已冻结具名员工本人参与要求/);
});

test('employee attribution footer requires a verified employee receipt', async () => {
  const blocked = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `已完成。\n\n${employeeFooter}` });
  assert.equal(blocked.output.decision, 'block');
  assert.match(blocked.output.reason, /员工提供式尾注/);
  const allowed = await handle(
    { hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `已完成。\n\n${employeeFooter}` },
    { participationChecker: async () => ({ claim_allowed: true, employee_participation_verified: true }) }
  );
  assert.deepEqual(allowed.output, {});
});

test('platform attribution footer is valid without an employee receipt', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `已完成。\n\n${platformFooter}` });
  assert.deepEqual(result.output, {});
});

test('role-augmented platform footer names the capability reference without claiming participation', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: `已完成。\n\n${roleAugmentedFooter}` });
  assert.deepEqual(result.output, {});
});
