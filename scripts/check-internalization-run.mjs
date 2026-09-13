import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = fs.realpathSync(process.argv[2] || process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const runArg = process.argv[3];
const errors = [];
const warnings = [];

if (!runArg) {
  console.error('usage: node scripts/check-internalization-run.mjs <root> <run.json>');
  process.exit(2);
}

function insideRoot(relativePath) {
  if (path.isAbsolute(relativePath)) throw new Error('absolute path is not allowed');
  const resolved = fs.realpathSync(path.join(root, relativePath));
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('path escapes company root');
  return resolved;
}

const runPath = insideRoot(runArg);
const run = JSON.parse(fs.readFileSync(runPath, 'utf8'));
const roster = fs.readFileSync(path.join(root, 'employees', 'ROSTER.txt'), 'utf8')
  .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const allowedEvidence = new Set(['reviewed_case', 'verified_context', 'unknown']);
const expectedClones = new Set(['experience_miner', 'boundary_challenger', 'transfer_architect']);

for (const key of ['id', 'created_at', 'budget', 'employees']) {
  if (run[key] === undefined || run[key] === null) errors.push(`run missing ${key}`);
}
if (run.budget?.model_requested !== 'gpt-5.3-codex-spark') errors.push('requested model must use canonical gpt-5.3-codex-spark');
if (run.budget?.cap_percent !== 10) errors.push('budget cap_percent must equal the user-authorised 10 for this run');
if (run.budget?.per_role_percent !== 10) errors.push('budget per_role_percent must equal 10 for this run');
if (run.budget?.role_count !== roster.length) errors.push('budget role_count must match the roster');
if (run.budget?.aggregate_target_percent !== roster.length * run.budget?.per_role_percent) {
  errors.push('budget aggregate_target_percent must equal role_count times per_role_percent');
}
if (run.budget?.actual_usage !== 'unknown' && typeof run.budget?.actual_usage !== 'number') {
  errors.push('budget actual_usage must be a number or unknown');
}
const executionStatus = run.budget?.execution_status;
if (!['executed', 'failed_model_gate', 'blocked_usage_unavailable'].includes(executionStatus)) {
  errors.push('budget execution_status is invalid');
}
const usage = run.budget?.usage_snapshot || {};
if (usage.limit_id !== 'codex_bengalfox') errors.push('Spark usage snapshot must use codex_bengalfox');
if (executionStatus === 'executed') {
  if (run.budget?.actual_model !== 'gpt-5.3-codex-spark') errors.push('executed Spark run must confirm the canonical actual model');
  if (![usage.before_percent, usage.after_percent, usage.delta_percent].every((value) => typeof value === 'number')) {
    errors.push('executed Spark run requires numeric before, after, and delta snapshots');
  } else {
    if (usage.after_percent - usage.before_percent !== usage.delta_percent) errors.push('Spark usage delta does not match snapshots');
    if (usage.delta_percent <= 0) errors.push('executed Spark run requires a positive Spark usage delta');
    if (usage.delta_percent > run.budget.aggregate_target_percent) errors.push('Spark usage exceeded the aggregate target');
  }
} else {
  errors.push(`Spark execution not verified: ${executionStatus}`);
}

const employees = Array.isArray(run.employees) ? run.employees : [];
const byRole = new Map(employees.map((employee) => [employee.role_id, employee]));
const snapshots = Array.isArray(run.source_snapshot) ? run.source_snapshot : [];
const snapshotByRole = new Map(snapshots.map((snapshot) => [snapshot.role_id, snapshot]));
for (const role of roster) if (!byRole.has(role)) errors.push(`missing roster role ${role}`);
for (const role of byRole.keys()) if (!roster.includes(role)) warnings.push(`run contains non-roster role ${role}`);

for (const role of roster) {
  const snapshot = snapshotByRole.get(role);
  if (!snapshot) errors.push(`${role}: missing source snapshot`);
  else {
    try {
      const body = fs.readFileSync(insideRoot(snapshot.path));
      const digest = crypto.createHash('sha256').update(body).digest('hex');
      if (digest !== snapshot.sha256) errors.push(`${role}: source snapshot hash mismatch`);
    } catch (error) { errors.push(`${role}: invalid source snapshot: ${error.message}`); }
  }
  const employee = byRole.get(role);
  if (!employee) continue;
  const clones = Array.isArray(employee.clones) ? employee.clones : [];
  const cloneRoles = new Set(clones.map((clone) => clone.role));
  for (const expected of expectedClones) if (!cloneRoles.has(expected)) errors.push(`${role}: missing clone ${expected}`);
  if (clones.length !== expectedClones.size) errors.push(`${role}: expected exactly three clone outputs`);
  if (!employee.business_stakeholder?.role_id || !employee.business_stakeholder?.question || !employee.business_stakeholder?.response) {
    errors.push(`${role}: incomplete business stakeholder dialogue`);
  }
  const unit = employee.experience_unit || {};
  for (const key of ['trigger', 'signals', 'decision', 'action', 'evidence', 'limits', 'counterexample', 'transfer_test']) {
    const value = unit[key];
    if (value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)) {
      errors.push(`${role}: experience_unit missing ${key}`);
    }
  }
  for (const evidence of Array.isArray(unit.evidence) ? unit.evidence : []) {
    if (!allowedEvidence.has(evidence.level)) errors.push(`${role}: invalid evidence level ${evidence.level}`);
    if (!evidence.path) errors.push(`${role}: evidence path missing`);
    else {
      try { insideRoot(evidence.path); } catch (error) { errors.push(`${role}: invalid evidence path: ${error.message}`); }
    }
  }
  const transfer = unit.transfer_test || {};
  if (!Array.isArray(transfer.variation_axes) || transfer.variation_axes.length < 2) errors.push(`${role}: transfer test needs at least two variation axes`);
  for (const key of ['question', 'initial_answer', 'challenge', 'revision', 'result']) {
    if (!transfer[key]) errors.push(`${role}: transfer test missing ${key}`);
  }
  if (!['reviewed_case', 'held', 'unknown'].includes(employee.outcome_status)) errors.push(`${role}: invalid outcome_status`);
}

console.log(JSON.stringify({
  run: path.relative(root, runPath),
  roster_roles: roster.length,
  run_roles: employees.length,
  errors,
  warnings,
  spark_execution_status: executionStatus || 'missing',
  scope: 'structure, source drift, and Spark execution declaration; not production capability certification'
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
