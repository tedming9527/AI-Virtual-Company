# 周启明：跨路由、多数据源请求归属与完整页面状态

- 日期：2026-09-18
- Owner：周启明 · 体验工程官（Frontend Engineer）
- Reviewer：顾清妍 · 质量测试工程师（Test Expert，独立复核 `pass`）
- 执行配置：deep / `gpt-5.6-sol` / high；质量优先；个人 3% cap，个人精确用量 unknown
- 状态：`partial`；没有真实页面、浏览器和接口证据，不是 `production_verified`

## 1. P0 问题与会改变的决策

问题：用户跨路由或连续切换业务上下文时，多个数据源怎样共同保护 data/loading/error、允许部分失败和局部重试，并避免旧页面或旧尝试回写当前页面？

本研究会改变四个决定：请求归属应按页面还是资源划分；全局 loading/error 是否保留；retry 重试整页还是失败资源；是否立即抽成通用 hook/state machine。当前决定是：采用“页面作用域 + 资源 + 输入 + 尝试”的分层归属作为候选模型，停止使用单一全局布尔状态；**不创建通用 hook**，先在一个真实页面完成协议验证。

## 2. 当前证据地图

| 类型 | 当前证据 | 能证明什么 | 不能证明什么 |
|---|---|---|---|
| 事实 | 本轮复跑 `node --test search-controller.test.js`：1 pass / 0 fail；实现以递增 request ID 统一保护 rows/loading/error，retry 使用当前关键词 | 单资源、无框架、可控乱序下的最新请求归属成立 | 路由卸载、多源部分失败、真实取消和浏览器行为 |
| 事实 | 2026-09-13 Vanke 静态蒸馏记录：`azeroth` 用 effect cleanup 阻止旧写入；`flexible` 使用 AbortController，但把取消转为空列表成功 | 真实代码样本存在 cleanup/abort 意识及取消语义反例 | 当前分支仍相同、运行时正确或生产成熟 |
| 官方文档 | React 在依赖变化和卸载时先执行旧 Effect cleanup；取数应 abort 或忽略旧结果；独立同步过程应拆成独立 Effect | 单个 Effect 的生命周期与客户端旧结果隔离原则 | 多资源聚合业务规则、后端副作用和目标项目版本 |
| 官方文档 | React Router 数据路由会取消被中断导航和陈旧 revalidation，但不同 fetcher 有各自并发边界；服务端仍可能继续处理已取消请求 | 若目标项目实际使用对应数据 API，可减少常见客户端竞态 | 任意路由库都自动安全、取消等于服务端终止 |
| 冲突 | 项目选择页任务记录同时写 `actual_executor: not_started` 与 `status: verified` | 该记录只能提供研究线索 | 页面已实现、测试/浏览器/接口已验收 |
| unknown | `$VANKE_WORKSPACE_ROOT` 当前未解析，业务仓、框架版本、目标路由及真实接口不可读 | — | 当前项目是否已有缓存库、loader/fetcher 或状态机 |
| 陈旧项 | 9 月 13 日静态蒸馏、9 月 16 日任务事件均是历史快照 | 可用于提出反例和验证问题 | 不得描述成当前代码事实 |

