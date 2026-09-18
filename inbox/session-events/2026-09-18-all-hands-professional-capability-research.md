# 全员专业能力提升研究

- id: `2026-09-18-all-hands-professional-capability-research`
- created_at: `2026-09-18T00:00:00+08:00`
- source: codex
- request: 八位员工分别使用 Pro 周额度上限 3%，以 `gpt-5.6-sol`、`high` 推理强度研究共同主题与个人专业主题，完成独立作答、质量复核和成长经验沉淀。
- scope: 公司八岗位的受监督学习、评测、个人知识候选与跨岗位综合报告
- sensitivity: internal
- requested_outcome: supervised research, reviewed learning artifacts, knowledge candidates
- level: M；多执行者、显式模型与共享额度约束、需要独立复核和持久交付，但不涉及外部发布或生产写入。
- owner: 陈知行 · 路由官（Chief of Staff）
- actual_supervisor: 当前 Codex 主任务 `/root`；原生协作任务 ID 与每分钟额度快照共同构成监督证据
- consult: 顾清妍 · 质量测试工程师（Test Expert）
- consult_status: contributed；顾清妍已完成七岗独立复核、整改复核和后端最终关闭复核
- consult_question: 八份成果的主张、证据、环境与验收结论是否同层，案例训练是否被误报为生产能力。
- status: verified
- dispatch_status: completed

## 预算与执行契约

- 解析结果：八位员工、每人上限 3%、聚合上限 24%、`gpt-5.6-sol`、共享 `codex` 计量窗口、依赖评估后分批执行。
- 分配语义：cap，不是必须耗尽的目标；监督者不计入八位员工预算。
- 模型要求：所有员工最低 `gpt-5.6-sol`，推理强度 `high`，能力层级 `deep`，质量优先；不得降级代跑。
- 计量要求：启动前和结束后均须取得 Pro 周额度同一窗口的新鲜数值快照；共享窗口只能报告共享增量，不伪造个人精确消耗。
- 执行前快照：本地 Codex 只读协议 `account/rateLimits/read` 于 `2026-09-18T03:58:22.904Z` 返回 `limitId=codex`、周窗口 `10080` 分钟、`usedPercent=55`、`ordinaryUsageAllowed=true`、重置时间 `2026-09-19 22:46:18 CST`；用户截图独立显示 Pro 账户剩余 `45%`，与协议快照一致。
- 模型回执：Codex CLI 启动页显示 `gpt-5.6-sol high`；员工任务均通过原生协作通道显式指定同一模型与推理强度。
- 监控：每分钟读取一次 `account/rateLimits/read`；任务硬停止线为 `usedPercent >= 79`，即相对执行前最多新增 24 个百分点。共享窗口只报告总增量，不伪造个人精确用量。
- 门禁结论：模型与计量门禁已通过，允许分批派发；如快照过期、读取失败或达到79%，立即停止新派发并取消可安全取消的未完成任务。
- 执行后快照：本地 Codex 只读协议于 `2026-09-18T04:28:38.848Z` 返回同一 `codex / 10080 分钟`窗口、`usedPercent=60`、`ordinaryUsageAllowed=true`；相对启动前增加 5 个百分点，低于聚合上限 24 个百分点。每分钟监控随后停止。

## 执行回执

- 批次1（completed）：`/root/product_research`、`/root/frontend_research`、`/root/backend_research`；实际模型请求均为 `gpt-5.6-sol`，推理强度 `high`。
- 批次2（completed）：`/root/design_research`、`/root/ai_engineer_research`、`/root/trainer_research`；同样锁定 `gpt-5.6-sol / high`。
- 批次3（completed）：`/root/chief_research`、`/root/test_research`；同样锁定 `gpt-5.6-sol / high`。顾清妍随后只读复核七岗并保留首轮、定向整改和最终关闭轨迹。
- 独立复核结论：七岗 `pass 7 / held 0 / reject 0`；测试岗由陈知行复核其修订后的迁移题，确认视觉观察、浏览器终态语义、真实链路与发布状态已正确分层，判定 `pass`。本轮八岗最终均可按 `reviewed_case` 落盘。

