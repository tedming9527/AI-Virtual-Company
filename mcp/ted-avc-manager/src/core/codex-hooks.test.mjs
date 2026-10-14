import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { installCodexHooks, runCodexHook } from './codex-hooks.js';
const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
function fixture(t) {
  const parent = resolve('runtime/cache/hook-tests');
  mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'run-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'bootstrap.json'), JSON.stringify({ version }));
  const deployment = join(root, 'deployment.json');
  const roleDir = join(root, 'packs/role/ai-engineer'); mkdirSync(roleDir, { recursive: true });
  writeFileSync(join(roleDir, 'meta.json'), JSON.stringify({ type: 'role', name: 'ai-engineer', nameZh: '示例专家', professionZh: 'AI工程师', displayName: '示例专家·AI工程师' }));
  writeFileSync(deployment, JSON.stringify({ organization: 'Example organization', projects: [{ root, roles: ['ai-engineer'] }] }));
  return { root, deployment, input: { cwd: root, session_id: 'session-1', turn_id: 'turn-1', hook_event_name: 'UserPromptSubmit' } };
}
test('install is idempotent and preserves unrelated hooks', t => {
  const f = fixture(t), home = join(f.root, 'client');
  mkdirSync(home);
  const file = join(home, 'hooks.json');
  writeFileSync(file, JSON.stringify({ description: 'user config', hooks: { Stop: [{ hooks: [{ type: 'command', command: 'unrelated' }] }] } }));
  installCodexHooks(f.deployment, home); installCodexHooks(f.deployment, home);
  const c = JSON.parse(readFileSync(file));
  assert.equal(c.description, 'user config'); assert.equal(c.hooks.Stop.length, 2);
  assert.equal(c.hooks.Stop[0].hooks[0].command, 'unrelated'); assert.equal(c.hooks.SessionStart.length, 1);
  const relocated = join(f.root, 'relocated.json'); writeFileSync(relocated, readFileSync(f.deployment));
  installCodexHooks(relocated, home);
  const moved = JSON.parse(readFileSync(file));
  assert.equal(moved.hooks.Stop.length, 2);
  assert.equal(moved.hooks.Stop[0].hooks[0].command, 'unrelated');
  assert.ok(moved.hooks.Stop[1].hooks[0].command.includes(relocated));
});
test('prompt, warning and verified output correlate without recording conversation', t => {
  const f = fixture(t);
  const context = runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext;
  const footer = context.split('\n').at(-1).slice('ai-engineer: '.length);
  assert.ok(footer.includes(`发布版本：v${version}`));
  assert.ok(footer.includes('任务主责：示例专家·AI工程师'));
  const stop = { ...f.input, hook_event_name: 'Stop', last_assistant_message: 'Probe content' };
  assert.match(runCodexHook(stop, f.deployment).systemMessage, /请修复钩子/);
  assert.equal(runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext, context);
  assert.deepEqual(runCodexHook({ ...stop, stop_hook_active: true, last_assistant_message: `Probe content\n\n${footer}\n<oai-mem-citation>x</oai-mem-citation>` }, f.deployment), {});
  const rows = readFileSync(join(f.root, 'runtime/hooks/events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(x => x.status), ['context_injected', 'footer_unverified', 'context_injected', 'footer_verified']);
  assert.equal(rows[0].receipt, rows.at(-1).receipt); assert.ok(!JSON.stringify(rows).includes('Probe content'));
});
test('display comes from professional package, and missing Chinese identity fails visibly', t => {
  const f = fixture(t), metaFile = join(f.root, 'packs/role/ai-engineer/meta.json');
  writeFileSync(metaFile, JSON.stringify({ type: 'role', name: 'ai-engineer', displayName: 'ai-engineer' }));
  assert.match(runCodexHook(f.input, f.deployment).systemMessage, /Chinese name/);
});
test('wrong nonce, misplaced footer and version drift warn without controlling the turn', t => {
  const f = fixture(t);
  const context = runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext;
  const footer = context.split('\n').at(-1).slice('ai-engineer: '.length);
  const stop = { ...f.input, hook_event_name: 'Stop' };
  assert.match(runCodexHook({ ...stop, last_assistant_message: footer + '\nOther text' }, f.deployment).systemMessage, /footer missing or invalid/);
  assert.deepEqual(Object.keys(runCodexHook({ ...stop, stop_hook_active: true, last_assistant_message: footer.replace(/.$/, 'Z') }, f.deployment)), ['systemMessage']);
  writeFileSync(join(f.root, 'bootstrap.json'), JSON.stringify({ version: '0.0.0' }));
  assert.ok(runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext.includes('Hook 回执：')); // central drift cannot stop event attribution
});
test('unbound cwd receives no claims; receipt symlink is rejected', t => {
  const f = fixture(t);
  assert.deepEqual(runCodexHook({ ...f.input, cwd: process.cwd() }, f.deployment), {});
  runCodexHook(f.input, f.deployment);
  const audit = join(f.root, 'runtime/hooks/events.jsonl');
  rmSync(audit);
  const target = join(f.root, 'protected'); writeFileSync(target, 'unchanged'); symlinkSync(target, audit);
  assert.match(runCodexHook(f.input, f.deployment).systemMessage, /symlink/);
  assert.equal(readFileSync(target, 'utf8'), 'unchanged');
});

function stateFile(f) { return join(f.root, 'runtime/hooks/sessions', createHash('sha256').update(f.input.session_id).digest('hex') + '.json'); }
test('Stop without prompt receipt only warns and never issues a replacement receipt', t => {
  const f = fixture(t);
  const result = runCodexHook({ ...f.input, hook_event_name: 'Stop', last_assistant_message: 'Done' }, f.deployment);
  assert.deepEqual(Object.keys(result), ['systemMessage']);
  assert.equal(existsSync(stateFile(f)), false);
  const event = JSON.parse(readFileSync(join(f.root, 'runtime/hooks/events.jsonl'), 'utf8').trim());
  assert.equal(event.status, 'footer_unverified'); assert.equal(event.receipt, null);
});
function exactFooter(output) { return output.hookSpecificOutput.additionalContext.split('\n').at(-1).slice('ai-engineer: '.length); }
test('SessionStart startup is context only and never creates a session nonce', t => {
  const f = fixture(t); const input = { ...f.input, hook_event_name: 'SessionStart', source: 'startup' }; delete input.turn_id;
  const result = runCodexHook(input, f.deployment).hookSpecificOutput.additionalContext;
  assert.ok(result.includes('SessionStart supplies project context only')); assert.ok(!result.includes('Hook 回执：'));
  assert.equal(existsSync(stateFile(f)), false);
  const event = JSON.parse(readFileSync(join(f.root, 'runtime/hooks/events.jsonl'), 'utf8').trim());
  assert.equal(event.turnReceiptIssued, false); assert.equal(event.receipt, undefined);
});
test('resume and compact after prompt preserve turn state and do not replace exact footer', t => {
  const f = fixture(t); const prompt = runCodexHook(f.input, f.deployment); const before = readFileSync(stateFile(f), 'utf8');
  for (const source of ['resume', 'compact', 'clear']) for (const withTurn of [false, true]) {
    const input = { ...f.input, hook_event_name: 'SessionStart', source }; if (!withTurn) delete input.turn_id;
    const context = runCodexHook(input, f.deployment).hookSpecificOutput.additionalContext;
    assert.ok(!context.includes('Hook 回执：')); assert.equal(readFileSync(stateFile(f), 'utf8'), before);
  }
  assert.deepEqual(runCodexHook({ ...f.input, hook_event_name: 'Stop', last_assistant_message: exactFooter(prompt) }, f.deployment), {});
});
test('a different turn cannot borrow a valid footer; resume never forces a correction', t => {
  const f = fixture(t); const a = exactFooter(runCodexHook(f.input, f.deployment));
  const second = { ...f.input, turn_id: 'turn-2' }; const b = exactFooter(runCodexHook(second, f.deployment)); assert.notEqual(a, b);
  const stop = { ...second, hook_event_name: 'Stop', last_assistant_message: a }; assert.match(runCodexHook(stop, f.deployment).systemMessage, /请修复钩子/);
  runCodexHook({ ...second, hook_event_name: 'SessionStart', source: 'resume' }, f.deployment);
  assert.deepEqual(Object.keys(runCodexHook(stop, f.deployment)), ['systemMessage']);
  assert.deepEqual(runCodexHook({ ...stop, last_assistant_message: b }, f.deployment), {});
});
test('prompt and Stop without turn ID reject session fallback', t => {
  const f = fixture(t); runCodexHook({ ...f.input, hook_event_name: 'SessionStart' }, f.deployment);
  for (const event of ['UserPromptSubmit', 'Stop']) { const input = { ...f.input, hook_event_name: event }; delete input.turn_id; assert.match(runCodexHook(input, f.deployment).systemMessage, /turn_id/); }
  assert.equal(existsSync(stateFile(f)), false);
});
test('upgrade recovers legacy issuing version from matching prompt audit without changing nonce', t => {
  const f = fixture(t); runCodexHook(f.input, f.deployment);
  const state = JSON.parse(readFileSync(stateFile(f))); const receipt = state.turns['turn-1'].receipt;
  delete state.turns['turn-1'].deliveryVersion; state.turns.session = { receipt: 'session-nonce-must-not-appear' }; writeFileSync(stateFile(f), JSON.stringify(state));
  const audit = join(f.root, 'runtime/hooks/events.jsonl'); const event = JSON.parse(readFileSync(audit, 'utf8').trim());
  event.version = '1.2.3'; delete event.deliveryVersion; writeFileSync(audit, JSON.stringify(event) + '\n');
  runCodexHook({ ...f.input, hook_event_name: 'SessionStart', source: 'resume' }, f.deployment);
  const footer = `以上内容由 Example organization 提供；发布版本：v1.2.3；任务主责：示例专家·AI工程师；实际执行者：platform agent；Hook 回执：${receipt}`;
  assert.deepEqual(runCodexHook({ ...f.input, hook_event_name: 'Stop', last_assistant_message: footer }, f.deployment), {});
  assert.equal(exactFooter(runCodexHook(f.input, f.deployment)), footer);
  assert.equal(JSON.parse(readFileSync(stateFile(f))).turns['turn-1'].receipt, receipt);
});
