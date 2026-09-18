# 陈知行 · 执行回执、恢复与重复执行防护深入研究

- 日期：2026-09-18
- 负责人：陈知行 · 路由官（Chief of Staff）
- 复核人：顾清妍 · 质量测试工程师（Test Expert）
- 模型 / 推理：`gpt-5.6-sol / high`（原生协作任务显式指定）
- 状态：`partial`
- 证据等级：本地进程通道为 `verified_context`；Codex App Server/子智能体为官方契约与既有任务回执；外部工具为研究协议。未验证平台级统一适配、跨客户端崩溃恢复或外部副作用 exactly-once。

## 1. P0 问题与会改变的决策

**问题：**不同执行通道的什么回执，足以把任务从 `queued` 升为 `running`、进入终态、安全恢复，并防止重复执行？

它直接改变四个编排决定：何时可以声称“正在执行”；取消请求何时算真正停止；会话或监督器中断后是恢复、等待还是重派；新一次尝试是否会重复产生外部副作用。事实所有者分别是通道维护者、当前主责和业务副作用所有者。禁止用任务卡、角色声明、最终文本或超时猜测替代通道回执。

## 2. 当前证据地图

| 类型 | 当前证据 | 可支持结论 | 边界 |
|---|---|---|---|
| 事实：本地进程 | `supervisor-runtime` 只在子进程 `spawn` 后写 `running`，保存 run/task ID、PID、开始/结束时间、心跳、退出码；取消后等待进程组退出；同一 run ID 永久拒绝重用 | 本地、非 detached 进程的执行态可由监督器证明 | 不验证模型、额度、业务产物或逃离进程组的守护进程 |
| 事实：本地复测 | 本轮执行 `node --test scripts/supervisor-runtime.test.mjs scripts/task-lifecycle.test.mjs scripts/supervision-gate.test.mjs`，27/27 通过 | 伪造回执拒绝、真实启动、失败依赖、补位、超时退出、取消确认、重复启动拒绝、陈旧心跳均有行为证据 | 测试环境，不等于平台或生产监督 |
| 事实：Codex App Server 官方契约 | `threadId/turnId/itemId` 关联事件；`turn/started` 为 `inProgress`；`turn/completed` 为 `completed/interrupted/failed`；`turn/interrupt` 成功后终态为 `interrupted`；`thread/resume` 复用既有 thread ID | 若客户端实际接入并保存事件，可构造原生 turn 适配器 | `thread/resume` 只恢复线程，不等于旧 turn 仍运行；item 完成不证明业务副作用完成 |
| 事实：Codex 子智能体官方说明及历史任务 | 支持查看 Active/Done、打开线程、要求停止；上一轮保存了八个原生任务 ID 与 completed 回执 | 当前会话的派发和终态可追溯 | 未实测父会话崩溃、跨客户端恢复、取消后的副作用终止和重复派发 |
| 冲突 | 任务卡可写 `running`，但本地门禁不能读取原生智能体；原生 UI 状态也不能由本地文件工具伪造 | 状态必须由对应通道适配器提供，不能跨通道替代 | 当前公司本地 gate 仍只支持 `supervision:RUN/TASK` |
| Unknown | 原生协作任务在宿主重启后的读取期限；中断后工具调用是否已产生副作用；各 MCP/App 的幂等、查询与重放语义 | 必须按通道现场核验 | 无接口即 `unavailable/blocked` |
| 陈旧项 | “有 agent ID 就等于持续监督”“心跳过期即可判失败并重跑” | 只能作为反例 | 已被本地行为与官方契约否定 |

