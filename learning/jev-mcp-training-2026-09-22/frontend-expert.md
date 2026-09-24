# 周启明 · 体验工程官（Frontend Engineer）JEV MCP 使用训练

- 日期：2026-09-22
- 负责人：周启明 · 体验工程官（Frontend Engineer）
- 能力层级：balanced
- 模型 / 推理强度：`gpt-5.6-sol / high`（父任务派发登记；本子任务没有独立模型身份读取接口）
- 速度或质量取向：质量优先
- 最低模型限制：Sol-high
- 复核人：陈知行 · 路由官（Chief of Staff）
- 数据边界：只使用去身份化合成前端构建、无障碍与回归案例；未向 JEV 发送员工、客户、真实项目、额度或用户资料。
- 训练状态：`completed`（内容与有效 JEV 语义调用完成；共享额度与原生任务回执由父任务结算）

## 1. 前端岗位的 JEV 路由

| 事实位置 / 判断性质 | 正确通道 | 前端示例 | 边界 |
| --- | --- | --- | --- |
| 事实已在当前上下文，问题可枚举，且不阻塞其他工作 | 同一状态的全部问题一次批量 `jev_judge` | 构建是否成功、候选版本下一动作、回归优先级、发布准备度 | 只做类型化判断；不让 JEV 写组件、修 CSS 或生成测试 |
| 构建日志、axe 报告、测试清单只在文件或工具输出里 | 脚本把原始数据直接管道给 `jev-use judge` CLI | 数百条 lint/构建警告分级、测试失败分类、无障碍扫描项分诊 | 不为了调用 MCP 把整份日志读入主对话；文件数据应留在会话外 |
| 一个高风险、不可逆动作被单个判断阻塞，且最小事实已在上下文 | `jev_gate` | 是否允许执行一次生产发布或不可逆依赖升级 | 仅门禁这一动作；`escalate` 后仍由主模型/负责人裁决 |
| 每次工具调用都需要重复同类安全门禁 | 一次接入 `jev-use hook gate` | 一条发布流水线中的重复命令门禁 | 不逐步手调 `jev_gate`；Hook 已激活也不等于公司监督已接通 |
| 需要新代码、文案、方案，或选项不能穷举 | 主模型 | 修复焦点陷阱、设计响应式布局、撰写回归计划 | JEV 不是生成器，也不替代浏览器、设计或接口证据 |

本训练的事实已经压缩在当前上下文，因此使用 MCP 批量 `jev_judge`。若同类事实仍在构建文件或测试工具输出中，必须由脚本调用 CLI，而不是把原始输出复制进对话。

## 2. 主案例：Atlas Checkout

### 2.1 冻结的合成状态与人工基线

合成候选为 React 结账页。发布政策要求：生产构建退出码为 0、所有发布阻断回归通过、无严重无障碍门禁。已知事实：

- 构建退出码 0；主包 742 kB，高于 600 kB 软预算，但该告警非阻断。
- 118/120 测试通过。R1 可复现为优惠码输入框按 Enter 错误提交外层结账表单，违反验收标准；R2 仅为有意调整 `aria-describedby` id 后的快照差异，语义断言通过。
- 支付对话框焦点会逃逸、缺少可访问名称；14 px 帮助文本对比度 3.1:1。既定政策把前两项视为 critical，把正常文本低于 4.5:1 视为 major，均阻断发布。

在查看 JEV 返回前，按冻结规则形成无 JEV 人工基线：

| ID | 类型 | 人工基线 |
| --- | --- | --- |
| `build_succeeded` | `noul` | true |
| `release_action` | `choice` | `fix_then_rerun` |
| `readiness` | `score` | 1：builds but blocked |
| `regression_priority` | `choice` | `R1_behavior` |
| `a11y_gate_clear` | `noul` | false |
| `snapshot_is_blocker` | `noul` | false；仅快照维护，不单独成为发布阻断 |

人工基线的独立墙钟与 token 计量接口不可用，均记为 `unknown`，不伪造速度优势。

### 2.2 一次真实批量 `jev_judge`

一次调用提交上述 6 题，`model=jev-latest`，`confidence_threshold=0.85`。真实回执：

- 后端 / 模型：`typesafe / jev-1.13.0`
- 服务端 `latencyMs=2896`
- 客户端端到端墙钟：`15,803 ms`
- tokens：`inputTokens=1053`，`outputTokens=187`

| ID | JEV answer | confidence / 来源 | escalate | 处置 |
| --- | --- | --- | --- | --- |
| `build_succeeded` | 0.98 | 0.96 / estimated | false | 采纳为 true |
| `release_action` | `fix_then_rerun` | 1.00 / reported | false | 采纳 |
| `readiness` | 1 | 1.00 / reported | false | 采纳为 builds but blocked |
| `regression_priority` | `R1_behavior` | 1.00 / reported | false | 采纳 |
| `a11y_gate_clear` | 0.03 | 0.94 / estimated | false | 采纳为 false |
| `snapshot_is_blocker` | 0.10 | 0.80 / estimated | **true / unsure** | 不采纳为决定；仅保留为先验，回交主模型 |

