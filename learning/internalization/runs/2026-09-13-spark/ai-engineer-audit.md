# 辛澈 · AI工程师 边界质疑分身 C 审核稿（Spark 2026-09-13）

Primary: 辛澈 · AI工程师  
Consult: 陈知行 · 路由官（Chief of Staff）  
Outcome: 对 AI工程师迁移文档族做来源层级、时效性、事实边界与权限边界审计

actual_model: `gpt-5.3-codex-spark`

> 2026-09-24 审计修复：actual_model 为当时文档声明值；运行模型未独立鉴证，保持 unknown。

输入文件：
- `learning/internalization/runs/2026-09-13-spark/ai-engineer-extract.md`
- `learning/internalization/runs/2026-09-13-spark/ai-engineer-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/product-manager-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/test-expert-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/chief-of-staff-transfer.md`

## 一、来源等级与事件/页面日期审计

1. 声明链上最上位：`ai-engineer-extract.md` 明确引用 `LEARNING_POLICY.md`、`INITIALIZATION_POLICY.md`、`ROUTER.md`，并给出 `actual_model`，来源结构可追溯。  
2. 迁移链上层次：`ai-engineer-transfer.md` + `product-manager-transfer.md` + `test-expert-transfer.md` + `chief-of-staff-transfer.md` 以“输入路径+重放对话+修订决定”形式串联，属于中高可复用层。  
3. 事件日期完整性：
   - 任务日期与 run_id：4 个迁移稿（ai-engineer-extract、ai-engineer-transfer、product-manager-transfer、test-expert-transfer、chief-of-staff-transfer）均绑定 `2026-09-13` 或 `2026-09-13-spark`。  
   - 页面日期（claim text 的“当时状态页”/“当时截图”）在迁移稿中多为“逻辑状态”叙述，缺少可验来源路径的采样时间戳。  
4. 结论：事件主轴为“当天训练批次（run）”，但部分页面状态缺少页面级日期锚点，需标为 `unknown-页面日期`，不能直接当作当前系统快照。

## 二、Claim / Evidence / Verdict 审核

### Claim 1（可复用）：学习触发规则必须先经过关键词解析器与预算快照
- Claim: 只要出现人群+百分比+模型名信号，就需执行 `resolve-model-learning-request` 并做前后用量快照。  
- Evidence: `ai-engineer-extract.md` 与 `LEARNING_POLICY.md` 的规则段。  
- Verdict: PASS（规则一致）。`ai-engineer-extract` 与 `ai-engineer-transfer`/`chief-of-staff-transfer` 的多处结论均未违背该门槛。

### Claim 2（可复用）：发布/高风险动作不得以主流程通过（截图、提交成功）替代终态放行
- Claim: “提交成功”与主流程通过只能作为阶段证据，不应直接放行。  
- Evidence: `ai-engineer-extract`、`test-expert-transfer.md`、`product-manager-transfer.md`、`chief-of-staff-transfer.md`。  
- Verdict: PASS（定义一致，且测试稿对 unknown 做阻断更为严格）。

### Claim 3（可复用）：内容保留与收益观察是双窗口，不可混算
- Claim: `10天站内保留` 与 `240小时/7天观察` 分属不同用途，必须分离。  
- Evidence: `ai-engineer-extract.md`、`product-manager-transfer.md`、`test-expert-transfer.md`、`chief-of-staff-transfer.md`、以及 `LEARNING_POLICY.md` 的“边界/规则稳定性”要求。  
- Verdict: PASS（四份迁移稿均未把两个窗口合并为单口径）。

### Claim 4（部分存疑）：高风险动作可先做“受限观察”但不可放行
- Claim: `unknown` 且高风险动作下可启用 pilot-note 级别观察，但不得上线。  
- Evidence: `ai-engineer-transfer.md` 与 `test-expert-transfer.md`。
- Verdict: PASS + CONSTRAINT-STRICT（可，但只能以 `not-ship / conditional pilot` 呈现；`chief-of-staff-transfer.md` 对此也支持“观察型提案不放量”）。

