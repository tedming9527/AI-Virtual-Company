# 顾清妍 · 质量测试工程师 迁移归档：Spark 运行分身 B

Primary: 顾清妍 · 质量测试工程师（Test Expert）
Consult: 陈知行 · 路由官（Chief of Staff）
Outcome: 融合测试、前端、后端、产品与 AI 岗位证据，重建冲突质询闭环并定义可迁移灰度/对账门禁。
actual_model: gpt-5.3-codex-spark
输入路径:
- learning/internalization/runs/2026-09-13-spark/test-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/product-manager-extract.md
- learning/internalization/runs/2026-09-13-spark/frontend-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/backend-expert-extract.md
- learning/internalization/runs/2026-09-13-spark/ai-engineer-extract.md
- learning/internalization/ARCHITECTURE.md

## 一、异步对话重建（证据驱动）

### 业务相关者质询 1

**业务相关者质疑（发布负责人）**：自动化通过、主流程截图达标，但并发/超时仍 `unknown`，是否可以先灰度？若不允许，谁在多久内发起人工对账与干预？

**本岗回应**  
`test-expert-extract` 的经验单元 1、2、4明确写明：构建/静态/截图只是阶段证据，`unknown` 的并发/超时主路径不能直接放行。`backend-expert-extract` 与 `frontend-expert-extract` 同样强调外部副作用与视图归属分离，说明仅凭主流程绿灯无法证明终态无副作用。  
因此先保留结论：  
1) 并发/超时 `unknown` 时，灰度不得进入“放行”状态；  
2) 必须记录手工干预责任人、触发条件与截止时间，默认 `sloDeadline = 24h`，到期未关单记入阻塞清单。

**反质疑（产品视角）**：如果按此规则，发布窗口会被频繁卡住；是否可先行投放受控灰度，失败后再回收？

**修订决定（保留+修改）**  
- **保留**：`unknown` 终态仍为放行阻断。  
- **修改**：允许“受限观察启动”而不是“正式灰度”：
  - 仅允许 `pilot-note` 采样流，不计放量结论；
  - 页面与任务需要显式 `risk_hold=unknown_terminal`；
  - 自动写入人工对账清单：`owner=发布测试owner`、`nextCheckpoint=发现后12小时回填`、`escalation=24h不闭环自动阻塞`。
- 任何 `unknown` 项出现外部副作用（发单/扣费/退回）未核实时，恢复入口仅可向测试顾问和主责触发，不可由开发自决。

### 业务相关者质询 2

**业务相关者质疑（产品经理）**：主指标上升但关键体验指标下降时，能否设置二级放行线（如 10% 灰度）先跑完观察？

**本岗回应**  
`product-manager-extract` 的经验 2 与 `test-expert-extract` 经验 3 共同表明描述性指标不能直接当通过；构建/截图无法替代关键体验闭环。该质询在测试侧的判定是：  
- 关键体验/副作用未闭环时不进入任何“放行层”；  
- 二级放行线只能用于无高风险副作用且无 `unknown_terminal` 的路径。  

**反质疑（测试与后端）**：如果业务要求快速验证，是否可以以“低风险页面状态”先放行 10%？  

**修订决定（修改）**  
- 新增二级放行前置：  
  1) 明确动作风险分级（高风险动作需测试顾问签字）；  
  2) 明确 `release_state` 与 `evidence_state` 两类状态同闭合；
  3) 所有关键副作用链路的 `unknown_terminal=0` 才可进入 10% 灰度。  
- 高风险动作（支付/发布/AI 自动执行）一律不允许“先灰度后修”。

### 业务相关者质询 3

**业务相关者质疑（AI 工程）**：`站内保留 10 天` 与 `发布后 7 天观察`可否合并成统一窗口？  

**本岗回应**  
`ai-engineer-extract` 指出内容保留与发布后观察是不同目的阈值，`test-expert-extract` 的“状态/副作用分离验收”也不支持口径混算。不能直接合并。  
- `10天`：内容生命周期与保留权限控制；  
- `7天/240h`：发布观察与可见性窗口。  
它们可共享字段映射，但不能互替。  

**反质疑（前端）**：统一窗口可减少联调成本，是否可在文案层面先做统一口径？  

