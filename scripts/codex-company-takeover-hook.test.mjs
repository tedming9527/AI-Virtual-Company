import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './codex-company-takeover-hook.mjs';

test('startup and every prompt receive mandatory takeover context', async () => {
  for (const hook_event_name of ['SessionStart', 'UserPromptSubmit']) {
    const result = await handle({ hook_event_name, session_id: 'session_1' });
    assert.match(result.output.hookSpecificOutput.additionalContext, /TED_CODEX_PLATFORM_TAKEOVER_V1/);
    assert.match(result.output.hookSpecificOutput.additionalContext, /bootstrap 已通过/);
    assert.doesNotMatch(result.output.hookSpecificOutput.additionalContext, /公司平台接管门禁已通过/);
  }
});

test('an unsupported supervision claim is stopped', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message: '本任务已受监管。\n\n以上内容由 Ted 公司的陈知行等人为您提供' });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /task_not_registered/);
});

test('a missing company signature is stopped before other exit checks', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: '已完成。' });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /最终公司回复缺少精确末行/);
});

test('negative wording is not mistaken for a supervision claim', async () => {
  for (const last_assistant_message of ['本任务尚未受监管。\n\n以上内容由 Ted 公司的陈知行等人为您提供', '不得宣称已受监管。\n\n以上内容由 Ted 公司的陈知行等人为您提供', '当前无法持续监督。\n\n以上内容由 Ted 公司的陈知行等人为您提供']) {
    const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message });
    assert.deepEqual(result.output, {});
  }
});

const failedBootstrap = () => ({ status: 1, stderr: 'fixture_bootstrap_failure' });

test('bootstrap failure lets an ordinary authorized prompt continue without takeover claims', async () => {
  const result = await handle(
    {
      hook_event_name: 'UserPromptSubmit',
      session_id: 'session_1',
      prompt: '解释已有代码，不依赖公司治理。'
    },
    { bootstrapRunner: failedBootstrap }
  );
  assert.equal(result.blocked, undefined);
  assert.match(result.output.hookSpecificOutput.additionalContext, /公司工作流暂不可用/);
  assert.match(result.output.hookSpecificOutput.additionalContext, /普通任务仍可/);
  assert.doesNotMatch(result.output.hookSpecificOutput.additionalContext, /平台已阻止/);
});

test('bootstrap failure blocks only an explicitly governance-dependent prompt', async () => {
  for (const prompt of [
    '本任务必须经公司治理、员工分配并持续监督。',
    '不依赖公司治理，但必须开启持续监督。'
  ]) {
    const result = await handle(
      { hook_event_name: 'UserPromptSubmit', session_id: 'session_1', prompt },
      { bootstrapRunner: failedBootstrap }
    );
    assert.equal(result.blocked, true);
    assert.match(result.reason, /明确依赖公司治理/);
    assert.doesNotMatch(result.reason, /平台已阻止/);
  }
});

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
  for (const last_assistant_message of ['本任务已受监管。', '公司初始化已完成。', '公司平台接管门禁已通过。']) {
    const result = await handle(
      { hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message },
      { bootstrapRunner: failedBootstrap }
    );
    assert.equal(result.blocked, true);
    assert.match(result.reason, /无法支持当前回复中的公司接管、员工分配或监管成功声明/);
  }
});

test('a route-derived dynamic signature with an owner name passes the tail-line check', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message: '本任务已受监管。\n\n以上内容由 Ted 公司的陈知行等人为您提供' });
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
    assert.match(result.output.reason, /最终公司回复缺少精确末行/);
  }
});
