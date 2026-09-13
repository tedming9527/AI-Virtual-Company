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
  knowledge/INDEX.md
  knowledge/catalog.json
  templates/TASK_CLOSEOUT.md
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

for profile in "$COMPANY_ROOT"/employees/*/PROFILE.md; do
  employee_dir="${profile:h}"
  if [[ ! -r "$profile" || ! -r "$employee_dir/MEMORY.md" || ! -r "$employee_dir/KNOWLEDGE.md" ]]; then
    print -u2 "INCOMPLETE EMPLOYEE: ${employee_dir:t}"
    failed=1
  fi
done

if (( failed )); then
  print -u2 "Company bootstrap check failed: $COMPANY_ROOT"
  exit 1
fi

print "Company bootstrap check passed: $COMPANY_ROOT"
