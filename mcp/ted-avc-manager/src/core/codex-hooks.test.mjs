import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
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
});
test('prompt, correction and verified output correlate without recording conversation', t => {
  const f = fixture(t);
  const context = runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext;
  const footer = context.split('\n').at(-1).slice('ai-engineer: '.length);
  assert.ok(footer.includes(`发布版本：v${version}`));
  assert.ok(footer.includes('任务主责：示例专家·AI工程师'));
  const stop = { ...f.input, hook_event_name: 'Stop', last_assistant_message: 'Probe content' };
  assert.equal(runCodexHook(stop, f.deployment).decision, 'block');
  assert.equal(runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext, context);
  assert.deepEqual(runCodexHook({ ...stop, stop_hook_active: true, last_assistant_message: `Probe content\n\n${footer}\n<oai-mem-citation>x</oai-mem-citation>` }, f.deployment), {});
  const rows = readFileSync(join(f.root, 'runtime/hooks/events.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  assert.deepEqual(rows.map(x => x.status), ['context_injected', 'correction_requested', 'context_injected', 'footer_verified']);
  assert.equal(rows[0].receipt, rows.at(-1).receipt); assert.ok(!JSON.stringify(rows).includes('Probe content'));
});
test('display comes from professional package, and missing Chinese identity fails visibly', t => {
  const f = fixture(t), metaFile = join(f.root, 'packs/role/ai-engineer/meta.json');
  writeFileSync(metaFile, JSON.stringify({ type: 'role', name: 'ai-engineer', displayName: 'ai-engineer' }));
  assert.throws(() => runCodexHook(f.input, f.deployment), /Chinese name/);
});
test('wrong nonce and misplaced footer cannot pass; retry is bounded; versions must match', t => {
  const f = fixture(t);
  const context = runCodexHook(f.input, f.deployment).hookSpecificOutput.additionalContext;
  const footer = context.split('\n').at(-1).slice('ai-engineer: '.length);
  const stop = { ...f.input, hook_event_name: 'Stop' };
  assert.equal(runCodexHook({ ...stop, last_assistant_message: footer + '\nOther text' }, f.deployment).decision, 'block');
  assert.equal(runCodexHook({ ...stop, stop_hook_active: true, last_assistant_message: footer.replace(/.$/, 'Z') }, f.deployment).continue, false);
  writeFileSync(join(f.root, 'bootstrap.json'), JSON.stringify({ version: '0.0.0' }));
  assert.throws(() => runCodexHook(f.input, f.deployment), /differs/);
});
test('unbound cwd receives no claims; receipt symlink is rejected', t => {
  const f = fixture(t);
  assert.deepEqual(runCodexHook({ ...f.input, cwd: process.cwd() }, f.deployment), {});
  runCodexHook(f.input, f.deployment);
  const audit = join(f.root, 'runtime/hooks/events.jsonl');
  rmSync(audit);
  const target = join(f.root, 'protected'); writeFileSync(target, 'unchanged'); symlinkSync(target, audit);
  assert.throws(() => runCodexHook(f.input, f.deployment), /symlink/);
  assert.equal(readFileSync(target, 'utf8'), 'unchanged');
});
