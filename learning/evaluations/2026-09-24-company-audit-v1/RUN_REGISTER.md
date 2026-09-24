# 审计运行登记 · run 2026-09-24-company-audit-v1

- run_id：2026-09-24-company-audit-v1
- 触发：用户请求"运行一次公司审计"（原事件/任务：本会话 2026-09-24；归档由此文件链接）。
- 操作手册：EVALUATION_RUNBOOK.md（版本 1.0 · 2026-09-12 · Owner 陈知行）；配套 EVALUATION_POLICY.md、METRICS_POLICY.md、templates/EVALUATION_BRIEF.md、templates/KNOWLEDGE_CHANGE.md。
- 源版本：company root working tree @ git HEAD d9c672db27d068c425b9c293846a9f1b85e1b72b（含未提交改动：EVALUATION_RUNBOOK.md、knowledge/INDEX.md、knowledge/catalog.json、learning/audit-findings.md）。快照创建于 2026-09-24 16:16（/tmp/ted-audit-2026-09-24-wvepg37p）。
- 范围：只读审计。在 mktemp 隔离快照上执行 bootstrap + check-knowledge 全量 + 最小评测矩阵（文档一致性、摘要语义、结构负例、S 执行任务、M 只读评审、来源越权负例、冷启动、上下文读取账本、独立验收）；AUD-2026-09-24-001/002 收敛在一次性副本验证并给出决策。
- 允许读写：快照内 fixtures/、results/、negatives/、eval-logs/（冻结源文件只读）；审计归档 learning/evaluations/2026-09-24-company-audit-v1/（本目录）；learning/audit-findings.md 两条 AUD 条目按手册 §5 更新状态/决策/日期/负责人。
- 排除项：凭据、原始聊天、业务库、平台缓存、自动化配置（.codex/、.git/、deliverables/、output/、logs/、inbox/、schedule/、meetings/、research/、memory/learner/、memory/projects/ 等，详见 MANIFEST.json omitted）。
- 验收条件：见 EVALUATION_RUNBOOK §3 最小矩阵九项 + 集成者验收表（templates/EVALUATION_BRIEF.md）。
- 整改预算：最多 2 轮（知识修复与评测整改共享同一计数）；本轮为 r0，未消耗整改轮次（无已授权修复被执行；收敛修复待用户授权）。
- 输出目录：learning/evaluations/2026-09-24-company-audit-v1/（本目录）。
- 运行预算/停止条件：关键授权或语义问题未解决不整体通过，保持 partial/blocked 交用户决定；不为全绿无限重试。
- 角色：主责/集成 陈知行 · 路由官（按 ROUTER"独立评测…陈知行主责"）；独立评审者 = 全新上下文子智能体（未参与实现，先固定判据再看结果，见 independent-review/reviewer-report.md）；受测执行者 = 冷启动/摘要语义/S任务/M评审/越权负例 五个全新上下文子智能体。
- 运行时身份：本环境为豆包 agent 环境（platforms/REGISTRY.md doubao work 行：binding_scope=active、可写公司文件、node_status=healthy、last_checked=2026-09-24；platform_hook_verified=unverified）。模型/Token 不可观测 → actual_model: unknown，不冒称其他供应商；independence: 子智能体为全新上下文（不继承作者解题过程），无平台级独立鉴证标记 → 按运行证据记，未额外声称。
