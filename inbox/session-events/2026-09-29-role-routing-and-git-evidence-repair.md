# 公司岗位路由与 Git 证据门禁修复

id: 2026-09-29-role-routing-and-git-evidence-repair
created_at: 2026-09-29T00:00:00+08:00
source: codex
request: 修复因错误继承会话摘要而把产品经理描述为前端开发，并错误处理 reset/revert 的公司规则缺口
scope: company routing, initialization, cross-AI rules, Codex adapter
sensitivity: internal
requested_outcome: implementation

## 知识变更/修复单

- issue_id / task_id / created_at：2026-09-29-role-routing-and-git-evidence-repair / 同上 / 2026-09-29
- owner / actual_executor / reviewer（自审注明，未参与写none）：逻辑主责为陈知行 · 路由官（Chief of Staff）；实际写入为当前 Codex 主会话；独立 reviewer: none，自审
- trigger：反例。实际会话把林知夏 · 目标规划官（Product Manager）错误描述为前端开发，并混淆本地 reset 与对已合入 main 提交的 revert
- affected_ids / inbound_references / policy_dependencies：`ROUTER.md`、`INITIALIZATION_POLICY.md`、跨 AI `AI_RULES.md`、Codex target；初始化、员工路由、代码与 Git 交付依赖这些规则
- source_version / source_hash / observed_evidence：变更前版本由 Git 历史保留；第 2 轮变更后 SHA-256：ROUTER `e04438d972bb36573a6ea5f4750ff802763259c353472cbc9f5e046ae635cbb8`，INITIALIZATION_POLICY `1a2a7ead6d5166c073078de992fdb485f6bf388f962ac401b51254036763fb2f`，AI_RULES `cddc199ed385cbf4f4c12b2a94b182eb203e81f19db8813922783d00eaa606e4`，Codex target `ac8ad32fbf81267a751c12b6f0cbc4e7465aff5450106753c029a246c465e95b`；证据为本会话中的错误岗位声明、后续花名册核验和 Git reflog/提交图核验
- authority：用户明确要求“对公司规则执行修复”；不修改业务仓库、不安装工具、不改变生产系统
- validity_action：原规则继续有效；新增角色责任分离和 Git 证据门禁作为现行规则
- proposed_change / why_not_other_alternatives：在事实源和中立主配置补充最小门禁，并在第 2 轮明确平台代理可以读取花名册、路由、协调和派发，但逻辑指定不等于实际参与；不只修平台副本，因为会产生跨平台漂移
- preserved_before / proposed_after / concurrent_change_check：变更前由 Git 保留；变更前工作树仅有无关未跟踪 deliverable，本次不触碰
- adoption_example：前端仓库的需求由产品定义范围，前端工程岗位承担逻辑执行责任，测试岗位承担逻辑验证责任；只有真实派发并取得回执或产物后才能声明二者已参与。无员工执行通道时标记平台代理执行；上下文接续后重新核验
- rejection_example：不能因旧摘要写“林知夏主责”就把林知夏描述成前端开发；不能用 reset 结果冒充 main 中已有 revert 记录
- structural_checks / semantic_review / runtime_scope：公司 bootstrap 通过；Codex 与 Claude 生成配置均包含身份和 Git 门禁；`git diff --check` 通过；本次不宣称已完成下一次冷启动运行时验收
- decision / updated_index_and_hash / published_status：已同步中立主配置、Codex/Claude 适配器和上述 hash；现行规则已发布，运行时冷启动验收仍为待观察
- rollback_scope / residual_risks / next_review_trigger：可按本次文件差异精确回退；剩余风险是旧会话不会自动重写历史，且逻辑路由不能替代实际员工回执；下一次上下文接续、真实员工派发或 Git 历史修复任务复核
- repair_round / stop_reason：第 2 轮；补全读取、路由、派发、代执行和参与证据边界后，完成同步与验证即停止继续叠加规则
- reuse_result：unknown，等待后续真实任务验证
