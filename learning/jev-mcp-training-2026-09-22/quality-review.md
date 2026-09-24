# JEV MCP 全员训练独立质量复核

> 2026-09-24 审计修复：文中 #Lnn 行为 2026-09-22 快照行号锚点；后续追加会移动行号，定位以章节标题/短可搜索片段为准，需精确版本时核对文件 sha256。

- 日期：2026-09-22
- 复核人：顾清妍 · 质量测试工程师（Test Expert）
- 复核对象：目录内八个岗位训练文件
- 任务登记模型 / 推理强度：`gpt-5.6-sol / high`；本复核没有独立运行时模型身份读取接口，不把登记值扩展为平台鉴证
- 数据边界：仅复核去身份化合成训练记录；未读取任务卡、真实项目、客户数据、用户能力档案或个人额度账户
- 写入边界：仅本文件；未修改八岗训练文件、任务卡或 `REPORT.md`

## 复核方法与判定标准

逐岗核对七项要求：

1. 有效调用：存在 `backend=typesafe`、`model=jev-1.13.0`、有效 answer、latency 和 token usage。
2. verdict 处置：记录 answer、confidence、confidenceFrom、escalate；任何 `unsure` 或其他升级项停止直接采纳并人工复核。
3. 有 / 无 JEV 对照：至少覆盖耗时、上下文或 tokens、输出一致性、升级与适用边界；不可测项写 `unknown`。
4. 质疑修订：对 verdict、题型或假设提出实质反证，并记录保持或修订理由。
5. 迁移题：题面未预写答案，随后有明确作答与复核。
6. 无 JEV 替代协议：覆盖状态压缩、类型化、枚举、批处理、阈值和升级。
7. 声明边界：不把合成案例扩大为生产提效，不伪造个人 6% 周额度消耗或余额。

判定含义：`pass` 为七项均有明确证据且无实质矛盾；`partial` 为核心训练完成，但存在会影响可审计性的局部缺口或表述冲突；`fail` 为缺少有效调用、升级处置失当或多个核心要求缺失。

## 按文件引用的 JEV CLI 复核尝试

按 `jev-use` 的文件路由规则，本复核先用本地脚本逐一读取八个岗位文件；每个文件一次批量提交八个判断（七项要求加整体判定）给 `jev-use judge` CLI，正文没有打印或复制进对话。

结果：八次 CLI 均返回退出状态 3；共 64 个 verdict 全部为 `answer=null`、`confidence=0`、`escalate=true`、`reason=unreachable`，后端为 `typesafe`，错误为网络 `fetch failed`。因此：

- 没有把 CLI 失败当作任何岗位的通过证据；
- 64 项全部按 `unreachable` 升级，由复核人完整回读原文件后人工裁决；
- 本次 CLI 失败不覆盖各训练文件中已记录的有效 MCP 回执，但独立复核没有原始服务端日志，能验证的是记录完整性与内部一致性，而不是重新证明历史调用真实性；
- MCP 曾成功不代表 shell CLI 同时可用，二者可达性必须分开报告。

## 逐岗结果矩阵

列顺序为：有效调用 / verdict 处置 / 有无 JEV 对照 / 质疑修订 / 迁移题 / 无 JEV 协议 / 声明边界 / 总评。

| 岗位文件 | 调用 | 处置 | 对照 | 质疑 | 迁移 | 替代 | 边界 | 总评 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 辛澈 · AI工程师 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 陆行远 · 可靠服务官 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 沈砚舟 · 后端培训导师 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 陈知行 · 路由官 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 苏映雪 · 信任设计官 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 周启明 · 体验工程官 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 林知夏 · 目标规划官 | pass | pass | pass | pass | pass | pass | pass | **pass** |
| 顾清妍 · 质量测试工程师 | pass | pass | pass | pass | pass | pass | pass | **pass** |

最终汇总：`pass=8`、`partial=0`、`fail=0`。

## 逐岗证据与必要修正

### 辛澈 · AI工程师 — pass

通过证据：