`snapshot_is_blocker` 的 `answer=0.10` 方向与人工基线相同，但低于预设阈值。正确处理不是把它四舍五入成 false 后继续，而是保留原始先验、标记 `escalate=true`，再依据冻结政策独立裁决：R2 只有有意的 id 差异且语义断言通过，故其本身不构成发布阻断；仍应更新快照并保留最小回归验证。

## 3. 未预设答案的迁移题：Cedar Search

### 3.1 冻结题面

迁移题在调用前没有写入期望答案。合成候选为 React 商品筛选抽屉：

- 构建退出码 0；路由包 610 kB，高于 550 kB 软预算、低于 700 kB 硬上限。
- 126 项自动检查通过；手工视口矩阵发现 320 CSS px 下价格控件固定为 420 CSS px，造成横向滚动并把 Apply 按钮挤出屏幕；375、768、1440 CSS px 通过。验收标准明确要求 320–1440 CSS px 无横向页面滚动且流程完全可操作。
- 已列出的无障碍检查全部通过：可访问名称、`aria-expanded`、焦点约束、Escape 关闭并恢复焦点、可见焦点、正常文本 4.7:1 对比度。

一次调用提交 6 题，`confidence_threshold=0.90`。真实回执：

- 后端 / 模型：`typesafe / jev-1.13.0`
- 服务端 `latencyMs=968`
- 客户端端到端墙钟：`6,722 ms`
- tokens：`inputTokens=1153`，`outputTokens=234`

| ID | JEV answer | confidence / 来源 | escalate | 人工独立复核 |
| --- | --- | --- | --- | --- |
| `transfer_build_succeeded` | 0.99 | 0.98 / estimated | false | true，一致 |
| `transfer_release_action` | `fix_then_rerun` | 1.00 / reported | false | 一致；320 px 验收回归阻断 |
| `transfer_readiness` | 1.03 | 0.97 / reported | false | 映射为等级 1，一致 |
| `transfer_primary_work` | `responsive_regression` | 1.00 / reported | false | 一致 |
| `transfer_a11y_clear` | 0.93 | 0.86 / estimated | **true / unsure** | 不采纳为决定；按已列证据独立裁决为 true |
| `transfer_validation` | `rerun_320_flow` | 1.00 / reported | false | 一致；先验证 Apply 可达性与横向滚动 |

迁移结果说明同一种“事实压缩 → 类型化 → 批量 → 升级”结构可从结账页迁移到筛选抽屉，但案例训练不证明真实项目、真实浏览器矩阵或生产发布能力。

## 4. 质疑、修订与再次升级

两个 `unsure` 暴露出题面与阈值的不同问题：

1. `snapshot_is_blocker` 把“测试仍红”与“是否满足发布阻断定义”混在一起，容易让工具对流程状态与风险语义摇摆。
2. `transfer_a11y_clear` 的“gate clear”可能被理解成对所有未测试缺陷作保证，而题面只证明“已列出的发现不构成 blocker”。

修订后把问题收窄为：

- “按 Case A 明确的 blocker policy，只有 id 的有意快照差异本身是否阻断？”
- “仅判断 Case B 已列事实，是否存在发布阻断无障碍发现；不得猜测未测试缺陷？”

两题再次一次批量调用，`confidence_threshold=0.90`。真实回执为 `typesafe / jev-1.13.0`，服务端 `latencyMs=1291`，客户端墙钟 `11,304 ms`，`inputTokens=516`、`outputTokens=53`。结果仍分别为：

- `revised_snapshot_blocker`：answer 0.07，confidence 0.86 / estimated，`escalate=true / unsure`；
- `revised_listed_a11y_blocker`：answer 0.11，confidence 0.78 / estimated，`escalate=true / unsure`。

修订没有稳定消除升级，因此停止为“刷过阈值”而重复调用。最终答案仍由负责人依据冻结事实给出：两题均为 false。训练结论是：高阈值下 `noul` 的 estimated confidence 即使方向明显也可能升级；没有当前场景校准数据时，阈值只是一条保守的回接规则，不能把反复改写题目当成准确率优化。

## 5. 有 JEV / 无 JEV 对照

