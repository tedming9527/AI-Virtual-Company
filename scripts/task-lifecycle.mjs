#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { validState } from './supervisor-runtime.mjs';

export const SCHEMA = 'ted.tmp-task.v1';
const DAY = 86400000;
const terminal = new Set(['completed', 'cancelled', 'failed']);
const statuses = new Set(['queued', 'running', 'blocked', ...terminal]);
const safeId = value => typeof value === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const validReason = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 240 &&
  !/(?:bearer\s|(?:password|token|secret|api[_-]?key)\s*[:=]|sk-[a-zA-Z0-9]{12,})/i.test(value);
const validRunId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_.:/-]{0,199}$/.test(value);

// Local supervisor state is the evidence source, never the caller's receipt text.
function execution(root, receipt) {
  const m = /^supervision:([A-Za-z0-9][A-Za-z0-9_-]{0,79})\/([A-Za-z0-9][A-Za-z0-9_-]{0,79})$/.exec(receipt ?? '');
  if (!m) throw new Error('Unsupported execution receipt; use supervision:RUN_ID/TASK_ID');
  const file = path.join(root, 'tmp', 'supervision', m[1], 'state.json');
  inspect(file);
  const state = JSON.parse(fs.readFileSync(file, 'utf8'));
  validState(state, m[1]);
  const task = state.tasks.find(t => t.id === m[2]);
  if (!task) throw new Error('Execution task not found');
  const finished = new Set(['succeeded', 'failed', 'blocked', 'cancelled', 'timed_out']);
  if (!finished.has(state.status)) {
    if (!Number.isInteger(state.owner_pid) || state.owner_pid < 1 || !Number.isFinite(Date.parse(state.heartbeat_at)) || Math.abs(Date.now() - Date.parse(state.heartbeat_at)) > 10000) throw new Error('Supervisor unavailable or stale');
    try { process.kill(state.owner_pid, 0); } catch { throw new Error('Supervisor unavailable or stale'); }
  }
  if (task.status === 'running') {
    if (!Number.isInteger(task.pid) || task.pid < 1) throw new Error('Missing live execution PID');
    try { process.kill(task.pid, 0); } catch { throw new Error('Execution no longer live; await supervisor reconciliation'); }
  }
  return task;
}

