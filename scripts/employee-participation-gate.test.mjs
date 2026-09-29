import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { canonical, checkParticipation, requireParticipation, sha256, submitReceipt } from './employee-participation-gate.mjs';

const root = () => mkdtemp(path.join(os.tmpdir(), 'employee-participation-'));
const employee = { employee_id: 'ted:employee:test-expert', role_id: 'test-expert', participation_kind: 'review' };

async function fixture(adapterStatus = 'verified') {
  const dir = await root();
  await mkdir(path.join(dir, 'employees'), { recursive: true });
  await mkdir(path.join(dir, 'platforms'), { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  await writeFile(path.join(dir, 'employees/IDENTITIES.json'), JSON.stringify({ schema: 'ted.employee-identities.v1', employees: [{ employee_id: employee.employee_id, role_id: employee.role_id, display_name: '顾清妍 · 质量测试工程师（Test Expert）', status: 'active' }] }));
  await writeFile(path.join(dir, 'platforms/EMPLOYEE_EXECUTION_ADAPTERS.json'), JSON.stringify({ schema: 'ted.employee-execution-adapters.v1', adapters: [{ adapter_id: 'fixture-adapter', platform: 'test', mode: 'isolated', status: adapterStatus, verification: 'ed25519', key_id: 'fixture-key', public_key_pem: publicKey.export({ type: 'spki', format: 'pem' }), employee_ids: [employee.employee_id], max_receipt_age_ms: 300000 }] }));
  return { dir, privateKey };
}

async function requirement(f, now = Date.parse('2026-09-29T00:00:00Z')) {
  return requireParticipation('task-1', { request_digest: sha256('request'), context_manifest_digest: sha256('context'), participants: [employee] }, { root: f.dir, now });
}

function receipt(req, privateKey, overrides = {}) {
  const value = { schema: 'ted.employee-participation-receipt.v1', receipt_id: 'receipt-1', task_id: 'task-1', employee_id: employee.employee_id, role_id: employee.role_id, participation_kind: employee.participation_kind, adapter_id: 'fixture-adapter', adapter_run_id: 'native-run-1', issued_at: '2026-09-29T00:00:01Z', expires_at: '2026-09-29T00:04:01Z', nonce: req.participants[0].nonce, request_digest: req.request_digest, context_manifest_digest: req.context_manifest_digest, output_digest: sha256('review output'), artifact_refs: [{ ref: 'artifact:review-output', digest: sha256('review output') }], key_id: 'fixture-key', ...overrides };
  value.signature = sign(null, Buffer.from(canonical(value)), privateKey).toString('base64');
  return value;
}

test('missing receipt fails closed', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  await requirement(f);
  const result = await checkParticipation('task-1', { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') });
  assert.equal(result.claim_allowed, false);
  assert.equal(result.reason, 'required_employee_receipt_missing');
});

test('verified signed receipt proves only its bound employee participation', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  const req = await requirement(f);
  await submitReceipt('task-1', receipt(req, f.privateKey), { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') });
  const result = await checkParticipation('task-1', { root: f.dir, now: Date.parse('2026-09-29T00:00:03Z') });
  assert.equal(result.employee_participation_verified, true);
  assert.deepEqual(result.participants, [employee]);
});

test('unverified adapter, wrong binding, expiration and replay are refused', async t => {
  const unverified = await fixture('unverified'); t.after(() => rm(unverified.dir, { recursive: true, force: true }));
  const req0 = await requirement(unverified);
  await assert.rejects(submitReceipt('task-1', receipt(req0, unverified.privateKey), { root: unverified.dir, now: Date.parse('2026-09-29T00:00:02Z') }), /trusted_employee_adapter_unavailable/);

  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  const req = await requirement(f);
  await assert.rejects(submitReceipt('task-1', receipt(req, f.privateKey, { context_manifest_digest: sha256('wrong') }), { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') }), /receipt_binding_mismatch/);
  await assert.rejects(submitReceipt('task-1', receipt(req, f.privateKey), { root: f.dir, now: Date.parse('2026-09-29T00:10:00Z') }), /receipt_expired_or_invalid_time/);
  const good = receipt(req, f.privateKey);
  await submitReceipt('task-1', good, { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') });
  await assert.rejects(submitReceipt('task-1', good, { root: f.dir, now: Date.parse('2026-09-29T00:00:03Z') }), /receipt_replay_or_duplicate/);
});

test('tampering after signing is refused', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  const req = await requirement(f), value = receipt(req, f.privateKey);
  value.output_digest = sha256('tampered');
  await assert.rejects(submitReceipt('task-1', value, { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') }), /invalid_signature/);
});

test('empty or corrupted requirements never fail open', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  await requirement(f);
  const requirementFile = path.join(f.dir, 'tmp/employee-participation/task-1/requirement.json');
  const value = JSON.parse(await readFile(requirementFile, 'utf8'));
  value.participants = [];
  await writeFile(requirementFile, JSON.stringify(value));
  const result = await checkParticipation('task-1', { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') });
  assert.equal(result.claim_allowed, false);
  assert.equal(result.reason, 'invalid_requirement');
});

test('concurrent freeze and receipt submission cannot replace existing evidence', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  const args = ['task-1', { request_digest: sha256('request'), context_manifest_digest: sha256('context'), participants: [employee] }, { root: f.dir, now: Date.parse('2026-09-29T00:00:00Z') }];
  const freezes = await Promise.allSettled([requireParticipation(...args), requireParticipation(...args)]);
  assert.equal(freezes.filter(item => item.status === 'fulfilled').length, 1);
  const req = JSON.parse(await readFile(path.join(f.dir, 'tmp/employee-participation/task-1/requirement.json'), 'utf8'));
  const value = receipt(req, f.privateKey);
  const submissions = await Promise.allSettled([
    submitReceipt('task-1', value, { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') }),
    submitReceipt('task-1', value, { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') })
  ]);
  assert.equal(submissions.filter(item => item.status === 'fulfilled').length, 1);
});

test('receipt must bind at least one concrete artifact digest', async t => {
  const f = await fixture(); t.after(() => rm(f.dir, { recursive: true, force: true }));
  const req = await requirement(f);
  await assert.rejects(submitReceipt('task-1', receipt(req, f.privateKey, { artifact_refs: [] }), { root: f.dir, now: Date.parse('2026-09-29T00:00:02Z') }), /invalid_receipt/);
});