| 维度 | 使用 JEV 的实测 | 无 JEV 人工基线 | 结论 |
| --- | --- | --- | --- |
| 耗时 | 三个批次服务端共 `5,155 ms`；客户端共 `33,829 ms`。其中两组正式案例为服务端 `3,864 ms`、客户端 `22,525 ms` | 无独立计时接口，`unknown` | 只能报告 JEV 实测；不能据此声称端到端更快 |
| 主对话上下文 | 三批共 `2,722` 输入 tokens、`474` 输出 tokens；state 与 verdict 都进入对话 | 独立 token 计量 `unknown` | MCP 形态是费率/延迟实验，不是 token 节省；大文件必须改走 CLI 才能把数据留在对话外 |
| 一致性 | 两个正式案例 12 题中，10 题由 JEV 直接裁决并与人工基线一致；2 题升级，原始先验方向也一致但不计作决定 | 12 题均由冻结政策独立判断 | 非升级项一致率 10/10；升级后最终 12/12 一致，但不能把升级先验算成工具裁决 |
| 升级 | 正式案例 2/12 为 `unsure`；修订复测仍 2/2 升级 | 主模型直接承担不确定项 | `escalate=true` 会改变控制流，不是附注 |
| 输出稳定性 | `choice/score` 在显式政策下稳定；高阈值 `noul` estimated confidence 较易升级 | 显式枚举后人工结果稳定，但 confidence 无校准，必须写 `unknown` | 结构化问题有复用价值；置信度不应伪造 |
| 边界 | 短、已知、可枚举的判断适合批量；文件数据走 CLI | 生成、开放式诊断、补方案、敏感数据、选项不全或工具不可达时由主模型处理 | JEV 不能替代代码、浏览器、无障碍审计、授权或最终发布责任 |

使用 JEV 的主要可验证收益是统一输出结构与显式升级控制；本次没有取得人工基线的可比墙钟/token，也没有真实生产样本，因此不声称提速、降 token 或生产准确率提升。

## 6. 无 JEV 时的替代协议

当后端不可达、任务禁止外发或无需调用 JEV 时，保留以下 JEV-like 工作方式；模拟的是流程约束，不是假造 JEV 答案或置信度。

1. **状态压缩**：只保留目标、已证实事实、发布政策、未知项、候选动作和停止条件；大日志留在文件，用脚本本地处理或只引用摘要。
2. **类型化**：真假判断用 `noul`，互斥动作用 `choice`，有序成熟度用 `score`；需要写代码、解释或提出新选项时转主模型。
3. **预先枚举**：在看结果前冻结 true/false 语义、互斥选项或从低到高等级；没有覆盖“补证据/停止”的集合就先补齐选项。
4. **按状态批处理**：同一构建候选的构建、回归、无障碍和下一动作组成一个批次；不同事实域分批，避免超大 state。
5. **预设阈值**：按错误代价在批次前确定阈值；没有校准接口时，人工 confidence 写 `unknown`，不得编造小数。本训练的 0.85/0.90 不是公司通用阈值。
6. **统一升级**：事实冲突、关键字段未知、选项不全、状态过大、开放式生成、工具不可达或高风险低把握时，写 `escalate=true` 与 reason，并回到主模型/责任人。
7. **只执行非升级项**：升级项先补证据、重构题面或停止；不得沿用低置信先验继续发布。
8. **最小回执**：每项仅保留 `id / type / answer / confidence或unknown / escalate / reason / owner / action`，避免重复整段推理。

可复用模板：

```text
STATE: <目标 + 最小事实 + 政策 + unknown + 停止条件>
THRESHOLD: <预设阈值；无校准则只作升级规则>
QUESTIONS:
- id=<id>; type=noul; true=<语义>; false=<语义>
- id=<id>; type=choice; options=<互斥且完备的动作>
- id=<id>; type=score; levels=<低到高的可观察等级>
RESULTS:
- id=<id>; answer=<值>; confidence=<值或unknown>;
  escalate=<true|false>; reason=<原因>; owner=<裁决者>; action=<采纳|补证据|停止>
```

## 7. 训练边界与自检

- [x] 完整读取 `jev-use` Skill 与前端岗位 `PROFILE.md`。
- [x] 完成真实 `typesafe / jev-1.13.0` 批量 MCP 调用，记录 backend、model、服务端/客户端 latency、tokens、verdict、confidence、confidenceFrom 与 escalate。
- [x] 对全部 `unsure` 停止直接采纳，保留先验后由主模型按冻结事实复核。
- [x] 完成同题无 JEV 人工基线、质疑修订与未预设答案迁移题。
- [x] 比较耗时、上下文、一致性、升级和适用边界；不可测项标为 `unknown`。
- [x] 形成覆盖状态压缩、类型化、枚举、批处理、阈值与升级的无 JEV 替代协议。
- [x] 说明文件/工具输出应由脚本管道给 CLI，不搬入主对话。
- [x] 仅写本文件，未修改任务卡或 `REPORT.md`。

文件形成后的覆盖性检查也按事实位置通过脚本管道调用 `jev-use judge` CLI；该次 CLI 请求因 `typesafe` 网络错误返回 4/4 `unreachable`。所有项均按 `escalate=true` 回交，并由负责人依据本文件逐项人工核验；没有把失败回执当成通过证据。这次失败不影响前述三次 MCP 有效语义调用，但说明 MCP 与 shell CLI 的网络可达性必须分别报告。

限制：本训练只验证合成案例中的使用方法与失败控制流，不证明真实前端项目提效、生产判断准确率、浏览器兼容性或发布质量。当前本地监督门禁没有该公司任务的可验证注册回执，因此本文件不声明“已受监管”；父任务仍须复核真实原生任务 ID、共享额度快照和最终集成交付。
