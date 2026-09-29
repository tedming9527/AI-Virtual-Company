#!/usr/bin/env node
import { createHash, randomBytes, verify as verifySignature } from 'node:crypto';
import { constants } from 'node:fs';
import { link, lstat, mkdir, open, readFile, realpath, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIREMENT_SCHEMA = 'ted.employee-participation-requirement.v1';
export const RECEIPT_SCHEMA = 'ted.employee-participation-receipt.v1';
const safeTaskId = value => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(value);
const digestPattern = /^sha256:[a-f0-9]{64}$/;
const employeePattern = /^ted:employee:[a-z][a-z0-9-]*$/;
const kinds = new Set(['owner', 'implementation', 'review', 'consult']);
const exists = async target => { try { await lstat(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } };

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
}

export const sha256 = value => `sha256:${createHash('sha256').update(value).digest('hex')}`;

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
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe_file');
  const handle = await open(file, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  try { return await handle.readFile('utf8'); } finally { await handle.close(); }
}

async function readJson(file) {
  return JSON.parse(await readRegular(file));
}

async function atomicJson(file, value) {
  const temporary = `${file}.${process.pid}.${randomBytes(4).toString('hex')}.new`;
  await writeFile(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  try { await link(temporary, file); }
  finally { await unlink(temporary).catch(() => {}); }
}

async function location(root, taskId, create = false) {
  if (!safeTaskId(taskId)) throw new Error('invalid_task_id');
  root = await realpath(root);
  const dir = await safeDirectory(root, `tmp/employee-participation/${taskId}`, create);
  const receipts = await safeDirectory(root, `tmp/employee-participation/${taskId}/receipts`, create);
  return { root, dir, receipts, requirement: path.join(dir, 'requirement.json') };
}

async function registries(root) {
  const identities = await readJson(path.join(root, 'employees/IDENTITIES.json'));
  const adapters = await readJson(path.join(root, 'platforms/EMPLOYEE_EXECUTION_ADAPTERS.json'));
  if (identities.schema !== 'ted.employee-identities.v1' || adapters.schema !== 'ted.employee-execution-adapters.v1') throw new Error('unsupported_registry_schema');
  return { identities: new Map(identities.employees.map(item => [item.employee_id, item])), adapters: new Map(adapters.adapters.map(item => [item.adapter_id, item])) };
}

function validateParticipant(item, identities) {
  if (!item || !employeePattern.test(item.employee_id ?? '') || !kinds.has(item.participation_kind)) throw new Error('invalid_participant');
  const identity = identities.get(item.employee_id);
  if (!identity || identity.status !== 'active' || identity.role_id !== item.role_id) throw new Error('employee_identity_not_active');
}

function validateRequirement(value, taskId, identities) {
  const allowed = new Set(['schema', 'task_id', 'created_at', 'request_digest', 'context_manifest_digest', 'participants']);
  if (!value || value.schema !== REQUIREMENT_SCHEMA || value.task_id !== taskId || Object.keys(value).some(key => !allowed.has(key)) || !Number.isFinite(Date.parse(value.created_at)) || !digestPattern.test(value.request_digest ?? '') || !digestPattern.test(value.context_manifest_digest ?? '') || !Array.isArray(value.participants) || value.participants.length === 0) throw new Error('invalid_requirement');
  const seen = new Set();
  for (const item of value.participants) {
    validateParticipant(item, identities);
    if (!/^[a-f0-9]{32}$/.test(item.nonce ?? '')) throw new Error('invalid_requirement');
    const key = `${item.employee_id}\0${item.participation_kind}`;
    if (seen.has(key)) throw new Error('invalid_requirement');
    seen.add(key);
  }
  return value;
}

export async function requireParticipation(taskId, { request_digest, context_manifest_digest, participants }, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), now = Date.now() } = {}) {
  if (!digestPattern.test(request_digest ?? '') || !digestPattern.test(context_manifest_digest ?? '') || !Array.isArray(participants) || participants.length === 0) throw new Error('invalid_requirement');
  const loc = await location(root, taskId, true);
  if (await exists(loc.requirement)) throw new Error('requirement_already_frozen');
  const { identities } = await registries(loc.root);
  const seen = new Set();
  const frozen = participants.map(item => {
    validateParticipant(item, identities);
    const key = `${item.employee_id}\0${item.participation_kind}`;
    if (seen.has(key)) throw new Error('duplicate_participant');
    seen.add(key);
    return { employee_id: item.employee_id, role_id: item.role_id, participation_kind: item.participation_kind, nonce: randomBytes(16).toString('hex') };
  });
  const requirement = { schema: REQUIREMENT_SCHEMA, task_id: taskId, created_at: new Date(now).toISOString(), request_digest, context_manifest_digest, participants: frozen };
  await atomicJson(loc.requirement, requirement);
  return requirement;
}

