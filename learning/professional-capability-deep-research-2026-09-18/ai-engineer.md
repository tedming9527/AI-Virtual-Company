# 辛澈 · AI工程师深入研究：外部工具的授权—写入—结果闭环

- 日期：2026-09-18
- 负责人：辛澈 · AI工程师
- 复核人：顾清妍 · 质量测试工程师
- 模型 / 推理：`gpt-5.6-sol / high`（已核验派发）；能力层级：deep；额度语义：个人 3% cap
- 状态：`research_complete`
- 验证等级：官方能力审计 + 当前本地只读盘点；没有连接新账号、授予权限或执行外部写入，不是 `production_verified`

## 1. P0 问题与会改变的决策

**问题：** 邮件、内容发布、代码托管等外部工具，是否能用可审计证据证明“用户授权正确 → 写入只发生一次且对象正确 → 业务结果达到所声称层级”？

该问题决定：工具是否可进入自动化白名单；哪些动作必须逐次确认；超时后能否重试；何种回执可把任务从 `running/unknown` 升级；何时必须降级为只读、人工确认或禁止自动化。事实所有者分别是用户/业务负责人（业务授权）、workspace 与服务管理员（可用动作）、外部服务（资源与终态）、工具维护者（schema/重试语义）。

## 2. 当前证据地图

### 已证实的当前本地事实（2026-09-18 只读采样）

| 类型 | 当前可发现能力 | 实际可用状态 | 本轮能证明什么 |
|---|---|---|---|
| 邮件 | 插件目录可发现 Gmail；本机有 `agently-mail` Skill | Gmail 插件 `installed:false`；`agently-cli` 不存在；未检查或连接邮箱账号 | 只有插件/Skill 描述和默认应用权限策略，不能证明 OAuth scope、真实 schema、两阶段确认或发送回执可运行 |
| 内容发布 | 可发现 Metricool、WordPress.com、WPWriter 等插件 | 抽样 Metricool `installed:false`；`wp` CLI 不存在；未连接站点/品牌 | 只有目录能力声明，不能证明当前账号、发布权限、平台回执或目标状态查询 |
| 代码托管 | 可发现 GitHub 插件；本机存在 `gh`；当前会话另有 Vanke Monitor Release 专用工具 | GitHub 插件 `installed:false`；未检查 `gh` 登录身份；专用工具仅能按其 schema 处理目标业务仓库，本轮无目标仓库与写授权 | 可证明本机存在 CLI 和一个窄域工具入口；不能证明通用 GitHub 连接、仓库权限或任何写入已发生 |

