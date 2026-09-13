# 沈砚舟 · 后端培训导师 经验提取（Spark）

Primary: 沈砚舟 · 后端培训导师（backend-training-architect）；Consult: 顾清妍 · 质量测试工程师（必要时）；Outcome: 形成 2026-09-13 的可复用后端培训经验单元，保留边界与恢复条件。
actual_model: gpt-5.3-codex-spark
run_id: 2026-09-13-spark-backend-training-architect-extract
target_path: learning/internalization/runs/2026-09-13-spark/backend-training-architect-extract.md

## 经验 1：字段不能先验等同，先解出业务归属与公式再讲“正确性”

- 触发信号
  - 出现到家/研选/返佣相关的字段解释或报表复盘（如 `orderAmount`、`actualIncome`、`baseCommission`、`adjustAmount`）任务；
  - 前端名称与上游口径冲突、同名字段跨生态复用。
- 状态/责任边界
  - 培训职责：先将“来源系统、字段定义、计算口径”拆开，不能把业务语义直接从字段名推断；
  - 用户/产品职责：最终核对字段与展示口径、财务口径，导师只做课程抽象，不能替代财务口径确认。
- 决策规则
  - 当路径涉及跨系统金额聚合时，先确认以下三层：来源系统（谁产生原始口径）→ 聚合规则（SQL/服务端如何合成）→ 表达层字段（展示是否覆盖口径差异）；
  - 未识别来源状态（`unknown`）时，不得把“0”或“未更新”解释为真实值。
- 证据
  - `learning/2026-09-13-vanke-backend-project-distillation.md`：BlackSam 中 `totalPerformance = totalOrderAmount + yanxuanFee + backfillAmount`、`actualIncome = baseCommission - totalPunishAmount`，但 `adjustAmount` 未在该链路中并入；并强调前端/下游展示需另核对。
  - `learning/2026-09-13-vanke-backend-project-distillation.md`：Mephisto 中 `createOrderSnapshots` 与后续分摊链条说明“快照是跨变化保持历史真实口径”的作用。
  - `employees/backend-training-architect/READING_MAP.md`：强调“先判明到家/灵工生态并行、同名操作并非同源口径”的阅读边界。
- 反例/失效条件
  - 反例：直接以字段名写“订单金额=实际收益”，未区分快照、费率来源、分摊尾差与补贴后修正；
  - 失效条件：未核对来源系统而混合同名字段，导致财务口径、用户解释和补贴核算冲突。

## 经验 2：金额口径要“可复核”，默认降级与异常不应默默吞掉

- 触发信号
  - 金额计算链路接入外部配置、税率、远端服务或尾差修正；
  - 系统里出现 `queryYanxuanFee`、外部接口异常、或“吞错后返回 0/空值”。
- 状态/责任边界
  - 导师职责：教学中标注“确定性公式”和“未知/异常状态”两条路径；
  - 实施职责：若用于交易/结算，需通过参数化单元测试与真实 Mapper 测试验证精度、尾差与异常归档；产品/财务确认异常策略。
- 决策规则
  - 对金额链路优先输出：精度规则（如舍入位、负值下限）、尾差归属规则（最后一项吸收/余数单列）、异常映射（真实为 0 vs 远端不可用为 0）；
  - 默认把“异常降级为 0”视为高风险行为，除非业务方明确授权并保留来源状态。
- 证据
  - `learning/2026-09-13-vanke-backend-project-distillation.md`：BlackSam 的 `totalCommissionableAmount` 与 `baseCommission` 公式，以及 `queryYanxuanFee` 将异常降级为 0 的反例；Mephisto 的金额分摊“最后一项吸收尾差 + 余数单列”作为可借鉴范式。
  - `employees/backend-training-architect/KNOWLEDGE.md`：强调课程中需区分“已核验事实、工程推断、未知”，并对金额、事务和重试采用可复现规则。
  - `learning/internalization/ARCHITECTURE.md`：定义经验单元必须带 evidence/limits/counterexample，不能混合把推断写成验证真值。
- 反例/失效条件
  - 反例：出现外部超时就把异常金额设 0 并继续报表同步；
  - 失效条件：没有记录尾差去向与异常来源状态时，后续对账无法判断“真实金额”与“降级值”边界。

## 经验 3：跨系统副作用要分离领取所有权、远端副作用、恢复策略

