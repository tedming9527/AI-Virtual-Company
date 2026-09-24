# 公司审计发现积压（open / deferred）

目的：登记待下次审计收敛的审计发现，作为公司审计知识的可执行积压。
原则：每次正式审计（按 `EVALUATION_RUNBOOK.md` 触发）**必须先读取本文件**，处理其中 `status: open / deferred` 的条目；处理完毕后在该条目更新状态、日期与负责人。发现先登记、不即时整改的由路由官判定为 `deferred`；整改授权在下次审计时按 `EVALUATION_POLICY.md` / `EVALUATION_RUNBOOK.md` 明确。**不得把"待收敛"误写为"已修复"**。

---

## AUD-2026-09-24-001 · 缺节点共享规则段跨 8 岗重复

- **issue_id / created_at**：AUD-2026-09-24-001 / 2026-09-24
- **owner / actual_executor / reviewer**：陈知行（登记；无独立评审者，自审注明）
- **trigger**：去重（员工 C2C 学习小节的共享运行规则段重复）
- **severity**：低（可维护性 / 单一事实源张力，不影响正确性）
- **affected_ids**：`employees/{chief-of-staff,product-manager,frontend-expert,backend-expert,design-master,test-expert,ai-engineer,backend-training-architect}/{KNOWLEDGE.md,MEMORY.md}` 的 `## C2C 编排学习（2026-09-24）` 小节与对应索引条目
- **observed_evidence**：8 份 `MEMORY.md` 索引条目的末尾段（"缺节点（C2C 规划/执行角色或 jev-use）时先查 platforms/REGISTRY.md 共享状态…成功即回 healthy。"）字节完全相同；`KNOWLEDGE.md` 的 C2C 小节共享规则段同样一致。各条目**前半段**（触发 / 直接完成不启动 / jev 判断范围）按岗不同，故每岗整体记忆并非整份重复，仅共享规则段被各岗各带一份。
- **policy_dependencies**：`skills/codex-with-chatgpt/SKILL.md`（节点缺失回退与短时缓存）、`platforms/REGISTRY.md`（node_status/last_checked，单一事实源）、`MEMORY_POLICY.md`（每岗只记自己职责相关内容）
- **authority**：当前仅登记待下次审计收敛，**不即时整改 8 份文件**；本轮不允许改写员工档案。
- **validity_action**：candidate（去重候选；待下次审计裁决）
- **proposed_change**：把 8 份里的共享规则段收敛为一行指针（如"缺节点先查 `platforms/REGISTRY.md` 共享状态、不各自重试；规则见 `codex-with-chatgpt/SKILL.md`"），权威细节保留在单一事实源。
- **why_not_other_alternatives**：保留整段则每岗重复携带运行规则、易漂移；直接删除则需确认真实性；指针式是"单一事实源 × 每岗可用性"的折中，是否采用由下次审计裁决。
- **decision / status**：`deferred → 收敛已验证（待用户授权）` → 已修复/已关闭（2026-09-24，陈知行 · 路由官负责；用户已授权收敛）；更新于 2026-09-24 正式审计（run 2026-09-24-company-audit-v1）。
- **audit_record（2026-09-24，陈知行 · 路由官审计主责）**：现状核对——共享尾段在 8 份 MEMORY.md 中逐字一致（127 字/257 字节 ×8 = 2056 字节重复），各岗前半段按岗不同，整体记忆并非整份重复（与登记一致）；各 c2c 条目"原文版本 sha256"与当前 KNOWLEDGE.md 一致。收敛方案（共享规则段收敛为一行指针，权威细节保留于 `platforms/REGISTRY.md` 与 `skills/codex-with-chatgpt/SKILL.md`）已在一次性快照副本验证：收敛后 bootstrap 通过、c2c 定向结构检查通过、全量 error 27→19（8 条 c2c 归零）。**真实 8 岗 KNOWLEDGE/MEMORY 与 catalog 未改动**；真实文件修复与 catalog/INDEX 同步待用户显式授权，授权后按 proposed_change 收敛并复测。
- **fix_record（2026-09-24）**：8 岗 KNOWLEDGE/MEMORY 的 C2C 共享规则段已收敛为一行指针（权威细节保留于 skills/codex-with-chatgpt/SKILL.md 与 platforms/REGISTRY.md）；证据：收敛后 check-knowledge 结果、各文件 sha256、git diff 见归档 learning/evaluations/2026-09-24-company-audit-fix-v1/。
- **next_review_trigger**：用户授权后收敛并复测；或下次正式审计开始时复核。
- **residual_risks**：已消除（共享段收敛为单一事实源指针）；待 platforms/REGISTRY.md 与 skills/codex-with-chatgpt/SKILL.md 后续事实源更新时复核指针是否仍指向现行规则。

---

