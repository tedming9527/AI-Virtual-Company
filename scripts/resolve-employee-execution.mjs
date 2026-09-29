#!/usr/bin/env node
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);

async function readJson(file, root) {
  const resolved = await realpath(file);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('source_outside_root');
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe_source');
  return JSON.parse(await readFile(resolved, 'utf8'));
}

async function roleAssetsAvailable(root, roleId) {
  try {
    for (const name of ['PROFILE.md', 'MEMORY.md']) {
      const resolved = await realpath(path.join(root, 'employees', roleId, name));
      if (!resolved.startsWith(root + path.sep) || !(await lstat(resolved)).isFile()) return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function resolveEmployeeExecution(task, employeeId, {
  root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(),
  platform = 'codex',
  mode = 'desktop',
  available_skill_ids = []
} = {}) {
  root = await realpath(root);
  if (!task || typeof task.task_id !== 'string' || !task.task_id.trim()) throw new Error('invalid_task');
  const participation = task.employee_participation;
  if (!participation || !['optional', 'required'].includes(participation.requirement) || typeof participation.fallback_allowed !== 'boolean' || !Array.isArray(participation.requested_employee_ids)) throw new Error('invalid_employee_participation');
  if (!participation.requested_employee_ids.includes(employeeId)) throw new Error('employee_not_requested');
  if (!Array.isArray(task.required_skill_ids ?? []) || (task.required_skill_ids ?? []).some(id => !safeId(id))) throw new Error('invalid_required_skill_ids');
  if (!Array.isArray(available_skill_ids) || available_skill_ids.some(id => !safeId(id))) throw new Error('invalid_available_skill_ids');

  const identities = await readJson(path.join(root, 'employees/IDENTITIES.json'), root);
  const adapters = await readJson(path.join(root, 'platforms/EMPLOYEE_EXECUTION_ADAPTERS.json'), root);
  const capabilityMap = await readJson(path.join(root, 'platforms/ROLE_CAPABILITY_MAP.json'), root);
  const identity = identities.employees?.find(item => item.employee_id === employeeId && item.status === 'active');
  if (!identity) throw new Error('employee_identity_not_active');
  const role = capabilityMap.roles?.find(item => item.role_id === identity.role_id);
  const registeredSkills = new Set((role?.skills ?? []).map(item => item.skill_id));
  const loadedSkillIds = [...new Set(available_skill_ids)].filter(id => registeredSkills.has(id));
  const missingRequired = (task.required_skill_ids ?? []).filter(id => !loadedSkillIds.includes(id));
  const adapter = adapters.adapters?.find(item => item.platform === platform && item.mode === mode && item.status === 'verified' && item.employee_ids.includes(employeeId));
  const base = {
    schema: 'ted.employee-execution-decision.v1', task_id: task.task_id, employee_id: employeeId, role_id: identity.role_id,
    decision_stage: 'pre_execution',
    employee_participation_verified: false,
    adapter_attempt: adapter ? { adapter_id: adapter.adapter_id, result: 'available', reason: 'verified_adapter_covers_employee' } : { adapter_id: null, result: 'unavailable', reason: 'no_verified_employee_adapter' },
    role_context: { profile_ref: `employees/${identity.role_id}/PROFILE.md`, memory_ref: `employees/${identity.role_id}/MEMORY.md`, loaded_skill_ids: loadedSkillIds, missing_required_skill_ids: missingRequired }
  };
  if (adapter) return { ...base, execution_mode: 'verified_employee', actual_executor: null, fallback_used: false, reason: 'verified_employee_adapter_available' };
  if (participation.requirement === 'required') return { ...base, execution_mode: 'blocked', actual_executor: null, fallback_used: false, reason: 'required_employee_channel_unavailable' };
  if (!participation.fallback_allowed) return { ...base, execution_mode: 'blocked', actual_executor: null, fallback_used: false, reason: 'fallback_not_allowed' };
  if (missingRequired.length) return { ...base, execution_mode: 'blocked', actual_executor: null, fallback_used: false, reason: 'required_professional_skill_unavailable' };
  if (await roleAssetsAvailable(root, identity.role_id)) return { ...base, execution_mode: 'role_augmented_platform', actual_executor: 'platform agent', fallback_used: true, reason: 'employee_channel_unavailable_role_context_available' };
  if (task.generic_platform_allowed === true) return { ...base, execution_mode: 'generic_platform', actual_executor: 'platform agent', fallback_used: true, reason: 'role_context_unavailable_generic_fallback_allowed' };
  return { ...base, execution_mode: 'blocked', actual_executor: null, fallback_used: false, reason: 'role_context_unavailable' };
}

async function main() {
  const args = process.argv.slice(2);
  const value = flag => { const i = args.indexOf(flag); return i < 0 ? null : args[i + 1]; };
  const taskFile = value('--task'), employeeId = value('--employee');
  if (!taskFile || !employeeId) throw new Error('usage: resolve-employee-execution.mjs --task FILE --employee ID [--platform ID] [--mode ID] [--available-skills id,id]');
  const task = JSON.parse(await readFile(taskFile, 'utf8'));
  const result = await resolveEmployeeExecution(task, employeeId, { platform: value('--platform') || 'codex', mode: value('--mode') || 'desktop', available_skill_ids: (value('--available-skills') || '').split(',').filter(Boolean) });
  console.log(JSON.stringify(result, null, 2));
  if (result.execution_mode === 'blocked') process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ execution_mode: 'blocked', reason: error.message }));
  process.exitCode = 2;
});
