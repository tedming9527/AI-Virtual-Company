import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { beginTask, loadAsset, closeTask, runExecutionHook, installExecutionHooks } from './execution.js';
import { runCodexHook } from './codex-hooks.js';
const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
const sha = value => createHash('sha256').update(value).digest('hex');
const tool = 'functions.exec', close = 'mcp__ted_avc_manager__task_closeout';
function fixture(t, mode = 'enforce') {
  const parent = resolve('runtime/cache/execution-tests'); mkdirSync(parent, { recursive: true });
  const root = mkdtempSync(join(parent, 'case-')); t.after(() => rmSync(root, { recursive: true, force: true }));
  writeFileSync(join(root, 'bootstrap.json'), JSON.stringify({ name: 'example', version }));
  const roleDir = join(root, 'packs/role/ai-engineer'); mkdirSync(roleDir, { recursive: true });
  writeFileSync(join(roleDir, 'meta.json'), JSON.stringify({ name: 'ai-engineer', type: 'role', version: '1.0.0', nameZh: '示例专家', professionZh: 'AI工程师', displayName: '示例专家·AI工程师' }));
  writeFileSync(join(roleDir, 'PROFILE.md'), '# 示例专家\n\n真实角色契约全文。\n');
  const skill = join(root, 'packs/skill/demo'); mkdirSync(skill, { recursive: true });
  writeFileSync(join(skill, 'meta.json'), JSON.stringify({ name: 'demo', type: 'skill', version: '1.0.0' }));
  writeFileSync(join(skill, 'SKILL.md'), '# 示例技能\n');
  const deployment = join(root, 'deployment.json');
  writeFileSync(deployment, JSON.stringify({ organization: 'Example organization', projects: [{ root, roles: ['ai-engineer'], execution: { enabled: true, mode, maxToolCalls: 3, bootstrapTools: ['mcp__pack_manager__list_packs', 'mcp__pack_manager__load_asset', 'mcp__pack_manager__task_begin'] } }] }));
  const native = { cwd: root, session_id: 'session-a', turn_id: 'turn-a', hook_event_name: 'UserPromptSubmit' };
  runCodexHook(native, deployment);
  const receipt = JSON.parse(readFileSync(join(root, 'runtime/hooks/sessions', sha(native.session_id) + '.json'))).turns[native.turn_id].receipt;
  const key = { sessionId: native.session_id, turnId: native.turn_id, receipt };
  const begin = extra => beginTask(root, { ...key, role: 'ai-engineer', goal: 'Verify bounded native execution', allowedTools: [tool, close], maxToolCalls: 2, ...extra }, deployment);
  const event = (name, id = 'call-a', extra = {}) => runExecutionHook({ ...native, hook_event_name: name, tool_name: tool, tool_use_id: id, tool_input: { cmd: 'example' }, ...extra }, deployment);
  return { root, roleDir, deployment, native, key, begin, event };
}
test('task_begin binds actual native nonce, returns complete role and pins immutable contract', t => {
  const f = fixture(t), task = f.begin();
  assert.equal(task.roleProfile, readFileSync(join(f.roleDir, 'PROFILE.md'), 'utf8'));
  assert.equal(task.actualExecutor, 'platform agent'); assert.equal(task.role.displayName, '示例专家·AI工程师');
  assert.equal(f.begin().taskId, task.taskId);
  assert.throws(() => f.begin({ maxToolCalls: 3 }), /already pinned/);
  assert.throws(() => f.begin({ receipt: 'invented' }), /receipt mismatch/);
  assert.throws(() => f.begin({ turnId: 'different' }), /receipt mismatch/);
  assert.throws(() => f.begin({ allowedTools: ['*'] }), /wildcards/);
});
test('before begin exact bootstrap tools only; enforce denial prevents handler side effect', t => {
  const f = fixture(t), sentinel = join(f.root, 'handler-executed');
  const denied = f.event('PreToolUse');
  if (denied.hookSpecificOutput?.permissionDecision !== 'deny') writeFileSync(sentinel, 'executed');
  assert.equal(existsSync(sentinel), false);
  assert.equal(f.event('PreToolUse', 'call-b', { tool_name: 'mcp__pack_manager__task_begin' }).hookSpecificOutput, undefined);
  assert.equal(f.event('PreToolUse', 'call-c', { tool_name: 'mcp__other__task_begin' }).hookSpecificOutput.permissionDecision, 'deny');
});
test('tool-use IDs reserve budget once, response observation and artifact SHA closeout are factual', t => {
  const f = fixture(t); f.begin();
  assert.deepEqual(f.event('PreToolUse'), {}); assert.deepEqual(f.event('PreToolUse'), {});
  f.event('PostToolUse', 'call-a', { tool_response: { output: 'actual tool text', exit_code: 0 } });
  assert.match(f.event('PreToolUse', 'call-a').hookSpecificOutput.permissionDecisionReason, /Completed/);
  f.event('PreToolUse', 'call-b'); f.event('PostToolUse', 'call-b');
  const denied = f.event('PreToolUse', 'call-c'); assert.match(denied.hookSpecificOutput.permissionDecisionReason, /budget exhausted/);
  assert.deepEqual(f.event('PreToolUse', 'close-a', { tool_name: close }), {});
  const artifact = join(f.root, 'result.md'); writeFileSync(artifact, 'Actual output');
  assert.throws(() => closeTask(f.root, { ...f.key, artifacts: [{ path: artifact, sha256: 'forged' }] }, f.deployment), /SHA mismatch/);
  const closed = closeTask(f.root, { ...f.key, artifacts: [{ path: artifact }] }, f.deployment);
  assert.equal(closed.observation.reservedCalls, 2); assert.equal(closed.observation.observedCalls, 1); assert.equal(closed.observation.unknownCalls, 1);
  assert.equal(closed.calls['call-a'].exitCode, 0); assert.equal(closed.calls['call-b'].exitCode, 'unknown');
  assert.equal(closed.artifacts[0].sha256, sha('Actual output'));
  const audit = readFileSync(join(f.root, 'runtime/execution/events.jsonl'), 'utf8'); assert.ok(!audit.includes('actual tool text')); assert.ok(!audit.includes('example"'));
  assert.match(f.event('PreToolUse', 'after-close').hookSpecificOutput.permissionDecisionReason, /closed/);
});
test('missing completion requires explicit unknown classification and real artifact evidence', t => {
  const f = fixture(t); f.begin(); f.event('PreToolUse');
  const artifact = join(f.root, 'result'); writeFileSync(artifact, 'file');
  assert.throws(() => closeTask(f.root, { ...f.key, artifacts: [{ path: artifact }] }, f.deployment), /unknownCalls/);
  assert.throws(() => closeTask(f.root, { ...f.key, unknownCalls: [{ toolUseId: 'call-a', reason: 'client emitted no post event' }], artifacts: [] }, f.deployment), /actual output/);
  const closed = closeTask(f.root, { ...f.key, unknownCalls: [{ toolUseId: 'call-a', reason: 'client emitted no post event' }], artifacts: [{ path: artifact }] }, f.deployment);
  assert.equal(closed.observation.unknownCalls, 1);
});
test('role drift, forbidden tool, ID mutation deny before side effects', t => {
  const f = fixture(t); f.begin();
  assert.equal(f.event('PreToolUse', 'forbidden', { tool_name: 'functions.other' }).hookSpecificOutput.permissionDecision, 'deny');
  f.event('PreToolUse');
  assert.match(f.event('PreToolUse', 'call-a', { tool_input: { cmd: 'changed' } }).hookSpecificOutput.permissionDecisionReason, /different call/);
  writeFileSync(join(f.roleDir, 'PROFILE.md'), 'changed role');
  const decision = f.event('PreToolUse', 'drift'), sentinel = join(f.root, 'drift-handler');
  if (decision.hookSpecificOutput?.permissionDecision !== 'deny') writeFileSync(sentinel, 'executed');
  assert.equal(existsSync(sentinel), false); assert.match(decision.hookSpecificOutput.permissionDecisionReason, /drift/);
});
test('monitor records violations but does not claim enforcement; actual foreign root gets no context', t => {
  const f = fixture(t, 'monitor'); assert.deepEqual(f.event('PreToolUse'), {});
  f.begin(); assert.deepEqual(f.event('PreToolUse', 'wrong', { tool_name: 'functions.other' }), {});
  const context = runExecutionHook(f.native, f.deployment).hookSpecificOutput.additionalContext;
  assert.match(context, /mode=monitor/); assert.match(context, /session-a/);
  assert.deepEqual(runExecutionHook({ ...f.native, cwd: resolve('.') }, f.deployment), {});
});
test('general and registered personal skills load, staging/unregistered/drift/traversal cannot', t => {
  const f = fixture(t); f.begin();
  assert.equal(loadAsset(f.root, { ...f.key, source: 'general', type: 'skill', name: 'demo' }, f.deployment).content, '# 示例技能\n');
  assert.throws(() => loadAsset(f.root, { ...f.key, source: 'general', type: 'skill', name: 'demo', entry: '../PROFILE.md' }, f.deployment), /pack-relative/);
  const dir = join(f.root, 'runtime/personal/projects/example/custom/skills/local-demo'); mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'SKILL.md'), '# Original local content'); writeFileSync(join(dir, 'meta.json'), JSON.stringify({ type: 'skill', name: 'local-demo', version: '1.0.0' }));
  const input = { ...f.key, source: 'local-custom', type: 'skill', name: 'local-demo' };
  assert.throws(() => loadAsset(f.root, input, f.deployment), /registration/);
  const entrySha256 = sha('# Original local content'), metaSha256 = sha(readFileSync(join(dir, 'meta.json')));
  writeFileSync(join(f.root, 'runtime/skill-registry.json'), JSON.stringify({ entries: [{ name: 'local-demo', dir, source: 'local-custom', version: '1.0.0', entrySha256, metaSha256, sha256: sha(entrySha256 + ':' + metaSha256) }] }));
  assert.equal(loadAsset(f.root, input, f.deployment).source, 'local-custom');
  writeFileSync(join(dir, 'SKILL.md'), 'unreviewed edit'); assert.throws(() => loadAsset(f.root, input, f.deployment), /changed/);
  assert.throws(() => loadAsset(f.root, { ...input, source: 'staging' }, f.deployment), /source/);
  assert.match(f.event('PreToolUse', 'drift').hookSpecificOutput.permissionDecisionReason, /drift/);
});
test('loaded general document digest drift is detected before execution', t => {
  const f = fixture(t); f.begin(); loadAsset(f.root, { ...f.key, source: 'general', type: 'skill', name: 'demo' }, f.deployment);
  writeFileSync(join(f.root, 'packs/skill/demo/SKILL.md'), 'Changed body with unchanged meta');
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /asset digest drift/);
  assert.deepEqual(f.event('PreToolUse', 'close', { tool_name: close }), {});
  const artifact = join(f.root, 'drift-report'); writeFileSync(artifact, 'Invalidated task report');
  const result = closeTask(f.root, { ...f.key, artifacts: [{ path: artifact }] }, f.deployment);
  assert.equal(result.integrity.status, 'invalidated');
});
test('runtime symlinks and lock collision fail without changing protected target', t => {
  const f = fixture(t), task = f.begin();
  const directory = join(f.root, 'runtime/execution/tasks'); mkdirSync(join(directory, `${task.taskId}.lock`));
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /locked/); rmSync(join(directory, `${task.taskId}.lock`), { recursive: true });
  const audit = join(f.root, 'runtime/execution/events.jsonl'), target = join(f.root, 'protected'); writeFileSync(target, 'untouched'); rmSync(audit); symlinkSync(target, audit);
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /symlink/); assert.equal(readFileSync(target, 'utf8'), 'untouched');
});
test('installer preserves unrelated/attribution hooks and does not grant trust', t => {
  const f = fixture(t), home = join(f.root, 'client'); mkdirSync(home);
  writeFileSync(join(home, 'hooks.json'), JSON.stringify({ custom: true, hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'unrelated' }] }], UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'footer-first' }] }] } }));
  installExecutionHooks(f.deployment, home); const result = installExecutionHooks(f.deployment, home), config = JSON.parse(readFileSync(result.file));
  assert.equal(config.custom, true); assert.equal(config.hooks.PreToolUse.length, 2); assert.equal(config.hooks.UserPromptSubmit[0].hooks[0].command, 'footer-first'); assert.equal(existsSync(join(home, 'config.toml')), false);
});
test('CLI stdout contains only valid native hook JSON', t => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [new URL('../execution-hook.js', import.meta.url).pathname, '--deployment', f.deployment], { input: JSON.stringify(f.native), encoding: 'utf8' });
  assert.equal(result.status, 0); assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /execution adapter/); assert.equal(result.stderr, '');
});

test('required entry body gates execution and controls remain callable after budget', t => {
  const f=fixture(t), load='mcp__ted_avc_manager__load_asset';
  assert.throws(()=>loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo'},f.deployment),/task_begin/);
  f.begin({requiredAssets:['general:skill:demo'],allowedTools:[tool,close,load],maxToolCalls:1});
  const input={...f.key,source:'general',type:'skill',name:'demo'};
  writeFileSync(join(f.root,'packs/skill/demo/README.md'),'Short description');
  loadAsset(f.root,{...input,entry:'README.md'},f.deployment);
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason,/Required asset/);
  loadAsset(f.root,input,f.deployment);
  assert.deepEqual(f.event('PreToolUse','first'),{});
  f.event('PostToolUse','first',{tool_response:{exit_code:0}});
  assert.match(f.event('PreToolUse','second').hookSpecificOutput.permissionDecisionReason,/budget/i);
  assert.deepEqual(f.event('PreToolUse','control',{tool_name:load}),{});
});