## AUD-2026-09-24-002 · 8 岗 c2c-orchestration 记忆索引与目录漂移

- **issue_id / created_at**：AUD-2026-09-24-002 / 2026-09-24
- **owner / actual_executor / reviewer**：陈知行（登记；无独立评审者，自审注明）
- **trigger**：漂移（员工 MEMORY.md 索引条目与 `knowledge/catalog.json` 不一致）
- **severity**：低-中（检索一致性：按 ID 定位时目录覆盖缺失/重复）
- **affected_ids**：`employees/{chief-of-staff,product-manager,frontend-expert,backend-expert,design-master,test-expert,ai-engineer,backend-training-architect}/MEMORY.md` 的 `*-c2c-orchestration` 索引条目；`knowledge/catalog.json` 缺对应目录条目
- **observed_evidence**：`scripts/check-knowledge.mjs .` 报告 8 条 `*-c2c-orchestration: missing or duplicate catalog entry (employees/<role>/MEMORY.md)`。此为员工学习批量更新 MEMORY 时遗留，非本次登记引入。
- **policy_dependencies**：`knowledge/INDEX.md`、`knowledge/catalog.json`、`MEMORY_POLICY.md`
- **authority**：当前仅登记待下次审计收敛，不即时整改（与 AUD-2026-09-24-001 同批）。
- **validity_action**：candidate（收敛待办）
- **proposed_change**：下次审计时核对 8 岗 MEMORY 的 c2c-orchestration 条目，在 `knowledge/catalog.json` 补齐/去重对应目录条目，使 `check-knowledge` 对应告警清零；可与 AUD-2026-09-24-001 的共享规则段收敛合并处理。
- **decision / status**：`deferred → 收敛已验证（待用户授权）` → 已修复/已关闭（2026-09-24，陈知行 · 路由官负责；用户已授权收敛）；更新于 2026-09-24 正式审计（run 2026-09-24-company-audit-v1）。
- **audit_record（2026-09-24，陈知行 · 路由官审计主责）**：现状核对——8 条 `*-c2c-orchestration` 在 `knowledge/catalog.json` 无对应条目（check-knowledge 全量报 missing/duplicate catalog entry，与登记一致）。收敛方案（补齐 8 条 catalog 条目，sha256 取当前 KNOWLEDGE.md，可与 AUD-2026-09-24-001 共享段收敛合并处理）已在一次性快照副本验证：c2c 8 条 error 归零、全量 27→19、bootstrap 通过。**真实 catalog.json 与 8 岗 MEMORY 未改动**；真实文件修复待用户显式授权，授权后按 proposed_change 收敛并复测。
- **fix_record（2026-09-24）**：8 条 c2c-orchestration catalog 条目已补齐，sha256 与收敛后 KNOWLEDGE.md 一致；check-knowledge 对应告警清零。
- **next_review_trigger**：用户授权后收敛并复测；或下次正式审计开始时，与 AUD-2026-09-24-001 同批。
- **residual_risks**：收敛前 8 岗 c2c-orchestration 记忆在 catalog 无对应目录，按 ID 检索可能漏命中；全库另存在一批 STALE summary/source hash mismatch（`*-core`、`*-experience-transfer`、`ai-capability-source-link-radar` 等，非本条目范围），另行观察。

---

## 2026-09-24 正式审计处理注记（run 2026-09-24-company-audit-v1）

- 本文件两条 AUD 条目已按 EVALUATION_RUNBOOK §5 更新状态/决策/日期/负责人，状态为"收敛已验证（待用户授权）"，**未误写为已修复**。
- 因本文件内容更新，`knowledge/catalog.json` 与 `knowledge/INDEX.md` 中 `audit-findings` 条目的 sha256 已不再匹配当前文件（产生 1 条 STALE summary/source hash mismatch，属本轮审计的已知副效应）。该 sha256 同步属于"修改 catalog/INDEX"范围，**待用户显式授权**后一并更新并复测；授权前不静默改动。
- 真实 8 岗 KNOWLEDGE/MEMORY 与 catalog.json 本轮一律未改动；AUD-001/002 的真实文件收敛均待用户授权。
- 审计归档：`learning/evaluations/2026-09-24-company-audit-v1/`（manifest/判据/产物/读取账本/命令结果/独立评审原报告/集成结论）。
- 2026-09-24 修复轮（run 2026-09-24-company-audit-fix-v1，用户授权后执行）：AUD-001/002 已按收敛方案落地并关闭；19 条 STALE hash mismatch 经语义复核全部为"摘要仍准确"（漂移源自 C2C 小节追加），已同步 catalog/INDEX/MEMORY sha256；macro-first-induction 已登记 catalog；P2/P3 33 项已按 09-22 全局映射精确修复；过期条目维持 stale 保留。全量 check-knowledge errors 归零/逐条书面理由见归档。
