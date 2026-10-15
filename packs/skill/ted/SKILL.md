---
name: ted
description: 处理 Ted 便捷命令，包括 /ted 文本触发、检查更新、本地全景图、评分汇总、doctor 与修复方案；使用已安装的 ted-avc-manager MCP 或 CLI。
---

# Ted 便捷命令

用户输入 `$ted`、`/ted` 文本或请求 Ted 管理操作时，优先调用固定动作的 MCP `ted_<action>`；未指定动作调用 `ted_help`。若客户端只暴露组合入口，则调用 `ted_command` 并将明确动作作为 `action` 传入。只读动作不需要专门登记文件交付任务，也不为关闭任务虚构产物。已有业务任务继续沿用其绑定。按返回证据报告结果，工具不可用时使用已安装的 `ted-avc-manager ted <action>` CLI。

| 动作 | 结果 |
|---|---|
| `update` | 版本检查与有界双语摘要维护；检查不等于安装 |
| `panorama` | 生成本地全景图，返回真实文件路径 |
| `scores` | 有效评分、优秀项及证据不足项，不制造样本 |
| `doctor` / `status` | 目录与接入诊断，不自动修改配置 |
| `repair` | 安装修复方案尚未执行；另行分批登记双语短摘要补齐请求 |
| `monitor` | 打开本机只读资料监控；仅记录已登记候选与正式资料，滚动保留 24 小时 |
| `summary` | 默认只读查看预算、交接信息和已登记资料的中英短摘要 |
| `tasks` | 默认只读预览活性与拟结算；reconcile 核对，cleanup 保全统计后清理到期原始日志 |

这是聊天输入框技能入口：在支持技能菜单的客户端输入 `/` 并选择 Ted，或输入 `$ted` 明确选择技能，然后补充动作或自然语言要求。界面标签来自 `agents/openai.yaml`。MCP 支持的客户端也可选择 `ted` prompt。`/ted` 同时保留为文本触发约定；安装文件、宿主列入技能清单、菜单可见和实际工具调用分别核验，不把文字别名当作已验证菜单，不声称已经注册原生 `@Ted` 插件入口。

更新或修复获用户明确授权后，执行返回的确定性安装入口，并保留原生审批、Hook 信任及资料保全。工具或采集失败时继续其他已授权工作，任务登记、资料交付、评分、升级和最终署名分别核验。

原生任务已登记时，结束前用 `ted_status` 传入当前 sessionId 和 turnId 查询 `pendingCalls`。仅把仍为 reserved 且确实没有完成回执的调用登记为 unknown；不要把已观测调用再次声明 unknown。无需读取或修改底层任务 JSON。

## 上下文预算与摘要

`/ted summary`（`/ted 摘要优化`）或 `ted_summary` 查看预算和收敛方案；CLI 可带 `--session <id> --turn <id>`。仅统计适配器交付的 UTF-8 字节，不代表模型 token，也不能清空宿主已加载上下文。预算不会因查询而重置。

已有原生会话标识时，将当前 sessionId/turnId（子代理同时带 agentId）传给摘要、诊断、修复与更新工具，使完整 JSON 响应累计计量。缺标识会明确返回 unbound 和单次硬上限，不要求为此另开任务；预算耗尽或计量故障时按控制状态保留待办，继续其他已授权工作。

已有 metadata description 保存同源的 `zh-CN` / `en` 短字段，绑定正文、description、元数据 SHA-256、声明的 sourceVersion 与摘要策略版本。`doctor` / `summary` 提供维护预览，普通 list_assets/recommend_assets 检索消费通过来源校验的双语字段；缺失时保留原描述回退。load_asset 正文摘录保持原文，不自动翻译整篇资料。不设置语言环境、不筛掉其他语言资料、不翻译或覆盖正文。`doctor` 和 `summary` 默认只读；`repair` / `update` 每批检查至多 4 项并复用可核验缓存或登记缺失请求，按返回 `nextCursor` 继续。两语言共享字节预算；`pending` 不等于已补齐。

用户要求修复或更新时，在当前任务预算内处理返回的请求：调用 `ted_summary`，传 `operation:"prepare"` 与 `requestId`；只按返回的 `originalDescription` 补齐 `missingLanguages`，保留否定和限制。再用 `operation:"submit"` 回传同一 `requestId`、`sourceSha256`、`descriptionSha256`、`policyVersion` 和 `summaries:{"zh-CN":"…",en:"…"}`（可仅提交缺失字段）。每批至多处理 4 个请求，达到预算、遇到来源变化或验证失败便保留 pending/游标，继续其他已授权工作；不靠改标签宣称翻译完成。工具只校验来源、字节与语言特征，`pairComplete` 不证明语义等价、完整指令覆盖或升级完成。提交结果失败时不报告修复成功。CLI 后备使用 `ted-avc-manager ted summary --input <input.json>`，参数相同。

`load_asset` 默认 `mode=summary` 返回有界摘录和章节游标，不代表全文采用。需要正文时显式 `mode=chunk`，按 `nextCursor` 连续读取；游标绑定源 SHA-256，源变更须重新发现。重复片段不再次交付，预算耗尽保留未读游标，继续其他授权业务。

自动升级提取同样先索引后分段；周度使用 `governance-weekly-read <input.json>`，携带当前原生 sessionId/turnId/receipt 与 runId，先读分页索引，再以 path 和 mode=chunk 读取来源。摘要、预算不足和未读来源不能当成完整提取或升级回执；不自动发布，不删除原始资料。

## 任务结算与到期清理

`/ted tasks`（`/ted 任务`、`/ted 结算`）或 `ted_tasks` 默认 inspect，不修改任务。`operation:"reconcile"` 应用分页核对，可明确传 `policy:{forceCloseDays:7}` 将连续无有效进展的硬结算上限配置为 5～10 天，默认 7 天。状态查询不续期；强制结算不制造业务成功或终止工具。纯问答用 `task_closeout` 的 `evidenceKind:"conversation"`，没有已观测答复时仍报告未验证，不虚构文件。

`operation:"cleanup"` 先保全计数和最小审计证明，再清理默认到期 10 天的受管原始采集副本；未知结果与旧 active 不永久锁住原日志。已采集的加载、读取、声明及独立结果按各自证据继续统计，未采部分列未知。按 nextCursor/moreLogs 续页；预算降级时以 operationOutcome 中的实际变更和游标为准，不盲目重试。CLI 为 `ted-avc-manager ted tasks --input <input.json>`。常驻 MCP 每五分钟做一批本地维护，客户端关闭期间不承诺到点执行；宿主归档事件支持另需验收。未安装新版时不声称此入口已生效。

## 本地资料监控

`/ted monitor`（`/ted 监控`）调用 `ted_monitor`，默认 `operation:"open"`；`status` 查询、`stop` 停止新增采样与交互。CLI 为 `ted-avc-manager monitor open/status/stop`，`monitor serve --open` 可前台诊断。服务只绑定本机回环地址；一次性浏览器凭据不写入聊天，打开失败请在本机重新运行命令签发。旧客户端尚未安装新版时不宣称已支持此入口。

仅活动页面存在时收集未来准入资料事件；关闭最后页面停采样，已有监控副本滚动保留 24 小时，重开不续期、不补旧业务历史。按会话、时间、类型和证据筛选，分组柱状图与增长动画只反映可观察事件。摘要交付、完成读取、模型声明与正式采用分开；监控不调用模型/Jev，不更改采集源、原始资料或宿主权限，失败不阻断任务。
