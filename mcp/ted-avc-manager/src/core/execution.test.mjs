import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, rmSync, symlinkSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { skillBundle } from './local-assets.js';
import { beginTask, loadAsset, closeTask, runExecutionHook, installExecutionHooks,executionResponse } from './execution.js';
import {registerCandidate,recordTrial} from '../governance/candidate-trials.js';
import { runCodexHook } from './codex-hooks.js';
import { openMaintenance, maintenanceStatus, endMaintenance } from './maintenance.js';
import { diagnosticCall, maintenanceDoctor } from './maintenance-diagnostics.js';
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
test('coordination helper requires its exact native name and records genuine fixture completion', t => {
  const f = fixture(t), helper = 'request_user_input_async';
  f.begin({allowedTools:[helper,close]});
  assert.equal(f.event('PreToolUse','wrapper',{tool_name:'functions.request_user_input_async'}).hookSpecificOutput.permissionDecision,'deny');
  assert.deepEqual(f.event('PreToolUse','question',{tool_name:helper}),{});
  f.event('PostToolUse','question',{tool_name:helper,tool_response:{accepted:true}});
  const task=f.begin({allowedTools:[helper,close]});
  assert.equal(task.calls.question.tool,helper);
  assert.equal(task.calls.question.status,'observed');
  assert.equal(task.violations.length,1);
  assert.equal(task.violations[0].tool,'functions.request_user_input_async');
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
  const f = fixture(t, 'monitor'), pending = f.event('PreToolUse');
  assert.equal(pending.systemMessage, undefined); assert.equal(pending.hookSpecificOutput.permissionDecision, undefined);
  assert.match(pending.hookSpecificOutput.additionalContext, /任务待关联/);
  assert.deepEqual(pending._tedTask, {status:'pending',verified:false});
  assert.equal(JSON.parse(JSON.stringify(pending))._tedTask, undefined);
  assert.equal(f.event('PostToolUse')._tedTask.status, 'pending');
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
  assert.throws(() => loadAsset(f.root, input, f.deployment), /legacy digest/);
  const registered = JSON.parse(readFileSync(join(f.root, 'runtime/skill-registry.json'))); registered.entries[0].bundleSha256 = skillBundle(dir).bundleSha256; writeFileSync(join(f.root, 'runtime/skill-registry.json'), JSON.stringify(registered));
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
test('collection lock and symlink failures warn without changing protected targets, even in enforce mode', t => {
  const f = fixture(t), task = f.begin();
  const directory = join(f.root, 'runtime/execution/tasks'); mkdirSync(join(directory, `${task.taskId}.lock`));
  assertWarningOnly(f.event('PreToolUse'), /locked/); rmSync(join(directory, `${task.taskId}.lock`), { recursive: true });
  const audit = join(f.root, 'runtime/execution/events.jsonl'), target = join(f.root, 'protected'); writeFileSync(target, 'untouched'); rmSync(audit); symlinkSync(target, audit);
  assertWarningOnly(f.event('PreToolUse'), /symlink/); assert.equal(readFileSync(target, 'utf8'), 'untouched');
});
test('installer preserves unrelated/attribution hooks and does not grant trust', t => {
  const f = fixture(t), home = join(f.root, 'client'); mkdirSync(home);
  writeFileSync(join(home, 'hooks.json'), JSON.stringify({ custom: true, hooks: { PreToolUse: [{ hooks: [{ type: 'command', command: 'unrelated' }] }], UserPromptSubmit: [{ hooks: [{ type: 'command', command: 'footer-first' }] }] } }));
  installExecutionHooks(f.deployment, home); const result = installExecutionHooks(f.deployment, home), config = JSON.parse(readFileSync(result.file));
  assert.equal(config.custom, true); assert.equal(config.hooks.PreToolUse.length, 2); assert.equal(config.hooks.UserPromptSubmit[0].hooks[0].command, 'footer-first'); assert.equal(existsSync(join(home, 'config.toml')), false);
});

test('CLI stdout contains only valid native hook JSON', t => {
  const f = fixture(t);
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../execution-hook.js', import.meta.url)), '--deployment', f.deployment], { input: JSON.stringify(f.native), encoding: 'utf8' });
  assert.equal(result.status, 0); assert.match(JSON.parse(result.stdout).hookSpecificOutput.additionalContext, /execution adapter/); assert.equal(result.stderr, '');
});

function assertWarningOnly(result, reason) {
  assert.deepEqual(Object.keys(result).filter(k=>k!=='_tedCollection'), ['systemMessage']);
  assert.match(result.systemMessage, reason);
  assert.match(result.systemMessage, /请修复钩子/);
}
test('missing or corrupt deployment warns for every event, including unrelated projects', t => {
  const f = fixture(t);
  for (const corrupt of [false, true]) {
    if (corrupt) writeFileSync(f.deployment, '{broken'); else rmSync(f.deployment);
    for (const cwd of [f.root, process.cwd()]) for (const event of ['UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
      assertWarningOnly(f.event(event, 'missing-config', { cwd }), /scope\/policy|ENOENT|JSON/);
    }
  }
});
test('reinstall after deployment move replaces the old owned commands and preserves other hooks', t => {
  const f = fixture(t), home = join(f.root, 'moved-client');
  installExecutionHooks(f.deployment, home);
  const relocated = join(f.root, 'moved-deployment.json');
  writeFileSync(relocated, readFileSync(f.deployment));
  installExecutionHooks(relocated, home);
  const hooks = JSON.parse(readFileSync(join(home, 'hooks.json'))).hooks;
  for (const event of ['UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
    assert.equal(hooks[event].length, 1);
    assert.ok(hooks[event][0].hooks[0].command.includes(relocated));
    assert.ok(!hooks[event][0].hooks[0].command.includes(f.deployment));
  }
});
test('monitor collection failures never prevent the handler or invent successful observations', t => {
  for (const failure of ['receipt', 'lock', 'audit']) {
    const f = fixture(t, 'monitor'), task = f.begin();
    if (failure === 'receipt') rmSync(join(f.root, 'runtime/hooks'), { recursive: true });
    if (failure === 'lock') mkdirSync(join(f.root, 'runtime/execution/tasks', `${task.taskId}.lock`));
    if (failure === 'audit') {
      rmSync(join(f.root, 'runtime/execution/events.jsonl'));
      mkdirSync(join(f.root, 'runtime/execution/events.jsonl'));
    }
    if (failure === 'inventory') writeFileSync(join(f.root, 'runtime/storage.json'), '{broken');
    const output = f.event('PreToolUse');
    assertWarningOnly(output, /missing|locked|EISDIR|JSON/);
    const sentinel = join(f.root, 'authorized-handler');
    if (!output.hookSpecificOutput?.permissionDecision && !output.decision) writeFileSync(sentinel, 'completed');
    assert.equal(readFileSync(sentinel, 'utf8'), 'completed');
    assertWarningOnly(f.event('PostToolUse', 'call-a', { tool_response: {} }), /missing|locked|EISDIR|JSON/);
  }
});
test('both CLI adapters degrade malformed input and missing deployment to valid warning JSON', t => {
  const f = fixture(t);
  for (const entry of ['execution-hook.js', 'codex-hook.js']) {
    for (const input of ['{broken', JSON.stringify({ ...f.native, hook_event_name: 'PreToolUse' })]) {
      const result = spawnSync(process.execPath, [fileURLToPath(new URL(`../${entry}`, import.meta.url)), '--deployment', join(f.root, 'missing.json')], { input, encoding: 'utf8' });
      assert.equal(result.status, 0, result.stderr);
      assertWarningOnly(JSON.parse(result.stdout), /JSON|ENOENT/);
      assert.equal(result.stderr, '');
    }
  }
});

test('required entry body gates execution and controls remain callable after budget', t => {
  const f=fixture(t), load='mcp__ted_avc_manager__load_asset';
  assert.throws(()=>loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo'},f.deployment),/task_begin/);
  f.begin({requiredAssets:['general:skill:demo'],allowedTools:[tool,close,load],maxToolCalls:1});
  const input={...f.key,source:'general',type:'skill',name:'demo'};
  writeFileSync(join(f.root,'packs/skill/demo/README.md'),'Short description');
  loadAsset(f.root,{...input,entry:'README.md'},f.deployment);
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason,/Required asset/);
  loadAsset(f.root,{...input,mode:'chunk'},f.deployment);
  assert.deepEqual(f.event('PreToolUse','first'),{});
  f.event('PostToolUse','first',{tool_response:{exit_code:0}});
  assert.match(f.event('PreToolUse','second').hookSpecificOutput.permissionDecisionReason,/budget/i);
  assert.deepEqual(f.event('PreToolUse','control',{tool_name:load}),{});
});

function maintenance(f, extra = {}) {
  return { sessionId: f.key.sessionId, turnId: f.key.turnId, userAuthorized: true,
    reason: 'task_begin_unavailable', authorizationRef: 'current user authorized adapter recovery',
    unavailableEvidence: 'current host tools/list does not expose task_begin', ttlSeconds: 600,
    operations: [{ purpose: 'test', tool, input: { cmd: 'example' }, maxCalls: 1 }], ...extra };
}
test('fixed read-only self-check works without binding or usable deployment; command injection does not', t => {
  const f = fixture(t), diagnostic = diagnosticCall(f.root, f.deployment);
  const invoke = args => f.event('PreToolUse', 'doctor', { tool_name: diagnostic.tool, tool_input: args });
  assert.equal(invoke(diagnostic.input).hookSpecificOutput, undefined);
  for (const changed of [
    { cmd: diagnostic.input.cmd + '; touch injected' },
    { cmd: diagnostic.input.cmd + ' --other' },
    { login: true }, { shell: '/bin/zsh' }, { workdir: resolve('.') },
    { env: { NODE_OPTIONS: '--import injected' } }, { sandbox_permissions: 'require_escalated' },
  ]) assert.equal(invoke({ ...diagnostic.input, ...changed }).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(f.event('PreToolUse', 'keyword', { tool_input: { cmd: 'echo 自检 maintenance-doctor' } }).hookSpecificOutput.permissionDecision, 'deny');
  rmSync(join(f.root, 'runtime/hooks'), { recursive: true });
  writeFileSync(f.deployment, '{broken');
  assert.equal(invoke(diagnostic.input).hookSpecificOutput, undefined);
  assert.deepEqual(f.event('PostToolUse', 'doctor', { tool_name: diagnostic.tool, tool_input: diagnostic.input, tool_response: {} }), {});
  const cli = fileURLToPath(new URL('../cli.js', import.meta.url));
  const result = spawnSync(process.execPath, [cli, 'maintenance-doctor', '--deployment', f.deployment], { cwd: f.root, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).checks.deploymentReadable, false);
  assert.equal(existsSync(join(f.root, 'runtime/hooks')), false);
  assert.equal(maintenanceDoctor(f.root, f.deployment).bindingActive, 'unknown');
});
test('unbound authorized maintenance needs no footer/role assets, matches exact operations and records observations', t => {
  const f = fixture(t), grant = openMaintenance(f.root, maintenance(f), f.deployment);
  rmSync(join(f.root, 'runtime/hooks'), { recursive: true });
  rmSync(f.roleDir, { recursive: true });
  assert.match(runExecutionHook(f.native, f.deployment).hookSpecificOutput.additionalContext, /Unbound maintenance active/);
  assert.equal(f.event('PreToolUse').hookSpecificOutput, undefined);
  assert.equal(f.event('PreToolUse').hookSpecificOutput, undefined); // pending retry uses one slot
  const denied = f.event('PreToolUse', 'changed', { tool_input: { cmd: 'unrelated-write' } });
  const sentinel = join(f.root, 'not-executed');
  if (denied.hookSpecificOutput?.permissionDecision !== 'deny') writeFileSync(sentinel, 'executed');
  assert.equal(existsSync(sentinel), false);
  f.event('PostToolUse', 'call-a', { tool_response: { output: 'private result', exit_code: 0 } });
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /replay/);
  assert.match(f.event('PreToolUse', 'new').hookSpecificOutput.permissionDecisionReason, /budget/);
  const state = maintenanceStatus(f.root, f.key, f.deployment);
  assert.equal(state.bindingActive, 'unknown'); assert.equal(state.calls['call-a'].status, 'observed');
  assert.equal(state.calls['call-a'].exitCode, 0); assert.equal(state.id, grant.id);
  const audit = readFileSync(join(f.root, 'runtime/execution/maintenance/events.jsonl'), 'utf8');
  assert.match(audit, /unbound_maintenance/); assert.ok(!audit.includes('private result')); assert.ok(!audit.includes('"cmd"'));
  assert.equal(existsSync(join(f.root, 'runtime/execution/tasks')), false);
});
test('maintenance authorization, bounded scope and immutable budget cannot be omitted or enlarged', t => {
  const f = fixture(t);
  for (const extra of [
    { userAuthorized: false }, { reason: 'convenience' }, { authorizationRef: '' }, { unavailableEvidence: '' },
    { ttlSeconds: 3601 }, { operations: [] },
    { operations: [{ purpose: 'deploy', tool, input: {}, maxCalls: 1 }] },
    { operations: [{ purpose: 'test', tool: '*', input: {}, maxCalls: 1 }] },
    { operations: [{ purpose: 'test', tool, maxCalls: 1 }] },
    { operations: [{ purpose: 'test', tool, input: {}, cwd: '..', maxCalls: 1 }] },
    { operations: [{ purpose: 'test', tool, input: {}, maxCalls: 101 }] },
  ]) assert.throws(() => openMaintenance(f.root, maintenance(f, extra), f.deployment));
  openMaintenance(f.root, maintenance(f), f.deployment);
  assert.throws(() => openMaintenance(f.root, maintenance(f, { ttlSeconds: 3600 }), f.deployment), /pinned/);
  for (const extra of [{ session_id: 'other-session' }, { turn_id: 'other-turn' }, { tool_name: 'functions.other' }]) {
    assert.equal(f.event('PreToolUse', 'scope', extra).hookSpecificOutput.permissionDecision, 'deny');
  }
  mkdirSync(join(f.root, 'subdir'));
  assert.equal(f.event('PreToolUse', 'cwd', { cwd: join(f.root, 'subdir') }).hookSpecificOutput.permissionDecision, 'deny');
});
test('expiry and revocation restore blocking; post observations remain factual and immutable', t => {
  const f = fixture(t), grant = openMaintenance(f.root, maintenance(f), f.deployment);
  f.event('PreToolUse');
  const file = join(f.root, 'runtime/execution/maintenance', grant.id + '.json');
  const state = JSON.parse(readFileSync(file, 'utf8')); state.expiresAt = new Date(Date.now() - 1).toISOString();
  writeFileSync(file, JSON.stringify(state));
  assert.match(f.event('PreToolUse', 'expired').hookSpecificOutput.permissionDecisionReason, /expired/);
  assert.equal(maintenanceStatus(f.root, f.key, f.deployment).status, 'expired');
  endMaintenance(f.root, f.key, f.deployment);
  assert.match(f.event('PreToolUse', 'revoked').hookSpecificOutput.permissionDecisionReason, /task_begin/);
  f.event('PostToolUse');
  f.event('PostToolUse', 'call-a', { tool_response: { exit_code: 0 } });
  assert.equal(maintenanceStatus(f.root, f.key, f.deployment).calls['call-a'].status, 'unknown');
});
test('successful genuine binding retires maintenance without backfilling its calls', t => {
  const f = fixture(t); openMaintenance(f.root, maintenance(f), f.deployment);
  f.event('PreToolUse'); f.event('PostToolUse', 'call-a', { tool_response: { exit_code: 0 } });
  assert.throws(() => f.begin({ receipt: 'forged' }), /receipt/);
  assert.equal(maintenanceStatus(f.root, f.key, f.deployment).status, 'active');
  assert.equal(f.event('PreToolUse', 'begin', { tool_name: 'mcp__pack_manager__task_begin' }).hookSpecificOutput, undefined);
  const task = f.begin();
  const state = maintenanceStatus(f.root, f.key, f.deployment);
  assert.equal(state.status, 'rebound'); assert.equal(state.reboundTaskId, task.taskId);
  assert.deepEqual(task.calls, {}); assert.equal(state.calls['call-a'].status, 'observed');
  assert.equal(f.event('PreToolUse', 'wrong', { tool_name: 'functions.other' }).hookSpecificOutput.permissionDecision, 'deny');
  assert.deepEqual(f.event('PreToolUse', 'bound'), {});
  assert.throws(() => openMaintenance(f.root, maintenance(f), f.deployment), /pinned/);
  const other = fixture(t); other.begin();
  assert.throws(() => openMaintenance(other.root, maintenance(other), other.deployment), /already bound/);
});
test('maintenance corruption and contention fail closed even when ordinary policy is monitor', t => {
  const f = fixture(t, 'monitor'), grant = openMaintenance(f.root, maintenance(f), f.deployment);
  assert.equal(f.event('PreToolUse', 'wrong', { tool_input: { cmd: 'not approved' } }).hookSpecificOutput.permissionDecision, 'deny');
  const base = join(f.root, 'runtime/execution/maintenance'), lock = join(base, grant.id + '.lock');
  mkdirSync(lock);
  assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /locked/);
  rmSync(lock, { recursive: true });
  writeFileSync(join(base, grant.id + '.json'), '{corrupt');
  assert.equal(f.event('PreToolUse').hookSpecificOutput.permissionDecision, 'deny');
});
test('maintenance paths reject symlinks and CLI entry requires explicit authorization', t => {
  const f = fixture(t), input = join(f.root, 'maintenance-input.json');
  writeFileSync(input, JSON.stringify(maintenance(f)));
  const cli = fileURLToPath(new URL('../cli.js', import.meta.url));
  const run = args => spawnSync(process.execPath, [cli, ...args], { cwd: f.root, env: { ...process.env, AVC_DEPLOYMENT_FILE: f.deployment }, encoding: 'utf8' });
  assert.equal(run(['maintenance-open', input]).status, 1);
  assert.equal(maintenanceStatus(f.root, f.key, f.deployment).status, 'absent');
  const opened = run(['maintenance-open', input, '--authorize-unbound-maintenance']);
  assert.equal(opened.status, 0, opened.stderr); assert.equal(JSON.parse(opened.stdout).status, 'active');
  assert.equal(JSON.parse(run(['maintenance-status', input]).stdout).bindingActive, 'unknown');
  assert.equal(JSON.parse(run(['maintenance-close', input]).stdout).status, 'revoked');
  const other = fixture(t), directory = join(other.root, 'runtime/execution');
  mkdirSync(directory, { recursive: true }); symlinkSync(f.root, join(directory, 'maintenance'));
  assert.throws(() => openMaintenance(other.root, maintenance(other), other.deployment), /symlink/);
  const monitored = fixture(t, 'monitor'); openMaintenance(monitored.root, maintenance(monitored), monitored.deployment);
  const audit = join(monitored.root, 'runtime/execution/maintenance/events.jsonl');
  rmSync(audit); symlinkSync(join(monitored.root, 'missing-target'), audit);
  assert.match(monitored.event('PreToolUse').hookSpecificOutput.permissionDecisionReason, /symlink/);
});

// Adapter integration fixtures are simulated hook receipts, not live-host verification.
import { createWorkflow, workflowStatus, cancelWorkflow } from './workflow.js';
function nativeWorkflow(f) {
 const spec={schema:'avc.workflow.v1',id:'native-flow',title:'Native workflow',goal:'Verify node binding',owner:'ai-engineer',assets:[{id:'general:skill:demo',usage:'support',purpose:'Required method'}],maxParallel:1,maxAttemptsTotal:1,nodes:[{id:'work',title:'Work',role:'ai-engineer',assets:[],dependsOn:[],maxAttempts:1,executor:{kind:'native',allowedTools:[tool,close],maxToolCalls:2},outputs:['result.md'],acceptance:'Actual tool result and artifact'}]};
 createWorkflow(f.root,spec);return {workflowId:spec.id,nodeId:'work'};
}
test('workflow native claim uses real adapter binding and required asset delivery before effects',t=>{
 const f=fixture(t),ref=nativeWorkflow(f);
 assert.throws(()=>f.begin({...ref,receipt:'invented'}),/receipt mismatch/);
 assert.throws(()=>f.begin({...ref,maxToolCalls:3}),/workflow node tool/);
 const task=f.begin(ref);assert.equal(workflowStatus(f.root,ref.workflowId).nodes.work.status,'reserved');assert.ok(task.contract.requiredAssets.includes('general:skill:demo'));
 loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo',mode:'chunk'},f.deployment);
 assert.deepEqual(f.event('PreToolUse'),{});writeFileSync(join(f.root,'result.md'),'new artifact');f.event('PostToolUse','call-a',{tool_response:{exit_code:0}});
 closeTask(f.root,{...f.key,artifacts:[{path:'result.md'}]},f.deployment);
 const run=workflowStatus(f.root,ref.workflowId);assert.equal(run.status,'succeeded');assert.equal(run.nodes.work.attempts[0].nativeTaskId,task.taskId);assert.equal(run.nodes.work.attempts[0].outputs.length,1);
});
test('workflow required assets, cancellation and unknown completion cannot be claimed successful',t=>{
 const f=fixture(t),ref=nativeWorkflow(f);f.begin(ref);
 assert.match(f.event('PreToolUse').hookSpecificOutput.permissionDecisionReason,/Required asset/);
 loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo',mode:'chunk'},f.deployment);
 f.event('PreToolUse','call-b');f.event('PostToolUse','call-b');writeFileSync(join(f.root,'result.md'),'artifact');
 closeTask(f.root,{...f.key,artifacts:[{path:'result.md'}]},f.deployment);assert.equal(workflowStatus(f.root,ref.workflowId).status,'needs_attention');
 const g=fixture(t),other=nativeWorkflow(g);g.begin(other);cancelWorkflow(g.root,other.workflowId);
 assert.match(g.event('PreToolUse').hookSpecificOutput.permissionDecisionReason,/cancelled/);
 writeFileSync(join(g.root,'result.md'),'cancel evidence');closeTask(g.root,{...g.key,artifacts:[{path:'result.md'}]},g.deployment);assert.equal(workflowStatus(g.root,other.workflowId).status,'cancelled');
});

test('task_begin delivers optional candidates, preserves cross-turn refusal and degrades corrupt trial state',t=>{
 const f=fixture(t);
 const candidate={id:'task-review',type:'role',version:'1.0.0',title:'Review role candidate',hypothesis:'May find missed defects',triggers:['frontend review'],exclude:['production'],scope:'One isolated review',validation:'Compare defect findings',expectedCost:'Five minutes',sources:[{kind:'research',url:'https://example.com/review/v1',revision:'v1'}],components:[],target:{kind:'pack',paths:['packs/role/reviewer']},eligibility:'reversible',status:'candidate'};
 const saved=registerCandidate(f.root,{candidate});
 const first=f.begin({candidateTaskKey:'logical-review',goal:'Perform frontend review'});assert.equal(first.candidateTrials.recommendations[0].sha256,saved.sha256);
 const input={taskKey:'logical-review',candidateId:candidate.id,sha256:saved.sha256};
 recordTrial(f.root,{...input,action:'offer',query:'frontend review',prompt:'Try this role?',reason:'Matches review task'});
 recordTrial(f.root,{...input,action:'decide',choice:'declined',userResponse:'Skip',responseSource:'user'});
 assert.equal(f.begin({candidateTaskKey:'logical-review',goal:'Perform frontend review'}).candidateTrials.recommendations.length,0);
 const native={...f.native,turn_id:'turn-next'};runCodexHook(native,f.deployment);
 const receipt=JSON.parse(readFileSync(join(f.root,'runtime/hooks/sessions',sha(native.session_id)+'.json'))).turns[native.turn_id].receipt;
 const next=beginTask(f.root,{...f.key,turnId:native.turn_id,receipt,role:'ai-engineer',goal:'Perform frontend review',allowedTools:[tool,close],maxToolCalls:2,candidateTaskKey:'logical-review'},f.deployment);
 assert.equal(next.candidateTrials.recommendations.length,0);
 const ledger=join(f.root,'runtime/personal/projects/example/experience/.avc/candidate-trials.json');writeFileSync(ledger,'broken');
 assert.equal(beginTask(f.root,{...f.key,turnId:native.turn_id,receipt,role:'ai-engineer',goal:'Perform frontend review',allowedTools:[tool,close],maxToolCalls:2,candidateTaskKey:'logical-review'},f.deployment).candidateTrials.taskContinues,true);
});

test('short-lived concurrent task writer does not lose Pre/Post observations',t=>{
 const f=fixture(t,'monitor'),task=f.begin(),lock=join(f.root,'runtime/execution/tasks',task.taskId+'.lock');
 const releaseSoon=()=>{mkdirSync(lock);const child=spawn(process.execPath,['-e','setTimeout(()=>require("node:fs").rmdirSync(process.argv[1]),150)',lock],{stdio:'ignore'});t.after(()=>child.kill());};
 releaseSoon();const pre=f.event('PreToolUse');assert.equal(pre.systemMessage,undefined);
 releaseSoon();const post=f.event('PostToolUse','call-a',{tool_response:{exit_code:0,output:'observed'}});assert.equal(post.systemMessage,undefined);
 const stored=JSON.parse(readFileSync(join(f.root,'runtime/execution/tasks',task.taskId+'.json')));assert.equal(stored.calls['call-a'].status,'observed');
});

test('cold directory EEXIST races accept only real directories',t=>{
 for (const kind of ['directory','symlink','file']) {
  const f=fixture(t,'monitor');
  const script=`const fs=require('node:fs'),{syncBuiltinESMExports}=require('node:module');
   const exists=fs.existsSync,target=require('node:path').join(process.argv[2],'runtime/execution');
   fs.existsSync=path=>{if(path===target&&!exists(path)){
    if(process.argv[5]==='directory')fs.mkdirSync(path);
    else if(process.argv[5]==='symlink')fs.symlinkSync(process.argv[2],path);
    else fs.writeFileSync(path,'file');
    return false;
   }return exists(path);};syncBuiltinESMExports();
   import(require('node:url').pathToFileURL(process.argv[1])).then(m=>{
    try{const task=m.beginTask(process.argv[2],JSON.parse(process.argv[3]),process.argv[4]);console.log(JSON.stringify({status:task.status}));}
    catch(error){console.log(JSON.stringify({error:error.message}));}
   });`;
  const child=spawnSync(process.execPath,['-e',script,fileURLToPath(new URL('./execution.js',import.meta.url)),f.root,JSON.stringify({...f.key,role:'ai-engineer',goal:'Cold directory fixture',allowedTools:[tool],maxToolCalls:2}),f.deployment,kind],{encoding:'utf8'});
  assert.equal(child.status,0,child.stderr);const result=JSON.parse(child.stdout);
  if(kind==='directory')assert.equal(result.status,'active');else assert.match(result.error,/Refusing symlink|Expected directory/);
 }
});

import { CONTEXT_LIMITS, deliverContext, contextStatus } from './context-budget.js';
test('preview does not satisfy full delivery; chunks reconstruct UTF-8 source with dedup and pinned cursors', t => {
 const f=fixture(t,'monitor'), source='# 标题\n'+'中文😀 evidence\n'.repeat(500);
 writeFileSync(join(f.root,'packs/skill/demo/SKILL.md'),source); f.begin();
 const input={...f.key,source:'general',type:'skill',name:'demo'};
 const preview=loadAsset(f.root,input,f.deployment); assert.equal(preview.previewOnly,true);assert.equal(preview.documentComplete,false);
 assert.ok(Buffer.byteLength(preview.content)<=2048);assert.ok(preview.headings[0].cursor);
 const repeated=loadAsset(f.root,input,f.deployment);assert.equal(repeated.contextDelivery,'already-delivered');assert.equal(repeated.content,'');
 let cursor=preview.nextCursor, reconstructed=''; let part;
 do {
  part=loadAsset(f.root,{...input,mode:'chunk',cursor,maxBytes:1024},f.deployment);
  assert.equal(part.contextDelivery,'delivered');assert.ok(!part.content.includes('�'));
  reconstructed+=part.content;cursor=part.nextCursor;
 }while(cursor);
 assert.equal(reconstructed,source);assert.equal(part.documentComplete,true);
 assert.equal(loadAsset(f.root,{...input,mode:'chunk',maxBytes:1024},f.deployment).contextDelivery,'already-delivered');
 writeFileSync(join(f.root,'packs/skill/demo/SKILL.md'),source+'changed');
 assert.throws(()=>loadAsset(f.root,{...input,mode:'chunk',cursor:preview.nextCursor},f.deployment),/Stale/);
});
test('shared cumulative budget withholds context without rejecting the authorized business tool',t=>{
 const f=fixture(t,'monitor');f.begin();
 for(let i=0;i<8;i++)deliverContext(f.root,f.key,'fill:'+i,'x'.repeat(8000));
 const result=loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo'},f.deployment);
 // Fill remaining space with individually small deliveries until optional content cannot fit.
 for(let i=0;i<20;i++)deliverContext(f.root,f.key,'tail:'+i,'x'.repeat(256));
 const dir=join(f.root,'packs/skill/demo');writeFileSync(join(dir,'README.md'),'x'.repeat(3000));
 const withheld=loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo',entry:'README.md'},f.deployment);
 assert.equal(withheld.contextDelivery,'budget-exhausted');assert.equal(withheld.content,'');assert.equal(withheld.taskContinues,true);
 assert.ok(contextStatus(f.root,f.key).turnBytes<=CONTEXT_LIMITS.turnBytes);assert.deepEqual(f.event('PreToolUse'),{});
});
test('corrupt context accounting reports unverified and business collection remains nonblocking',t=>{
 const f=fixture(t,'monitor');f.begin();
 const dir=join(f.root,'runtime/context');
 // A directory replacement simulates storage failure without faking a successful receipt.
 rmSync(dir,{recursive:true});writeFileSync(dir,'unavailable');
 const result=loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo'},f.deployment);
 assert.equal(result.contextDelivery,'unverified');assert.equal(result.content,'');assert.equal(result.taskContinues,true);
 assert.deepEqual(f.event('PreToolUse'),{});
});
test('explicit edit/delegation registration normalizes interface aliases without widening history or hiding real violations',t=>{
 const f=fixture(t,'monitor'),tools=['functions.exec_command',close],caps=['edit','delegation'];
 const task=f.begin({allowedTools:tools,toolCapabilities:caps,maxToolCalls:3});
 for(const native of ['Bash','apply_patch','collaborationinterrupt_agent']){
  assert.ok(task.contract.allowedTools.includes(native));assert.deepEqual(f.event('PreToolUse',native,{tool_name:native}),{});
  f.event('PostToolUse',native,{tool_name:native,tool_response:{exit_code:0}});
 }
 assert.equal(f.begin({allowedTools:tools,toolCapabilities:caps,maxToolCalls:3}).violations.length,0);
 f.event('PreToolUse','unexpected',{tool_name:'unregistered_tool'});
 assert.equal(f.begin({allowedTools:tools,toolCapabilities:caps,maxToolCalls:3}).violations.length,1);
 assert.throws(()=>f.begin({allowedTools:[...tools,'unregistered_tool'],toolCapabilities:caps,maxToolCalls:3}),/pinned/);
 const g=fixture(t),config=JSON.parse(readFileSync(g.deployment));config.projects[0].execution.allowedTools=['Bash',close];writeFileSync(g.deployment,JSON.stringify(config));
 assert.throws(()=>g.begin({allowedTools:['Bash',close],toolCapabilities:['edit']}),/deployment-approved/);
});
test('discovered untagged documents have a source-bound chunk path without granting adoption',t=>{
 const f=fixture(t,'monitor');mkdirSync(join(f.root,'rules'));const body='# 账号选择\n\n'+'创建 PR 前核对账号。\n'.repeat(50),id='general:document:rules/account.md';writeFileSync(join(f.root,'rules/account.md'),body);f.begin();
 let cursor,received='';do{const result=loadAsset(f.root,{...f.key,documentId:id,mode:'chunk',maxBytes:512,cursor},f.deployment);assert.equal(result.contextDelivery,'delivered');assert.equal(result.activation,'not-granted-by-read');received+=result.content;cursor=result.nextCursor;}while(cursor);
 assert.equal(received,body);assert.throws(()=>loadAsset(f.root,{...f.key,documentId:'general:document:rules/../../outside.md'},f.deployment),/Unsafe/);
 const preview=loadAsset(f.root,{...f.key,documentId:id},f.deployment);writeFileSync(join(f.root,'rules/account.md'),body+'changed');
 assert.throws(()=>loadAsset(f.root,{...f.key,documentId:id,mode:'chunk',cursor:preview.nextCursor},f.deployment),/Stale/);
});
test('public task control envelopes charge complete JSON and repeated task_begin does not resend the role profile',t=>{
 const f=fixture(t,'monitor'),input={...f.key,role:'ai-engineer',goal:'Read one role',allowedTools:[tool,close],maxToolCalls:2};
 const first=executionResponse(f.root,input,beginTask(f.root,input,f.deployment,{deferDelivery:true}));
 const second=executionResponse(f.root,input,beginTask(f.root,input,f.deployment,{deferDelivery:true}));
 assert.equal(first.roleProfileComplete,true);assert.equal(second.roleProfileComplete,false);assert.equal(second.roleProfile,'');
 assert.equal(contextStatus(f.root,f.key).turnBytes,Buffer.byteLength(JSON.stringify(first))+Buffer.byteLength(JSON.stringify(second)));
 const before=contextStatus(f.root,f.key).turnBytes,response=loadAsset(f.root,{...f.key,source:'general',type:'skill',name:'demo'},f.deployment);
 assert.equal(contextStatus(f.root,f.key).turnBytes-before,Buffer.byteLength(JSON.stringify(response)));
});
