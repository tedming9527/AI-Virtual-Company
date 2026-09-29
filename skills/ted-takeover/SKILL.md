---
name: ted-takeover
description: Reconnect the current Codex conversation to Ted AI Virtual Company when platform takeover context is missing or uncertain. Use explicitly for emergency company intake; it does not prove prior supervision or replace platform hooks.
---

# Ted Takeover

Reconnect only the current conversation, from this invocation forward.

1. Resolve the company root from `AI_VIRTUAL_COMPANY_ROOT`. On macOS only, if it is unset, use the `AI-Virtual-Company` directory under the current user's iCloud Drive. Do not persist the resolved absolute path into company facts or project configuration.
2. Read `INITIALIZATION_POLICY.md` and run `scripts/check-company-bootstrap.sh` with the resolved root. If either step fails, stop and report the exact missing path or bootstrap failure. Do not claim company takeover.
3. Load the base company facts required by the initialization policy, then apply its conditional-loading rules to the user's current request.
4. Identify the current Codex task/conversation ID when the platform exposes it. Search `inbox/session-events/` for an existing intake record. If none exists, create a minimal recovery event with the actual current timestamp, request summary, source, project/cwd when known, primary owner, `recovered_at`, and the boundary `coverage_starts_at: recovered_at`. Never backdate it.
5. Route the request through `ROUTER.md`, announce one primary employee and at most one material consultant, and continue the already-authorized task.
6. Say that the conversation is manually reconnected from this point. Do not say the platform hook is active unless the current context contains `TED_CODEX_PLATFORM_TAKEOVER_V1`. Do not say the task is supervised unless `scripts/supervision-gate.mjs assert-supervised TASK_ID` succeeds with a live receipt.
7. Before sending each company-facing final response, use the evidence-matched final line: without a verified employee receipt, `以上内容由 Ted 公司提供；任务主责：{该任务既定主责实名}；实际执行者：platform agent`; when role-augmented execution actually loaded the named role's PROFILE or selected knowledge, append `；岗位能力参考：{名字 + 岗位}（资料增强，非本人参与）`; only with `employee_participation_verified: true`, use `以上内容由 Ted 公司的{该任务既定主责实名}等人为您提供`. Names come from frozen evidence and are never invented. This is attribution, not evidence that a hook, supervision, or employee participation is active.

This skill is a manual recovery entrance. It cannot intercept messages before invocation, retroactively supervise earlier work, activate another conversation, or make user-level hooks organization-managed.
