# 陈知行 · 路由官（Chief of Staff）：JEV MCP 使用训练记录

- 日期：2026-09-22
- 负责人：陈知行 · 路由官（Chief of Staff）
- 能力层级：balanced
- 模型 / 推理强度：gpt-5.6-sol / high
- 取向：质量优先
- 最低模型限制：Sol-high
- 复核人：顾清妍
- 写入边界：仅本文件；未修改任务卡或 `REPORT.md`
- 数据边界：发给 JEV 的内容仅为去身份化合成任务、角色、监督证据与停止条件；没有真实公司任务、人员、额度、客户或项目资料。

## 岗位路由理解

路由官适合把“事实已在上下文、选项可穷举”的多任务分流、监督门禁充足性和停止条件质量合并交给 `jev_judge`。文件或工具输出中的大批条目应由脚本直送 `jev-use judge` CLI，避免进入主对话；单次阻塞性的高风险动作才用 `jev_gate`；反复阻塞每次工具调用的同类安全判断应接入 Hook Gate。需要生成任务书、写路由意见、处理不可枚举选项或接管 `escalate: true` 的问题，仍由主模型负责。

## 同题无 JEV 基线

在查看 JEV 返回前，按同一组合成事实独立形成以下人工基线。人工侧没有独立耗时或 token 计量，因此不编造数值。

| ID | 人工基线 | 依据 |
| --- | --- | --- |
| `route_a` | 后端工程师负责修复；发布必须停止并补齐审批与回滚证据 | 故障层在后端，但责任分配不等于发布授权 |
| `route_b` | 前端工程师 | 仅文字和布局，且已有设计验收清单 |
| `supervision_ready` | false | 缺独立复核签名和回滚演练结果 |
| `stop_quality` | 等级 1：部分可执行 | 有关键停止触发，但普通测试失败可无限重试 |
| `ambiguous_c` | 先复现并收集调用路径 | “可能受影响”不足以发布或关闭告警 |
| `migration_d` | 先补接收方授权与数据处理证据 | 新外部接收方改变了数据边界 |
| `approval_proven` | false | 明确缺少变更审批记录 |

`route_a` 的人工基线刻意保留两个维度：修复主责与发布门禁。首轮 JEV 题目却要求在角色和“停止补证据”之间单选，后续用这个差异检验 `unsure` 的正确处置。

## 首次真实批量 `jev_judge`

一次调用提交 7 个问题：3 个 `choice` 路由/下一步判断、2 个 `noul` 证据判断、1 个 `score` 停止条件质量判断，以及 1 个未预设答案的迁移题。调用阈值为 `0.82`，状态中未放入人工基线或偏好答案。

运行证据：

```json
{
  "backend": "typesafe",
  "model": "jev-1.13.0",
  "latencyMs": 710,
  "toolWallTimeSeconds": 12.5,
  "usage": {
    "inputTokens": 1565,
    "outputTokens": 341,
    "totalTokens": 1906
  },
  "confidenceThreshold": 0.82,
  "escalated": true
}
```

`latencyMs` 来自 JEV 返回；`toolWallTimeSeconds` 来自外层工具执行记录，包含 MCP 往返等开销，两者不能互换。

| ID | 类型 | verdict / answer | confidence | confidenceFrom | escalate | 处置 |
| --- | --- | --- | ---: | --- | --- | --- |
| `route_a` | choice | `后端工程师` | 0.50 | reported | true | `reason=unsure`；仅作 prior，不执行 |
| `route_b` | choice | `前端工程师` | 0.99 | reported | false | 采纳 |
| `supervision_ready` | noul | 0.03 | 0.94 | estimated | false | 判定不能证明门禁已满足 |
| `stop_quality` | score | 1 | 1.00 | reported | false | 判定为“部分可执行” |
| `ambiguous_c` | choice | `先复现并收集调用路径` | 1.00 | reported | false | 采纳 |
| `migration_d` | choice | `先补接收方授权与数据处理证据` | 1.00 | reported | false | 采纳 |
| `approval_proven` | noul | 0.03 | 0.94 | estimated | false | 判定未证明存在审批 |

