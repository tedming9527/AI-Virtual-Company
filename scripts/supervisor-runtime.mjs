#!/usr/bin/env node
// Explicitly invoked local processes only. This is not a model execution adapter.
import { mkdir, lstat, realpath, readFile, writeFile, rename, open, unlink } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const terminal = new Set(['succeeded', 'failed', 'blocked', 'cancelled', 'timed_out']);
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const now = () => new Date().toISOString();
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const exists = async p => { try { await lstat(p); return true; } catch (e) { if (e.code === 'ENOENT') return false; throw e; } };
const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
function redactOutput(text) {
  for (const [key, value] of Object.entries(process.env)) {
    if (/token|secret|password|credential|api.?key/i.test(key) && value && value.length >= 4) text = text.split(value).join('[REDACTED]');
  }
  return text.replace(/\b(Bearer\s+)\S+/gi, '$1[REDACTED]')
    .replace(/((?:password|token|secret|api[_-]?key)\s*[=:]\s*)[^\s,;]+/gi, '$1[REDACTED]');
}

// Refuse symlinks even when they currently point inside root. Not an OS sandbox:
// callers must trust commands and prevent concurrent directory replacement.
async function safePath(root, relative, create = false) {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('path_outside_root');
  let cursor = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (create) { try { await mkdir(cursor, { mode: 0o700 }); } catch (e) { if (e.code !== 'EEXIST') throw e; } }
    const stat = await lstat(cursor);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('unsafe_directory');
  }
  return target;
}
async function atomic(file, value) {
  if (await exists(file)) await regularFile(file);
  const temp = `${file}.${process.pid}.new`;
  await writeFile(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  await rename(temp, file);
}
async function regularFile(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe_file');
}
async function openRegular(file, flags) {
  if (await exists(file)) await regularFile(file);
  const handle = await open(file, flags | constants.O_NOFOLLOW | constants.O_NONBLOCK, 0o600);
  if (!(await handle.stat()).isFile()) { await handle.close(); throw new Error('unsafe_file'); }
  return handle;
}
export function validState(state, id) {
  const states = new Set([...terminal, 'queued', 'starting', 'running']);
  const timestamp = t => typeof t === 'string' && Number.isFinite(Date.parse(t));
  if (!state || state.schema_version !== 1 || state.id !== id || state.adapter !== 'local_process' || !states.has(state.status) || !Number.isInteger(state.owner_pid) || state.owner_pid <= 0 || !timestamp(state.created_at) || !timestamp(state.heartbeat_at) || !timestamp(state.last_progress_at) || !Array.isArray(state.tasks)) throw new Error('invalid_state');
  const ids = new Set();
  for (const task of state.tasks) {
    if (!task || !safeId(task.id) || ids.has(task.id) || !states.has(task.status)) throw new Error('invalid_task_state');
    ids.add(task.id);
    if (task.status === 'running' && (!Number.isInteger(task.pid) || task.pid <= 0 || !timestamp(task.started_at))) throw new Error('invalid_running_evidence');
    if (task.status === 'succeeded' && (task.exit_code !== 0 || !Number.isInteger(task.pid) || task.pid <= 0 || !timestamp(task.started_at) || !timestamp(task.finished_at))) throw new Error('invalid_success_evidence');
  }
  if (state.status === 'succeeded' && (!state.tasks.length || state.tasks.some(t => t.status !== 'succeeded'))) throw new Error('invalid_success_state');
  if (terminal.has(state.status) && !timestamp(state.finished_at)) throw new Error('invalid_terminal_state');
}
async function location(root, id, create = false) {
  if (!safeId(id)) throw new Error('invalid_run_id');
  root = await realpath(root);
  return { root, dir: await safePath(root, `tmp/supervision/${id}`, create) };
}
export async function status(id, { root = process.cwd(), stale_ms = 10000 } = {}) {
  const { dir } = await location(root, id);
  const handle = await openRegular(path.join(dir, 'state.json'), constants.O_RDONLY);
  let state;
  try { state = JSON.parse(await handle.readFile('utf8')); } finally { await handle.close(); }
  validState(state, id);
  if (!terminal.has(state.status) && (!Number.isInteger(state.owner_pid) || state.owner_pid < 1 || !alive(state.owner_pid) || Date.now() - Date.parse(state.heartbeat_at) > stale_ms || !Number.isFinite(Date.parse(state.heartbeat_at)))) {
    return { ...state, status: 'needs_attention', recorded_status: state.status, reason: 'runner_unavailable_or_stale; confirm old execution stopped before using a new run id' };
  }
  return state;
}
export async function cancel(id, options = {}) {
  const state = await status(id, options);
  if (terminal.has(state.status) || state.status === 'needs_attention') return state;
  const { dir } = await location(options.root || process.cwd(), id);
  try { await writeFile(path.join(dir, 'cancel.request'), now(), { flag: 'wx', mode: 0o600 }); } catch (e) { if (e.code !== 'EEXIST') throw e; }
  return { id, status: 'cancel_requested' };
}

function unsupported(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan)) return 'invalid_plan';
  const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
  if (!Array.isArray(plan.tasks) || !plan.tasks.length || tasks.some(t => !t || typeof t !== 'object' || Array.isArray(t))) return 'invalid_tasks';
  if (plan.adapter && plan.adapter !== 'local_process') return 'unsupported_adapter';
  const requestsModel = object => Object.keys(object).some(k => /model/i.test(k));
  if (requestsModel(plan) || tasks.some(requestsModel)) return 'unsupported_model';
  const requestsMeter = object => Object.keys(object).some(k => /budget|quota|usage|meter|token|credit|cost|spend/i.test(k));
  if (requestsMeter(plan) || tasks.some(requestsMeter)) return 'meter_adapter_unavailable';
  if (tasks.some(t => t.adapter && t.adapter !== 'local_process')) return 'unsupported_adapter';
  const topKeys = new Set(['id', 'adapter', 'max_concurrency', 'poll_ms', 'timeout_ms', 'tasks']);
  const taskKeys = new Set(['id', 'command', 'args', 'cwd', 'depends_on', 'timeout_ms', 'adapter']);
  if (Object.keys(plan).some(k => !topKeys.has(k)) || tasks.some(t => Object.keys(t).some(k => !taskKeys.has(k)))) return 'unsupported_plan_field';
  return null;
}
function validate(plan) {
  if (!Array.isArray(plan.tasks) || !plan.tasks.length) throw new Error('tasks_required');
  for (const [key, fallback, min, max] of [['max_concurrency', 1, 1, 64], ['poll_ms', 100, 10, 1000], ['timeout_ms', 3600000, 1, 2147483647]]) {
    plan[key] ??= fallback;
    if (!Number.isInteger(plan[key]) || plan[key] < min || plan[key] > max) throw new Error(`invalid_${key}`);
  }
  const ids = new Set();
  for (const t of plan.tasks) {
    if (!safeId(t.id) || ids.has(t.id)) throw new Error('invalid_or_duplicate_task_id');
    ids.add(t.id);
    if (typeof t.command !== 'string' || !t.command || /\s/.test(t.command) && !path.isAbsolute(t.command) || !Array.isArray(t.args) || t.args.some(a => typeof a !== 'string') || t.command.includes('\0') || t.args.some(a => a.includes('\0'))) throw new Error('command_and_string_args_required');
    if (t.timeout_ms !== undefined && (!Number.isInteger(t.timeout_ms) || t.timeout_ms < 1 || t.timeout_ms > 2147483647)) throw new Error('invalid_task_timeout');
    if (t.depends_on !== undefined && !Array.isArray(t.depends_on)) throw new Error('invalid_dependencies');
  }
  const visited = new Set(), active = new Set();
  function visit(t) {
    if (active.has(t.id)) throw new Error('dependency_cycle');
    if (visited.has(t.id)) return;
    active.add(t.id);
    for (const id of t.depends_on || []) { if (!ids.has(id)) throw new Error('unknown_dependency'); visit(plan.tasks.find(x => x.id === id)); }
    active.delete(t.id); visited.add(t.id);
  }
  plan.tasks.forEach(visit);
}

