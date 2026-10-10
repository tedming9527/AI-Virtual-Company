#!/bin/zsh
set -eu

COMPANY_ROOT="${AI_VIRTUAL_COMPANY_ROOT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company}"
CORE_ONLY=0

case "${1:-}" in
  --core-only) CORE_ONLY=1 ;;
  "") ;;
  *)
    print -u2 "Usage: $0 [--core-only]"
    exit 2
    ;;
esac

required_files=(
  AGENTS.md
  COMPANY.md
  INITIALIZATION_POLICY.md
  ROUTER.md
  PROJECT_BINDING_POLICY.md
  MEMORY_POLICY.md
  LEARNING_POLICY.md
  KNOWLEDGE_POLICY.md
  DELIVERY_POLICY.md
  METRICS_POLICY.md
  EVALUATION_POLICY.md
  EVALUATION_RUNBOOK.md
  KNOWLEDGE_MAINTENANCE.md
  templates/EVALUATION_BRIEF.md
  templates/KNOWLEDGE_CHANGE.md
  knowledge/INDEX.md
  knowledge/catalog.json
  templates/TASK_CLOSEOUT.md
  employees/ROSTER.txt
  employees/IDENTITIES.json
  skills/project-company-binding.template.md
  skills/ASSET_REGISTRY.md
  skills/codex-with-chatgpt/SKILL.md
  skills/jev-use/SKILL.md
  platforms/REGISTRY.md
  platforms/EMPLOYEE_EXECUTION_ADAPTERS.json
  platforms/ROLE_CAPABILITY_MAP.json
  templates/employee-participation-receipt.schema.json
  templates/employee-execution-decision.schema.json
  memory/PROJECT_MEMORY_POLICY.md
  scripts/resolve-model-learning-request.mjs
  TASK_LIFECYCLE.md
  scripts/task-lifecycle.mjs
  SUPERVISION_POLICY.md
  scripts/supervisor-runtime.mjs
  BOOTSTRAP.md
  infrastructure/ted-mac-assistant.md
  scripts/ted-mac-assistant-bootstrap.sh
  scripts/check-ted-remote-mcp.mjs
  mcp/REGISTRY.json
  mcp/schemas/mcp-profile.schema.json
  mcp/runbooks/FIRST_USE.md
  skills/mcp-first-use/SKILL.md
  scripts/mcp-launch
  scripts/mcp-governance.mjs
)

required_dirs=(employees knowledge skills memory inbox schedule platforms infrastructure mcp mcp/profiles mcp/bundles mcp/schemas mcp/runbooks)

failed=0
for item in "${required_files[@]}"; do
  if [[ ! -r "$COMPANY_ROOT/$item" ]]; then
    print -u2 "MISSING FILE: $item"
    failed=1
  fi
done

for item in "${required_dirs[@]}"; do
  if [[ ! -d "$COMPANY_ROOT/$item" ]]; then
    print -u2 "MISSING DIRECTORY: $item"
    failed=1
  fi
done

