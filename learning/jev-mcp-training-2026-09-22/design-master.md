# 苏映雪 · 信任设计官：JEV MCP 使用训练

## 训练登记与结论

- 负责人：苏映雪 · 信任设计官（Design Master）
- 复核人：陈知行 · 路由官（Chief of Staff）
- 任务与成功标准：以非敏感合成 UX/设计验收案例练习 JEV 路由、一次批量 `jev_judge`、升级处置和未预设答案的迁移题；对照有/无 JEV，并形成脱离 JEV 的高效判断协议。
- 能力层级：`balanced`
- 请求模型 / 推理强度：`gpt-5.6-sol` / `high`；平台未向本岗位提供可独立核验的模型身份回执，因此实际模型状态为 `unverified`，不把登记值写成已验证事实。
- 预算：每人周额度上限 6%；当前只有共享窗口规则，没有本岗位精确用量读接口，实际消耗与剩余额度为 `unknown`。
- 数据边界：送入 JEV 的内容仅为本文件所述的合成交互事实，没有真实设计、用户资料、客户数据、项目资料、员工档案或额度信息。
- 训练状态：`complete`（训练内容）。首次调用的 `unconfigured` 已作为失败基线保留；后端恢复后，对同一冻结题集完成了一次有效批量语义判断。额度结算仍为 `unknown`，不影响内容验收，也不冒充已用满 6%。

## 1. 路由判断：什么交给 JEV

先判断“事实在哪里、问题是否可枚举、是否阻塞”，再选择工具：

| 设计工作 | 事实位置与形态 | 路由 | 边界 |
| --- | --- | --- | --- |
| 对同一组已知交互状态判断是否有发布阻断、下一步和质量档位 | 已在上下文；是/否、互斥动作、有序等级均可枚举 | 一次批量 `jev_judge`，分别用 `noul`、`choice`、`score` | 同一状态只调用一次，不逐题往返 |
| 大量节点或验收记录已在文件/工具输出 | 文件或输出，不应为调用而重新灌入对话 | 脚本管道送入 `jev-use judge` CLI | 数据留在对话外；本次没有文件型大批量材料，未伪造 CLI 实测 |
| 单次高风险、不可逆写动作必须先决定是否执行 | 当前动作阻塞后续 | `jev_gate` | 只用于一个真实动作；重复逐工具门禁改用 hook gate |
| 每个工具调用都要做同类安全判断 | 重复阻塞 | 一次配置 `jev-use hook gate` | 不能靠人工反复调用 `jev_gate` 冒充 hook |
| 写界面文案、生成流程、发散方案、定义尚不可枚举的选项 | 需要生成新内容 | 主模型 | JEV 是判断器，不是作者或设计负责人 |

设计岗位的关键纪律是：JEV 可以加速“已给证据上的类型化判断”，不能替代系统能力核实、真实 Figma 节点读取、用户研究、辅助技术测试或最终设计责任。

## 2. 合成题集与真实批量调用

### 2.1 冻结状态

一次批次包含六个合成场景：

1. `A_delete_workspace`：不可逆删除；对象和永久后果已说明；输入名称确认；默认焦点在取消；有执行与终态反馈；读屏和对比度尚未测量。
2. `B_ai_publish`：AI 对外发布；无预览，按钮仅写“Run”，未说明目的地和受众；取消、撤销未知；只有 spinner，没有失败终态。
3. `C_inline_suggestion`：本地草稿中的非持久 AI 建议；已标记 AI；Tab 接受、Esc 拒绝；保存前不持久化；读屏播报未知。
4. `D_visual_acceptance`：视觉间距符合合成规范，但对比度、键盘、读屏与 focus-visible 均未验证。
5. `E_bulk_archive`：归档 80 条合成记录；有数量和清单预览、明确确认、30 天恢复、提交前取消、失败项重试和终态汇总。
6. `M_transfer_ai_reorder`：未预先给答案的迁移题。AI 只生成仪表盘重排预览；有全量 diff、独立 Apply、五分钟撤销、部分失败状态、键盘与读屏说明；审计保留未知、未做用户研究。