- [有效调用](ai-engineer.md#L59)记录 `typesafe / jev-1.13.0`、719 ms、933/207 tokens，并逐题列出 answer、confidence、confidenceFrom 和 escalate。
- [迁移题与质疑](ai-engineer.md#L106)保留首次不可达、人工基线和恢复后的三项有效判断，随后排除“契约通过即可直接生产切换”的潜在误读。
- [无 JEV 协议](ai-engineer.md#L145)覆盖压缩、类型化、枚举、批处理、阈值和升级；[限制](ai-engineer.md#L188)没有把合成训练扩大为生产验收。

修正复核：

- [迁移题结论](ai-engineer.md#L120)现明确只在迁移动作、完成状态和证据等级三个核心维度比较，并声明这不是首次 8 题与恢复 7 题的逐题复现或整体一致率。
- [对照口径](ai-engineer.md#L131)现分别列明首次不可达 8 题、恢复有效 7 题、无 JEV 基线 3 个核心维度，并说明恢复批次还扩展了动作选项与 rollback 事实，只能比较核心方向。
- 表格只保留“3 个可比维度方向一致”，不再把不同题集写成完全同题；原 `partial` 缺口关闭，转为 `pass`。

### 陆行远 · 可靠服务官 — pass

通过证据：

- [有效调用](backend-expert.md#L43)记录 `typesafe / jev-1.13.0`、3711 ms、907/157 tokens，四个 verdict 均有 confidenceFrom 和 escalate。
- [迁移题](backend-expert.md#L69)、[同题对照](backend-expert.md#L75)、[质疑修订](backend-expert.md#L90)及[无 JEV 协议](backend-expert.md#L98)均完整；[额度边界](backend-expert.md#L137)明确个人 6% 实际消耗不可测。

修正复核：

- [调用说明](backend-expert.md#L34)现明确首次不可达调用的 JEV 阈值为 0.92；[恢复批次](backend-expert.md#L43)明确实际阈值为 0.80，案例与问题相同但阈值不同，不再声称全部参数保持不变。
- [处置段](backend-expert.md#L60)现只依据恢复批次自己的 0.80 阈值解释四题 `escalate=false`；[无 JEV 协议](backend-expert.md#L106)把人工自评阈值单独命名为 `manual_acceptance_threshold`，并声明数值相同不代表口径相同。
- 对照只比较最终离散结论，不比较 JEV 与人工路径的阈值、置信度或校准；原 `partial` 缺口关闭，转为 `pass`。

### 沈砚舟 · 后端培训导师 — pass

- [有效调用与 verdict](backend-training-architect.md#L23)记录 `typesafe / jev-1.13.0`、939 ms、1414/314 tokens；`A_quality` 的 0.73 低于 0.75 后正确 `unsure` 升级并人工定级。
- [同题对照](backend-training-architect.md#L73)固定 A/B/C 九题，明确人工耗时与 token 为 `unknown`；[迁移题](backend-training-architect.md#L115)先冻结题面，再质疑并修订路由条件。
- [无 JEV 协议](backend-training-architect.md#L87)完整；[额度和生产边界](backend-training-architect.md#L145)均未夸大。
- 无必要修正。

### 陈知行 · 路由官 — pass

- [有效调用](chief-of-staff.md#L33)记录首批 7 题和完整计量；`route_a` 以 0.50、`unsure` 升级，没有直接执行。
- [质疑与修订](chief-of-staff.md#L69)识别“修复主责”和“发布门禁”混在同一选项集合，并拆题复测；[迁移题](chief-of-staff.md#L107)保持授权与数据边界。
- [对照](chief-of-staff.md#L118)只把 6 个未升级题计入 6/6；[CLI 失败边界](chief-of-staff.md#L133)和[无 JEV 协议](chief-of-staff.md#L135)均处置正确。
- 结尾明确仅证明合成训练，不证明真实监督、生产任务或外发通过；未声称个人额度已结算。无必要修正。

### 苏映雪 · 信任设计官 — pass

- [有效批次](design-master.md#L53)记录 `typesafe / jev-1.13.0`、1266 ms、1548/259 tokens和 8 个逐题 verdict；最低 confidence 0.88 等于阈值，正确说明为边界值而非高余量。
- [质疑修订](design-master.md#L76)区分交互链路、系统能力、无障碍和审计证据；[迁移题](design-master.md#L91)没有预写答案且不外推长期泛化。
- [三路对照](design-master.md#L93)、[无 JEV 协议](design-master.md#L106)、[额度与生产边界](design-master.md#L146)均完整。无必要修正。

### 周启明 · 体验工程官 — pass

- [主案例有效调用](frontend-expert.md#L48)和[迁移题](frontend-expert.md#L68)均记录 `typesafe / jev-1.13.0`、latency、tokens和逐题 verdict。
- 两个正式案例的 `unsure` 均停止采纳；[质疑复测](frontend-expert.md#L96)再次出现升级后停止刷阈值，最终答案明确来自人工冻结规则。
- [对照](frontend-expert.md#L115)区分 10/10 非升级项一致和升级后人工结论；[无 JEV 协议](frontend-expert.md#L128)完整；[生产边界](frontend-expert.md#L126)没有夸大。无必要修正。

### 林知夏 · 目标规划官 — pass

- [恢复后的主批次](product-manager.md#L184)与[迁移批次](product-manager.md#L230)均为 `typesafe / jev-1.13.0`，记录 latency、wall time、tokens、逐题 verdict 和批次升级。
- `q4_evidence` 与 `m3_evidence` 均为 `unsure`，分别在[主批次处置](product-manager.md#L212)和[迁移处置](product-manager.md#L257)中停止直接采纳并人工定级。
- [质疑修订](product-manager.md#L218)补足选择准则但没有预填答案；[三路对照](product-manager.md#L262)明确 8 个未升级题 8/8，同样不把升级先验计为直接决定。
- [无 JEV 协议](product-manager.md#L137)、[个人额度和生产边界](product-manager.md#L282)完整。无必要修正。

### 顾清妍 · 质量测试工程师 — pass

- [恢复后的有效批次](test-expert.md#L57)记录 `typesafe / jev-1.13.0`、1054 ms、1994/607 tokens和 11 个逐题 verdict。
- `G_terminal` 的 0.80 estimated confidence 触发 `unsure`；[人工升级](test-expert.md#L92)保留先验后依据崩溃与终态审计缺失独立判否。
- [H 迁移题](test-expert.md#L89)在调用前未预写答案，随后反向质疑低频 chaos 失败与功能开关的反例；[同题对照](test-expert.md#L123)只报告 8/8 可直接采纳项一致。
- [无 JEV 协议](test-expert.md#L136)和[个人额度、生产效果边界](test-expert.md#L169)完整。无必要修正。

## 全员内容验收结论

整体判定：`pass`。

八岗均具备有效 `typesafe / jev-1.13.0` 调用记录，均覆盖 verdict / confidence / escalate、有无 JEV 对照、质疑修订、迁移题和无 JEV 替代协议；没有岗位把 `unsure` 直接当作最终决定，也没有岗位宣称已精确消耗个人 6% 周额度或已证明生产提效。

首次复核发现的两项记录一致性缺口均已关闭：AI工程师已拆分 8 题、7 题与 3 个可比维度；后端工程师已拆分首次 0.92、恢复 JEV 0.80 与无 JEV 人工 0.80 三种口径。修正不改变历史有效 verdict，只提高记录的可审计性。最终内容验收为 `pass=8`、`partial=0`、`fail=0`。

## 仍未知的边界

- 本次独立 CLI 复核通道为 `unreachable`；复核结论来自完整人工回读，不是 JEV 对八岗文件的有效二次裁决。
- 八岗文件中的 MCP 元数据是训练记录内证据；缺少独立原始服务端日志或统一运行收据，本复核不重新证明历史回执真实性。
- 八岗主模型的实际运行身份没有逐岗独立鉴证；`gpt-5.6-sol / high` 是任务登记，不外推到其他会话。
- 每人周额度的基数、个人归属、实际消耗、剩余额度及全员聚合增量均无可信个人计量接口，保持 `unknown`。
- 无 JEV 人工侧普遍缺少同口径 wall time 和 token 计量；不能得出端到端提速、token 节省或成本节省比例。
- 样本均为去身份化合成案例，且有效运行次数有限；生产准确率、重复稳定性、长期提效、真实用户影响、安全性与发布质量均未验证。

## 新增迁移题复核：十条适用条件与“三层框架”

### 输入证据

用户新增规则草案为“列出十条 JEV 适用条件，满足多数才考虑 JEV”。主责提供的真实 JEV 结果为：整体 `1.84/3`（mostly sound with targeted revisions）；第 1/2 条为核心；第 4/7/8 条为条件性；第 3/5/6/9 条为 `unsure`；第 10 条被判核心，但需要区分“辅助门禁”和“唯一决策者”。该原始批次的 backend/model 已说明为当前真实 JEV 结果，但复核人未收到其 latency 与 token 回执，二者保持 `unknown`，不从其他批次补推。

主责拟把扁平多数投票修订为三层：硬门槛、价值增强条件、生产化条件。为复核这一方向，本轮另做一次五题批量 MCP 判断：

```json
{
  "backend": "typesafe",
  "model": "jev-1.13.0",
  "latencyMs": 2204,
  "toolWallTimeSeconds": 14.8,
  "usage": {"inputTokens": 1115, "outputTokens": 194},
  "confidenceThreshold": 0.85,
  "escalated": true
}
```

| 复核题 | JEV answer | confidence / 来源 | escalate | 处置 |
| --- | --- | --- | --- | --- |
| 是否采用简单多数投票 | `REJECT` | 0.66 / reported | `true / unsure` | 只作先验，人工复核 |
| 是否接受三层框架 | `ACCEPT` | 0.73 / reported | `true / unsure` | 只作先验，人工复核 |
| 第 3/5/6/9 条如何处理 | `ESCALATE` | 1.00 / reported | false | 采纳为“保持未决、不得升格硬规则” |
| 第 10 条如何表达 | `SPLIT` | 1.00 / reported | false | 采纳为“辅助门禁 / 唯一决策者”分拆 |
| 三层框架总体成熟度 | `1.92/3`，主分布在等级 2 | 0.51 / reported | `true / unsure` | 不把分数直接写成通过，人工复核 |

### 独立复核结论

结论：**同意用“三层框架”替代“十条满足多数”，但状态为 `pass with targeted revisions`，不是无条件通过。**

理由：八岗训练反复证明有些条件不可补偿。问题不可枚举、事实路由错误、生成任务误交 JEV、`escalate/unsure` 未停止、高风险动作把 JEV 当唯一决策者，任何一项失败都不能由其他六项“赞成票”抵消。因此简单多数不能作为 JEV 是否可用的总门槛。多数或加权评分最多用于硬门槛通过后评估“值不值得调用”，不能用于覆盖安全、授权、证据或责任边界。

建议的三层定义为：

1. **硬门槛（全部满足）**：事实能按上下文或文件/工具输出正确路由；任务是可类型化、可枚举的判断而非生成；升级项会停止自动执行；敏感、高风险或不可逆结论由主模型/责任人承担最终责任；授权和数据边界不因使用 JEV 扩大。
2. **价值增强（择优满足）**：同一状态可批处理、判断重复度高、选项稳定、路由开销合理，并确有费率、延迟或上下文收益。该层可用多数、权重或成本收益比较，但不应伪装成硬安全门槛。
3. **生产化条件（主张稳定使用前全部闭环）**：真实凭据与连接、CLI/MCP 分通道可达性、日志和审计、latency/SLO、token/成本计量、校准与重复测试、隐私、失败回退、监控和责任人。合成训练通过不能替代该层。

第 3/5/6/9 条因原判定为 `unsure`，在获得定义、证据和反例测试前保持 `partial / escalated`；不得因总体分数 1.84 或多数票而自动纳入硬规则。第 10 条应拆成两个命题：

- “JEV 可作为类型化辅助门禁，升级后由责任人接管”可进入硬门槛的正向条件；
- “JEV 可作为高风险事项的唯一决策者”必须为 false，不能被其他条件补偿。

### 工具与证据边界

- 八岗历史 MCP 记录显示 `typesafe / jev-1.13.0` 可产生有效 verdict，但模型 latency 约 0.7–3.7 秒、外层 wall time 通常更长，不能只看后端 latency 宣称端到端提速。
- 本次复核 MCP 有效，但文件型 `jev-use judge` CLI 审计仍因 `typesafe fetch failed` 全量 `unreachable`；MCP 成功不能证明 CLI 可达，生产化必须分通道验收。
- JEV 批次有实际 token 消耗，本轮为 1115 input / 194 output；八岗也未证明 token 必然减少。JEV 的预期优势是 rate 与判断卸载，实际价值需同口径基线。
- 本轮 3/5 复核题为 `unsure`，已全部人工升级；这本身再次证明“多数答案方向一致”不能替代逐项 escalation 控制。
- 该迁移题只支持治理框架修订，不证明生产准确率、长期收益、个人 6% 额度消耗或可由 JEV 独立承担最终责任。
