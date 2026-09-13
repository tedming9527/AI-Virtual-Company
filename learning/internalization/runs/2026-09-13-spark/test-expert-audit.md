# 顾清妍 · 质量测试工程师（边界质疑分身 C）审计

Primary: 顾清妍 · 质量测试工程师（Test Expert C）  
Consult: 陈知行 · 路由官（Chief of Staff）  
Outcome: 独立审查 Spark 运行分身 B 的主张边界与证据闭环，聚焦真实/模拟边界、回归、并发、AI 质量与迁移验收  
actual_model: gpt-5.3-codex-spark  
target_path: learning/internalization/runs/2026-09-13-spark/test-expert-audit.md  

## 审计输入

本次只引用以下材料进行交叉核验：

- `test-expert-extract.md`
- `test-expert-transfer.md`
- `product-manager-transfer.md`
- `frontend-expert-transfer.md`
- `backend-expert-transfer.md`
- `ai-engineer-transfer.md`

## Claim / Evidence / Verdict

1. Claim: “构建/截图/自动化仅是阶段证据，不能直接判定通过。”
   - Evidence:  
     - test-expert-extract 的经验单元 1 明确写明“构建成功、静态回归仅阶段证据”；  
     - test-expert-transfer 在并发/超时 unknown 下仍做 release 决策；
     - frontend/backend/AI 三份 transfer 均要求终态/对账闭环后再放行。  
   - Verdict: ✅ Pass（结论闭合一致，证据链清楚）

2. Claim: “并发与重试必须绑定真实外部副作用，不得把本地回写/owner/token 当作外部幂等证据。”
   - Evidence:  
     - test-expert-extract 经验单元 2；  
     - backend-expert-transfer 明确 `business key` 为外部副作用去重锚点、`requestFingerprint` 仅用于视图；  
     - frontend-expert-transfer 提到视图归属与副作用不可画等号。  
   - Verdict: ✅ Pass（原则一致，边界分离合理）

3. Claim: “并发/超时出现 `unknown` 时，放行应阻断而非受益于主流程绿灯。”
   - Evidence:  
     - test-expert-extract：`partial/blocked` 驱动。  
     - test-expert-transfer：`risk_hold=unknown_terminal` 与对账清单；  
     - product-manager-transfer：24h 首轮观察、T+12h 紧急复查，未闭环即 blocked；  
     - AI/frontend/backend 迁移题与验收条目都把 unknown 作为放行条件失败项。  
   - Verdict: ✅ Pass with Refinement（允许“观察启动”而非正式灰度，需严格区分）  

4. Claim: “高风险动作（支付/发布/财务/AI 自动执行）不能承诺可撤回/自动补救，除非后端能力可验证。”
   - Evidence:  
     - 前端与产品文案：`cancel_supported=false/unknown` 时仅给观察说明；  
     - backend 侧不将前端交互当成外部幂等；  
     - test-expert-transfer 明确高风险动作不能先灰度后修。  
   - Verdict: ✅ Pass（规则闭合且实现层/展示层分离清晰）

5. Claim: “迁移题与回归验收需跨维度验证（体验/逻辑/可靠性），不以单一指标判定。”
   - Evidence:  
     - 前端、测试、AI、后端 transfer 都定义 PASS 条件，包括 `success/retry/failed` 明细与状态一致性。  
     - product-manager-transfer 的 PM-Quality 联流闸口也要求同口径对照和终态。  
   - Verdict: ⚠️ Held（可执行框架完整，但当前材料未给出真实执行证据，仅是规则/题面推演）

## 证据范围与边界问题（Real vs Mock）

- 真实执行边界：
  - 文件间一致把生产放行与副作用验证绑定在“真实终态、对账、人工复核项”上，区分开了 mock/本地与生产影响链路。
- 模拟/结构边界：
  - 各 transfer 文档主要是迁移题演绎与过程闭环文本，不是对真实系统回放结果的日志证据。
- 风险：若将该类“迁移题结论”误当作运行验证结论，会出现过度承诺。

## 回归与并发覆盖审查

1. 回归覆盖  
   - 有：迁移题普遍包含重试、取消能力、终态明细、灰度阻断、时限升级。  
   - 缺：对历史运行结果的再验证（如是否已有旧任务按上述门禁失败/修复）未见回填。  

2. 并发覆盖  
   - 有：`businessKey` + `requestFingerprint` 双轨分离写法清楚。  
   - 有：`RetryWaiting` / `PartialSuccess` / `unknown_terminal` 被显式纳入放行约束。  
 3. 缺：`unknown` 的来源分类（超时已执行但未回执 vs 未执行）在 transfer 中仍偏决策口径，缺少统一枚举与采集标准。  

## AI 质量与评测隔离

- 积极项：  
  - 多份 transfer 明确“灰度不等于放行”，并保留反质疑、修订决策链；  
  - `actual_model: gpt-5.3-codex-spark` 被一致标注。  
- 偏差风险：  
  - 若主观文本被误读为生产行为结论，可能突破实施者-评估者隔离边界。  
- 结论：评测输出偏“复核模板”而非“事实结论”，总体风险可控，但需要强制落地态痕迹。

## 反例压力测试（至少一例）

### 压力测试 1：高风险重复触发 + 异常返回 + 快速重试

- 场景：在 5 秒窗口内对同一 `businessKey` 发起 40 次提交；部分请求超时，部分返回 `cancel_supported=false`，部分回执重复到达；外部渠道存在扣费副作用。  
- 预期规则执行：  
  1) view 层必须仅展示与最新 `requestFingerprint` 相关状态；  
  2) backend 需阻止外部副作用重复触发（按业务键）并形成 `RetryWaiting`/`unknown_terminal` 列表；  
  3) 前端不得出现可撤回承诺。  
- 结论：若任何“并发成功计数增长”即可 release，则判为 Fail；当前各 transfer 文件规则足以阻止这种偏差，但文档未提供该场景的实证运行证据。  
- Verdict: ⚠️ Held（规则正确，缺实证）

## 最终结论（pass / held / unknown）

- 本次边界质疑审计结论：  
  - `pass`: 核心质量边界主张与分身间一致；  
  - `held`: 对“unknown 风险的工程化实证闭环”仍无可追溯运行证据；  
  - `unknown`: 真实系统中 `unknown` 的归类标准（已执行/未执行/重复执行）尚未被统一定义。  

## 仍需继续探索的问题

1. 统一 `unknown` 的机器可解释分类（已执行 vs 未执行）以及对应对账模板。  
2. 将“观察启动（pilot-note）”与“正式放行”建立显式状态矩阵与不可绕过开关。  
3. 让每个迁移题输出与至少一次真实任务回放/日志采样挂钩，防止规则停留在文本层。  