export async function supervise(input, { root = process.cwd(), kill_grace_ms = 250, max_output_bytes = 65536 } = {}) {
  const plan = structuredClone(input);
  const loc = await location(root, plan.id, true); root = loc.root;
  const dir = loc.dir, lockPath = path.join(dir, 'run.lock');
  const lock = await open(lockPath, 'wx', 0o600).catch(e => { if (e.code === 'EEXIST') throw new Error('run_id_locked; do not resume stale processes automatically'); throw e; });
  const children = new Map();
  let stopping = null;
  const onSignal = () => { stopping = 'cancelled'; };
  const state = { schema_version: 1, id: plan.id, adapter: 'local_process', status: 'queued', owner_pid: process.pid, created_at: now(), heartbeat_at: now(), last_progress_at: now(), tasks: [] };
  let runtimeError;
  let events = Promise.resolve();
  const event = (type, detail = {}) => { events = events.then(async () => {
    const handle = await openRegular(path.join(dir, 'events.jsonl'), constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT);
    try { await handle.appendFile(JSON.stringify({ at: now(), type, ...detail }) + '\n'); } finally { await handle.close(); }
  }).catch(error => { runtimeError ||= error; }); };
  const save = async () => { state.heartbeat_at = now(); await atomic(path.join(dir, 'state.json'), state); await events; if (runtimeError) throw runtimeError; };
  const change = (task, next, reason) => { task.status = next; if (reason) task.reason = reason; state.last_progress_at = now(); event('task_state', { task_id: task.id, status: next, ...(reason ? { reason } : {}) }); };
  const groupAlive = entry => {
    if (process.platform === 'win32' || !Number.isInteger(entry.child.pid) || entry.child.pid <= 0) return false;
    try { process.kill(-entry.child.pid, 0); return true; } catch (e) { if (e.code === 'ESRCH') return false; throw e; }
  };
  const stopChild = (entry, reason) => {
    if (entry.cleanupStarted) return;
    entry.cleanupStarted = true;
    entry.stopping = reason;
    if (!Number.isInteger(entry.child.pid) || entry.child.pid <= 0) return;
    const signal = name => { try { if (process.platform === 'win32') entry.child.kill(name); else process.kill(-entry.child.pid, name); } catch (e) { if (e.code !== 'ESRCH') runtimeError ||= e; } };
    signal('SIGTERM');
    // Keep cleanup active even if the group leader exits before its descendants.
    entry.stopDone = new Promise(resolve => { entry.killTimer = setTimeout(() => { signal('SIGKILL'); resolve(); }, kill_grace_ms); });
  };
  try {
    // IDs are immutable even after completion: accidental retries cannot repeat side effects.
    if (await exists(path.join(dir, 'state.json'))) throw new Error('run_id_already_used');
    const reason = unsupported(plan);
    if (reason) { state.status = 'blocked'; state.reason = reason; }
    else {
      validate(plan);
      for (const t of plan.tasks) t.resolvedCwd = await safePath(root, t.cwd || '.');
      state.tasks = plan.tasks.map(t => ({ id: t.id, status: 'queued' }));
      process.on('SIGINT', onSignal); process.on('SIGTERM', onSignal);
      const started = Date.now();
      await save();
      while (state.tasks.some(t => !terminal.has(t.status))) {
        if (await exists(path.join(dir, 'cancel.request'))) { await regularFile(path.join(dir, 'cancel.request')); stopping = 'cancelled'; }
        if (!stopping && Date.now() - started >= plan.timeout_ms) stopping = 'timed_out';
        for (const entry of children.values()) if (stopping || Date.now() - entry.started >= entry.timeout) stopChild(entry, stopping || 'timed_out');
        for (let i = 0; i < plan.tasks.length; i++) {
          const spec = plan.tasks[i], task = state.tasks[i];
          if (task.status !== 'queued') continue;
          const deps = (spec.depends_on || []).map(id => state.tasks.find(t => t.id === id));
          if (stopping) { change(task, stopping); continue; }
          if (deps.some(d => terminal.has(d.status) && d.status !== 'succeeded')) { change(task, 'blocked', 'dependency_unsuccessful'); continue; }
          if (children.size >= plan.max_concurrency || deps.some(d => d.status !== 'succeeded')) continue;
          const output = await open(path.join(dir, `${task.id}.output.log`), 'wx', 0o600);
          change(task, 'starting');
          let bytes = 0;
          const chunks = [];
          const child = spawn(spec.command, spec.args, { cwd: spec.resolvedCwd, shell: false, detached: process.platform !== 'win32', stdio: ['ignore', 'pipe', 'pipe'] });
          const entry = { child, started: Date.now(), timeout: spec.timeout_ms || plan.timeout_ms, stopping: null, done: null };
          children.set(task.id, entry);
          const consume = chunk => { const clipped = chunk.subarray(0, Math.max(0, max_output_bytes - bytes)); bytes += clipped.length; if (clipped.length) chunks.push(clipped); };
          child.stdout.on('data', consume); child.stderr.on('data', consume);
          entry.done = new Promise(resolve => {
            child.once('spawn', () => { task.pid = child.pid; task.started_at = now(); change(task, 'running'); state.status = 'running'; });
            child.once('error', () => { entry.spawnError = true; });
            child.once('close', async (code, signal) => {
              try {
              // A successful leader can leave unref'ed descendants in its group.
              // Reap that group before reporting any terminal result. Descendants
              // which deliberately setsid()/detach escape this local guarantee.
              if (!entry.stopDone && groupAlive(entry)) stopChild(entry, null);
              if (entry.stopDone) await entry.stopDone;
              const cleanupDeadline = Date.now() + 2000;
              while (groupAlive(entry) && Date.now() < cleanupDeadline) await delay(20);
              if (groupAlive(entry)) throw new Error('process_group_cleanup_unconfirmed');
              const redacted = Buffer.from(redactOutput(Buffer.concat(chunks).toString('utf8'))).subarray(0, max_output_bytes);
              await output.write(redacted); await output.close();
              task.exit_code = code; task.signal = signal; task.finished_at = now(); task.output_bytes = redacted.length;
              change(task, entry.stopping || (code === 0 && !entry.spawnError ? 'succeeded' : 'failed'), entry.spawnError ? 'spawn_failed' : undefined);
              } catch (error) {
                runtimeError ||= error;
                change(task, 'failed', error.message === 'process_group_cleanup_unconfirmed' ? 'process_group_cleanup_unconfirmed' : 'output_io_failed');
              } finally {
                await output.close().catch(error => { runtimeError ||= error; });
                children.delete(task.id); resolve();
              }
            });
          });
        }
        await save();
        if (state.tasks.some(t => !terminal.has(t.status))) await delay(plan.poll_ms);
      }
      state.status = stopping || (state.tasks.every(t => t.status === 'succeeded') ? 'succeeded' : state.tasks.some(t => t.status === 'timed_out') ? 'timed_out' : 'failed');
    }
    state.finished_at = now(); event('run_finished', { status: state.status }); await save();
    const receipts = await safePath(root, 'inbox/session-events', true);
    await atomic(path.join(receipts, `supervision-${plan.id}.json`), { id: `supervision-${plan.id}`, created_at: state.created_at, source: 'local_process_supervisor', status: state.status, finished_at: state.finished_at, reason: state.reason, tasks: state.tasks.map(({ id, status, exit_code, reason }) => ({ id, status, exit_code, reason })), evidence: `tmp/supervision/${plan.id}/state.json`, model_execution_verified: false, usage: 'unknown' });
    return state;
  } finally {
    for (const entry of children.values()) stopChild(entry, 'cancelled');
    await Promise.all([...children.values()].map(e => e.done));
    process.removeListener('SIGINT', onSignal); process.removeListener('SIGTERM', onSignal);
    await lock.close(); await unlink(lockPath);
  }
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  const root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd();
  let result;
  if (action === 'run' && args.length === 2 && args[0] === '--plan') result = await supervise(JSON.parse(await readFile(args[1], 'utf8')), { root });
  else if (action === 'status' && args.length === 1) result = await status(args[0], { root });
  else if (action === 'cancel' && args.length === 1) result = await cancel(args[0], { root });
  else throw new Error('usage: supervisor-runtime.mjs run --plan FILE | status ID | cancel ID');
  console.log(JSON.stringify(result, null, 2));
  if (['failed', 'blocked', 'timed_out', 'needs_attention'].includes(result.status)) process.exitCode = 1;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(() => { console.error('supervisor request failed; check plan, paths, and run lock (commands/output omitted)'); process.exitCode = 1; });
