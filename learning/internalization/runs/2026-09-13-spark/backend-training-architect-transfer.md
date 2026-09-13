# 后端培训导师（Spark）迁移架构分身 B：交付重建记录

Primary: 沈砚舟 · 后端培训导师（backend-training-architect）；Consult: 顾清妍 · 质量测试工程师（test-expert）；Outcome: 形成异步四方对话重建与迁移题复核，提炼可复用架构单元与边界。
actual_model: gpt-5.3-codex-spark
run_id: 2026-09-13-spark-backend-training-architect-transfer
input_paths:
  - learning/internalization/runs/2026-09-13-spark/backend-training-architect-extract.md
  - learning/internalization/runs/2026-09-13-spark/backend-expert-extract.md
  - learning/internalization/runs/2026-09-13-spark/test-expert-extract.md
  - learning/internalization/runs/2026-09-13-spark/product-manager-extract.md
  - learning/internalization/ARCHITECTURE.md

## 业务相关者质疑 → 本岗回应 → 反质疑 → 修订决定

### 议题 A：租约重领 + 远端不幂等 + 超时未决，能否允许短时重复副作用？

业务相关者质疑：在租约重领、远端返回超时或无幂等时，能否允许重复副作用？允许重复到什么上限？超过后谁在多久内做人工对账？

本岗回应：  
现有证据未给出可执行的业务 SLA 和容忍重复上限，因此不能凭本地 owner/token 逻辑直接宣告可重复窗口，也不能把超时当“未执行”自动重试。需将“本地领取/远端副作用/恢复策略”三类状态分离，使用稳定业务键做去重，不允许以 trace/request id 替代。  
（证据：`backend-expert-extract.md` 经验 1、2；`backend-training-architect-extract.md` 经验 3；`test-expert-extract.md` 与 `ARCHITECTURE.md` 的状态机要求）

反质疑：  
如果缺少下游幂等，是否仍可“先跑再对账”以保持吞吐？  

修订决定：  
将规则改为“有界恢复”：
1. 自动重试只在 `pending_unknown` 与 `retry_window` 内进行，且所有重试共用业务键；
2. 任一副作用超过窗口且仍未可查询确认时，自动降级为 `RetryWaiting` 并触发人工/运营介入；
3. 未决项默认保留 `unknown` 且不进入成功看板。  
  
保留规则：将 `trace/request id` 仅作为观测链路字段；不会作幂等判定主键。

### 议题 B：金额口径出现外部查询异常时是否可默认 0 以继续流程？

业务相关者质疑：财务/运营希望异常时不中断流程，是否可以把失败金额暂时按 0 填充，并后续补账？

本岗回应：  
金额链路不能默认降级为 0，除非明确业务签字授权并记录来源状态；否则会把异常值与真实值混同，影响收益口径追溯。  
（证据：`backend-training-architect-extract.md` 经验 1、2；`backend-expert-extract.md` 经验证据链）

反质疑：  
若系统不能短期阻塞，是否可临时写入待核对态并继续上游流程？  

修订决定：  
保留“不中断可用性”，但新增可复核字段与状态：
1. 输出值保留原计算可读状态（如 `calcState=UNKNOWN|DEGRADED|OK`）；
2. 异常金额与口径差异单独入账列，必须携带来源状态；
3. 只在用户授命策略明确时写入回退值，并记录人工复核清单。  
  
修改规则：从“默认降级 0”改为“显式降级+来源标记+补偿路径强制保留”。

## 未预先给答案的跨场景迁移题（案例训练 vs 真实能力）

### 迁移题
场景变更：  
1) 同一任务既有**固定收益订单导出**又有**异步返佣回调**；  
2) 回调通道 A 可幂等，通道 B 不幂等；  
3) 同时存在“批处理每 500 条+租约扫描 + 人工对账窗口 2 小时”。  

问题：在此场景下，如何定义可复用的边界行为，避免“部分成功”被当成完成？  

作答：
- 将对象拆分为三段状态：`claim`、`remote_side_effect`、`reconcile`。  
- `claim` 与 `remote_side_effect` 分离，任何失败/未决只能通过 `RetryWaiting` 或 `Dead` 明确终态流转；  
- 对可幂等通道 A 使用业务键 + 幂等确认；对不幂等通道 B 采用窗口内一次主重试 + 超窗人工介入；  
- 批处理任务返回结构要包含每条对象 `Success/Failed/RetryWaiting` 清单，不允许只返回 `result.size()`。  
- 回调端到端成功率统计只可用于监控，不作为“交付成功率”唯一口径；收益回盘看 `calcState` 与对账清单。  

案例训练结论（本次复用）：  
以上做法可训练“迁移题解法”与“边界识别能力”。  

真实能力验收结论：  
将上述规则固化到课程/评审模板并在真实任务中实测（含至少一次人工介入场景）后，方可认为可生产采用；当前仅作为可复用方法，不自动等同于生产就绪。

## 可复用架构单元与边界

- 可复用架构单元：  
  1. 字段口径三段解耦（来源系统 → 聚合规则 → 展示字段）；  
  2. 交易状态机（Pending/Processing/Success/RetryWaiting/Failed）；  
  3. 租约模型（owner/token/leaseUntil）与稳定业务键分离于 trace id；  
  4. 金额计算可观测化（精度、尾差归属、异常状态）；  
  5. 批处理失败清单化输出（单项失败可重试且可人工接手）。

- 边界：  
  - `owner/token` 仅界定本地领取权，不保证外部副作用已执行；  
  - afterCommit 是时机边界，不等价外部可靠消息；  
  - `unknown` 是独立状态，需保持可查询和恢复入口，不可自动转化为成功；  
  - 重试键必须优先选业务键，trace/request id 仅观测索引。

## 验收规则

1. 规则可执行性：文件内至少保留 1 条原有规则、1 条修订规则，并标明适用与非适用条件。  
2. 证据闭环：每条决策点必须关联 evidence 文件路径（见 input_paths），并显式标记 `known/unknown`。  
3. 异步对话闭环：每条业务质疑必须有“本岗回应 + 反质疑 + 修订决定”的闭环痕迹。  
4. 迁移题完整性：迁移题至少改变两个变化轴，且包含作答与失败回退策略。  
5. 训练/生产分离：明确区分“案例训练适用结论”与“真实生产可上线前置条件”。