`noul` 的 `answer` 是命题为真的概率，不是布尔字符串。首轮 6 个未升级 verdict 与人工基线 6/6 一致；`route_a` 的原始答案方向与人工基线的“修复主责”一致，但由于低于阈值且 `escalate=true`，不计入有效一致率，也没有拿低置信答案继续执行。

## 正确处理 `unsure`：质疑、修订与复测

### 质疑

`route_a` 的四个选项混合了两种不同决策类型：前三项在问“谁负责修复”，第四项在问“发布是否应停止”。JEV 给出 `后端工程师`、0.50、`reason=unsure` 是合理升级信号；若直接采纳，可能被误读成允许发布，若只选“停止补证据”，又会丢失修复责任归属。

### 修订

把原题拆成两个互斥且同层级的问题：

1. 谁应作为修复实现主责？
2. 当前发布动作是继续，还是停止并补齐审批与回滚证据？

修订批次的真实返回：

```json
{
  "backend": "typesafe",
  "model": "jev-1.13.0",
  "latencyMs": 1295,
  "toolWallTimeSeconds": 7.8,
  "usage": {
    "inputTokens": 558,
    "outputTokens": 131,
    "totalTokens": 689
  },
  "confidenceThreshold": 0.82,
  "escalated": false
}
```

| ID | verdict / answer | confidence | confidenceFrom | escalate |
| --- | --- | ---: | --- | --- |
| `route_a_owner_revised` | `后端工程师` | 1.00 | reported | false |
| `route_a_release_revised` | `停止发布并补齐审批与回滚证据` | 1.00 | reported | false |

修订后两项都与人工基线一致。最终结论不是“覆盖”首轮 `unsure`，而是承认题目有结构缺陷、由主模型拆题，再以新的有效 verdict 分别支持修复路由和发布停止条件。

## 未预设答案的迁移题

迁移题 D 是一个首次出现的合成边界变化：数据导出只读且使用匿名样本，但结果要发送给新的外部接收方，没有接收方授权与数据处理协议证据。JEV 只看到事实和四个可枚举动作，没有看到人工答案。

- JEV：`先补接收方授权与数据处理证据`，confidence 1.00，`escalate=false`。
- 无 JEV 基线：同一动作。
- 质疑：匿名和只读是否足以支持直接发送？不足。只读限制的是源系统写入风险，匿名降低识别风险，但两者都不能替代新接收方的授权与数据处理边界证据。
- 修订后的结论：不是永久取消任务，也不是更换执行角色；在授权与数据处理证据齐备前停止外发，证据齐备后再单独判断发送。

该题验证了 JEV 可以对新出现但选项可枚举的迁移问题给出判断；它没有生成协议、授权文本或新的处理方案。

## JEV / 无 JEV 对照

| 维度 | JEV | 无 JEV（主模型） | 结论 |
| --- | --- | --- | --- |
| 同状态批量 | 7 题一次调用 | 人工逐项形成基线 | JEV 适合压缩重复判断往返 |
| 有效一致性 | 6 个未升级题与基线 6/6 一致 | 基线 | 仅统计有效 verdict，不把 `unsure` 凑入分母 |
| 含混题 | 主动以 0.50、`unsure` 升级 | 能识别“主责/发布”两维 | 升级改变了控制流，并触发拆题 |
| 修订复测 | 2/2 高置信且未升级 | 两项均与基线一致 | 题型质量直接影响判断可用性 |
| 迁移题 | 高置信选择先补证据 | 同一选择 | 对新题保持一致，但单样本不能外推 |
| 内部延迟 | 710 ms；修订批次 1295 ms | 未独立计量 | 不虚构人工耗时，且内部延迟不等于端到端耗时 |
| Token | 首批 1906；修订 689 | 未独立计量 | JEV 是 rate 优化，不宣称 token 更少 |
| 责任边界 | 给出类型化 verdict 和升级信号 | 写路由意见、处理升级项、承担最终责任 | JEV 不替代路由官验收 |

