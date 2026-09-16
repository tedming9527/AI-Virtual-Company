import test from 'node:test';
import assert from 'node:assert/strict';
import { handle } from './codex-company-takeover-hook.mjs';

test('startup and every prompt receive mandatory takeover context', async () => {
  for (const hook_event_name of ['SessionStart', 'UserPromptSubmit']) {
    const result = await handle({ hook_event_name, session_id: 'session_1' });
    assert.match(result.output.hookSpecificOutput.additionalContext, /TED_CODEX_PLATFORM_TAKEOVER_V1/);
  }
});

test('an unsupported supervision claim is stopped', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message: '本任务已受监管。\n\n以上内容由 Ted 公司为您提供' });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /task_not_registered/);
});

test('a missing company signature is stopped before other exit checks', async () => {
  const result = await handle({ hook_event_name: 'Stop', session_id: 'session_1', last_assistant_message: '已完成。' });
  assert.equal(result.output.decision, 'block');
  assert.match(result.output.reason, /最终公司回复缺少精确末行/);
});

test('negative wording is not mistaken for a supervision claim', async () => {
  for (const last_assistant_message of ['本任务尚未受监管。\n\n以上内容由 Ted 公司为您提供', '不得宣称已受监管。\n\n以上内容由 Ted 公司为您提供', '当前无法持续监督。\n\n以上内容由 Ted 公司为您提供']) {
    const result = await handle({ hook_event_name: 'Stop', session_id: 'unregistered', last_assistant_message });
    assert.deepEqual(result.output, {});
  }
});