**修订决定（保留）**  
- 保留双窗口分离；  
- 文案和状态面板可统一展示，但仍要写明“content_state / release_state / evidence_state”三种状态来源，不允许把 `content_state=留存中` 当作收益观察完成条件。  

## 二、未预先给出的跨场景迁移题（自行设计并作答）

### 题目  
某 SaaS 在“账单重算”入口新增了 `AI 自动复核`，支持两类来源：  
1) 用户手工提交批次；2) 事件总线自动触发。  
系统行为变化有三点：  
- 原本 30 分钟内仅单次触发，现在允许 5 秒内连续重试提交；  
- 原本有单点 UI 截图验收，现在要求按批次返回 `partial/success/failure` 明细；  
- 原本不允许取消操作，现在后端会在个别场景返回 `cancel_supported=false`。  

**问题**：迁移到该场景时，测试门禁如何定？能否放行灰度？何时必须人工对账？  

### 本岗作答  
1) 保留“终态优先”测试原则：将批次结果与 UI 显示解耦，必须按 `batchId` 归档 `successList / retryList / failedList / unknown`；每批次缺失明细禁止放行。  
2) 引入 `unknown_terminal` 门禁：只要 `batch` 中任一任务为 `unknown` 且外部副作用可能发生，则进入 `blocked`。  
3) 取消能力分离：后端返回 `cancel_supported=false/unknown` 时，前端/测试不得接受“可撤销”承诺；只允许展示任务状态页和工单路径。  
4) 并发与重试重放控制：连续重试时，以请求版本/上下文快照做归属，防止旧回包覆盖。  
5) 灰度资格：仅当 `unknown_terminal=0` 且 `manual_reconcilation_queue` 空，才允许灰度；否则只允许 `pilot-note` 观察，不计入 release。  

## 三、验收规则（本 run）

1. **阻断规则**：任一批次存在 `unknown_terminal` 且外部副作用链路不闭环时，发布门禁应输出 `blocked`，并生成人工复核项。  
2. **对账规则**：生成对账项时必须给出 `owner + deadline + reopen_rule`；默认 `deadline=24h`，超时自动升级。  
3. **可视终态规则**：主流程截图/构建通过不能覆盖 `partial/failure/unknown` 明细；放行页必须展示终态计数与异常明细。  
4. **高风险规则**：涉及支付/发布/自动化执行动作，若 `cancel_supported != true`，不得出现“可撤回/自动补救”通过承诺。  
5. **状态一致性规则**：快速连续重试必须通过版本归属校验，最终只承认当前上下文下的终态更新。  

## 四、可复用架构单元与边界

### 可复用单元 1：`terminal_unknown_blocker`
- 作用：把并发、重试、超时产生的 `unknown` 与外部副作用决策绑定，直接输出测试放行门禁。  
- 适用边界：批处理、异步执行、外部接口副作用链路。  
- 失效边界：对纯只读功能或无副作用路径可视为非必检；若缺少“是否影响外部副作用”字段，需回退到保守阻断。

### 可复用单元 2：`tri_state_batch_acceptance_matrix`
- 作用：将 `success/partial/failed/unknown` 与 `owner/token`、业务结果一致性、人工复核时限形成统一验收矩阵。  
- 适用边界：发布、对账、补贴/扣费、任务重放场景。  
- 失效边界：若依赖单一指标（截图、构建、成功计数）且无明细，矩阵失效。

### 可复用单元 3：`state-window_gate`
- 作用：把 `content_state`、`release_state`、`evidence_state` 显式解耦，防止时效窗口混用。  
- 适用边界：需要同时管理生命周期、发布观察、财务/运营核验的流程。  
- 失效边界：窗口字段来源缺失或字段语义不一致时，不得合并口径强行放行。

## 五、自检

- 已按至少一轮完整的“业务相关者质疑→本岗回应→反质疑→修订决定”输出。  
- 已提供未预先给答案的跨场景迁移题并给出闭环答复。  
- 已列验收规则、输入路径、`actual_model`、至少 1 条保留规则与 1 条修改规则。  
- 已明确可复用架构单元与边界。  
- 仅写入本文件：`learning/internalization/runs/2026-09-13-spark/test-expert-transfer.md`。 