限制：样本是两个小批次的合成案例；没有真实负载分布、重复试验或人工侧计时；高一致性不能证明所有路由情境都可靠。MCP 端到端 wall time 明显高于 JEV 内部延迟，不能只用模型延迟估算用户等待时间。

补充收尾验证时，脚本把本地检查摘要直送 `jev-use judge` CLI，但 CLI 返回 `backend=typesafe`、`answer=null`、`confidence=0`、`escalate=true`、`reason=unreachable`，错误为网络 `fetch failed`。该失败没有被当作验收通过，也没有覆盖前两次 MCP 的有效结果；随后按无 JEV 回退人工核对：目标文件存在、7 个必需章节齐全、关键运行证据命中、尾随空白检查通过。CLI 与 MCP 在本轮表现不一致，是环境/传输层限制，后续不能仅凭 MCP 成功推定 CLI 同时可用。

## 无 JEV 替代协议

当 JEV 不可达或规则允许人工回退时，路由官按以下协议保留其高效结构；如果任务规定“JEV 不可用即停止”，则只记录失败并停止相应步骤，不得以人工答案冒充 JEV verdict。

1. **压缩状态**：只保留任务目标、已证实事实、候选负责人/动作、监督证据、停止条件和未知项；批量文件保持引用，不整份复制进对话。
2. **分离决策维度**：负责人、执行动作、发布门禁、监督充分性分别成题，禁止把角色与停止动作混在同一个选项集合。
3. **类型化**：真假证据用 `noul`，有限下一步用 `choice`，有序成熟度用 `score`；开放式写作和不可穷举问题留给主模型。
4. **一次批处理**：同一状态的所有判断一次处理，避免重复加载背景。
5. **先定阈值与停止条件**：在看答案前记录置信阈值、缺证据停止项、重试上限和恢复条件。
6. **逐题记账**：记录 answer、置信度是否可计量、来源、升级原因和实际处置。主模型没有独立校准接口时写“未计量”，不伪造小数。
7. **升级即改变控制流**：低置信、证据冲突、题目含混、状态过大或工具不可达时停止自动采纳；修题、补证据或交给具名复核人。
8. **只执行有效项**：升级项的原答案最多作为 prior，不得被包装成通过门禁的决定。

可复用记录模板：

```text
STATE: <最小充分事实>
THRESHOLD: <预先设定>
QUESTIONS:
- id=<id>; type=<noul|choice|score>; options/levels/criteria=<互斥定义>
RESULTS:
- id=<id>; answer=<答案>; confidence=<数值或未计量>; source=<reported|estimated|manual>; escalate=<true|false>; action=<采纳|停止|补证据|重构问题>
STOP: <缺证据、超阈值、重试上限和恢复条件>
```

## 自检与限制

- [x] 完整阅读 `jev-use` Skill 和路由官岗位档案。
- [x] 使用真实 `jev_judge` 完成一次 7 题批量调用，并完成一次 2 题修订复测。
- [x] 记录 backend、model、内部 latency、外层 wall time、tokens、verdict、confidence、confidenceFrom 与 escalate。
- [x] 对 `unsure` 停止采纳、质疑题型、拆题并复测。
- [x] 完成同题无 JEV 基线、有效一致率和边界对照。
- [x] 完成一个未预设答案的迁移题及反方质疑。
- [x] 给出 JEV 不可用时的替代协议，没有把人工结论伪装成 JEV 输出。
- [x] 没有修改任务卡或 `REPORT.md`。
- [x] 发送给 JEV 的内容仅为去身份化合成材料。

本记录只证明陈知行 · 路由官（Chief of Staff）在本次合成训练中正确完成 JEV 批量判断、升级处理和无 JEV 回退设计，不能据此宣称真实生产任务、人员分配、监督门禁或外部数据发送已通过。登记模型为 `gpt-5.6-sol / high`；当前记录没有独立运行时模型证明接口，因此不扩展声称其他执行者或其他会话满足同一下限。