### Claim 5（问题项）：迁移题答案已改变多维度，且可判定放行路径
- Claim: 四个 transfer 案例均提供跨场景迁移题并给出“放行/观察/阻断”结论。  
- Evidence: `ai-engineer-transfer.md`、`product-manager-transfer.md`、`test-expert-transfer.md`、`chief-of-staff-transfer.md`。  
- Verdict: PASS（均含结论和依据），但 `product-manager-transfer.md` 仍依赖其引用输入文件未在本任务中复核，故最终状态记为 `held`+`unknown` for upstream证据一致性。

## 三、时效与页面日期风险

1. 统一时点：run 级别日期明确（2026-09-13）。  
2. 页面级时点：迁移稿把“构建通过/截图通过/unknown”作为证据结论描述，但未给出证据时间戳。  
3. 结论：时效性可用于回放训练，不等同生产状态快照；对任何“当前可发布”主张都应要求更新到实际事件时间。

## 四、发布/删除权限边界审计

1. 发布权限边界在规则层面一致：  
   - 高风险动作（发布、财务、AI 自动执行）默认非承诺可撤回，需 `cancel_available` 真实可验证值。  
   - `unknown/false` 时仅显示状态说明，不写“可恢复/自动补救”。  
2. 删除权限边界：仅有 `chief-of-staff-transfer` 与 `product-manager-transfer` 提到回滚与中止条件，未在 ai-engineer 文档看到删除链路细化权限字段（如 `delete_state`）。  
3. 结论：删除权限目前是“描述了边界原则但缺少可执行字段”。这在本轮不构成矛盾，但应在下一轮补 `delete` 责任/幂等与回滚闭环字段。

## 五、迁移边界审计

1. 迁移单元（A/B/C）定义完整：`stakeholder_conflict_gate`、`state-window_gate`、`terminal_unknown_blocker`、`state-window` 等结构化单元可复用。  
2. 迁移约束：四份迁移稿将“主指标”“体验指标”“副作用”“终态验证”分层；这能支持从“内容/发布/财务”多场景迁移。  
3. 边界风险：各稿虽多次强调输入路径，但未在每条迁移结论后逐条给出原始源文件行号级映射（例如外部来源路径+时间）。  
4. 结论：迁移边界“逻辑正确 + 工程化可落地”，但证据可追踪性不完全（需补充文档行级引用）。

## 六、反例压力测试（至少一条）

- 压力场景：A 场景为高风险发布任务，主指标上升 + 并发/超时仍为 `unknown`，但 PM 要求 48 小时 `gray/5%`。  
  - 触发规则：`ai-engineer-transfer.md` 允许受限观察；`test-expert-transfer.md` 要求 `unknown_terminal=0` 才允许 10% 灰度；`product-manager-transfer.md` 允许受限观察但经验性保留门槛；`chief-of-staff-transfer.md` 强化三重边界隔离。  
  - 预期判定：在 `unknown_terminal` 未闭环时，应仍为 `blocked` 或仅 `pilot-note`，不得改写为“已放行”。  
  - 结论：四份文档结论可收敛，压力测试通过（pass）。

## 七、最终裁决

- pass:  
  1) 源级别分层清晰；  
  2) 主指标优先级与风险门禁一致；  
  3) `双窗口`, `受限观察`, `unknown阻断` 三类关键机制一致。  
- held:  
  1) 部分迁移断言依赖未在本次审计中读取的输入文件（`product-manager-extract.md`、`frontend/frontend-expert-extract` 等）；  
  2) 部分页面级状态、权限字段未见行级时间戳与字段 schema，影响生产即时时效裁决。  
- unknown:  
  1) 各迁移稿的 `content_state / release_state / evidence_state` 到底是否已在实际系统中有统一事件模型尚未实测；  
  2) 删除/回滚权限字段（`delete_supported`/`cancel_supported`）的实时可验证来源还未在本次输入中出现。

## 八、后续可继续探索的问题

1. 是否需要在 `learning/internalization/ARCHITECTURE.md` 中新增统一状态字段定义（包含 `delete_supported/cancel_supported`）作为跨文件 schema 契约？  
2. 可否补充每次重放迁移题的“证据时间戳 + 输入文件行范围”，使迁移结论支持生产时的审计查询。  
3. 该批 `held` 仅为“追溯粒度不足”问题，不是规则冲突；建议优先补齐后再将 audit 结论提升为 `pass`（非 held）。