## 八岗任务登记

每项均为 `deep / gpt-5.6-sol / high / 质量优先 / 最低模型 gpt-5.6-sol`；各人只写本人的研究报告与个人知识候选，共享文件由陈知行串行整合，顾清妍仅做独立复核，不代写。

| 负责人 | 专业主题 | 所有权与成功标准 | 复核人 |
|---|---|---|---|
| 陈知行 · 路由官（Chief of Staff） | 轻治理的可验证任务编排 | 真实请求到执行回执的最小状态机；反例、迁移题、三条行动规则与返工指标齐全 | 顾清妍 |
| 林知夏 · 目标规划官（Product Manager） | AI产品从问题定义到可测量试点 | 问题、基线、分母、指标、护栏、观察窗口与停止条件可审计 | 顾清妍 |
| 周启明 · 体验工程官（Frontend Engineer） | 设计证据驱动的页面架构与全状态正确性 | Figma/页面/组件/状态/请求归属/浏览器证据链完整，未知项不冒充节点事实 | 顾清妍 |
| 陆行远 · 可靠服务官（Backend Engineer） | 跨系统业务终态 | 幂等、事务、失败恢复、对账、可观测性与人工介入边界完整 | 顾清妍 |
| 苏映雪 · 信任设计官（Design Master） | Figma精确读取与可信状态设计 | 节点、变量、布局、组件状态、无障碍和系统能力承诺边界可核对 | 顾清妍 |
| 顾清妍 · 质量测试工程师（Test Expert） | 风险驱动的证据架构 | 主张—风险—环境—证据—结论矩阵、unknown分类与最小回归集完整 | 陈知行整合；领域自审明确标注 |
| 辛澈 · AI工程师 | 可验证的AI工作流 | 来源、模型、Skill/工具、权限、Eval、失败降级与停止条件形成闭环 | 顾清妍 |
| 沈砚舟 · 后端培训导师（资深后端架构师） | 真实项目驱动的后端独立交付教学 | 预测、解释、实现、测试、迁移五段式验收，区分独立与提示完成 | 顾清妍 |

## 共同交付与停止条件

- 每人交付：共同主题理解、近期问题、来源、三条行动规则、成功与失败案例、未见迁移题、检查清单或 Skill 建议、unknown、下次应用和返工指标。
- 证据边界：优先项目事实与官方/第一方资料；事实、推断、候选规则、案例通过、真实项目验证和生产效果分别标记。
- 停止条件：问题已解决；连续两轮无新增有效证据；触及单人 3% 上限；模型、计量、权限或必要事实不可验证。
- 知识沉淀：只有通过复核且改变未来决策的内容进入个人知识候选；跨岗规则由陈知行去重整合后再决定是否进入公司知识。原始对话、运行日志和未核实材料不入库。

## 恢复条件与下一步

1. 八岗独立报告、未见题与最终复核均已完成；七岗独立复核 `pass 7 / held 0 / reject 0`，测试岗由陈知行确认 `pass`。
2. 八份岗位经验已以 `reviewed_case` 更新到对应员工知识资产，跨岗共识已进入公司级“可验证工作的证据账本”。
3. 后续只在三个自然发生、风险和交付层级可比的真实任务中观察返工指标；当前生产能力与返工改善幅度保持 `unknown`。

## 最终交付

- [全员综合报告](../../learning/professional-capability-research-2026-09-18/REPORT.md)
- [独立质量复核轨迹](../../learning/professional-capability-research-2026-09-18/quality-review.md)
- [公司级可验证工作证据账本](../../knowledge/verifiable-work-evidence-ledger.md)
- outcome: 八岗内容、独立作答、证据复核、问题关闭、个人经验和跨岗共识均已落盘；预算与内容分别验收。
- remaining: 真实项目效果、生产能力与个人精确额度归因尚未验证，不据本轮材料外推。
