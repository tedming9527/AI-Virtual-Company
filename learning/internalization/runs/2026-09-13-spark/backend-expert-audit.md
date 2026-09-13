# 陆行远 · 可靠服务官 C（独立审查）

actual_model: `gpt-5.3-codex-spark`

任务范围：基于 `backend-expert-extract.md`、`backend-expert-transfer.md`、`frontend-expert-transfer.md`、`product-manager-transfer.md`、`test-expert-transfer.md`、`backend-training-architect-transfer.md` 审查迁移审稿中的可靠性边界。

## Claim / Evidence / Verdict

1) 事务边界（claim）
- claim: 本轮迁移将“本地 claim/租约（owner/token）”与“外部副作用”分离的方向正确，能避免把本地写入成功误判为外部交付成功。
- evidence:
  - `backend-expert-extract.md` 经验 1、3 明确 owner/token 与远端副作用不可等价。
  - `backend-expert-transfer.md` 与 `backend-training-architect-transfer.md` 将状态机改为 `Pending/Processing/Success/RetryWaiting/Failed/Dead`。
  - `test-expert-transfer.md` 要求并发/超时场景不能直接 Success。
- verdict: PASS（通过）。当前决策避免“单点事务成功即业务完成”的高风险误判。

2) 跨系统幂等（claim）
- claim: 稳定业务键为幂等主锚点，trace/requestId 只做观测；重试不能更换主键。
- evidence:
  - `backend-expert-extract.md` 经验 2 与 `backend-training-architect-transfer.md` 的修订。
  - `backend-expert-transfer.md` 与 `frontend-expert-transfer.md` 均要求旧响应归属不可覆盖新请求。
- verdict: PASS（通过）。方向正确，但需要在实际代码中补齐“下游幂等契约不完整时”的 fallback 才能形成可执行边界。

3) 状态所有权（claim）
- claim: owner/token 属于本地领取权与并发防护，不是外部执行权归属，不应承担最终可撤销/可重放权定义。
- evidence:
  - `backend-expert-extract.md` 经验 1。
  - `backend-training-architect-transfer.md`（owner/token 仅界定本地领取权）。
  - `product-manager-transfer.md` 与 `frontend-expert-transfer.md` 对高风险路径采用状态公开与契约门禁。
- verdict: PASS（通过）。

4) 失败恢复与未知态（claim）
- claim: 使用 `unknown -> RetryWaiting`，并带上限/人工介入门槛，能把“超时/响应丢失”从错误吞没提升为可恢复态。
- evidence:
  - `backend-expert-extract.md` 经验 2、4。
  - `backend-expert-transfer.md` 验收规则要求 unknown / RetryWaiting 不得返回 Success。
  - `test-expert-transfer.md` 与 `product-manager-transfer.md` 加入 12h 首次观察、24h 阻塞等治理节点。
- verdict: PARTIAL（部分通过）。语义层成立，但目前文档对“同一批次 unknown 持续多久触发哪一类人工升级”只给出建议阈值，缺少跨队列统一强制性阈值定义。

5) 金额/精度边界（claim）
- claim: 金额失败不应默认为 0，需保留计算状态与来源，避免把异常吞掉污染口径。
- evidence:
  - `backend-training-architect-transfer.md` 将“默认降级 0”改为“显式降级+来源标记+人工复核”。
  - `backend-training-architect-transfer.md` 的字段口径三段解耦提法。
- verdict: PASS（通过）。该条目前在文档层成立，但未见统一数值精度单位策略（如金额单位、舍入规则、尾差归属）在迁移方案中落地。

6) 迁移边界（claim）
- claim: 迁移题与验收框架已区分训练结论与真实生产上线条件，关键边界是 high-risk + unknown 时必须阻断。
- evidence:
  - 四份 transfer 文档均用“阻断 unknown、不可默认灰度、需人工对账时限”作为硬门槛。
  - `backend-expert-transfer.md`、`test-expert-transfer.md` 均禁止仅靠截图/构建放行。
- verdict: PASS（通过）。

## 反例压力测试（至少1条）

- 场景：
  - W1 持有任务 A 并发起外部扣款接口调用，网络抖动导致响应超时；W1 本地 owner/token 回写被并发冲突拒绝。
  - W2 立即重领同一任务，按 W2 本地 claim 继续执行外部扣款。
  - 外部系统在超时后实际已执行 W1 扣款。
- 现状结论：
  - 若重试链路以新 requestId 当幂等键，重复扣款将发生。
  - 即便采用业务键，若没有人工介入与 `RetryWaiting` 再核机制仍可能进入“账务双记/人工扯皮”状态。
- 合规性检验：
  - 所提规则已能避免将 W1/W2 当新业务执行（只要执行时确实复用业务键），但仍依赖于外部对账窗口的明确时长。

## 未决项（unknown）

- 未明确：
  - 高风险场景的“重复副作用容忍上限”与对应的运营责任方（财务/测试/PM）SLA 未被最终量化（目前文档仅明确“有界/需人工介入”）。
  - 对金额字段缺乏统一精度与舍入/尾差归属标准（建议统一到“金额单位 + 舍入策略 + 差额归属责任人”）。
  - `unknown` 状态的跨批次升级策略（12h/24h）仍是治理建议，未见统一强制式全局策略。

## 结论

- final verdict: HELD
- 通过项：事务边界、状态所有权、幂等主锚点、unknown 恢复语义在文档层面成立。
- 暂止项：未给出生产级 SLA 与金额精度策略，故该次迁移审阅应保持阻断复核态（held）。
- 建议：补齐 3 份最小可执行配置项并复测：
  1. 重试恢复窗（T1、T2）与人工闸门统一模板；
  2. 外部副作用去重键与无幂等 fallback 的手册；
  3. 金额单位/精度/差额归属三元标准。
