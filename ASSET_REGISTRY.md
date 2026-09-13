# Company asset registry

## 独立模型评测结果 · 2026-09-11
- [综合报告与原始证据](learning/evaluations/2026-09-11-workflow-v1/REPORT.md)：独立审计4项问题及修复、两个岗位流程和一次新上下文冷启动、9项脚本检查、读取账本与两种基线。
- 仅本轮文档/fixture验收通过；不是OS强隔离、跨设备迁移或长期提效认证。完整输入Token未知，按需读取不保证每个短任务净省上下文。

## 分层知识与流程评测 · 2026-09-11
- Owner：陈知行；用户授权先优化再独立模型评估。
- KNOWLEDGE_POLICY.md、METRICS_POLICY.md、EVALUATION_POLICY.md、templates/TASK_CLOSEOUT.md 为本次规范；ROUTER按任务加载。
- 员工MEMORY变为摘要目录，原文完整保存在同目录KNOWLEDGE.md；knowledge/catalog.json记录源hash，INDEX为公司知识入口。
- scripts/check-knowledge.mjs 验证结构与源漂移；scripts/read-knowledge.mjs 记录隔离试验读取量，不是OS权限边界。


## Remaining roles case training — 2026-09-11
- Owner：陈知行；consult：顾清妍；source：用户明确要求对其他员工同样培训。
- [六岗位12道案例与复核](learning/2026-09-11-remaining-roles-retraining.md)：产品、前端、后端、设计、AI工程、后端导师；各岗位MEMORY保存触发、行动与边界。
- Invocation：沿用ROUTER相关岗位记忆检索；仅合成案例推理通过，生产效果和未来复用另行验证。未改业务项目、学员成绩、提醒或发布权限。

## Delivery rules and case training — 2026-09-11
- Owner：陈知行；consult：顾清妍；source：当前用户明确授权优化与知识沉淀。
- DELIVERY_POLICY.md：任务分级、实际协作、证据收口；ROUTER入口按任务加载。
- learning/2026-09-11-delivery-retraining.md：案例、交叉质疑、迁移题及边界；chief-of-staff与test-expert的MEMORY保存可检索索引。真实任务效果待验证。

## Canonical ownership
The company is the canonical steward of reusable skills, knowledge, role guidance and cross-project practices. Platform copies may remain as execution adapters; they are not deleted automatically.

## Imported 2026-09-09
| Asset set | Canonical company location | Steward |
|---|---|---|
| AI-config rules, targets, roles, commands and skills | `assets/imports/2026-09-09/ai-config/` | Chief of Staff |
| User-side Codex skills (10) | `assets/imports/2026-09-09/codex-skills/` | respective domain employee |
| Codex durable memories and rollout summaries | `assets/imports/2026-09-09/codex-memories/` | Chief of Staff |

Excluded: Codex `.system` skills, vendor imports, Git metadata, and platform-local execution settings. No original file was removed.

## Default for future assets
1. Create the canonical skill, knowledge note or reusable workflow under this company root first.
2. Register it here with owner, purpose, source and invocation policy.
3. Publish/copy a platform adapter only when a project or employee needs it. Adapters must point back to the company canonical source.
4. Skills are explicit assets, not automatic context. The routed employee decides whether to invoke one.

## Accumulation loop
New task outcome → responsible employee memory candidate → Chief of Staff weekly review → shared `knowledge/` or retained project evidence. iCloud is the durable company ledger; platform-local memory is an adapter/cache, not the sole record.

Employees may also use isolated, 14-day project handoffs under `memory/projects/`; they are deliberately separate from durable company knowledge.

## Stewardship assignments
- Product Manager: product/AI discovery, metrics and product-method knowledge.
- Frontend Expert: React, UI, CSS, browser, Figma-facing and frontend delivery skills.
- Backend Expert: Java, Spring, Redis, Docker/LAN, deployment and backend delivery skills.
- Design Master: design-system, UX, image/pet and design-facing knowledge.
- Test Expert: test strategy, quality gates, Playwright, regression evidence and AI evaluation.
- Chief of Staff: shared policies, model routing, memory curation, configuration sync and cross-platform adapters.

- Backend Training Architect: backend teaching, mephisto business learning, evidence-based practice and course handoffs; canonical directory `employees/backend-training-architect/`.

## Backend mentor onboarding — 2026-09-09
- Owner: 沈砚舟; routing: 陈知行. Source: explicit user request in task 01a086a3-929c-7043-9cfc-22ece9ab9e91.
- Assets: employee profile, capabilities, teaching playbook, reading map, onboarding record and next-lesson card.
- Source review: `knowledge/2026-09-09-mephisto-author-review.md`; intake and reading evidence in `inbox/session-events/` and `learning/`.
- Invocation: learning requests route to the mentor; product implementation remains with Backend Expert. No automatic schedule or external publishing created.

## External adapter cleanup — 2026-09-09
- Owner: 陈知行. Source: user requested cleanup after company asset consolidation.
- This Mac had no user-installed Codex skills outside `.system`.
- Archived and byte-verified four differing Claude skill copies under `assets/retired-adapters/2026-09-09-claude-local/`, then removed their external copies: java-code-explainer, mephisto-save-summary, model-router, vanke-merge-to-test-and-deploy.
- Removed the broken agently-mail symlink; its target is recorded in the archive. Claude user skills directory verified empty.
- These archived versions are retained for comparison, not promoted over canonical company skills. System skills and installed plugin capabilities were retained. Other computers were not inspected or changed.

## External material cleanup — 2026-09-09
- Owner: 陈知行. User extended cleanup to other materials.
- Archived and byte-verified six local Claude documents under `assets/retired-adapters/2026-09-09-claude-materials/`; manifest records source paths and SHA-256 hashes.
- Removed the archived image-reader role, stale deployment command and three knowledge-note files from Claude external directories.
- Replaced the obsolete sync and removed-skill sections of local CLAUDE.md with a company entry point, retaining unrelated coding guidance and RTK include.
- Kept credentials, native runtime configuration, plugins and conversation history. Legacy shared `claude-config` remains on iCloud, but its automatic sync instruction was removed from this Mac. Other computers were not modified. Codex managed memories remain platform-managed and were not deleted.

## 独立审查与知识维护规范 · 2026-09-12
- Owner：陈知行；用户要求固化评测与防退化知识积累流程。
- [评测手册](EVALUATION_RUNBOOK.md)、[知识维护规则](KNOWLEDGE_MAINTENANCE.md)、templates/EVALUATION_BRIEF.md、templates/KNOWLEDGE_CHANGE.md。
- ROUTER按需发现；不建立后台调度，不允许自我扩权。历史评测证据仍在learning/evaluations/2026-09-11-workflow-v1/。
