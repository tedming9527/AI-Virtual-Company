import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, symlink, mkdir, unlink, open } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { supervise, status, cancel } from './supervisor-runtime.mjs';

const root = () => mkdtemp(path.join(os.tmpdir(), 'supervisor-test-'));
const task = (id, code, extra = {}) => ({ id, command: process.execPath, args: ['-e', code], ...extra });
const plan = (id, tasks, extra = {}) => ({ id, tasks, poll_ms: 10, timeout_ms: 5000, ...extra });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn) { for (let i = 0; i < 300; i++) { try { const v = await fn(); if (v) return v; } catch {} await sleep(10); } throw new Error('condition timed out'); }

test('success produces genuine exit receipt and bounded output without command persistence', async () => {
  const r = await root();
  const state = await supervise(plan('ok', [task('a', 'console.log("x".repeat(10000))')]), { root: r, max_output_bytes: 100 });
  assert.equal(state.status, 'succeeded'); assert.equal(state.tasks[0].exit_code, 0); assert.ok(state.tasks[0].pid);
  assert.equal((await readFile(path.join(r, 'tmp/supervision/ok/a.output.log'))).length, 100);
  const receipt = await readFile(path.join(r, 'inbox/session-events/supervision-ok.json'), 'utf8');
  assert.ok(!receipt.includes('console.log')); assert.ok(!receipt.includes('args')); assert.match(receipt, /model_execution_verified/);
});
test('failure blocks dependents but independent work runs and replaces freed concurrency slot', async () => {
  const r = await root();
  const s = await supervise(plan('deps', [task('slow', 'setTimeout(()=>{},400)'), task('fail', 'process.exit(2)'), task('dependent', 'process.exit(0)', { depends_on: ['fail'] }), task('replacement', 'process.exit(0)')], { max_concurrency: 2 }), { root: r });
  assert.equal(s.status, 'failed'); assert.equal(s.tasks[2].status, 'blocked'); assert.equal(s.tasks[2].pid, undefined);
  assert.ok(Date.parse(s.tasks[3].started_at) < Date.parse(s.tasks[0].finished_at));
});
test('timeout kills real TERM-resistant child and waits for exit', async () => {
  const r = await root();
  const s = await supervise(plan('timeout', [task('a', 'process.on("SIGTERM",()=>{});setInterval(()=>{},100)', { timeout_ms: 200 })]), { root: r, kill_grace_ms: 30 });
  assert.equal(s.tasks[0].status, 'timed_out'); assert.equal(s.tasks[0].signal, 'SIGKILL');
  assert.throws(() => process.kill(s.tasks[0].pid, 0), /ESRCH/);
});
test('cancel handshake, duplicate run protection and immutable completed id', async () => {
  const r = await root(), p = plan('cancel', [task('a', 'setInterval(()=>{},100)')]);
  const running = supervise(p, { root: r });
  await until(async () => (await status('cancel', { root: r })).tasks[0]?.status === 'running');
  await assert.rejects(supervise(p, { root: r }), /run_id_locked/);
  assert.equal((await cancel('cancel', { root: r })).status, 'cancel_requested');
  const s = await running; assert.equal(s.status, 'cancelled'); assert.equal(s.tasks[0].status, 'cancelled');
  assert.throws(() => process.kill(s.tasks[0].pid, 0), /ESRCH/);
  await assert.rejects(supervise(p, { root: r }), /run_id_already_used/);
});
test('stale status reports attention without modifying or killing process', async () => {
  const r = await root(), d = path.join(r, 'tmp/supervision/stale'); await mkdir(d, { recursive: true });
  const text = JSON.stringify({ schema_version: 1, adapter: 'local_process', id: 'stale', status: 'running', owner_pid: process.pid, created_at: '2000-01-01T00:00:00Z', last_progress_at: '2000-01-01T00:00:00Z', heartbeat_at: '2000-01-01T00:00:00Z', tasks: [] });
  await writeFile(path.join(d, 'state.json'), text);
  assert.equal((await status('stale', { root: r })).status, 'needs_attention');
  assert.equal(await readFile(path.join(d, 'state.json'), 'utf8'), text);
  assert.equal((await cancel('stale', { root: r })).status, 'needs_attention');
});
test('unsupported adapters, models and unmetered budgets block without spawning', async () => {
  for (const extra of [{ adapter: 'codex' }, { model: 'spark' }, { usage_limit_id: 'window' }, { budget_percent: 10 }]) {
    const r = await root(), s = await supervise(plan('blocked', [task('a', 'process.exit(99)')], extra), { root: r });
    assert.equal(s.status, 'blocked'); assert.equal(s.tasks.length, 0);
  }
});
test('path escapes and symlink directories rejected before spawning', async () => {
  const r = await root(), outside = await root(); await symlink(outside, path.join(r, 'linked'));
  for (const cwd of ['../', 'linked']) await assert.rejects(supervise(plan(cwd === 'linked' ? 'link' : 'escape', [task('a', '', { cwd })]), { root: r }), /path_outside_root|unsafe_directory/);
  const r2 = await root(); await symlink(outside, path.join(r2, 'tmp'));
  await assert.rejects(supervise(plan('x', [task('a', '')]), { root: r2 }), /unsafe_directory/);
});
test('output redacts credential formats even when writes split the value', async () => {
  const r = await root();
  await supervise(plan('redact', [task('a', 'process.stdout.write("token=ab"); setTimeout(()=>console.log("cdef"),20)')]), { root: r });
  const output = await readFile(path.join(r, 'tmp/supervision/redact/a.output.log'), 'utf8');
  assert.match(output, /REDACTED/); assert.ok(!output.includes('abcdef'));
});
test('SIGTERM on CLI runner gracefully terminates its real child', async () => {
  const r = await root(), file = path.join(r, 'plan.json');
  await writeFile(file, JSON.stringify(plan('signal', [task('a', 'setInterval(()=>{},100)')])));
  const cli = spawn(process.execPath, [fileURLToPath(new URL('./supervisor-runtime.mjs', import.meta.url)), 'run', '--plan', file], { env: { ...process.env, AI_VIRTUAL_COMPANY_ROOT: r }, stdio: 'ignore' });
  const done = new Promise(resolve => cli.once('exit', resolve));
  const s = await until(async () => { const s = await status('signal', { root: r }); return s.tasks[0]?.status === 'running' && s; });
  cli.kill('SIGTERM'); await done;
  assert.equal((await status('signal', { root: r })).status, 'cancelled');
  assert.throws(() => process.kill(s.tasks[0].pid, 0), /ESRCH/);
});
test('state and event symlinks or special files are rejected', async () => {
  const r = await root(), d = path.join(r, 'tmp/supervision/files'); await mkdir(d, { recursive: true });
  const target = path.join(r, 'sentinel'); await writeFile(target, 'untouched');
  await symlink(target, path.join(d, 'state.json'));
  await assert.rejects(status('files', { root: r }), /unsafe_file/);
  await unlink(path.join(d, 'state.json')); await mkdir(path.join(d, 'state.json'));
  await assert.rejects(status('files', { root: r }), /unsafe_file/);
  const e = path.join(r, 'tmp/supervision/events'); await mkdir(e);
  await symlink(target, path.join(e, 'events.jsonl'));
  await assert.rejects(supervise(plan('events', [task('a', 'setTimeout(()=>{},1000)')]), { root: r }), /unsafe_file/);
  assert.equal(await readFile(target, 'utf8'), 'untouched');
});
test('status rejects fabricated schema, id and running/success evidence', async () => {
  const r = await root(); const s = await supervise(plan('schema', [task('a', '')]), { root: r });
  for (const corrupt of [{ ...s, schema_version: 0 }, { ...s, id: 'other' }, { ...s, adapter: 'codex' }, { ...s, tasks: [{ id: 'a', status: 'madeup' }] }, { ...s, tasks: [{ id: 'a', status: 'running' }] }, { ...s, tasks: [{ id: 'a', status: 'succeeded', exit_code: 0 }] }]) {
    await writeFile(path.join(r, 'tmp/supervision/schema/state.json'), JSON.stringify(corrupt));
    await assert.rejects(status('schema', { root: r }), /invalid_/);
  }
});
test('heartbeats update state without generating unbounded poll events', async () => {
  const r = await root(); await supervise(plan('quiet', [task('a', 'setTimeout(()=>{},200)')]), { root: r });
  const events = (await readFile(path.join(r, 'tmp/supervision/quiet/events.jsonl'), 'utf8')).trim().split('\n');
  assert.equal(events.length, 4); assert.ok(events.every(e => !e.includes('heartbeat')));
});
test('close-time output IO failure rejects promptly and cleans up other children', async t => {
  const r = await root(); const handle = await open(path.join(r, 'probe'), 'w');
  const running = supervise(plan('io', [task('a', 'setTimeout(()=>console.log("hello"),150)'), task('b', 'setInterval(()=>{},100)')], { max_concurrency: 2 }), { root: r });
  const s = await until(async () => { const v = await status('io', { root: r }); return v.tasks.every(t => t.status === 'running') && v; });
  t.mock.method(Object.getPrototypeOf(handle), 'write', async () => { throw new Error('injected_output_failure'); });
  await assert.rejects(running, /injected_output_failure/);
  t.mock.restoreAll(); await handle.close();
  for (const child of s.tasks) assert.throws(() => process.kill(child.pid, 0), /ESRCH/);
});
test('spawn failure never signals an invalid PID', async () => {
  const r = await root();
  const s = await supervise(plan('missing', [{ id: 'a', command: '/definitely/missing/executable', args: [], timeout_ms: 1 }]), { root: r });
  assert.equal(s.status, 'failed'); assert.equal(s.tasks[0].reason, 'spawn_failed'); assert.equal(s.tasks[0].pid, undefined);
});
test('successful and failed leaders clean up surviving children in their own group', async () => {
  for (const exitCode of [0, 2]) {
    const r = await root();
    const code = `const {spawn}=require('node:child_process'); const child=spawn(process.execPath,['-e','setInterval(()=>{},100)'],{stdio:'ignore',detached:false}); console.log(child.pid); child.unref(); process.exitCode=${exitCode};`;
    const s = await supervise(plan('descendant', [task('a', code)]), { root: r, kill_grace_ms: 30 });
    assert.equal(s.status, exitCode === 0 ? 'succeeded' : 'failed');
    assert.equal(s.tasks[0].exit_code, exitCode);
    const childPid = Number((await readFile(path.join(r, 'tmp/supervision/descendant/a.output.log'), 'utf8')).trim());
    assert.ok(Number.isInteger(childPid) && childPid > 0);
    assert.throws(() => process.kill(childPid, 0), /ESRCH/);
  }
});
test('strict plan contract blocks unknown, nested and token constraints before execution', async () => {
  for (const extra of [{ max_tokens: 1 }, { contract: { max_tokens: 1 } }, { unexpected: true }, { tasks: [] }, { tasks: {} }, { tasks: [null] }]) {
    const r = await root(), marker = path.join(r, 'executed');
    const s = await supervise(plan('contract', [task('a', `require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad')`)], extra), { root: r });
    assert.equal(s.status, 'blocked');
    await assert.rejects(readFile(marker), { code: 'ENOENT' });
  }
  for (const extra of [{ max_tokens: 1 }, { contract: { model: 'spark' } }, { surprise: true }]) {
    const r = await root(), marker = path.join(r, 'executed');
    const s = await supervise(plan('task-contract', [task('a', `require('node:fs').writeFileSync(${JSON.stringify(marker)},'bad')`, extra)]), { root: r });
    assert.equal(s.status, 'blocked');
    assert.equal(s.reason, 'max_tokens' in extra ? 'meter_adapter_unavailable' : 'unsupported_plan_field');
    await assert.rejects(readFile(marker), { code: 'ENOENT' });
  }
});
