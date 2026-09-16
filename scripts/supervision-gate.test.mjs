import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { check, register } from './supervision-gate.mjs';
import { supervise, status } from './supervisor-runtime.mjs';

const root = () => mkdtemp(path.join(os.tmpdir(), 'supervision-gate-'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function running(rootDir, runId, code = 'setTimeout(()=>{},300)') {
  const promise = supervise({ id: runId, tasks: [{ id: 'job', command: process.execPath, args: ['-e', code] }], poll_ms: 10, timeout_ms: 5000 }, { root: rootDir });
  for (let i = 0; i < 100; i++) {
    try { if ((await status(runId, { root: rootDir })).tasks[0]?.status === 'running') return { promise, receipt: `supervision:${runId}/job` }; } catch {}
    await sleep(10);
  }
  throw new Error('runner_not_started');
}

test('unregistered tasks alert and cannot claim supervision', async t => {
  const dir = await root(); t.after(() => import('node:fs/promises').then(fs => fs.rm(dir, { recursive: true, force: true })));
  assert.deepEqual(await check('missing', { root: dir }), { task_id: 'missing', status: 'alert', alert: true, claim_allowed: false, reason: 'task_not_registered' });
});

test('only a live supervisor receipt can register and pass the claim gate', async t => {
  const dir = await root(); t.after(() => import('node:fs/promises').then(fs => fs.rm(dir, { recursive: true, force: true })));
  await assert.rejects(register('work', 'invented', { root: dir }), /unsupported_execution_receipt/);
  const active = await running(dir, 'live');
  const registered = await register('work', active.receipt, { root: dir, now: Date.parse('2026-09-16T00:00:00Z') });
  assert.equal(registered.claim_allowed, true);
  assert.equal((await check('work', { root: dir })).status, 'supervised');
  await active.promise;
  const ended = await check('work', { root: dir });
  assert.equal(ended.claim_allowed, false);
  assert.equal(ended.reason, 'execution_not_active');
});

test('stale heartbeat raises an alert and blocks a claim', async t => {
  const dir = await root(); t.after(() => import('node:fs/promises').then(fs => fs.rm(dir, { recursive: true, force: true })));
  const runDir = path.join(dir, 'tmp/supervision/stale'); await mkdir(runDir, { recursive: true });
  await writeFile(path.join(runDir, 'state.json'), JSON.stringify({ schema_version: 1, id: 'stale', adapter: 'local_process', status: 'running', owner_pid: process.pid, created_at: '2000-01-01T00:00:00Z', heartbeat_at: '2000-01-01T00:00:00Z', last_progress_at: '2000-01-01T00:00:00Z', tasks: [{ id: 'job', status: 'running', pid: process.pid, started_at: '2000-01-01T00:00:00Z' }] }));
  const registry = path.join(dir, 'tmp/supervision-registry'); await mkdir(registry);
  await writeFile(path.join(registry, 'work.json'), JSON.stringify({ schema: 'ted.supervision-registration.v1', task_id: 'work', receipt: 'supervision:stale/job', registered_at: '2026-09-16T00:00:00Z' }));
  const result = await check('work', { root: dir, stale_ms: 10 });
  assert.equal(result.reason, 'supervision_heartbeat_stale');
  assert.equal(result.claim_allowed, false);
});

test('duplicate registration and unsafe registry paths are refused', async t => {
  const dir = await root(); t.after(() => import('node:fs/promises').then(fs => fs.rm(dir, { recursive: true, force: true })));
  const active = await running(dir, 'once', 'setInterval(()=>{},100)');
  await register('work', active.receipt, { root: dir });
  await assert.rejects(register('work', active.receipt, { root: dir }), /already_registered/);
  await import('./supervisor-runtime.mjs').then(module => module.cancel('once', { root: dir })); await active.promise;
  const unsafe = await root(); t.after(() => import('node:fs/promises').then(fs => fs.rm(unsafe, { recursive: true, force: true })));
  await mkdir(path.join(unsafe, 'tmp')); await symlink(dir, path.join(unsafe, 'tmp/supervision-registry'));
  await assert.rejects(check('work', { root: unsafe }), /unsafe_directory/);
  assert.ok((await readFile(path.join(dir, 'tmp/supervision-registry/work.json'), 'utf8')).includes('ted.supervision-registration.v1'));
});