### 2.2 一次批量问题

批次共 8 题：3 个 `noul`、4 个 `choice`、1 个 `score`。它们分别判断删除场景的发布处置、发布场景是否有阻断及下一步、轻量建议的摩擦等级、视觉页面能否声称无障碍验收、批量归档的信任质量、迁移题的处置，以及“未知审计保留是否足以证明所有部署环境都不安全”。`choice` 选项互斥，`score` 等级从 unsafe 到 validated 有序，`noul` 同时定义 true/false 含义。调用阈值设为 `0.88`，目的是让低置信答案回到主责，而不是被直接采用。

### 2.3 首次不可达：失败与升级基线

- 调用：一次真实 `mcp__jev__jev_judge`，同一 `state` 中批量提交 8 题。
- 工具 wall time：8,571 ms。
- 后端：`unconfigured`；模型与 token 用量均不可用。
- 结果：8/8 均为 `answer: null`、`confidence: 0`、`escalate: true`、`reason: unreachable`；批次级 `escalated: true`。
- 控制流：按 skill 将 `unreachable` 视作 JEV 不存在；停止 JEV 语义验收，不拆分重试、不启用 `JEV_BACKEND=mock`、不把人工裁决记为 JEV 输出。

### 2.4 恢复后的有效批量调用

后端恢复后，复用完全相同的冻结状态、8 个问题、选项和 `0.88` 阈值，只进行一次批量调用：

- `backend`: `typesafe`
- `model`: `jev-1.13.0`
- 工具 wall time：11,916 ms；JEV 返回的后端 `latencyMs`: 1,266 ms。两者口径不同，前者含 MCP 往返，后者是后端报告值。
- `usage`: `inputTokens=1548`、`outputTokens=259`；这是整个批次的 JEV 用量，不拆成虚构的逐题用量。
- 批次结果：`escalated=false`；8/8 有有效答案；0 个 `unsure`；0 个 `escalate:true`。

| ID / 类型 | JEV answer | confidence / 来源 | escalate |
| --- | --- | --- | --- |
| `delete_release` / choice | `conditional` | `1.00` / reported | `false` |
| `publish_blocker` / noul | `0.97`（true） | `0.94` / estimated | `false` |
| `publish_next` / choice | `block_and_redesign` | `1.00` / reported | `false` |
| `inline_friction` / choice | `current_lightweight` | `1.00` / reported | `false` |
| `visual_a11y` / noul | `0.03`（false） | `0.94` / estimated | `false` |
| `bulk_readiness` / score | `2.88`；level 3 概率 `0.88`、level 2 概率 `0.12` | `0.90` / reported | `false` |
| `transfer_disposition` / choice | `conditional_interaction_pass` | `1.00` / reported | `false` |
| `transfer_audit_required` / noul | `0.06`（false） | `0.88` / estimated | `false` |

最低 confidence 为 `0.88`，等于调用阈值但未触发升级。它是边界值，不应描述为“高余量”；若返回 `unsure` 或任何 `escalate:true`，必须交回主责而不能采用答案。本次没有这类项。

## 3. JEV verdict、人工基线、质疑与修订

人工基线来自首次不可达后的独立判断，没有在恢复调用前用来改题面或选项：