function validateReceiptShape(receipt) {
  const required = ['receipt_id', 'task_id', 'employee_id', 'role_id', 'participation_kind', 'adapter_id', 'adapter_run_id', 'issued_at', 'expires_at', 'nonce', 'request_digest', 'context_manifest_digest', 'output_digest', 'artifact_refs', 'key_id', 'signature'];
  if (!receipt || receipt.schema !== RECEIPT_SCHEMA || required.some(key => !(key in receipt))) throw new Error('invalid_receipt');
  const allowed = new Set(['schema', ...required]);
  if (Object.keys(receipt).some(key => !allowed.has(key))) throw new Error('invalid_receipt');
  if (!safeTaskId(receipt.task_id) || !employeePattern.test(receipt.employee_id) || !kinds.has(receipt.participation_kind) || !digestPattern.test(receipt.request_digest) || !digestPattern.test(receipt.context_manifest_digest) || !digestPattern.test(receipt.output_digest)) throw new Error('invalid_receipt');
  if (!Array.isArray(receipt.artifact_refs) || receipt.artifact_refs.length === 0 || receipt.artifact_refs.length > 20 || receipt.artifact_refs.some(item => !item || typeof item.ref !== 'string' || !item.ref.trim() || item.ref.length > 300 || !digestPattern.test(item.digest ?? '') || Object.keys(item).some(key => !['ref', 'digest'].includes(key))) || !/^[a-f0-9]{32}$/.test(receipt.nonce) || !Number.isFinite(Date.parse(receipt.issued_at)) || !Number.isFinite(Date.parse(receipt.expires_at))) throw new Error('invalid_receipt');
}

function verifyReceipt(receipt, requirement, registriesValue, now) {
  validateReceiptShape(receipt);
  if (receipt.task_id !== requirement.task_id || receipt.request_digest !== requirement.request_digest || receipt.context_manifest_digest !== requirement.context_manifest_digest) throw new Error('receipt_binding_mismatch');
  const expected = requirement.participants.find(item => item.employee_id === receipt.employee_id && item.role_id === receipt.role_id && item.participation_kind === receipt.participation_kind);
  if (!expected || receipt.nonce !== expected.nonce) throw new Error('participant_or_nonce_mismatch');
  const identity = registriesValue.identities.get(receipt.employee_id);
  if (!identity || identity.status !== 'active' || identity.role_id !== receipt.role_id) throw new Error('employee_identity_not_active');
  const adapter = registriesValue.adapters.get(receipt.adapter_id);
  if (!adapter || adapter.status !== 'verified' || adapter.verification !== 'ed25519') throw new Error('trusted_employee_adapter_unavailable');
  if (!adapter.employee_ids.includes(receipt.employee_id) || adapter.key_id !== receipt.key_id || typeof adapter.public_key_pem !== 'string') throw new Error('adapter_not_authorized_for_employee');
  const issued = Date.parse(receipt.issued_at), expires = Date.parse(receipt.expires_at);
  if (issued > now + 30_000 || expires <= now || expires <= issued || expires - issued > adapter.max_receipt_age_ms) throw new Error('receipt_expired_or_invalid_time');
  const unsigned = { ...receipt }; delete unsigned.signature;
  let signature;
  try { signature = Buffer.from(receipt.signature, 'base64'); } catch { throw new Error('invalid_signature'); }
  if (!verifySignature(null, Buffer.from(canonical(unsigned)), adapter.public_key_pem, signature)) throw new Error('invalid_signature');
  return true;
}