// All tool operations cooperate through one lock. This is not an OS sandbox:
// untrusted concurrent filesystem writers must not have access to this root.
function inspect(target, recursive = false) {
  const absolute = path.resolve(target);
  let cursor = path.parse(absolute).root;
  for (const part of absolute.slice(cursor.length).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (!fs.existsSync(cursor) && !fs.lstatSync(cursor, { throwIfNoEntry: false })) return;
    if (fs.lstatSync(cursor).isSymbolicLink()) throw new Error(`Symlink refused: ${cursor}`);
  }
  const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
  if (stat && !stat.isDirectory() && !stat.isFile()) throw new Error(`Special file refused: ${absolute}`);
  if (recursive && stat?.isDirectory()) {
    for (const entry of fs.readdirSync(absolute)) inspect(path.join(absolute, entry), true);
  }
}
function mkdir(target) { inspect(target); fs.mkdirSync(target, { recursive: true }); }
function atomicJSON(target, data) {
  inspect(target);
  const temporary = `${target}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
    fs.renameSync(temporary, target);
  } finally {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
  }
}
function readTask(dir, expectedId) {
  inspect(dir, true);
  const task = JSON.parse(fs.readFileSync(path.join(dir, 'task.json'), 'utf8'));
  if (task.schema !== SCHEMA || !safeId(task.id) || (expectedId && task.id !== expectedId) ||
      !statuses.has(task.status) || !Number.isFinite(Date.parse(task.created_at)) ||
      !Number.isFinite(Date.parse(task.expires_at))) throw new Error('Unrecognized task schema or identity');
  if (task.external_run_id !== undefined && !validRunId(task.external_run_id)) throw new Error('Invalid external run ID');
  if (terminal.has(task.status) && (!validReason(task.reason) || !/^[a-f0-9]{64}$/.test(task.reason_sha256 ?? '') ||
      digest(task.reason) !== task.reason_sha256 || !Number.isFinite(Date.parse(task.closed_at)))) throw new Error('Invalid terminal task');
  if (task.status === 'completed' && (!validRunId(task.external_run_id) || !Number.isFinite(Date.parse(task.started_at)))) throw new Error('Completed task lacks execution receipt');
  return task;
}

export function run(args, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), now = Date.now() } = {}) {
  inspect(root);
  if (!fs.statSync(root).isDirectory()) throw new Error('Root must be a directory');
  const [command, ...rest] = args;
  if (!['create', 'start', 'status', 'block', 'close', 'cleanup'].includes(command)) throw new Error('Usage: create ID [--ttl-days 7] | start ID --receipt supervision:RUN_ID/TASK_ID | status ID | block ID --reason TEXT | close ID --status completed|cancelled|failed --reason TEXT | cleanup [--apply]');
  const id = command === 'cleanup' ? undefined : rest.shift();
  if (id !== undefined && !safeId(id)) throw new Error('Unsafe task ID');
  if (command !== 'cleanup' && !id) throw new Error('Task ID required');
  const options = {};
  const allowed = { create: ['--ttl-days'], start: ['--receipt'], status: [], block: ['--reason'], close: ['--status', '--reason'], cleanup: ['--apply'] }[command];
  while (rest.length) {
    const flag = rest.shift();
    if (!allowed.includes(flag) || Object.hasOwn(options, flag)) throw new Error(`Unexpected option: ${flag}`);
    if (flag === '--apply') options[flag] = true;
    else {
      if (!rest.length || rest[0].startsWith('--')) throw new Error(`Value required: ${flag}`);
      options[flag] = rest.shift();
    }
  }
  const tmp = path.join(root, 'tmp');
  const tasks = path.join(tmp, 'tasks');
  const quarantine = path.join(tmp, 'quarantine');
  const receipts = path.join(root, 'inbox', 'session-events');
  [tmp, tasks, quarantine, receipts].forEach(p => inspect(p));
  const saveReceipt = task => {
    mkdir(receipts);
    atomicJSON(path.join(receipts, `tmp-${task.id}.json`), {
      schema: 'ted.tmp-task-receipt.v1', id: `tmp-${task.id}`, task_id: task.id,
      created_at: task.created_at, closed_at: task.closed_at, status: task.status,
      started_at: task.started_at ?? null,
      duration_ms: task.started_at ? Date.parse(task.closed_at) - Date.parse(task.started_at) : null,
      reason: task.reason, reason_sha256: task.reason_sha256, external_run_id: task.external_run_id ?? null,
      model_verified: false, source: 'task-lifecycle',
    });
  };
  // Durable closeout receipts go to inbox/session-events only when the task actually
  // executed against an external supervised run (外部动作/可恢复持续任务, TASK_LIFECYCLE.md
  // "命中持久任务记录触发条件"). Never-started temporary cards write no receipt.
  const needsDurableReceipt = task => Boolean(task.external_run_id);
  const mutate = command !== 'status' && (command !== 'cleanup' || options['--apply']);
  let lock;
  const lockPath = path.join(tmp, '.task-lifecycle.lock');
  if (mutate) {
    mkdir(tmp);
    inspect(lockPath);
    try { lock = fs.openSync(lockPath, 'wx', 0o600); }
    catch (error) { if (error.code === 'EEXIST') throw new Error('Lifecycle lock conflict; inspect the owner before manually removing a stale lock'); throw error; }
  }
  try {
    if (lock !== undefined) fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, created_at: new Date(now).toISOString() }));
    if (command === 'cleanup') {
      const results = [];
      if (fs.existsSync(tasks)) for (const folder of fs.readdirSync(tasks).sort()) {
        try {
          if (!safeId(folder)) throw new Error('Unsafe task folder');
          const dir = path.join(tasks, folder);
          const task = readTask(dir, folder);
          if (Date.parse(task.expires_at) > now) continue;
          if (!terminal.has(task.status)) { results.push({ id: folder, action: 'needs_attention', status: task.status }); continue; }
          const destination = path.join(quarantine, `${folder}-${now}`);
          if (options['--apply']) {
            if (needsDurableReceipt(task)) saveReceipt(task); // Durable closeout only for externally-executed tasks.
            mkdir(quarantine);
            inspect(destination);
            if (fs.existsSync(destination)) throw new Error('Quarantine destination exists');
            fs.renameSync(dir, destination);
          }
          results.push({ id: folder, action: options['--apply'] ? 'quarantined' : 'would_quarantine' });
        } catch (error) { results.push({ id: folder, action: 'refused', error: error.message }); }
      }
      if (fs.existsSync(quarantine)) for (const folder of fs.readdirSync(quarantine).sort()) {
        try {
          const match = /^(.*)-(\d{13,})$/.exec(folder);
          if (!match || !safeId(match[1])) throw new Error('Unrecognized quarantine folder');
          const task = readTask(path.join(quarantine, folder), match[1]);
          if (!terminal.has(task.status)) throw new Error('Nonterminal quarantine task');
          if (Number(match[2]) + 7 * DAY <= now) results.push({ id: task.id, folder, action: 'purge_candidate', permanent_deletion: false });
        } catch (error) { results.push({ folder, action: 'refused', error: error.message }); }
      }
      return { dry_run: !options['--apply'], results };
    }
    const dir = path.join(tasks, id);
    inspect(dir, true);
    if (command === 'create') {
      const ttl = Number(options['--ttl-days'] ?? 7);
      if (!Number.isFinite(ttl) || ttl <= 0 || ttl > 3650) throw new Error('ttl-days must be > 0 and <= 3650');
      inspect(path.join(receipts, `tmp-${id}.json`));
      if (fs.existsSync(path.join(receipts, `tmp-${id}.json`))) throw new Error('Task ID already has a permanent receipt');
      mkdir(tasks);
      fs.mkdirSync(dir); // Exclusive: never overwrite an existing task.
      const task = { schema: SCHEMA, id, status: 'queued', created_at: new Date(now).toISOString(), expires_at: new Date(now + ttl * DAY).toISOString() };
      atomicJSON(path.join(dir, 'task.json'), task);
      return task;
    }
    const task = readTask(dir, id);
    if (command === 'status') {
      if (!task.external_run_id || terminal.has(task.status)) return task;
      try { return { ...task, recorded_status: task.status, execution_status: execution(root, task.external_run_id).status }; }
      catch { return { ...task, recorded_status: task.status, status: 'needs_attention', execution_status: 'unknown' }; }
    }
    if (command === 'start') {
      if (!['queued', 'blocked'].includes(task.status)) throw new Error('Only queued or blocked tasks can start');
      if (task.external_run_id) {
        const previous = execution(root, task.external_run_id);
        if (['queued', 'starting', 'running'].includes(previous.status)) throw new Error('Previous execution still active; cannot replace its receipt');
      }
      if (!validRunId(options['--receipt'])) throw new Error('receipt must be an external run ID, not credentials or raw output');
      const observed = execution(root, options['--receipt']);
      if (observed.status !== 'running') throw new Error('Execution must be observed running before attachment');
      task.status = 'running';
      task.external_run_id = options['--receipt'];
      task.model_verified = false;
      task.started_at = new Date(now).toISOString();
      delete task.blocked_at;
      delete task.block_reason;
    } else if (command === 'block') {
      if (!['queued', 'running'].includes(task.status)) throw new Error('Only queued or running tasks can block');
      if (task.external_run_id) {
        const previous = execution(root, task.external_run_id);
        if (['queued', 'starting', 'running'].includes(previous.status)) throw new Error('Execution still active; stop and confirm exit before blocking');
      }
      if (!validReason(options['--reason'])) throw new Error('Short reason required (1–240 characters); never include credentials');
      // State bookkeeping only; the caller is responsible for stopping external work.
      task.status = 'blocked';
      task.blocked_at = new Date(now).toISOString();
      task.block_reason = options['--reason'].trim();
    } else {
      if (!terminal.has(options['--status'])) throw new Error('Terminal status required');
      if (options['--status'] === 'completed' && (task.status !== 'running' || !validRunId(task.external_run_id))) throw new Error('Completion requires a running task with an external run ID');
      if (task.external_run_id) {
        const observed = execution(root, task.external_run_id);
        if (['queued', 'starting', 'running'].includes(observed.status)) throw new Error('Execution still active; request cancellation and await exit first');
        if (options['--status'] === 'completed' && observed.status !== 'succeeded') throw new Error('Completion requires observed successful exit');
      }
      if (!options['--reason']?.trim() || options['--reason'].length > 240) throw new Error('Reason required (1–240 characters); never include credentials');
      if (!validReason(options['--reason'])) throw new Error('Potential credential in reason refused');
      if (terminal.has(task.status)) throw new Error('Task already closed');
      task.status = options['--status'];
      task.closed_at = new Date(now).toISOString();
      task.reason = options['--reason'].trim();
      task.reason_sha256 = digest(task.reason);
      if (needsDurableReceipt(task)) saveReceipt(task);
    }
    atomicJSON(path.join(dir, 'task.json'), task);
    return task;
  } finally {
    if (lock !== undefined) { fs.closeSync(lock); fs.unlinkSync(lockPath); }
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { console.log(JSON.stringify(run(process.argv.slice(2)), null, 2)); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
