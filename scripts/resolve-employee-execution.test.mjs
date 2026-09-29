import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { resolveEmployeeExecution } from './resolve-employee-execution.mjs';

const employeeId = 'ted:employee:frontend-expert';
const baseTask = { task_id: 'task-1', employee_participation: { requirement: 'optional', requested_employee_ids: [employeeId], fallback_allowed: true }, required_skill_ids: [] };

async function fixture(adapterStatus = 'unverified', roleAssets = true) {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'employee-execution-'));
  await mkdir(path.join(dir, 'employees/frontend-expert'), { recursive: true });
  await mkdir(path.join(dir, 'platforms'), { recursive: true });
  await writeFile(path.join(dir, 'employees/IDENTITIES.json'), JSON.stringify({ schema: 'ted.employee-identities.v1', employees: [{ employee_id: employeeId, role_id: 'frontend-expert', display_name: '周启明', status: 'active' }] }));
  if (roleAssets) {
    await writeFile(path.join(dir, 'employees/frontend-expert/PROFILE.md'), '# profile\n');
    await writeFile(path.join(dir, 'employees/frontend-expert/MEMORY.md'), '# memory\n');
  }
  await writeFile(path.join(dir, 'platforms/EMPLOYEE_EXECUTION_ADAPTERS.json'), JSON.stringify({ schema: 'ted.employee-execution-adapters.v1', adapters: [{ adapter_id: 'test-adapter', platform: 'codex', mode: 'desktop', status: adapterStatus, employee_ids: adapterStatus === 'verified' ? [employeeId] : [] }] }));
  await writeFile(path.join(dir, 'platforms/ROLE_CAPABILITY_MAP.json'), JSON.stringify({ schema: 'ted.role-capability-map.v1', roles: [{ role_id: 'frontend-expert', skills: [{ skill_id: 'react-scoped-styles' }] }] }));
  return dir;
}

test('selects verified employee only when a verified adapter covers the employee', async t => {
  const dir = await fixture('verified'); t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await resolveEmployeeExecution(baseTask, employeeId, { root: dir });
  assert.equal(result.execution_mode, 'verified_employee');
  assert.equal(result.employee_participation_verified, false);
  assert.equal(result.actual_executor, null);
});

test('uses role-augmented platform fallback without claiming employee participation', async t => {
  const dir = await fixture(); t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await resolveEmployeeExecution(baseTask, employeeId, { root: dir, available_skill_ids: ['react-scoped-styles', 'unregistered-skill'] });
  assert.equal(result.execution_mode, 'role_augmented_platform');
  assert.equal(result.actual_executor, 'platform agent');
  assert.equal(result.employee_participation_verified, false);
  assert.deepEqual(result.role_context.loaded_skill_ids, ['react-scoped-styles']);
});

test('fails closed when employee participation or a required professional skill is unavailable', async t => {
  const dir = await fixture(); t.after(() => rm(dir, { recursive: true, force: true }));
  const requiredEmployee = await resolveEmployeeExecution({ ...baseTask, employee_participation: { ...baseTask.employee_participation, requirement: 'required' } }, employeeId, { root: dir });
  assert.equal(requiredEmployee.execution_mode, 'blocked');
  assert.equal(requiredEmployee.reason, 'required_employee_channel_unavailable');
  const requiredSkill = await resolveEmployeeExecution({ ...baseTask, required_skill_ids: ['react-scoped-styles'] }, employeeId, { root: dir });
  assert.equal(requiredSkill.execution_mode, 'blocked');
  assert.equal(requiredSkill.reason, 'required_professional_skill_unavailable');
});

test('generic platform fallback requires explicit permission when role assets are missing', async t => {
  const dir = await fixture('unverified', false); t.after(() => rm(dir, { recursive: true, force: true }));
  const blocked = await resolveEmployeeExecution(baseTask, employeeId, { root: dir });
  assert.equal(blocked.execution_mode, 'blocked');
  const generic = await resolveEmployeeExecution({ ...baseTask, generic_platform_allowed: true }, employeeId, { root: dir });
  assert.equal(generic.execution_mode, 'generic_platform');
});
