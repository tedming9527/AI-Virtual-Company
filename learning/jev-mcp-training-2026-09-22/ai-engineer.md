# 辛澈 · AI工程师：JEV MCP 使用训练记录

- 日期：2026-09-22
- 负责人：辛澈 · AI工程师
- 能力层级：balanced
- 模型 / 推理强度：gpt-5.6-sol / high
- 取向：质量优先
- 最低模型限制：Sol-high
- 复核人：陈知行 · 路由官（Chief of Staff）
- 数据边界：本训练仅使用去身份化、非敏感合成案例；未向 JEV 发送公司人员、额度、客户或项目资料。

## 路由结论

| 场景 | 应用通道 | 理由 |
| --- | --- | --- |
| 已在当前上下文中的多个可枚举判断 | `jev_judge` | 把同一状态上的所有问题合并为一次调用；支持 `noul`、`choice`、`score`。 |
| 批量条目只存在于文件或工具输出 | `jev-use judge` CLI | 由脚本直接把数据传给 CLI，避免数据进入对话上下文。 |
| 单次高风险或不可逆动作，且后续执行被该判断阻塞 | `jev_gate` | 对一个拟执行动作做一次门禁。 |
| 每个工具调用都受相同安全判断约束 | `jev-use hook gate` PreToolUse Hook | 一次接入重复门禁；不应逐次手调 `jev_gate`。 |
| 需要生成新文字、代码，或选项无法完整枚举 | 主模型 | JEV 只做类型化判断，不承担开放式生成。 |

## 首次真实批量 `jev_judge` 调用：后端不可达

一次调用提交了 8 个合成判断，满足“同一状态、一次批量”的要求：

1. 五个通道路由题：上下文判断、文件内批量数据、单次不可逆动作、新迁移指南、30 步重复安全门禁。
2. 一个未预先给答案的 AI 工具核验迁移 `choice` 题。
3. 一个迁移是否完成的 `noul` 题。
4. 一个生产切换证据质量的 `score` 题。

调用参数要点：

```text
backend model: jev-latest
confidence_threshold: 0.65
questions: 8（5 个 route、1 个 migration_next、1 个 migration_ready、1 个 evidence_quality）
```

真实返回摘要：

```json
{
  "backend": "unconfigured",
  "model": "jev-latest",
  "escalated": true,
  "verdict_count": 8,
  "common_result": {
    "answer": null,
    "confidence": 0,
    "escalate": true,
    "reason": "unreachable"
  },
  "failure": "No Jev credentials found; expected TYPESAFE_API_KEY, OPENROUTER_API_KEY, or AI_GATEWAY_API_KEY"
}
```

JEV 的提示还给出了 `JEV_BACKEND=mock` 的无密钥 dry run 选项。本次没有启用，因为 mock 不能作为“真实批量 JEV 判断”的替代证据。

## 恢复后的有效批量 `jev_judge` 调用

JEV 后端恢复后，对同一类合成迁移事实重新发起一次批量调用。状态中明确写入“不包含偏好答案或先前评审结论”，避免把人工基线泄漏给判断模型。本批次共 7 题：3 个 `noul`、3 个 `choice`、1 个 `score`；其中包含迁移动作、完成度、生产准备度、证据强度、smoke test 是否覆盖契约失败、立即切换的反方质疑、最关键缺口。

运行证据：

```json
{
  "backend": "typesafe",
  "model": "jev-1.13.0",
  "latencyMs": 719,
  "toolWallTimeSeconds": 11.2,
  "usage": {
    "inputTokens": 933,
    "outputTokens": 207,
    "totalTokens": 1140
  },
  "confidenceThreshold": 0.65,
  "escalated": false
}
```

`latencyMs=719` 是 JEV 返回的模型调用延迟；`11.2 秒` 是外层 MCP 工具记录的端到端 wall time。两者口径不同，不应互相替代。

完整 verdict 摘要：

| ID | 类型 | answer | confidence | confidenceFrom | escalate |
| --- | --- | --- | ---: | --- | --- |
| `migration_next` | choice | `patch-schema-and-rerun` | 1.00 | reported | false |
| `migration_ready` | noul | 0.04 | 0.92 | estimated | false |
| `production_ready` | noul | 0.04 | 0.92 | estimated | false |
| `evidence_quality` | score | 1.01（等级 1：partial with blocking compatibility gaps） | 0.99 | reported | false |
| `smoke_override` | noul | 0.10 | 0.80 | estimated | false |
| `challenge_immediate_switch` | noul | 0.04 | 0.92 | estimated | false |
| `most_material_gap` | choice | `contract-failures` | 0.95 | reported | false |

所有 confidence 均高于 0.65，且没有 `escalate: true`。因此这些 verdict 可作为有效 JEV 判断使用；其中 `noul` 的 answer 是命题为真的概率，不是布尔标签。

## Verdict、confidence、escalate 的处置