typeset -A roster_seen
if [[ -r "$COMPANY_ROOT/employees/ROSTER.txt" ]]; then
  while IFS= read -r role || [[ -n "$role" ]]; do
    [[ -z "$role" ]] && continue
    if [[ ! "$role" =~ '^[a-z][a-z0-9-]+$' || -n "${roster_seen[$role]:-}" ]]; then
      print -u2 "INVALID OR DUPLICATE ROLE: $role"
      failed=1
      continue
    fi
    roster_seen[$role]=1
    for item in PROFILE.md MEMORY.md KNOWLEDGE.md; do
      if [[ ! -r "$COMPANY_ROOT/employees/$role/$item" ]]; then
        print -u2 "INCOMPLETE EMPLOYEE: $role/$item"
        failed=1
      fi
    done
  done < "$COMPANY_ROOT/employees/ROSTER.txt"
  for employee_dir in "$COMPANY_ROOT"/employees/*(/N); do
    role="${employee_dir:t}"
    if [[ -z "${roster_seen[$role]:-}" ]]; then
      print -u2 "UNREGISTERED EMPLOYEE: $role"
      failed=1
    fi
  done
fi

# Validate stable employee identities and adapter metadata without treating an
# unverified adapter as available.
if [[ -r "$COMPANY_ROOT/employees/IDENTITIES.json" && -r "$COMPANY_ROOT/platforms/EMPLOYEE_EXECUTION_ADAPTERS.json" && -r "$COMPANY_ROOT/platforms/ROLE_CAPABILITY_MAP.json" ]]; then
  if ! node --input-type=module - "$COMPANY_ROOT" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const root = fs.realpathSync(process.argv[2]);
const roles = fs.readFileSync(path.join(root, 'employees/ROSTER.txt'), 'utf8').split(/\r?\n/).filter(Boolean);
const identities = JSON.parse(fs.readFileSync(path.join(root, 'employees/IDENTITIES.json'), 'utf8'));
const adapters = JSON.parse(fs.readFileSync(path.join(root, 'platforms/EMPLOYEE_EXECUTION_ADAPTERS.json'), 'utf8'));
const capabilityMap = JSON.parse(fs.readFileSync(path.join(root, 'platforms/ROLE_CAPABILITY_MAP.json'), 'utf8'));
let failed = false;
const seenEmployee = new Set(), seenRole = new Set(), activeRoles = new Set(roles);
if (identities.schema !== 'ted.employee-identities.v1' || !Array.isArray(identities.employees)) failed = true;
for (const item of identities.employees || []) {
  if (!/^ted:employee:[a-z][a-z0-9-]*$/.test(item.employee_id || '') || !activeRoles.has(item.role_id) || seenEmployee.has(item.employee_id) || seenRole.has(item.role_id) || item.status !== 'active' || typeof item.display_name !== 'string' || !item.display_name.trim()) failed = true;
  seenEmployee.add(item.employee_id); seenRole.add(item.role_id);
}
if (seenRole.size !== activeRoles.size) failed = true;
if (adapters.schema !== 'ted.employee-execution-adapters.v1' || !Array.isArray(adapters.adapters)) failed = true;
for (const item of adapters.adapters || []) {
  if (!/^[a-z][a-z0-9-]*$/.test(item.adapter_id || '') || !['verified','unverified','unavailable'].includes(item.status) || item.verification !== 'ed25519' || !Array.isArray(item.employee_ids)) failed = true;
  if (item.status === 'verified' && (!item.key_id || !item.public_key_pem || item.employee_ids.some(id => !seenEmployee.has(id)))) failed = true;
}
const capabilityRoles = new Set();
if (capabilityMap.schema !== 'ted.role-capability-map.v1' || !Array.isArray(capabilityMap.roles)) failed = true;
for (const item of capabilityMap.roles || []) {
  if (!activeRoles.has(item.role_id) || capabilityRoles.has(item.role_id) || !Array.isArray(item.skills)) failed = true;
  capabilityRoles.add(item.role_id);
  const skillIds = new Set();
  for (const skill of item.skills || []) {
    if (!/^[a-z][a-z0-9-]*$/.test(skill.skill_id || '') || skillIds.has(skill.skill_id) || !['company','platform'].includes(skill.source) || !['available','discover_on_platform','installable','unavailable','descriptive_only'].includes(skill.status) || !Array.isArray(skill.signals) || skill.signals.some(value => typeof value !== 'string' || !value.trim())) failed = true;
    skillIds.add(skill.skill_id);
  }
}
if (capabilityRoles.size !== activeRoles.size) failed = true;
if (failed) console.error('INVALID EMPLOYEE IDENTITY OR ADAPTER REGISTRY');
else console.log('Employee identities, execution adapters, and role capabilities checked: ' + seenEmployee.size + ' employees');
process.exitCode = failed ? 1 : 0;
NODE
  then
    failed=1
  fi
fi

# Inspect canonical active assets and their discovery metadata only. This does
# not execute a Skill or inject its body into a business session.
if [[ -r "$COMPANY_ROOT/skills/ASSET_REGISTRY.md" ]]; then
  if ! node --input-type=module - "$COMPANY_ROOT" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const root = fs.realpathSync(process.argv[2]);
const registry = fs.readFileSync(path.join(root, 'skills/ASSET_REGISTRY.md'), 'utf8');
const seen = new Set();
let failed = false, active = 0;
for (const line of registry.split(/\r?\n/)) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.trim().split('|').slice(1, -1).map(v => v.trim().replace(/^`(.*)`$/, '$1'));
  if (cells.at(-1) !== 'active') continue;
  active++;
  const [id, source] = cells;
  try {
    if (cells.length !== 6 || !/^[a-z][a-z0-9-]*$/.test(id) || seen.has(id)) throw Error('invalid or duplicate registry row');
    seen.add(id);
    if (!/^skills\/[a-z0-9-]+\/$/.test(source)) throw Error('invalid canonical source path');
    const directory = fs.realpathSync(path.join(root, source));
    if (!directory.startsWith(root + path.sep) || !fs.statSync(directory).isDirectory()) throw Error('source outside company root or not a directory');
    const entry = fs.realpathSync(path.join(directory, 'SKILL.md'));
    if (!entry.startsWith(directory + path.sep)) throw Error('SKILL.md outside canonical source');
    const text = fs.readFileSync(entry, 'utf8');
    const front = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    if (!front) throw Error('missing SKILL.md front matter');
    for (const key of ['name', 'description']) {
      const fields = [...front.matchAll(new RegExp('^' + key + ':[ \\t]*([^\\n]*)$', 'gm'))];
      if (fields.length !== 1) throw Error('missing or duplicate ' + key);
      let value = fields[0][1].trim().replace(/^(["'])(.*)\1$/, '$2');
      if (/^[>|][+-]?$/.test(value)) {
        const rest = front.slice(fields[0].index + fields[0][0].length);
        value = rest.match(/^\n((?:[ \t]+[^\n]*\n?)+)/)?.[1]?.trim();
      }
      if (!value || /^(?:null|~|\[\]|\{\})$/.test(value) || value.startsWith('#')) throw Error('empty ' + key);
      if (key === 'name' && value !== id) throw Error('name does not match registry ID');
    }
  } catch (err) {
    failed = true;
    console.error('INVALID ACTIVE SKILL: ' + id + ': ' + err.message);
  }
}
if (!failed) console.log('Active Skill sources and required metadata checked: ' + active + ' (bodies not loaded into session)');
process.exitCode = failed ? 1 : 0;
NODE
  then
    failed=1
  fi
fi

if (( failed )); then
  print -u2 "Company bootstrap check failed: $COMPANY_ROOT"
  exit 1
fi

if ! node "$COMPANY_ROOT/scripts/mcp-governance.mjs" check-company; then
  failed=1
fi

if (( failed )); then
  print -u2 "Company bootstrap check failed: $COMPANY_ROOT"
  exit 1
fi

# Validate platform/mode registry structure only (facts stay in the fact source).
if [[ -r "$COMPANY_ROOT/platforms/REGISTRY.md" ]]; then
  if ! node --input-type=module - "$COMPANY_ROOT" <<'NODE'
import fs from 'node:fs';
import path from 'node:path';
const root = fs.realpathSync(process.argv[2]);
const reg = fs.readFileSync(path.join(root, 'platforms/REGISTRY.md'), 'utf8');
const STATUS = new Set(['yes','no','partial','unknown','unverified','mandatory','active','optional','none','healthy','missing']);
const seen = new Set();
let failed = false, rows = 0;
for (const line of reg.split(/\r?\n/)) {
  if (!line.trim().startsWith('|')) continue;
  const cells = line.trim().split('|').slice(1, -1).map(v => v.trim().replace(/^`(.*)`$/, '$1'));
  if (cells.length === 0) continue;
  if (/^-+$/.test(cells[0])) continue; // separator row
  if (cells[0] === 'platform') continue; // header row
  try {
    if (cells.length !== 13) throw Error('row must have 13 cells, got ' + cells.length);
    const [platform, mode] = cells;
    const key = platform + '\u0000' + mode;
    if (!/^[a-z][a-z0-9-]*$/.test(platform) || !/^[a-z][a-z0-9-]*$/.test(mode) || seen.has(key))
      throw Error('invalid or duplicate platform/mode row');
    seen.add(key);
    for (let i = 2; i <= 8; i++) {
      if (!STATUS.has(cells[i])) throw Error('invalid status value: ' + cells[i]);
    }
    if (!STATUS.has(cells[10])) throw Error('invalid node_status value: ' + cells[10]);
    if (cells[11] !== 'unknown' && !/^\d{4}-\d{2}-\d{2}$/.test(cells[11]))
      throw Error('invalid last_checked value: ' + cells[11]);
    rows++;
  } catch (err) {
    failed = true;
    console.error('INVALID PLATFORM REGISTRY: ' + err.message);
  }
}
if (!failed) console.log('Platform/mode registry checked: ' + rows + ' rows');
process.exitCode = failed ? 1 : 0;
NODE
  then
    failed=1
  fi
fi

if (( failed )); then
  print -u2 "Company bootstrap check failed: $COMPANY_ROOT"
  exit 1
fi

print "Company bootstrap check passed: $COMPANY_ROOT"

# Session hooks need a fast, deterministic fact-source check. Optional local
# infrastructure may access external projects or the network, so it must not
# participate in the hook's synchronous timeout or change one session from a
# bootstrap-failure state to a footer-enforcement state between events.
if (( CORE_ONLY )); then
  exit 0
fi

# Ted Mac Assistant is separately recoverable local infrastructure. The owner
# authorised initialization to refresh its external project and MCP adapter.
# Failure remains optional and never invalidates the company fact source.
if ! "$COMPANY_ROOT/scripts/ted-mac-assistant-bootstrap.sh" ensure --quiet; then
  print -u2 "OPTIONAL INFRASTRUCTURE NOT READY: Ted Mac Assistant project/App/MCP (run scripts/ted-mac-assistant-bootstrap.sh ensure)"
else
  print "Ted Mac Assistant project and MCP adapter ready; live tools require a new client session and separate runtime verification"
fi

# Remote MCP is optional runtime infrastructure. The check is read-only,
# proxy-fail-closed by default, and never deploys or changes authorization.
PROJECTS_ROOT="${TED_PROJECTS_ROOT:-$HOME/Documents/ted-projects}"
PROJECT_ROOT="$PROJECTS_ROOT/ted-personal-execution-system"
LOCAL_REVISION=""
if [[ -d "$PROJECT_ROOT/.git" ]]; then
  LOCAL_REVISION="$(git -C "$PROJECT_ROOT" rev-parse HEAD 2>/dev/null || true)"
fi
if ! TED_EXECUTION_LOCAL_REVISION="$LOCAL_REVISION" node "$COMPANY_ROOT/scripts/check-ted-remote-mcp.mjs"; then
  print -u2 "OPTIONAL INFRASTRUCTURE NOT READY: Ted Remote MCP metadata is incompatible or misconfigured"
fi