export async function submitReceipt(taskId, receipt, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), now = Date.now() } = {}) {
  const loc = await location(root, taskId, true);
  if (!await exists(loc.requirement)) throw new Error('requirement_missing');
  const requirement = await readJson(loc.requirement);
  const registry = await registries(loc.root);
  validateRequirement(requirement, taskId, registry.identities);
  verifyReceipt(receipt, requirement, registry, now);
  const target = path.join(loc.receipts, `${sha256(`${receipt.employee_id}\0${receipt.participation_kind}`).slice(7, 31)}.json`);
  if (await exists(target)) throw new Error('receipt_replay_or_duplicate');
  await atomicJson(target, receipt);
  return { task_id: taskId, employee_id: receipt.employee_id, participation_kind: receipt.participation_kind, employee_participation_verified: true, claim_allowed: true };
}

export async function checkParticipation(taskId, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), now = Date.now() } = {}) {
  const loc = await location(root, taskId);
  if (!await exists(loc.requirement)) return { task_id: taskId, employee_participation_verified: false, claim_allowed: false, reason: 'participation_requirement_missing' };
  let requirement, registry;
  try {
    registry = await registries(loc.root);
    requirement = validateRequirement(await readJson(loc.requirement), taskId, registry.identities);
  }
  catch (error) { return { task_id: taskId, employee_participation_verified: false, claim_allowed: false, reason: error.message === 'invalid_requirement' ? 'invalid_requirement' : 'participation_evidence_unavailable' }; }
  for (const participant of requirement.participants) {
    const name = `${sha256(`${participant.employee_id}\0${participant.participation_kind}`).slice(7, 31)}.json`;
    const file = path.join(loc.receipts, name);
    if (!await exists(file)) return { task_id: taskId, employee_participation_verified: false, claim_allowed: false, reason: 'required_employee_receipt_missing', missing: { employee_id: participant.employee_id, participation_kind: participant.participation_kind } };
    try { verifyReceipt(await readJson(file), requirement, registry, now); }
    catch (error) { return { task_id: taskId, employee_participation_verified: false, claim_allowed: false, reason: error.message }; }
  }
  return { task_id: taskId, employee_participation_verified: true, claim_allowed: true, reason: 'all_required_employee_receipts_verified', participants: requirement.participants.map(({ nonce, ...item }) => item) };
}

async function main() {
  const [command, taskId, ...rest] = process.argv.slice(2);
  let result;
  if (command === 'check' && rest.length === 0) result = await checkParticipation(taskId);
  else if (command === 'require') {
    const manifest = rest.indexOf('--manifest');
    if (manifest < 0 || manifest + 1 >= rest.length) throw new Error('usage: require TASK_ID --manifest FILE');
    result = await requireParticipation(taskId, JSON.parse(await readFile(rest[manifest + 1], 'utf8')));
  } else if (command === 'submit' && rest.length === 2 && rest[0] === '--receipt') result = await submitReceipt(taskId, JSON.parse(await readFile(rest[1], 'utf8')));
  else throw new Error('usage: employee-participation-gate.mjs require TASK_ID --manifest FILE | submit TASK_ID --receipt FILE | check TASK_ID');
  console.log(JSON.stringify(result, null, 2));
  if (!result.claim_allowed && command === 'check') process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ employee_participation_verified: false, claim_allowed: false, reason: error.message }));
  process.exitCode = 2;
});