| 题目 | JEV 与人工基线 | 质疑 | 修订后采用 |
| --- | --- | --- | --- |
| 删除工作区的发布处置 | 均为 `conditional` | 交互已充分披露不可逆性，是否仍应完全阻断？ | 保持：信任链路可接受，但读屏与对比度没有真实证据，不能声称完整验收 |
| AI 发布是否有信任阻断 | JEV true 概率 `0.97`；人工 `true` | “限制受众发布”能否降低风险？ | 保持：目的地/受众不透明、无预览、无失败终态；缩小人群不能修复错误交互 |
| AI 发布下一步 | 均为 `block_and_redesign` | 是否只补按钮文案即可？ | 保持：补范围、预览、明确确认、终态反馈，并核验取消/撤销真实能力；文案不能代替能力 |
| 行内 AI 建议的摩擦 | 均为 `current_lightweight` | 读屏播报未知是否意味着必须禁用？ | 采用轻量模式，但补充“无障碍验收为条件”。原三选一不能表达这个条件，显示枚举质量仍需主责把关 |
| 视觉页面能否声称无障碍验收 | JEV true 概率 `0.03`；人工 `false` | 视觉符合规范是否足够？ | 保持 `false`：规范匹配不能替代对比度、键盘、读屏和焦点证据 |
| 批量归档质量 | JEV `2.88`，人工 `3/4 strong` | 清单下载在真实场景可能有权限/隐私约束，且没有实测可用性 | 采用“接近 strong、但非 validated”；真实导出权限和无障碍仍需另验 |
| 迁移题处置 | 均为 `conditional_interaction_pass` | 审计未知会不会要求直接阻断？ | 保持：预览、确认、恢复、反馈链完整；若部署环境要求审计，则该未知项必须升级并在上线前关闭 |
| 审计未知是否证明普遍不安全 | JEV true 概率 `0.06`；人工 `false` | 某些高监管场景确实会因此阻断 | 保持 `false`：它不证明所有上下文都不安全，但在审计为硬约束的上下文中必须阻断或升级 |

迁移题在首次调用前没有附标准答案；首次不可达后由主责形成独立基线，恢复调用仍使用原冻结题面。JEV 随后选择 `conditional_interaction_pass`，confidence `1.00`、`escalate=false`，与人工基线一致。这是单个合成迁移案例的通过证据，不证明生产迁移能力或长期泛化。

## 4. 有 JEV / 先前不可达 / 无 JEV 的同题对照

| 维度 | 恢复后的有效 JEV | 先前 `unreachable` | 无 JEV 人工基线 | 可下结论 |
| --- | --- | --- | --- | --- |
| 耗时 | 工具 wall 11,916 ms；后端报告 1,266 ms | 工具 wall 8,571 ms，0 个答案 | 独立推理段没有平台计时 | 后端延迟可记录；JEV 相对人工的端到端速度收益仍为 `unknown` |
| 上下文 / tokens | JEV 用量 1,548 input / 259 output tokens；事实原本已在对话中，MCP 往返仍增加可见内容 | 无 usage；返回 8 条重复失败 | 无独立 token 计量 | 对上下文内短状态，本次取得紧凑结构化结果；与人工 token 差为 `unknown`。文件型大数据仍应走 CLI |
| 输出 | 8 个有效 typed verdict | 0 个有效答案，8 个升级 | 8 个带边界的人工答案 | 有效后端恢复了可执行判断；失败态不能参与答案质量比较 |
| 语义一致性 | 与人工基线按 choice 标签、noul 真假侧和 score 最近等级映射后为 8/8 一致 | 不可比较 | 单次基线 | 本题集一致率 100%；只有一次有效 JEV 运行，重复稳定性与总体准确率仍为 `unknown` |
| 升级 | 0/8；最低 confidence 恰为阈值 0.88，无 `unsure` | 8/8 因 `unreachable` 升级 | 用 unknown、硬阻断和证据阈值升级 | 升级语义确实改变控制流；阈值边界不等于高置信余量 |
| 边界 | 适合短状态、类型化、可枚举、批量判断 | 后端不可用时必须停止或显式回退 | 负责生成、选项设计、JEV 升级项和最终责任 | JEV 不替代真实系统、无障碍、研究或生产证据，也不替代对选项是否完整的审查 |