来源：[本地监督契约](../../SUPERVISION_POLICY.md)、[任务生命周期](../../TASK_LIFECYCLE.md)、[监督器实现](../../scripts/supervisor-runtime.mjs)、[生命周期实现](../../scripts/task-lifecycle.mjs)、[上一轮原生任务回执](../../inbox/session-events/2026-09-18-all-hands-professional-capability-research.md)、[OpenAI App Server 官方文档](https://developers.openai.com/es-419/docs/app-server)、[OpenAI 子智能体官方文档](https://developers.openai.com/fr-FR/docs/agent-configuration/subagents)。

## 3. 专业研究结论

不存在一个仅靠字符串格式就跨通道成立的“万能回执”。可复用的是**薄的统一信封 + 通道原生证据**：

`channel + execution_id + work_item_id + attempt/operation_key + observed_status + observed_at + start/terminal evidence + result pointer + adapter/schema version`

统一信封只负责关联；状态真值必须回到原生通道读取。最低判定如下：

| 状态决策 | 最低充分回执 | 明确不足 |
|---|---|---|
| `queued → running` | 通道生成的不可变 execution/work ID；真实 start/inProgress 事件；可读取的当前 active 状态或新鲜心跳；实际执行者/目标范围 | 任务卡、计划、调用请求已发送、角色自述 |
| `running → succeeded/failed` | 同一 execution/work ID 的终态事件、完成时间和退出/错误信息；产物指针另验 | 最终自然语言、文件存在、HTTP 202、命令开始 |
| `running → cancel_requested` | 通道接受取消请求的确认 | 取消调用返回不等于已经停止 |
| `cancel_requested → cancelled/interrupted` | 同一 ID 的终态 `cancelled/interrupted`，或本地进程实际退出且后代清理确认 | 心跳停止、窗口关闭、主责写“已取消” |
| `running → needs_attention` | 非终态回执过期、监督器失联或状态冲突 | 不能据此写 failed、cancelled 或安全重试 |
| 恢复 | 先以原 ID `read/status/resume`，核对最后终态、目标副作用和产物；旧执行确定终止或同一业务操作具备可靠幂等/查询后，才创建新 attempt | 直接用新 run ID 重放旧命令 |

防重复必须有两层身份：**执行 ID** 防止调度器重复启动同一次 attempt；**稳定 operation key** 防止新 attempt 重复业务副作用。本地监督器的不可重用 run ID 只能保护它管理的进程，不能阻止操作者换一个 run ID 再次扣款、发信或发布。

## 4. 竞争假设与反例

### 假设 A：统一字段即可统一判定

主张：只要所有通道返回 `id/status/result`，就可以共用状态机。

判定：**部分接受。** 字段可统一，语义不能假定统一。App Server 的 `turn/completed`、本地进程 `exit_code=0`、外部发布工具的“accepted”分别只证明模型 turn、命令进程、受理动作完成。每个适配器必须声明 freshness、terminal、cancel 和 result 的含义。

### 假设 B：有终态文本或产物就足以标记完成

主张：agent 发回最终回答或目标文件存在，即可把任务写成 succeeded/verified。

判定：**拒绝。** 最终文本可能在工具副作用未确认时生成，文件也可能来自旧 attempt。终态回执证明执行层结束；产物版本、环境和业务结果仍需同层验证。

### 假设 C：心跳超时即可判失败并安全重派

主张：监督器失联超过阈值，旧任务视为失败，新 run 可立即开始。

判定：**拒绝。** 反例：外部发布已被服务端接受，父线程在写回终态前断线；心跳过期只表示观察者失去证据。立即重派可能重复发布。正确状态是 `needs_attention/unknown`，先查原 execution/job ID 与目标系统；无法查询且无幂等时 blocked。

## 5. 三条立即采用的行动规则

1. **原生读取后再升状态。** 只接受通道维护者生成、可重新读取并绑定目标工作的 ID；人工登记只能引用回执，不能创造 `running`。
2. **取消采用两阶段。** `cancel_requested` 与 `cancelled/interrupted` 分开；收到终态或确认进程/副作用停止前，不关闭任务，也不释放为可安全重试。
3. **恢复先查旧执行，再建新 attempt。** 旧执行不明时保持 `needs_attention`；只有确认终止、确认未产生副作用，或具备稳定 operation key 与结果查询时才重派。

## 6. 未见迁移题与独立作答

**题目：**内容发布工具返回 `202 Accepted + job-731` 后，Codex 父线程断线；任务卡仍写 running，恢复后工具状态查询连续超时，用户说“继续”。是否重新提交？

**作答：**不能直接重新提交。`202` 只证明请求被受理，`job-731` 是必须保留的原生工作 ID；父线程恢复也不证明发布任务仍运行。先用同一 job ID 查询，读取目标内容是否已出现及其版本；任务状态改为 `needs_attention`，而非 failed。若工具支持稳定 operation key，同键重试且能返回原 job/结果，可按契约继续；若明确查到失败且未产生目标副作用，可创建新 attempt 并关联旧 job；若既不可查询又不幂等，则 blocked，交由人工核对，不能以“继续”扩大成重复发布授权。该结论适用于可能产生外部副作用的异步工具；纯只读、可安全重复的查询不需要同等级门禁。

## 7. 最小真实验证协议

| 项目 | 协议 |
|---|---|
| 输入 | 一个可控慢任务、一个确定失败任务、一个带稳定 operation key 的可恢复任务；每项预先登记目标与允许副作用 |
| 环境 | 本地临时目录；实际接入的 Codex/App Server 测试线程；具备测试账号或沙箱且可 read-after-write 的外部工具。没有测试环境的通道不执行 |
| 权限 | 默认只读；写入只限测试对象并明确授权，禁止生产扣款、发布、发信或删除 |
| 步骤 | 对每个通道依次验证 start、fresh status、success、failure、cancel request、cancel terminal、观察者断连后按原 ID 恢复、重复同 execution ID、重复同 operation key |
| 必留证据 | 原生 ID、时间序事件、状态与新鲜度、取消确认和终态、退出/错误、产物指针、目标系统复查、第二次提交是否被拒绝或折叠 |
| 通过条件 | 无真实 start 不进入 running；取消未终态不关闭；断连可用原 ID 重建状态；重复 execution 不启动；重复 operation 不产生第二次副作用；执行完成与业务验证分层 |
| 阻断条件 | 无状态读取、无取消终态、外部副作用既不可查询又不幂等、无法隔离测试对象，或回执不能绑定目标工作 |
| 退出方式 | 取消测试任务并等待终态，清理测试对象；若停止未确认则保留 needs_attention 和原 ID，不以删除记录收口 |

本轮仅真实执行了本地进程测试；没有为研究连接新账号、调用外部写工具或模拟平台适配器。

## 8. 适用、禁止套用与失效条件

- **适用：**多执行者、长任务、跨会话恢复、外部工具写入，以及任何可能因重试产生副作用的任务。
- **可精简：**单回合、只读、无副作用且结果可直接复算的操作，可保留 execution ID、终态和结果指针，不强制完整恢复矩阵。
- **禁止：**把 HTTP 202、消息已发送到队列、任务卡、agent 最终文本、心跳超时或文件存在单独当作业务成功；把 App Server 官方能力写成当前公司已接通能力。
- **失效：**通道 API、状态枚举、保留期、取消语义、幂等契约、客户端持久化或适配器版本变化时，旧矩阵停止自动采用并重新验证。

## 9. 仍需真实任务关闭的 Unknown

1. 当前原生协作工具能否在宿主重启后按 agent/thread ID 读取精确终态，并区分任务中断与业务副作用已经发生。
2. 原生子智能体“停止”对正在执行的工具调用、外部写入和已派生进程的实际终止保证。
3. 各 App/MCP 工具的 operation key、重复请求、异步 job 查询、回执保留期和 read-after-write 能力。
4. App Server 事件流适配到公司门禁后的丢事件、重连、事件顺序和重复消费行为。
5. 上述协议在三个真实可比任务中是否减少重复执行与人工恢复成本。

## 10. Skill、工具地图与检查清单建议

**不立即新建 Skill。** 当前最缺的是通道适配器实证，不是更多说明。建议先在公司工具地图为每个通道登记：原生 ID、start/terminal/freshness/cancel/resume/query 语义、回执保留期、幂等/副作用、当前 `verified/unavailable` 状态和验证日期。

下一步若至少两个真实通道通过协议，再评估把以下只读检查做成 `execution-receipt-audit` Skill：

- [ ] 回执是否由原生通道生成并可重新读取？
- [ ] execution ID、work ID、attempt 与 operation key 是否分开？
- [ ] running 是否有 start 与新鲜度证据？
- [ ] cancel request 是否取得停止终态？
- [ ] stale 是否保持 needs_attention，而非自动失败？
- [ ] 新 attempt 前是否确认旧执行/副作用状态？
- [ ] execution 完成、产物验证和发布是否分别结论？

Skill 只能审核回执，不得伪造状态、自动重派、扩大授权或承诺 exactly-once。

## 11. 停止理由与下一触发条件

**停止理由：**本地实现与本轮 27 项行为测试已足以回答本地进程通道；OpenAI 官方资料足以定义 App Server/子智能体的候选回执字段，但当前没有已接入的原生状态适配器、宿主崩溃场景或外部工具测试权限。继续阅读政策不会把文档契约提升为运行实证，因此按“关键环境/权限不可得”停止，状态保持 `partial`；不是连续重试耗尽，也未触及预算上限。

**下一触发条件：**出现真实多通道任务、父会话中断恢复、外部异步 job，或获得具备查询与幂等能力的测试工具时，按第 7 节执行一次纵向验证。只有至少两个非本地通道完成成功、失败、取消、恢复和重复提交矩阵，才考虑把统一信封提升为 `reviewed_case` 或新增适配器。
