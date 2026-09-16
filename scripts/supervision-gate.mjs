#!/usr/bin/env node
// Evidence gate for company supervision claims. It does not discover Codex UI tasks.
import { mkdir, lstat, open, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { status as supervisorStatus } from './supervisor-runtime.mjs';

export const SCHEMA = 'ted.supervision-registration.v1';
const safeId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const receiptPattern = /^supervision:([A-Za-z0-9][A-Za-z0-9_-]{0,79})\/([A-Za-z0-9][A-Za-z0-9_-]{0,79})$/;
const exists = async target => { try { await lstat(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

async function safeDirectory(root, relative, create = false) {
  const target = path.resolve(root, relative);
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('path_outside_root');
  let cursor = root;
  for (const part of path.relative(root, target).split(path.sep).filter(Boolean)) {
    cursor = path.join(cursor, part);
    if (create) { try { await mkdir(cursor, { mode: 0o700 }); } catch (error) { if (error.code !== 'EEXIST') throw error; } }
    let stat;
    try { stat = await lstat(cursor); }
    catch (error) {
      if (!create && error.code === 'ENOENT') return target;
      throw error;
    }
    if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error('unsafe_directory');
  }
  return target;
}

async function readRegular(file) {
  const stat = await lstat(file);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe_registration_file');
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try { return await handle.readFile('utf8'); } finally { await handle.close(); }
}

async function location(root, taskId, create = false) {
  if (!safeId(taskId)) throw new Error('invalid_task_id');
  root = await realpath(root);
  const dir = await safeDirectory(root, 'tmp/supervision-registry', create);
  return { root, file: path.join(dir, `${taskId}.json`) };
}

function validateRegistration(value, taskId) {
  if (!value || value.schema !== SCHEMA || value.task_id !== taskId || !receiptPattern.test(value.receipt) || !Number.isFinite(Date.parse(value.registered_at))) throw new Error('invalid_registration');
  return value;
}

async function evidence(root, receipt, stale_ms) {
  const match = receiptPattern.exec(receipt);
  if (!match) return { status: 'alert', alert: true, claim_allowed: false, reason: 'unsupported_execution_receipt' };
  let run;
  try { run = await supervisorStatus(match[1], { root, stale_ms }); }
  catch { return { status: 'alert', alert: true, claim_allowed: false, reason: 'supervision_evidence_unavailable' }; }
  if (run.status === 'needs_attention') return { status: 'alert', alert: true, claim_allowed: false, reason: 'supervision_heartbeat_stale', run_id: match[1], execution_status: run.recorded_status };
  const task = run.tasks.find(item => item.id === match[2]);
  if (!task) return { status: 'alert', alert: true, claim_allowed: false, reason: 'execution_task_missing', run_id: match[1] };
  if (run.status === 'running' && task.status === 'running') return { status: 'supervised', alert: false, claim_allowed: true, reason: 'live_supervision_evidence', run_id: match[1], execution_task_id: match[2], heartbeat_at: run.heartbeat_at };
  return { status: 'alert', alert: true, claim_allowed: false, reason: 'execution_not_active', run_id: match[1], execution_task_id: match[2], execution_status: task.status };
}

export async function check(taskId, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), stale_ms = 10000 } = {}) {
  const loc = await location(root, taskId);
  if (!await exists(loc.file)) return { task_id: taskId, status: 'alert', alert: true, claim_allowed: false, reason: 'task_not_registered' };
  let registration;
  try { registration = validateRegistration(JSON.parse(await readRegular(loc.file)), taskId); }
  catch { return { task_id: taskId, status: 'alert', alert: true, claim_allowed: false, reason: 'registration_invalid' }; }
  return { task_id: taskId, registered_at: registration.registered_at, receipt: registration.receipt, ...await evidence(loc.root, registration.receipt, stale_ms) };
}

export async function register(taskId, receipt, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), stale_ms = 10000, now = Date.now() } = {}) {
  if (!receiptPattern.test(receipt ?? '')) throw new Error('unsupported_execution_receipt');
  const loc = await location(root, taskId, true);
  if (await exists(loc.file)) throw new Error('task_already_registered');
  const observed = await evidence(loc.root, receipt, stale_ms);
  if (!observed.claim_allowed) throw new Error(`registration_requires_live_supervision:${observed.reason}`);
  const registration = { schema: SCHEMA, task_id: taskId, receipt, registered_at: new Date(now).toISOString() };
  const temporary = `${loc.file}.${process.pid}.new`;
  await writeFile(temporary, JSON.stringify(registration, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  try { await rename(temporary, loc.file); } catch (error) { throw error; }
  return { ...registration, ...observed };
}

async function main() {
  const [command, taskId, ...rest] = process.argv.slice(2);
  let result;
  if (command === 'register' && rest.length === 2 && rest[0] === '--receipt') result = await register(taskId, rest[1]);
  else if ((command === 'check' || command === 'assert-supervised') && rest.length === 0) result = await check(taskId);
  else throw new Error('usage: supervision-gate.mjs register TASK_ID --receipt supervision:RUN_ID/TASK_ID | check TASK_ID | assert-supervised TASK_ID');
  console.log(JSON.stringify(result, null, 2));
  if (!result.claim_allowed) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ status: 'alert', alert: true, claim_allowed: false, reason: error.message }));
  process.exitCode = 2;
});
