---
id: 2026-09-24-audit-full-remediation
created_at: 2026-09-24T17:20:00+08:00
source: doubao
request: 移除过期审计；执行审计问题全量修复（AUD-001/002 收敛落地、19 条 STALE 语义复核+哈希同步、macro-first-induction 登记、P2/P3 33 项精确修复、过期条目标记加固）
scope: 公司知识/员工档案/catalog/INDEX/治理注记/部分脚本与模板（8 岗 KNOWLEDGE/MEMORY、knowledge/catalog.json、knowledge/INDEX.md、learning/audit-findings.md、P2/P3 涉及 20+ 文件）
sensitivity: internal
requested_outcome: full_remediation_verified
level: M
reason: 跨 8 岗档案与目录契约同步（catalog/INDEX/MEMORY hash 一致）+ scripts/task-lifecycle.mjs 行为级改动需集成验收；可 git 回退、无生产数据/权限变更，按 DELIVERY_POLICY 风险/依赖/可逆判 M
owner: 陈知行 · 路由官（Chief of Staff）
consult: none
consult_status: none
consult_question: none（研究/执行/验证由全新上下文子代理承担，非咨询角色；无外邀顾问）
consult_evidence: none
consult_disposition: none
status: verified
baseline: 真实根 git d9c672d + 未提交改动；修复前 check-knowledge 29 error（8 c2c 缺失 + 20 STALE + 1 macro 缺失）
---

## 执行摘要

用户授权两步执行后，按 EVALUATION_RUNBOOK 从更新后的真实根完成全量修复并独立验证：

1. **移除过期审计**：按 KNOWLEDGE_POLICY/KNOWLEDGE_MAINTENANCE 逐条处置——3 条 catalog stale 条目（research-source-governance、2026-09-09-ai-delivery-principles、2026-09-09-mephisto-author-review）维持 stale 保留历史指针；ai-delivery-principles 补历史边界横幅（与另两张对齐）；两张 weekly-curation 非 catalog 条目自带声明不改；未硬删任何真实历史。区分了"内容过期"与"hash 漂移"（20 条 STALE 属结构漂移，非过期，未误删）。
2. **AUD-001/002 收敛落地**：8 岗 MEMORY/KNOWLEDGE 的 C2C 共享规则段收敛为一行指针（权威细节保留于 skills/codex-with-chatgpt/SKILL.md 与 platforms/REGISTRY.md）；catalog 补齐 8 条 *-c2c-orchestration + macro-first-induction 共 9 条新条目。
3. **19 条 STALE**：逐条语义复核（研究层证据：漂移根因=2026-09-24 追加 C2C 小节，对应正文块自首版未变，摘要均仍准确）→ 实算同步 catalog/INDEX/MEMORY sha256，未机械改 hash 掩盖错误。
4. **P2/P3 33 项**：按 09-22 全局映射逐项精确修复（最小改动、带「2026-09-24 审计修复」标注）；含 experience-internalization-v2 catalog summary↔INDEX 三处联动、task-lifecycle.mjs 持久回执条件化（测试 8/8 通过）。

## 验证证据

- 真实根：`node scripts/check-knowledge.mjs .` → 58 entries / errors=[] / warnings=[]，exit=0；bootstrap 通过，exit=0。
- 独立验证子代理（全新上下文）：8 岗各仅一个 c2c 小节、信息无损（SKILL/REGISTRY 权威规则在位）、catalog 合法 JSON 且 9 条新条目 detail hash 独立实算 10/10 一致、audit-findings sha256 三处一致、抽样 STALE/P2/P3 均到位、git 无删除项。
- 快照重建：mktemp 95 文件 manifest，快照 bootstrap+check-knowledge 与真实根完全一致。
- 冷启动：快照上全新上下文 bootstrap → 路由 frontend-expert（consult:none）→ INDEX 命中 verifiable-work-evidence-ledger 并读详情 → S 级简报收口，通过。
- 归档：`learning/evaluations/2026-09-24-company-audit-fix-v1/`（commands、results、manifest、fix-record、results-verify）。

## 未覆盖 / 遗留

- 未执行 git commit（用户未授权提交；改动保留工作区）。
- check-knowledge 语义为抽样认证（4 条 STALE + 冷启动命中 1 条），未对 58 条逐条语义审计。
- capability_handoff_status: pending——本任务为用户授权型内部修复，无用户本人技术行为证据；本会话无通知沈砚舟的真实通道，待其下次培训会话核对（无能力变化可登记，记 no_evidence 倾向）。
- 平台运行时鉴证（hook 安装/信任/实际事件注入）保持 unknown，非文件可修。

## 修复单

见归档 fix-record/2026-09-24-audit-full-remediation.md（含 affected_ids、authority、before/after、rollback_scope、residual_risks）与 fix-record/summary.md（按修复清单逐项 已修/保留+理由/未覆盖）。