- `answer: null`：没有把空答案解释成任何路由或迁移结论。
- `confidence: 0`：没有基于该返回做业务决策。
- `escalate: true` 且 `reason: unreachable`：按技能规则把问题交回主模型，但本训练要求“JEV 拒绝或不可用时停止对应步骤、不绕过”，因此只记录失败，未以主模型补答来冒充 JEV 成果。
- 本次失败发生于后端配置，不是题目置信度不足；因此没有反复重试同一调用。
- 恢复调用的 7 个 verdict 全部达到阈值且 `escalate=false`，故按 answer 执行判断记录，无需交回主模型裁决。
- `confidenceFrom=estimated` 与 `reported` 被分别保留；没有把估计置信度误写成模型置信头的直接报告。

## 未预先给答案的迁移题

合成证据：某 AI 核验适配器从协议 v1 迁移到 v2；适配器报告 `protocol=2.0`；契约套件 118/120 通过，两个失败分别涉及 `confidenceFrom` 可空兼容性与未知 `escalate reason=oversized`；三种 verdict 类型的 smoke test 有效；尚未切生产流量。

提供给 JEV 的可枚举选项为：

- `accept-migration`
- `patch-schema-and-rerun`
- `switch-production`

首次结果：`answer: null`、`confidence: 0`、`escalate: true`、`reason: unreachable`。因此首次题目没有获得 JEV verdict，训练在该步骤停止，未预设 JEV 答案。

按照对照验收新增要求，随后由主模型独立作答（这不是 JEV verdict）：选择 `patch-schema-and-rerun`；`migration_ready=false`；证据质量为 `partial with blocking gaps`（有序等级索引 1）。依据是 2 个契约失败仍直接涉及 verdict schema 兼容性，smoke test 不能替代契约通过，且尚无生产切换证据。该结论只用于“无 JEV”对照，未回填或伪装成 JEV 输出。

恢复后的 JEV 在未获知人工答案的前提下给出：`migration_next=patch-schema-and-rerun`；`migration_ready` 真值概率 0.04；证据质量 1.01，接近等级 1“存在阻塞性兼容缺口”。迁移题由此获得有效 verdict。它与人工基线可比较的范围仅为迁移动作、完成状态和证据等级 3 个核心维度，三项方向均一致；这不是首次 8 题与恢复 7 题的逐题复现或整体一致率。

### 质疑与修订

- 质疑：`production_ready=0.04` 是否把“任何生产流量”判断得过于保守？有限 canary 在具备隔离、自动回滚和监控时可能成立。
- 核对：当前合成事实只说明回滚流程“已记录但未测试”，没有 canary 隔离或自动止损证据，同时还有两项文档化兼容要求失败。JEV 对当前证据给出否定是合理的；它不能外推为“修复后仍禁止 canary”。
- 反方检验：`challenge_immediate_switch=0.04`，表示“结构有效的 smoke verdict 足以支持立即全量切换”几乎不成立；`smoke_override=0.10` 也表明 smoke test 不足以消除契约缺口。
- 修订后的结论：先修复 schema/parser 兼容问题并重跑契约套件；通过后还需实际演练 rollback，并补充 canary 隔离与监控证据，再单独判断有限流量。原人工基线的第一步不变，但“契约通过即可生产切换”的潜在含义被明确排除。

## 对照：首次不可达、恢复后的 JEV 与不使用 JEV

三侧口径并不相同，必须拆开解释：首次不可达批次共 8 题，由 5 个通道路由题和 3 个迁移核心题组成；恢复后的有效批次共 7 题，全部围绕迁移判断，其中保留 3 个可与人工基线做语义对照的核心维度，并新增 4 个生产准备度、反方质疑和关键缺口问题；无 JEV 人工基线只回答迁移动作、完成状态、证据等级这 3 个核心维度。恢复批次还扩展了动作选项并补充 rollback 事实，因此只能比较核心结论方向，不能声称两批题目完全相同。

| 维度 | 首次 JEV（不可达） | 恢复后的 JEV | 不使用 JEV（主模型） | 评估 |
| --- | --- | --- | --- | --- |
| 耗时 | 外层 wall time 11.9 秒，无有效 verdict | JEV 内部 719 ms；外层 wall time 11.2 秒 | 平台未提供该段推理的独立 wall-time | 有效调用证明模型判断本身低于 1 秒，但当前 MCP 往返显著增加端到端耗时；人工侧不虚构耗时 |
| Token | 未报告有效 usage | 输入 933、输出 207、合计 1140 | 无独立计量 | JEV 是 rate 优化，不应宣称 token 更少；本批次的 token 有实测依据 |
| 主对话上下文 | 8 条重复失败信息进入上下文 | 7 条紧凑 verdict 进入上下文 | 无工具往返，但由主模型承担判断 | 当前事实已在上下文，MCP 返回仍占上下文；文件型大数据必须走 CLI 才能获得主要上下文收益 |
| 迁移输出 | 3 个迁移核心题均无答案；另有 5 个路由题也无答案 | 7 个有效迁移 verdict；其中可比核心结论为修复并重跑、尚未完成、证据等级约 1 | 仅有 3 个核心结论：修复并重跑、尚未完成、证据等级 1 | 对照只覆盖三项核心维度，不覆盖恢复批次其余 4 题，也不覆盖首次 5 个路由题 |
| 一致性 | 因 8 题全部不可达，不能与任一侧计算 verdict 一致性 | 与人工基线在 3 个可比核心维度上方向一致 | 3 项人工基线 | 可记为“3 个可比维度方向一致”，不可写成首次 8 题、恢复 7 题或完整批次的 3/3 一致率 |
| 升级 | 8/8 `unreachable`，全量升级 | 0/7 升级，全部超过阈值 | 接手首次失败并标注来源 | 工具状态和低置信 verdict 都必须改变控制流 |
| 适用边界 | 只能验证失败语义 | 类型化、可枚举、同状态批量判断 | 开放式生成、升级项和最终责任判断 | JEV 是判断加速器，不是作者或责任替代者 |