对 Gmail、GitHub、Metricool 三个未安装插件读取到的只是全局默认“Allow low-risk actions”。这不是业务授权、不是连接账号授权，也不是服务 OAuth scope。OpenAI 官方把插件可用性、Skill、MCP 访问、动作许可、服务授权和运行环境权限列为独立控制层，并建议先只读、再以最小权限测试写入。[OpenAI 插件与连接器控制](https://developers.openai.com/pt-BR/docs/enterprise/apps-and-connectors)

### 推断

- **闭环是主张级，不是工具级。** 同一次写入可以验证“资源已创建”，却仍无法验证“收件人已收到”“内容已被外部读者看到”或“代码已部署”。
- **工具回执是证据输入，不是终态。** 只有把返回标识绑定到同一对象的独立读取，并按业务主张补齐下游状态，才可能升级结论。
- **本轮所查三个标准写端点没有形成已证实的通用幂等键契约。** 这是对已读官方文档的有限结论，不等于这些平台永远无法通过应用层设计去重。

### 冲突与陈旧项

- 当前平台默认权限可能自动批准“低风险动作”，但公司工作流要求外部写入先取得具体业务授权；二者不能互相替代。
- `agently-mail` Skill 描述了确认令牌和错误码，但执行二进制缺失，故属于 `skill_state:loaded`、`runtime/tool_state:unavailable`，不能当成本机邮件能力。
- 上轮来源治理历史规范仍为 `stale`；本轮只采用已复核的正交证据字段与授权前置规则。[上一轮报告](../professional-capability-research-2026-09-18/ai-engineer.md)｜[已复核岗位知识](../../employees/ai-engineer/VERIFIABLE_AI_WORKFLOW.md)

### Unknown

三类插件实际工具 schema、账号 OAuth scope、服务管理员策略、确认提示是否覆盖全部写动作、模糊超时后的服务端状态、供应商审计日志保留期、撤销/补偿能力、当前 `gh` 登录与目标仓库权限均为 `unknown`。

## 3. 专业研究结论及来源

### 总结论

外部工具**可以形成有限、主张匹配的闭环，但不能形成跨工具统一的“成功回执＝业务完成”闭环**。最低闭环由五类正交证据组成：

1. `authority_state`：谁批准了哪个对象、动作、范围和时限；
2. `service_capability`：已连接身份、最小 scope、workspace 动作策略与工具 schema；
3. `write_tool_receipt`：请求参数摘要、时间、返回码、服务资源 ID/URL；
4. `outcome_evidence`：用服务端读取或下游事实验证与主张同层的结果；
5. `ambiguity_recovery`：丢失响应、重复投递、异步失败时的查询、去重、人工处置和退出方式。

字段不构成万能顺序状态机；唯一硬门禁是外部写入必须先 `authority_confirmed`，之后才可调用写工具。

### 邮件

Gmail `users.messages.send` 需要明确 OAuth scope，成功响应包含 `Message`；`users.messages.get` 可按 ID 回读消息。[发送端点](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/send)｜[读取端点](https://developers.google.com/workspace/gmail/api/reference/rest/v1/users.messages/get) 但 Gmail 官方错误指南明确指出，不能假设 HTTP 200 就代表邮件成功送达；429、部分 403 reason 与 5xx 的重试策略也不同。[错误与重试](https://developers.google.com/workspace/gmail/api/guides/handle-errors)

因此邮件的最大可验证主张应分层：`API 接受并返回消息对象`、`发件箱对象可回读`、`收件服务器/收件人已送达`、`收件人已阅读`。前两层可能由 API 支持；后两层需要退信、投递服务事件或收件人证据，标准发送回执不能补齐。

### 内容发布

WordPress 支持用可撤销的 Application Password 在 HTTPS 上认证；最终权限仍受用户 capability 与站点配置约束。[认证](https://developer.wordpress.org/rest-api/using-the-rest-api/authentication/)｜[Application Passwords](https://developer.wordpress.org/advanced-administration/security/application-passwords/) `POST /wp/v2/posts` 可创建 `draft/pending/private/future/publish` 等状态，`GET /wp/v2/posts/<id>` 可回读对象。[Posts API](https://developer.wordpress.org/rest-api/reference/posts/)

这可支持“指定站点中的指定 post 已达到某状态并能按 ID 回读”；若声称“公网可见”，还应以未认证读取页面/REST `view` 核对；若声称“已分发、已被索引、已产生阅读”，还需 CDN、平台分发、搜索索引或分析数据，单个 post 响应不足。

### 代码托管

GitHub 创建 issue 要求仓库 `Issues:write`，成功返回 201 和资源对象；403、410、422、503 有不同语义。[Issues REST API](https://docs.github.com/en/rest/issues/issues) 资源 ID/number 可用于回读“对象存在”，但通知、PR 合并、Actions、部署仍是独立结果。Webhook 可能延迟或乱序，失败不会自动重投；GitHub 为事件提供唯一 delivery ID，并允许有限窗口内重投。[Webhook 排错](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/troubleshooting-webhooks)｜[Webhook 重投](https://docs.github.com/en/webhooks/testing-and-troubleshooting-webhooks/redelivering-webhooks)

因此“已发布代码”至少要指定是哪一层：远端 ref/commit 存在、PR 已创建、PR 已合并、目标分支 SHA 正确、CI conclusion 成功、部署环境指向该 SHA。GitHub/CLI 的一次成功返回不能跨层替代。

## 4. 竞争假设与反例分析

### 假设 A：成功 HTTP/工具回执和资源 ID 足以闭环

**反例：** Gmail 官方不允许把 200 外推为成功送达；WordPress `publish` 对象不证明 CDN/索引/读者可见；GitHub issue 201 不证明通知或后续自动化成功。A 只适合主张“服务接受请求并创建了对象”，不能支持业务终态，故被否决。

### 假设 B：写后再 GET 到目标对象，就足以闭环

**反例：** 发件箱对象存在仍可能退信；文章对象存在但公开 URL、缓存或分发失败；PR 存在但未合并，合并后 CI/部署仍可失败。B 比 A 强，却仍只能关闭“对象状态”而非所有下游副作用，故仅条件成立。

### 采用假设 C：按主张拆终态，以权限、写回执、同对象回读和下游证据组合闭环

C 能解释不同工具为何需要不同证据，也能在下游不可见时安全输出 `partial/unknown`。它的代价是必须预先声明主张层级，并为模糊失败保留人工处置；当前证据支持将 C 作为能力审计结论，但尚未经过真实账号实验。

## 5. 三条可立即采用的行动规则

1. **写前契约：** 在调用前记录目标对象、允许动作、最大影响、授权人、有效期、最小服务 scope、工具版本、预期资源 ID、结果查询、重试/补偿方式。缺任一关键项时保持只读。
2. **授权与平台控制分账：** `authority_confirmed`、workspace 动作策略、连接账号 scope、运行时批准分别核对。只有业务授权已确认且其他控制允许时才写；自动批准策略永远不补业务授权。
3. **按错误语义恢复：** 401/权限型 403/验证错误不盲重试；仅对官方定义的限流或瞬时错误按 `Retry-After`/退避处理。响应丢失时先查目标状态；没有可靠查询或幂等/去重契约时禁止自动重放。

## 6. 未见迁移题及独立作答

**题：** 一个获批的测试流程要发布 WordPress 测试文章、发送一封通知邮件并创建 GitHub issue。WordPress 写响应在客户端超时，但按预定 slug 查到一篇 `publish` 文章；Gmail 返回 200 和 message ID；GitHub 返回 201，但关联 webhook 显示失败。能否把流程标记完成？是否应自动重发邮件和重建 issue？

**答：** 只能标记 `partial`。WordPress 还需按文章 ID 和未认证公开 URL 核对内容摘要/状态，匹配后可关闭“文章已公开”这一层；Gmail 只能关闭“API 接受且消息对象存在”，送达仍 unknown，不能因缺少送达证据自动重发，否则可能重复；GitHub issue 已创建，不应重建，webhook 失败是独立终态，应在授权范围内重投原 delivery 或人工处理。只有文章公开、邮件所需终态、issue 和 webhook 下游结果分别达到题目预设验收层级，整体才完成。若流程原本只要求“提交邮件给 Gmail”而非“送达”，则邮件子项可以完成——终态必须由事前主张决定，不能事后迁就回执。

## 7. 最小真实验证协议

本轮没有测试权限，以下是下一次可执行的能力审计协议，不是已完成测试。

### 输入与环境

- 用户明确批准的测试 Gmail/邮件接收槽、WordPress 测试站点、GitHub 测试仓库；禁止生产账号。
- 三个唯一 `operation_id`、无敏感数据的固定测试内容、预期对象摘要和清理授权。
- 最小权限身份：邮件仅发送/回读所需 scope，WordPress 限定测试作者，GitHub 限定单仓库 issue 或测试分支权限。

### 步骤与证据

1. **只读预检：** 记录插件 installed/connected、工具 schema、账号主体、scope、workspace action policy、服务权限；读不到任一项则不写。
2. **批准：** 向用户展示精确收件人/站点/仓库、内容摘要、副作用、清理方式；保存 `authority_confirmed` 的对象与时间，不复用到别的动作。
3. **单次写入：** 每类只写一次，捕获参数摘要、客户端 operation ID、HTTP/工具状态、provider resource ID/URL、时间和原始错误分类。
4. **结果复查：** 邮件按 message ID 回读发件箱并由测试收件槽记录接收/退信；WordPress 按 post ID 回读并以未认证 URL 核对；GitHub 按 issue/PR/commit ID 回读，并按声明继续查 webhook、Actions 或部署状态。
5. **模糊失败：** 在可控代理中模拟“服务已写、客户端丢响应”。先按 operation ID/资源属性查询；只有服务或适配器证明去重安全时才重放，否则人工裁决。
6. **错误矩阵：** 分别验证未授权、scope 不足、验证错误、429/限流、5xx、超时、重复请求；不得在生产制造邮件、发布或合并副作用。
7. **退出与恢复：** 邮件只发到自有 sink、不可撤回；文章按预授权降为 draft/删除；issue 关闭、测试分支删除；每项清理另留回执，清理失败不隐瞒。

### 通过、阻断与退出条件

- **通过：** 三类工具均能证明授权对象匹配、最小权限、一次写入、稳定资源标识、同对象回读、声明层级终态和可执行恢复；模糊失败不会造成重复副作用。
- **部分通过：** 只能证明资源存在，不能证明下游结果；仅允许该层自动化并对外显示 `partial/unknown`。
- **阻断：** 无法确认账号/scope、无目标状态查询、响应丢失后无法安全对账、不可逆副作用没有测试隔离，或平台确认策略可能绕过具体业务授权。
- **退出：** 任一高风险副作用出现、达到预算/速率阈值、两轮无新增证据或用户撤销授权，立即停止新写入并按已批准方式收尾。

## 8. 适用、禁止套用与失效条件

- **适用：** 有外部副作用且服务提供资源 ID、状态读取或审计事件的工具；包括邮件、CMS、代码托管及相似 SaaS。
- **禁止套用：** 把平台确认提示当用户业务授权；把目录描述/Skill 加载当连接成功；把 2xx、CLI exit 0、webhook 2xx 或对象存在跨级写成业务完成；在无测试隔离时故意制造重复发送、公开发布、合并或部署。
- **失效条件：** provider API/schema、OAuth scope、插件安装状态、workspace action policy、错误/重试语义或业务验收层级变化；出现重复副作用、资源 ID 不稳定、读取与写回执冲突时立即撤下自动化资格。

## 9. 仍需真实任务关闭的 unknown

- Gmail、Metricool/WordPress、GitHub 插件在当前 workspace 安装后的真实工具列表、scope、确认行为和审计字段。
- 邮件适配器确认令牌是否与参数摘要强绑定，以及响应丢失时能否用稳定 operation ID 查重。
- 内容插件是否返回 provider post ID、计划发布终态、失败隔离和撤回证据。
- GitHub 连接器“publish changes”的精确边界、目标 branch/SHA 校验、Actions/部署轮询和重复请求语义。
- 该协议在三个真实可比任务中的误报、重复副作用、人工介入和返工成本；目前均为 `unknown`。

## 10. Skill、工具地图与检查清单建议

**值得修改工具地图，不立即新增 active Skill。** 为每个外部工具增加：官方来源、插件/二进制版本、installed/connected、身份类型、读/写动作、OAuth/service scope、workspace 确认策略、不可逆副作用、幂等声明来源、返回标识、结果查询、webhook/audit、错误分类、重试上限、补偿、数据去向、最近实测日期和状态。

现有 `verifiable-ai-workflow` 候选可在真实协议通过后增加 `external_action_contract` 模板；当前只保留 `reviewed_case` 建议，不因文档能力审计升级。最小检查清单就是本报告第 7 节的“预检—批准—一次写入—结果复查—模糊失败—错误矩阵—退出”。

## 11. 停止理由与下一触发条件

**停止理由：** 第一轮完成当前本地能力/安装状态盘点，第二轮完成 OpenAI、Google、WordPress、GitHub 官方权限、回执、查询与失败语义核对；能力矩阵、竞争假设、反例和验证协议已形成。继续只读检索不会关闭账号 scope、真实 schema、超时去重和业务终态这些权限依赖项；问题在能力审计层已解决，因此状态为 `research_complete`，真实验证保持未执行。

**下一触发条件：** 用户明确提供一种测试工具、测试账号/仓库/站点、最小权限和具体写入授权，并同意相应清理方式；届时只执行第 7 节协议的一种工具，不默认同时连接三类服务。若实际回执推翻本报告，先将相关工具地图状态降为 stale/blocked，再修订规则。