- 触发信号
  - 任务使用定时任务、分布式任务扫描、领取/重领、远端回调或外部推送；
  - 看见 `afterCommit`、全局锁、重试表、任务扫描与状态回写链。
- 状态/责任边界
  - 导师教学边界：向学员明确“本地事务、远端副作用、外部幂等契约”是三类独立责任；
  - 业务边界：系统若无对账/去重契约，最多提供有界恢复与人工流程，不可宣称 exactly-once。
- 决策规则
  - 先从最小路径画三段：本地所有权/领取、外部副作用调用、失败状态与重试入口；任何一段缺失都标 `unknown`；
  - 对“租约重领/全局锁”场景，要求稳定业务键驱动幂等，不用可变 `trace`/重试标识替代。
- 证据
  - `learning/2026-09-13-vanke-backend-project-distillation.md`：BlackSam、Camille、Pandaria 小节分别给出“本地回写成功但失败路径未完整收敛”“afterCommit 非可靠投递”“无租约/claim 时并发扫描风险”等反例。
  - `learning/2026-09-11-remaining-roles-retraining.md`：后端栏位明确“本地回写不能替代远端幂等与对账”，重复执行与未知结果需有界恢复。
  - `employees/backend-training-architect/TEACHING_PLAYBOOK.md`：每次授课强调“状态、机制、语法分层讲解”和失败场景必须明确恢复/重试边界。
- 反例/失效条件
  - 反例：仅凭 `@Transactional` 与 `afterCommit` 推断“外部副作用已可靠落地”；
  - 失效条件：租约过期时旧执行者继续执行外部调用且无幂等键，导致重复扣款/重复推送。

## 经验 4：批处理必须显式状态化失败，不得把部分成功当全成功交付

- 触发信号
  - 任务循环里出现 `catch` 继续执行，返回给上游的是汇总成功指标；
  - 外部扫描任务将单条失败与成功混在同一结果口径返回。
- 状态/责任边界
  - 导师教学边界：让学员能区分“成功条目数”和“成功判定语义”，对失败清单与重试路径进行可解释说明；
  - 运营边界：业务看板可读性必须映射到可恢复状态（待重试/失败）而非仅成功率。
- 决策规则
  - 任何循环内失败必须记录到可重试对象并返回可追踪失败清单；若无失败明细，返回状态需降级为部分成功或待确认；
  - 关键路径至少覆盖 `Pending/Processing/Success/RetryWaiting/Failed` 或同等状态机。
- 证据
  - `learning/2026-09-13-vanke-backend-project-distillation.md`：BlackSam 单工人失败后仍汇总返回 `handleSuccess` 的反例；Pandaria 相关实现强调短事务+状态更新+审计日志可作为部分借鉴但不等于完整成功语义。
  - `employees/backend-training-architect/TEACHING_PLAYBOOK.md`：要求每次课程安排“成功路径 + 真实失败场景 + 回滚/恢复结果”。
  - `learning/internalization/ARCHITECTURE.md`：经验单元结构要求包含限界与反例，迁移题须改变至少两个轴并给修订痕迹。
- 反例/失效条件
  - 反例：任务中 1 条失败被记录日志后继续“任务成功”返回；
  - 失效条件：任务上游以汇总行数/成功标志当作完整成功，导致重试通道与对账缺失。

## 尚未回答的业务相关者质询

- 业务相关者（财务/产品）：在远端回调与任务扫描并存的场景里，允许“暂时性重复副作用”多少窗口？超过该窗口后应由谁（线上值班、财务核对、运营）触发人工补偿，并在多长时间内完成？  
- 当前状态：`unknown`（`employees/backend-training-architect/ONBOARDING.md` 与 `learning/2026-09-13-vanke-backend-project-distillation.md` 都明确了 `unknown` 边界，但未给出具体 SLA 与容忍重复次数）。

## 自检

1. 已输出 4 条经验单元，每条包含触发信号、状态/责任边界、决策规则、证据路径、反例/失效条件。  
2. 已显式记录 `actual_model: gpt-5.3-codex-codex-spark`。  
3. 每条经验均包含至少 1 个来源路径且未超出岗位资料/学习产物范围。  
4. 未修改共享文件：仅新增本地运行文件 `learning/internalization/runs/2026-09-13-spark/backend-training-architect-extract.md`，未改写 `employees/` 与 `knowledge/`。  