可追溯来源：[上一轮报告](../professional-capability-research-2026-09-18/frontend-expert.md)、[岗位 reviewed_case](../../employees/frontend-expert/DESIGN_EVIDENCE_STATE_ARCHITECTURE.md)、[最小实现与验收](../exercises/vanke-request-ownership/README.md)、[Vanke 静态蒸馏](../2026-09-13-vanke-frontend-code-distillation.md)及[质量复核](../2026-09-13-vanke-frontend-code-distillation-review.md)、[历史项目选择页记录](../../inbox/session-events/2026-09-16-project-picker-page.md)。官方来源：[React useEffect](https://react.dev/reference/react/useEffect)、[同步 Effect](https://react.dev/learn/synchronizing-with-effects)、[拆分独立同步过程](https://react.dev/learn/removing-effect-dependencies)、[React Router 竞态说明](https://reactrouter.com/explanation/race-conditions)。

## 3. 专业研究结论

请求归属不是单个 `requestId`，而是四元组：

`owner = { scopeKey, resourceKey, inputKey, attempt }`

- `scopeKey`：路由参数、租户/用户上下文与选择结果共同定义的页面事实版本；A→B 时先使 A 失去当前作用域资格。
- `resourceKey`：project、user、brand、entries 等独立数据源。每个资源拥有自己的 status/data/error，互不以一次 `finally` 修改共享计数。
- `inputKey`：资源实际请求条件的稳定快照；同一路由内筛选变化也会失效旧结果。
- `attempt`：同一输入的重试序号；只校验 scope 会让早期重试覆盖后续重试。

响应只有四项都与当前所有者匹配时才可提交。Abort/cleanup 是降低浪费和触发生命周期失效的手段，归属比较才是可见状态的最后写入门禁；两者都不能证明服务端副作用取消。

页面状态应从**当前 scope 的资源状态派生**，而非被请求回调直接开关：

| 页面状态 | 派生条件 |
|---|---|
| `initial_loading` | 至少一个必需资源无当前数据且 pending |
| `blocked_error` | 必需资源失败且无可安全展示的当前数据 |
| `ready` | 全部必需资源成功；可选资源可独立展示 |
| `partial` | 必需资源 ready，但至少一个可选资源失败并有局部恢复入口 |
| `refreshing` | 当前 scope 已有可用数据，资源重试/刷新中；不清空内容 |

2026-09-24 审计修复：上述状态为正交可组合（如可选资源失败且后台刷新中 → partial + refreshing 并存），不是互斥枚举；聚合渲染优先级取“有数据可展示”最受限态，实现时不要假设互斥。

“必需/可选”是页面业务契约，不由前端自行猜测。重试默认只创建失败资源的新 attempt；路由切换后旧 retry 即使返回也不得写入。若接口提供原子快照/BFF 且所有字段同生共死，才可以把多个资源视为一个 resource。

## 4. 竞争假设与反例分析

### H1：整页单一 owner，所有资源原子提交

优点是页面不会出现混合快照，状态简单。反证场景：brand 为可选数据但失败，`Promise.all` 会令 project/user/entries 的成功结果一起失败；重试又重复请求全部资源。只有后端提供同版本原子快照，或页面规定所有资源均为阻断项时才成立。

### H2：每个资源完全独立 owner，不设页面 scope

优点是部分成功与局部重试自然。反证场景：A→B 后，A 的 brand 与 B 的 project 分别通过各自“最新资源请求”检查，最终拼出跨项目混合页面。仅资源级 latest 不足以表达路由事实版本。

### 候选综合：层级 owner

页面 scope 先阻断跨路由污染，资源 owner 再支持部分成功，attempt 防止同输入重试乱序。它能解释现有单请求练习，也能解释 H1/H2 的失败，但仍是案例推理，须由真实页面验证。

其他反例：用共享 loading 计数时，A 的迟到 `finally` 可能提前关闭 B 的 loading；把 abort 转成 empty 会伪造业务成功；把 GET 取消经验迁移到提交类写请求，会掩盖服务端已经执行的副作用。

## 5. 三条可立即采用的行动规则

1. 开工先列 `scopeKey/resourceKey/inputKey/attempt`，并明确哪些资源必需、哪些可选；缺业务事实就记 unknown，不先写聚合逻辑。
2. 资源状态独立保存，页面状态只从当前 scope 派生；禁止旧 owner 修改 data、loading、error，禁止用全局 `finally` 直接结束当前页面加载。
3. 先复用目标框架已有 loader/cache/concurrency 能力，再决定自建 reducer 或 hook；无真实框架、浏览器与接口证据时不发布“通用请求 hook”。

## 6. 未见迁移题及独立作答

**题目：** `/projects/:code` 同时加载 profile（必需）、permission（必需）、brand（可选）、entries（可选）。用户 A→B→C 连续切换：B profile 先成功，A brand 随后成功；C permission 失败。用户重试 C permission 后立刻后退到 B，C retry 最后成功。页面应如何显示并归属？

**作答：** A、B、C 各有不同 scope；A brand 不得进入 B/C。C profile 若成功但 permission 无可用数据且失败，页面为 `blocked_error`，不能因可选资源成功而 ready。retry 只增加 C permission 的 attempt；退回 B 后 C scope 失效，迟到 retry 成功不得清除 B 的 error/loading 或写入 B 权限。B 若缓存中的必需资源版本完整，可先显示 B 并标 `refreshing`；若 permission 缺失则仍为 `initial_loading`。每个可选资源各自显示 pending/error/retry。若 permission 请求会产生服务端写入，则本答案失效：前端失效 token 不能取消副作用，必须另核对业务键、幂等和终态查询。该答案尚未在 React 页面执行。

## 7. 最小真实验证协议

| 项目 | 要求 |
|---|---|
| 输入 | 一个真实 React 路由、稳定 route/context 标识、至少 2 个必需和 2 个可选读取源、明确的错误与重试语义 |
| 环境 | 项目实际框架版本；本地或隔离测试环境；可控制延迟、失败和返回顺序的测试代理；真实浏览器 |
| 权限 | 仅使用获授权的读取接口或无副作用 fixture；不得为研究触发生产写入；网络记录脱敏 |
| 步骤 | ①记录现有路由/缓存能力；②建立 owner 与状态转移表；③覆盖 A→B→C、直达、后退、卸载、Strict Mode setup→cleanup→setup；④制造必需/可选源部分失败；⑤失败资源 retry 后再次切路由；⑥若有写请求，单独核对后端契约 |
| 证据 | 可控时序脚本、状态转移断言、浏览器截图/可访问状态、Network/接口回执、框架版本与测试输出；Mock 和真实接口分栏 |
| 通过 | 旧 scope/attempt 对 data/loading/error 的写入均为 0；页面聚合与必需/可选契约一致；retry 不误发成功资源；返回/直达状态可解释；无未处理 rejection |
| 阻断 | scope 身份不稳定、必需/可选未确认、无法控制时序、真实接口终态不可见，或写副作用无幂等/查询契约 |
| 退出 | 删除临时延迟/失败注入和调试日志，关闭 fixture；保存最小证据与剩余 unknown，不遗留生产 debug 入口 |

## 8. 适用、禁止套用与失效条件

- 适用：同一页面由多个读取源组成，且路由参数、筛选、身份或选择结果可快速变化。
- 不必套用：纯同步数据、单次静态文案修改，或后端已提供原子版本化页面快照且路由层能完整管理其生命周期。
- 禁止：把 token 当服务端幂等键；把 abort/路由取消写成副作用已取消；把 `partial` 当作默认放行；在未确认项目框架时强推 React Router API。
- 失效：真实框架的 loader/cache 已给出更强且经验证的提交语义；业务要求跨资源原子一致；资源依赖不是并行而是有严格前置；浏览器/接口实验推翻派生状态。出现任一项即回项目事实重做模型。

## 9. 仍需真实任务关闭的 unknown

- 当前目标项目、React/路由/缓存库版本及真实页面代码不可达。
- project/user/brand/entries 中哪些是阻断资源，是否共享同一版本或允许部分展示。
- 返回 B 时缓存是可信 current、可显示 stale，还是必须清空重取。
- 真实 AbortSignal 是否贯穿 transport；接口超时、鉴权和错误结构如何表达。
- 浏览器 Strict Mode、WebView、返回栈及真实网络下的可见状态；写请求的幂等、取消和终态查询能力。
- 层级 owner 相比既有项目能力是否减少缺陷或只增加复杂度。

## 10. Skill、工具地图与检查清单判断

暂不新建 Skill，也不修改稳定知识：当前缺少一个真实页面闭环，抽象为通用 hook 会过早。下一真实任务可先使用项目级检查清单：①scope 身份；②资源必需/可选；③input 快照；④attempt；⑤资源状态与页面派生；⑥路由卸载/后退；⑦部分失败/retry；⑧浏览器与接口分层证据。

工具地图只登记候选：若项目已使用 React Router 数据 API，优先验证其 loader/fetcher 取消和 revalidation；若使用其他缓存/路由方案，则按该项目官方能力重新评估。只有协议通过并发现重复实现成本，才考虑提炼 reducer adapter 或 Skill。

## 11. 停止理由、下一触发条件与状态

状态为 `partial`。第一轮取得并复跑无框架最小代码证据；第二轮用 React 与 React Router 官方资料核对生命周期、独立同步过程和取消边界，形成层级 owner 候选及可执行协议。继续搜索未解析的业务仓不会产生真实证据；关键环境与权限不可得，按停止门槛收口，而不是猜路径或制造 Mock 冒充页面验证。

下一触发条件：`$VANKE_WORKSPACE_ROOT` 或其他获授权真实 React 项目可解析，并同时具备目标路由、可控读取接口和浏览器环境。届时只执行第 7 节协议；若两轮实验连续无新增状态或反例，再停止并决定保留、收窄或否定该模型。
