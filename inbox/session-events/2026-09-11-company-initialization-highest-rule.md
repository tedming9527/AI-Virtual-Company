id: 2026-09-11-company-initialization-highest-rule
created_at: 2026-09-11T17:41:00+08:00
source: manual
request: Promote company initialization and cross-device migration to one of the company's highest rules, and store the learning-quota supervision mechanism in company rules.
scope: AI Virtual Company
sensitivity: internal
requested_outcome: governance-and-bootstrap
status: completed

outcome:
  - Added INITIALIZATION_POLICY.md as a highest-level company rule.
  - Added LEARNING_POLICY.md as the company learning-quota rule.
  - Updated AGENTS.md, COMPANY.md, PROJECT_BINDING_POLICY.md and the project binding template.
  - Added and passed scripts/check-company-bootstrap.sh.
  - Removed hard-coded current-computer paths from the reusable project binding.