本次恢复补测验证了有效 verdict、服务返回的 model 字段（非独立鉴证 actual_model）、内部延迟、token、阈值处理和核心结论一致性。限制仍包括：人工侧缺少独立耗时/token 计量；样本只有一个合成迁移案例；719 ms 不能代表长期分布；外层 11.2 秒包含非模型开销。

## 脱离 JEV 时模拟其高效模式

当 JEV 不可用但任务允许回退到主模型时，采用以下可执行流程；若任务明确要求“不可用即停止”，则在第 6 步停止，不回退：

1. **状态压缩**：只保留任务意图、已证实事实、候选动作、阻塞条件和不确定项；删除叙事性背景。文件型大数据保留引用与摘要，不整份贴入对话。
2. **类型化问题**：把每个判断归为 `noul`（真假概率）、`choice`（有限选项）或 `score`（有序等级）；凡是需要新文字或选项不可穷举的任务直接留给主模型生成，不伪装成判断题。
3. **枚举选项**：为 `choice` 给出互斥、可执行的标签和含义；为 `score` 写出从低到高的等级；为 `noul` 同时定义 true/false 的验收含义。
4. **一次批处理**：同一状态上的全部问题组成一个判断批次，禁止逐题重复加载相同背景。
5. **设置信心阈值**：执行前规定阈值（本训练为 0.65）；每题记录 `answer`、`confidence`、置信来源和理由。主模型若没有可校准的数值置信接口，应写“未计量”，不得编造小数。
6. **升级分流**：低于阈值、证据冲突、开放式任务、状态过大或工具不可达时，标记 `escalate` 及原因；高风险项回主模型复核或按任务规则停止。
7. **只执行未升级项**：升级项不得沿用低置信答案；主模型接手时须标注“回退结论”，保留与 JEV verdict 的来源边界。

可复用批次模板：

```text
STATE: <最小充分事实>
THRESHOLD: 0.65
QUESTIONS:
- id=<id>; type=noul; question=<问题>; true=<含义>; false=<含义>
- id=<id>; type=choice; question=<问题>; options=<互斥选项>
- id=<id>; type=score; question=<问题>; levels=<从低到高等级>
RESULTS:
- id=<id>; answer=<答案>; confidence=<数值或“未计量”>; escalate=<true|false>; reason=<原因>
ACTION: 仅执行未升级项；升级项交回主模型或停止。
```

## 自检

- [x] 已完整阅读 `jev-use` 技能说明与 AI工程师岗位资料。
- [x] 已区分 `jev_judge`、CLI、`jev_gate`、Hook Gate 与主模型的适用边界。
- [x] 已发起首次包含 8 题但后端不可达的真实批量 `jev_judge` 调用。
- [x] 已记录每题共同的 verdict、confidence、escalate 与处置。
- [x] 已提交一个未预先给答案的 AI 工具核验迁移题。
- [x] 已在 JEV 不可用后停止对应步骤，未使用 mock 或手工结论绕过。
- [x] 已对合成迁移案例中的 3 个可比核心维度完成 JEV 与主模型方向对照；未把首次 8 题与恢复 7 题表述为同题复现或完整批次一致率。
- [x] 已给出脱离 JEV 时复用状态压缩、类型化、枚举、批处理、阈值和升级机制的可执行方法。
- [x] 已在恢复后取得 7 个有效 verdict，记录 model、内部 latency、外层 wall time、tokens、answer、confidence、confidenceFrom 和 escalate。
- [x] 已用未预设答案的迁移题检验人工基线，并完成反方质疑与结论修订。
- [x] 未修改任务卡或 `REPORT.md`。
- [x] 训练材料不含公司人员、额度、客户或项目业务资料；仅岗位署名与治理角色用于训练归档元数据，未发送给 JEV。

## 限制与恢复条件

本次训练现已完成路由学习、不可达处置、有效批量调用、阈值与升级处理、人工基线对照及迁移题质疑修订。有效 JEV 实操范围仅限本记录中的去身份化合成判断；不能据此推断真实生产数据、开放式写作或高风险不可逆动作已经验收。

模型身份按本任务登记为 `gpt-5.6-sol / high`；当前记录没有独立的运行时证明接口，不能据此扩展声称其他执行者或其他会话也满足该模型下限。
