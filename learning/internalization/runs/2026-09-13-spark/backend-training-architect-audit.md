# 后端培训导师（Spark）边界质疑审计记录（分身 C）

Primary: 沈砚舟 · 后端培训导师；Consult: 顾清妍 · 质量测试工程师；Outcome: 对 2026-09-13 三份跨岗迁移材料做边界质疑收敛，确认案例训练与真实能力界面分离与收口。
actual_model: gpt-5.3-codex-spark
run_id: 2026-09-13-spark-backend-training-architect-audit
input_paths:
- learning/internalization/runs/2026-09-13-spark/backend-training-architect-extract.md
- learning/internalization/runs/2026-09-13-spark/backend-training-architect-transfer.md
- learning/internalization/runs/2026-09-13-spark/backend-expert-transfer.md
- learning/internalization/runs/2026-09-13-spark/test-expert-transfer.md

## claim/evidence/verdict

1. 训练链路在“案例训练”和“真实生产能力”上已经做了明确分离。  
   - evidence: transfer.md 与 backend-expert-transfer.md 均写明“案例训练结论不等于生产就绪”与“真实能力验收需要人工介入与对账条件”；test-expert-transfer.md 也用 `unknown_terminal` 与 `pilot-note` 区分观察与正式放行。  
   - verdict: PASS

2. 代写边界被明示为“只改进结构、不给出业务默认值”，并保留了 `unknown` 与 `RetryWaiting`。  
   - evidence: extract.md 强制“不能把字段名直接当口径”与“异常默认 0 有高风险”，transfer.md 规定“默认降级 0 仅在明确授权下允许”；test-expert-transfer.md 对高风险动作 `cancel_supported!=true` 给出不可承诺可撤销。  
   - verdict: PASS（部分保守性边界依赖业务授权）

3. 源码/业务事实证据链被纳入可复核路径，但未见全链路实测闭环。  
   - evidence: extract.md 指向学习知识源并标明事实来源路径；transfer.md 引入三段状态（claim/remote_side_effect/reconcile）；然而这三份材料均未提供可执行 SQL/测试用例结果或外部系统确认快照，属于方案级复核而非行为级验证。  
   - verdict: HELD

4. 迁移题强度不足够“可直接上线”要求，主要停在决策模板层。  
   - evidence: transfer.md 的迁移题覆盖了“可幂等/不可幂等+超时+租约”复杂组合，test-expert-transfer.md 也覆盖“批次明细+连续重试+取消能力变化”；但都以规则重建为主，未给出固定指标阈值（例如重复容忍上限、人工介入 SLA 的权威值）。  
   - verdict: HELD（待业务定义阈值）

5. 反馈闭环有回合闭合（质疑-反质疑-修订）且有多岗交叉，但仍缺少统一度量签核点。  
   - evidence: transfer.md、backend-expert-transfer.md、test-expert-transfer.md 均有“质疑→回应→反质疑→修订”链路；然而没有统一“最终签核”字段（例如 owner、deadline、退出条件）在同一文本内合并。  
   - verdict: PARTIAL

## 反例压力测试（至少一项）

### 压力场景
同一批次 500 笔订单中，1 笔外部回调 B 无幂等，回放窗口 10 分钟。  
事件顺序：第 1 次执行把这笔订单成功下发到下游；3 秒后任务超时，任务状态错误标记为 `Success` 并返回总成功数；owner/token 过期后第二 worker 重领并重试该订单，导致重复扣款，但系统仅通过主成功率报表判定通过；财务侧因 `calcState` 缺省而未识别异常。

### 预期失败行为（当前材料中的应对是否足够）
- 若只按“批处理返回 size()”判定放行，风险暴露：重复副作用 + 无法回滚。  
- 现有材料给出的修复方向（`PartialSuccess` + 失败明细化 + 回放状态 `RetryWaiting` + 人工介入）可缓解，但没有给出“重复副作用已确认机制”与“重复上限”数值，会出现判定执行但不能自动阻断的灰色地带。  
- 因此该压力测试下，当前方案仍属于“可解释修复策略齐备、执行阈值缺失”，不满足直接生产放行条件。  

## pass / held / unknown

### pass
- 交叉质疑闭环结构存在，避免了简单堆叠观点。  
- 多份材料都保留了“案例训练结论 ≠ 真实生产能力”的边界。  
- `unknown` 状态与“不得默认成功”原则有持续强调。  

### held
- 未闭环的核心阻断问题：重复副作用允许上限、人工对账责任人与时限仍未形成统一主账单。  
- migration 规则重建尚停留在策略层，缺少可执行验收矩阵的硬门槛（最小不可接受阈值）。  
- 仍需把“重试窗口/人工介入条件”落在同一份可执行规则表中再放行。

### unknown
- 业务是否接受一次性重复副作用（N 次）尚无明确阈值，当前文件均记为 `unknown` 或“需业务签字”。  
- 财务复核责任人与响应 SLA（例如 12h/24h 之外是否还有更严格时限）在材料中未形成公司级统一答案。  

## 仍值得继续探索的问题

1. 统一定义 `unknown` 到“可放行/阻塞”的硬门槛：是否允许连续重试次数、最大租约延期次数、SLA 触发时间。  
2. 设计一版可落地的验收清单：包含 `successList / failedList / retryList / unknownList` 与 `manual_reconcilation_queue` 的必填项 schema。  
3. 把“谁在什么时点接管人工核对”写成固定责任矩阵（开发、测试、运营、财务）以消除当前多个文档的口径分散。  
4. 校验 `actual_model` 标识一致性（有一处 `gpt-5.3-codex-codex-spark` 拼写偏差）避免审计元数据污染。  

## 审计结论
overall_verdict: HELD
原因：当前材料在边界识别、风险提示和代写边界方面较完整；但在“真实生产可上线前的可观测阈值、人工干预 SLO 与统一放行签核”仍有未决项，需要再补一个可执行收口表格并补充一轮行为级回归证据后才能转为 PASS。
