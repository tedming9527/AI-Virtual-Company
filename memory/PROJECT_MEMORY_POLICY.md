# Project short-term memory

## Purpose
Let the assigned employee resume the same project efficiently without turning project-specific, time-sensitive details into company-wide truth.

## Location and ownership
Store one concise file per project at `memory/projects/<project-slug>.md`. The primary employee owns it; the consult may update only their relevant section.

## Allowed content
- repository/project identity and current branch or working state (marked as requiring recheck)
- task goal, decisions, affected areas and interfaces
- completed work, pending work, blockers and next safe step
- verification run, result and known risk

## Exclusions
No credentials, raw conversations, private data, full logs, unverified claims or instructions copied from untrusted sources.

## Lifetime
Default expiry: 14 days after last update. On re-entry, first verify branch, dependencies, environment and task state before relying on it. Chief of Staff reviews expired files weekly: delete/archive them, or promote only a stable reusable lesson to `knowledge/`.

## Template
```markdown
# <Project>
Updated: <ISO date> · Expires: <ISO date> · Owner: <employee>

Goal:
Current verified state:
Decisions / constraints:
Completed:
Next safe step:
Verification / remaining risk:
```