本轮验证了有效 JEV 对同一冻结状态的一次批量输出，并观察到与人工基线 8/8 对齐；由于没有人工端计时、没有成功重复运行、也没有真实生产样本，速度优势、重复一致性、总体准确率和长期提效仍为 `unknown`。

## 5. 脱离 JEV 的高效输入输出协议

JEV 不可用时，不模拟其模型答案，只复用约束判断的结构：

1. **状态压缩**：每批只写 `intent`、`impact_scope`、`reversibility`、`system_capabilities`、`evidence`、`unknowns`。历史讨论、修辞和无关视觉细节不进入判断状态。
2. **类型化**：真假主张用 `noul`；下一步互斥动作使用 `choice`；质量档位使用 `score`；需要新文案、代码或开放式方案时退出协议，由主模型生成。
3. **枚举**：`choice` 必须互斥且可执行；`score` 从低到高写出每级证据；`noul` 同时定义 true/false，避免把“没有证据”偷换成“已经通过”。
4. **批处理**：同一冻结状态上的所有问题一次作答；状态变化后才开新批次。文件中的大批量事实留在本地脚本中处理，避免复制进对话。
5. **阈值**：高风险或对外动作只要 scope、确认、恢复/补偿、终态反馈中的任一项为 unknown，就升级；无障碍“已验收”必须有相应实测证据；`score` 若一个未知项可能使结果跨一级以上，则不给确定分，升级。
6. **升级**：记录 `reason=unknown_capability|insufficient_evidence|open_ended|oversized|conflict`。升级项暂停自动行动，交给主责补证据或裁决；人工回退必须明确来源，不能沿用低置信先验。
7. **输出收缩**：每题只输出 `id / answer / evidence / unknowns / escalate / next_action`，再由负责人统一写结论，避免八段重复叙述。

可复用模板：

```text
STATE: intent=...; impact_scope=...; reversibility=...;
       capabilities=[...]; evidence=[...]; unknowns=[...]
QUESTIONS:
- id=...; type=noul; true=...; false=...
- id=...; type=choice; options=[互斥动作...]
- id=...; type=score; levels=[低 -> 高]
THRESHOLD:
- critical_unknown => escalate
- missing measured accessibility evidence => cannot claim accepted
OUTPUT:
- id=...; answer=...; evidence=...; unknowns=...;
  escalate=true|false; next_action=...
```

这一协议能压缩状态、减少来回切换并提升可审计性，但不会获得 JEV 的独立判断、结构化 confidence、已测后端延迟或专用费率优势。有效 JEV 已测得单批后端延迟 1,266 ms；相对人工的速度和成本收益仍因缺少同口径基线而为 `unknown`。

## 6. 验收与恢复条件

- [x] 已完整读取 `jev-use` skill 和苏映雪岗位档案。
- [x] 已用非敏感合成 UX 案例完成一次有效、单调用、8 题批量 `jev_judge`；记录 backend、model、latency、tokens、verdict、confidence 与 escalate。
- [x] 已保留并正确处理首次 8/8 `escalate:true / unreachable`；有效批次无 `unsure` 或升级项，没有 mock 或伪造 verdict。
- [x] 已完成未预设答案的迁移题，并将 JEV verdict 与人工基线严格分开。
- [x] 已比较有/无 JEV 的耗时、上下文、输出、一致性、升级与适用边界；不可测项均标为 `unknown`。
- [x] 已形成覆盖状态压缩、`noul/choice/score`、枚举、批处理、阈值与升级的无 JEV 协议。
- [x] JEV 在线语义判断成功：`typesafe / jev-1.13.0`，8/8 有效，批次 `escalated=false`。
- [ ] 6% 周额度实际消耗核验：无本岗位精确计量接口，状态 `unknown`。

训练内容已完成；后续若要主张稳定提效，应在不写入凭据或真实用户资料的前提下，用多组同类合成题和同口径人工计时重复测试。合成案例通过不证明生产提效、真实无障碍合规、用户可用性或长期能力提升。
