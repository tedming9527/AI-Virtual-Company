#!/bin/zsh
set -eu

COMPANY_ROOT="${AI_VIRTUAL_COMPANY_ROOT:-$HOME/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company}"

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
  skills/project-company-binding.template.md
  skills/ASSET_REGISTRY.md
  memory/PROJECT_MEMORY_POLICY.md
  scripts/resolve-model-learning-request.mjs
  TASK_LIFECYCLE.md
  scripts/task-lifecycle.mjs
  SUPERVISION_POLICY.md
  scripts/supervisor-runtime.mjs
)

required_dirs=(employees knowledge skills memory inbox schedule)

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

if (( failed )); then
  print -u2 "Company bootstrap check failed: $COMPANY_ROOT"
  exit 1
fi

print "Company bootstrap check passed: $COMPANY_ROOT"
