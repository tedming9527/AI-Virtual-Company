# 公司审计问题修复

- id: 2026-09-18-company-audit-remediation
- created_at: 2026-09-18T11:30:00+08:00
- source: codex
- request: 修复本轮公司仓库审计确认的问题
- scope: 公司规范源、Codex 适配器生成链、持久资料路径与历史断链
- sensitivity: internal
- requested_outcome: implementation
- level: M
- owner: 陈知行 · 路由官（Chief of Staff）
- actual_executor: 当前 Codex 任务
- consult: none
- status: partial
- acceptance: 退役 Skill 不会被重新同步；规范源与 Codex 全局适配器一致；根目录 AGENTS.md 规则符合官方发现机制；持久公司资料不含机器用户名绝对路径；结构、知识、测试与 Git 差异检查通过

## 知识变更/修复单

- issue_id / task_id / created_at：AUDIT-2026-09-18 / 2026-09-18-company-audit-remediation / 2026-09-18T11:30:00+08:00
- owner / actual_executor / reviewer：陈知行 · 路由官（Chief of Staff） / 当前 Codex 任务 / 自审
- trigger：适配器漂移、退役能力残留、规则冲突、绝对路径与断链
- affected_ids / inbound_references / policy_dependencies：跨 AI 配置源、Codex 平台附加规则、初始化政策、导师资料导航、mephisto 历史知识、历史评测索引
- source_version / source_hash / observed_evidence：Git HEAD ec4815731f46065c00f7a0944f88386dbf7249bc；审计命令、规范源与当前适配器差异、OpenAI 官方 AGENTS.md 文档
- authority：用户明确要求修复审计问题；不提交、不推送、不发布，不改历史结论语义
- validity_action：停止采用退役 Skill 规则；修正规范源、引用与适配器
- proposed_change / why_not_other_alternatives：先改事实源再生成适配器；历史证据保留，不以删除历史记录掩盖问题
- preserved_before / proposed_after / concurrent_change_check：修复前工作树干净；最终以完整 diff 和当前文件状态复核
- adoption_example / rejection_example：新 Codex 会话加载根目录 AGENTS.md；历史材料中的旧 Skill 名称仅作归档，不恢复安装
- structural_checks / semantic_review / runtime_scope：bootstrap、知识校验、现有测试、语法、链接、绝对路径、生成结果与 Git diff；Hook 实际新会话注入须冷启动复核
- decision / updated_index_and_hash / published_status：已完成规范源、适配器、路径与断链修复；mephisto 历史知识索引及 catalog hash 已同步；实现已验证，Hook 平台注入仍待新会话冷启动
- rollback_scope / residual_risks / next_review_trigger：仅回退本任务差异；新建 Codex 任务后检查 `TED_CODEX_PLATFORM_TAKEOVER_V1` 注入标记，未取得前保持 platform hook unverified
- repair_round / stop_reason：1 / 可修改问题已修复，等待新会话运行时证据
- reuse_result：unknown

## 结果与证据

- outcome：退役 Skill 已从现行规则、配置清单、同步入口和可安装规范目录移除；历史归档保留。
- evidence：Codex 全局 AGENTS 与规范源生成结果 SHA-256 一致；全局退役 Skill 目录不存在；bootstrap、27 条知识结构检查、80 项测试、脚本语法、JSON、Markdown 链接和 Git diff 检查通过。
- portability：活跃持久资料中的机器用户名绝对路径已归零，改用仓库相对路径或初始化政策登记的逻辑路径。
- remaining：当前任务无法证明 Hook 在新的平台会话中实际注入；这不影响已完成的文件修复，但阻止声明 `platform_hook_verified`。
- next_action：下一次新建 Codex 任务时执行冷启动验收；无需再次修改规范源，除非注入失败。
