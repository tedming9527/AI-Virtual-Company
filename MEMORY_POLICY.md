# Memory policy

## 入库判定

只有同时满足“未来任务需要复用或审计”且“内容可压缩为结论、必要证据或正式交付”的材料可以进入版本库。可入库的类别仅为：规则/模板/源代码、已验证的决策与经验、稳定偏好或系统约束、正式交付，以及其最小可追溯证据。

`knowledge/` 只保存跨任务可复用的结论；`employees/*/KNOWLEDGE.md` 保存岗位经验；`learning/` 仅保存已完成且有明确学习目标、结论和复核边界的训练或评测；`inbox/session-events/` 仅保存 ROUTER 与 DELIVERY_POLICY 指定的任务记录。`output/` 仅保存正式、可交付的成果，不保存运行输出。

## 不入库

探索笔记、一次性排查、工具原始输出、运行日志、可再生成产物、未核实主张、原始对话、凭据和未经专项授权的个人数据均为临时信息，放入 `tmp/` 或 `logs/`，不得写入上述持久目录、暂存或推送。任何材料缺少可复用结论、最小证据或明确交付价值时，默认临时；“可能以后有用”不是入库理由。

用户于 2026-09-18 明确授权沈砚舟 · 后端培训导师（资深后端架构师）维护专业能力与市场价值评估档案。该专项档案只允许存放在 `memory/learner/`，限于职业目标、用户本人在任务中的可归属行为、独立程度、提示轨迹、能力观测、市场评估条件和纠错记录；不得保存原始对话、密钥、私人账户内容、健康、家庭、身份号码等与职业能力无关或高敏信息。每条观测必须有来源、时间、证据等级和不确定性，用户可随时要求更正、导出、暂停或删除；删除属于专项授权动作，不由清理脚本自动执行。

## Format and lifecycle
Each entry is dated, concise, has a source/owner and a confidence label. Employees maintain candidates in their own detailed `KNOWLEDGE.md` and a concise discovery entry in `MEMORY.md`; Chief of Staff promotes cross-team items to `knowledge/` after review. Review quarterly; supersede rather than silently overwrite.

## Continuous accumulation
For each completed, non-trivial routed task, retain only its compact outcome/decision, reusable lesson when present, minimal verification evidence and owner. 没有可复用结论时不创建知识或学习条目；任务记录是否保留由 ROUTER 与 DELIVERY_POLICY 的触发条件决定。Store domain lesson details in the responsible employee’s `KNOWLEDGE.md`, with summaries in `MEMORY.md`; promote shared, stable lessons to `knowledge/`. Weekly curation deduplicates, expires time-sensitive facts and rejects raw transcript dumping.

## Project short-term memory
Employees may retain a scoped, expiring project handoff in `memory/projects/` so they can resume the same project. It is isolated from company knowledge, defaults to a 14-day lifetime, and must be revalidated on re-entry. See `memory/PROJECT_MEMORY_POLICY.md`.

## Verified retrieval and reuse — 2026-09-11
Employee lessons include trigger, action, evidence, applicability limits, date/owner/confidence and review status. Read relevant entries at task start through ROUTER; add a reuse reference to the task outcome when applied. Synthetic case exercises establish scenario reasoning only, not production skill improvement. Supersede disproved guidance with a dated correction. Write a candidate only if it changes future decisions; no learning entry is required for trivial work. Store full exercises in learning/ and concise discoverable links in the employee MEMORY.md. Full loading and summary-review rules are in KNOWLEDGE_POLICY.md; summaries never replace required safety/authorization instructions.

## Maintenance and repair
Knowledge creation, de-duplication, invalidation and authorized repair follow KNOWLEDGE_MAINTENANCE.md. Preserve before/after evidence and revalidation; no automatic deletion, authority expansion or background scheduling is implied.
