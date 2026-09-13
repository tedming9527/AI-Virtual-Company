# 陆行远 · 可靠服务官 迁移架构分身 B（Spark）

Primary: 陆行远 · 可靠服务官（Backend Expert）；Consult: 无；Outcome: 将后端跨系统重试与批处理经验形成可复用迁移决策，覆盖业务争议点和灰度验收门槛。

actual_model: gpt-5.3-codex-spark  
输入路径:
- learning/internalization/runs/2026-09-13-spark/backend-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/frontend-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/product-manager-extract.md
- learning/internalization/runs/2026-09-13-spark/test-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/backend-training-architect-extract.md
- learning/internalization/ARCHITECTURE.md

## 业务相关者质疑

1. 业务（财务/产品）质疑：在“租约重领 + 超时未决 + 远端不幂等”场景，允许多少重复副作用？多久后必须转人工对账？  
2. 产品质疑：主指标上升、关键指标下降时，能否提前用二级放行线继续灰度？  
3. 测试质疑：自动化与主流程截图通过，但并发/超时仍 `unknown`，是否可发布？  
4. 前端质疑：在并行验收窗口内，优先补全页面状态覆盖还是关键旅程端到端？  

## 本岗回应（初版）

我先按后端恢复语义给出保底结论：  
- 保留“本地回写与远端副作用分离”原则。超时/进程重启后，即便 owner/token 写失败，也必须按业务键保持幂等恢复，不得把新重试当新副作用。  
- 保留“超时不等于未执行”判断，超时必须进入可恢复状态并保留失败重放边界。  
- 引入状态机替代全量成功返回：`Pending -> Processing -> Success/RetryWaiting/Failed/Dead`。  
- 在无明确去重契约时，不给 exactly-once 承诺，改为“有界重复 + 人工确认窗口”策略。  

## 反质疑（对齐其他岗位要点）

- 前端侧补充：界面可见状态和版本归属必须可追踪，否则旧请求会覆盖新状态；这意味着每条任务应携带 `requestFingerprint`（与业务键不同）用于视图回写过滤，但外部幂等仍必须使用业务键。  
- 测试侧补充：构建/自动化是阶段证据，不足以替代高风险终态。并发和未知结果必须有可追溯终态清单、重试清单和人工触发规则。  
- 训练侧补充：金额与口径问题是“数据核对问题”，不能把字段名直接映射为真实口径；同理，本次迁移只给规则，不替代财务复核与 SLA 约定。  
- 产品侧补充：若关键指标冲突，不能只看主指标；必须有“阻断条件”与“二级放行线”的未决项，未定义则不得默认放行。  

## 修订决定（收口）

1. **保留规则（保留）**  
   - 维持 `业务键` 作为外部副作用去重主锚点；`trace/requestId` 仅用于链路观测。  
   - `afterCommit` 仅作为调用时机，不作为外部可靠投递保证。  
2. **修改规则（新增/加强）**  
   - 将“超时即失败/未执行”改为：`unknown` 记为 `RetryWaiting`，带重试上限和人工介入闸门；无穷重试禁止。  
   - 将批处理汇总成功改为失败明细化：只要存在失败明细，任务最终状态不得为 `Success`，必须返回 `PartialSuccess` 并持久化待重试队列。  
   - 定义统一放行条件：未决项与手工核对清单为空之前，不能进入“完全放行”；关键流程与页面状态覆盖可并行执行，但以不影响 `unknown` 闭合为前提。  

## 未预先给答案的迁移题（跨场景）

场景：  
- A 场景是“结算批量发放”服务，每 10 分钟拉一批订单做外部打款。  
- B 场景是“前端发起撤销退款”按钮，用户在 2 分钟内可手动取消。  
- 现网约束：打款接口无幂等 API，回调可能超时但实际可能已执行；数据库主库偶发延迟，重启后另一个 worker 会重领未完成任务。  
- 业务目标：允许在 15 分钟内不阻塞流水，同时避免重复打款争议。  

问题：  
在上述场景中，任务调度如何保证“可恢复且可解释”，并定义失败与放行边界？  

答案：  
1. 每条订单只允许一个 `businessClaimKey = orderNo` 参与外部操作；worker 重领只接管 claim 状态，不重放业务键。  
2. 外部调用通过本地 outbox 持久化 `outboxId = orderNo` 后推进，只有本地 outbox 状态进入 `Sent` 才允许进入 `Processing`；`unknown` 不可回填为 `Success`。  
3. 重试逻辑以 `RetryWaiting` + `nextRetryAt` 控制，达到上限后进入人工待核对（Ops/财务）队列。  
4. 前端状态以 `requestFingerprint` 控制展示归属，避免撤销请求与后台异步响应混写；但状态归属不替代外部去重。  
5. 放行门槛：`unknown`、`RetryWaiting`、`Failed` 清单不空时，任何“主指标提升”不允许转绿色；需明确写入 `freezeReasons`，等待关键流程 `reconciled=true`。  

## 可复用架构单元

- 单元名：`RecoveredBatchFlowForUnreliableDownstream`  
- 组成：  
  - `claim table`（owner/token、leaseUntil、attempt）  
  - `outbox`（business_key、sourceId、payloadHash、status）  
  - `state machine`（Pending/Processing/Success/PartialSuccess/RetryWaiting/Failed）  
  - `view token`（requestFingerprint）  
  - `manual hold`（sloDeadline、owner）  
- 适用边界：  
  - 适用于有批处理、重试、租约恢复、远端异步副作用、前端可见状态回写的场景。  
  - 适用于可识别稳定业务键且允许在短期窗口内人工介入的场景。  
- 失效边界：  
  - 任何要求“严格 exactly-once”且远端无任何对账/查询能力的场景，此单元只能做到有界重复；若业务不接受重复，必须先补充下游去重或查询能力再上线。  
  - 不适合“无状态短任务 + 无重试痕迹 + 无持久化能力”的轻量脚本场景。  

## 验收规则（本轮收口）

1. 所有超时/异常必须有 `unknown` 归档与 `RetryWaiting` 入口，不能直接返回成功。  
2. 同一 `businessKey` 在任一时间仅允许 1 个“可触发外部副作用”的有效 lease；重复重领只允许接管本地 claim。  
3. 批处理返回结果必须包含 `successList / retryList / failedList`，且任一项存在失败时状态不得是 `Success`。  
4. 关键路径与页面状态校验并行完成；未满足关键流程终态（可复核账务、补充对账）不得升级为放行。  
5. 验收通过条件需含“适用边界”和“失效边界”两段签核，不再允许只写 `green`。  
