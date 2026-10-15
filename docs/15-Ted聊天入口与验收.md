# Ted 聊天入口与验收

本轮新增内容是工作副本候选，尚未发布或安装到用户真实客户端。下述既有宿主验收记录对应 [v1.6.1](https://github.com/tedming9527/AI-Virtual-Company/releases/tag/v1.6.1)，实际安装版本以 `ted_status` 为准；该历史版本完整发布和 Pages 工作流 [38546371224](https://github.com/tedming9527/AI-Virtual-Company/actions/runs/38546371224) 成功。不要把旧发布记录当作本轮双语候选已部署的证据。

## 输入框交互

安装器将 `packs/skill/ted` 作为独立、受管的原生技能安装到客户端技能目录，记录每个文件摘要。`agents/openai.yaml` 提供名称 Ted、菜单说明和默认提示。宿主支持技能斜杠菜单时，用户输入 `/` 选择 Ted，再补充更新、全景、评分、诊断或修复要求；明确技能调用使用 `$ted`。这是输入框操作，CLI 仅作为安装和工具不可用时的后备。

[官方斜杠菜单说明](https://learn.chatgpt.com/docs/reference/slash-commands) 表明已启用技能会出现在菜单中，具体可用命令取决于客户端环境。`/ted` 仍接受文本触发，不据此断言某宿主已注册同名内置命令。独立技能不冒充 `@Ted` 插件。

MCP 提供 `ted_help`、`ted_update`、`ted_panorama`、`ted_scores`、`ted_doctor`、`ted_repair`、`ted_status`、`ted_summary`，并提供 `ted` prompt。doctor/status/help/scores 为只读。update/repair 可写双语摘要请求，summary 的 submit 可写摘要缓存，故这些工具的静态 `readOnlyHint` 为 false；summary 默认 inspect 的实际响应仍标明 `readOnly:true`。组合工具 `ted_command` 保留兼容。安装修复仍只返回计划，安装与原生 Hook 信任分别处理。

## 双语短摘要候选

此功能尚未发布、安装或迁移真实用户数据。它不引入语言配置、切换命令或全套界面翻译。对话语言遵循当前用户要求；来源正文保持原样，只维护现有 metadata description 的同源 `zh-CN` / `en` 短字段，二者共享 1024 字节配对预算，每字段最多 480 字节（含 JSON 编码）。它们仅帮助发现资料，不能当作完整正文、已采用指令或升级凭证。

`summary` / `doctor` 只读检查已登记库存，展示可核验的双语摘要；`repair` / `update` 默认每批最多 4 项、双语维护响应最多 4096 字节，复用已有字段并登记待补请求。来源绑定包含正文 SHA-256、原有 description SHA-256、元数据 SHA-256、声明的 sourceVersion 和摘要策略版本；源过期、未知来源/格式、缺失字段和预算耗尽如实报告。未知原文不自动改写；源过期需先更新库存，不用旧缓存冒充有效摘要。维护失败不掩盖版本检查或安装修复计划。

当前工作副本已将来源校验通过的双语字段接入 `find_skill/list_assets/recommend_assets` 实际检索，同时保留原始描述。它仍是 metadata description 的短预览，现有 `load_asset` 正文摘录不冒充完整语义摘要；未生成或失效的翻译不会被当作有效双语字段。

真正补齐沿用一个 `ted_summary` 工具：

1. `operation:"prepare", requestId` 读取一条有界原摘要及当前缺失语言。
2. 平台模型仅翻译这条摘要，保留否定和限制；用 `operation:"submit"` 提交 prepare 返回的 `requestId/sourceSha256/descriptionSha256/policyVersion` 与 `summaries`。
3. 提交校验源摘要未变化、语言特征、字段和配对预算；随后 `summary`/`doctor` 会消费已写入的字段。`pairComplete` 只证明字段配对，模型生成内容保持 `semanticReview:"model-declared-unverified"`。

每次用户触发只处理当前有界批次，余项保留 pending 与游标；无后台模型调用、每 Hook 扫库或全文翻译。修复计划顶层 `applied:false` 只描述尚未执行的客户端安装；摘要维护的请求、字段写入及配对计数另行报告。MCP prepare/submit 失败返回 `isError:true`；CLI 后备 `ted-avc-manager ted summary --input <input.json>` 接受同一参数对象，输入上限 16384 字节，失败返回非零退出码。

新增摘要相关响应整体上限为 8192 UTF-8 字节，包含返回 JSON 外层与计量字段。有 sessionId/turnId（子代理同时传 agentId）时，每次完整响应计入现有回合/会话预算；重复查看也计数。这里的只读指资料与配置不变，辅助交付账本仍可计量写入。缺少标识时 `contextDelivery.status=unbound`，不伪称累计计量；账本故障或预算耗尽只给最多 1024 字节的控制状态、摘要配对状态和必要短版本结果，不带完整诊断对象或双语正文，也不要求先修复绑定才能继续任务。短控制响应是明确标注未计量的小额例外；MCP 协议外壳、CLI 换行和隐藏模型 token 不在计量口径内。账本提交不证明宿主已消费响应。

只读诊断无需另开文件交付任务。业务任务的结束状态通过 `ted_status` 查询当前会话/回合的 pendingCalls，仅将尚无完成回执的 reserved 调用声明 unknown。纯诊断不为任务关闭虚构产物。

## 整体整改候选：实际检索与共享预算

以下为未发布源码行为，不能作为已安装客户端验证。发现工具保留原来的 `skills/assets/recommendations/packs` 集合名，新增 coverage、nextCursor 与交付计量，默认每页最多 8 项、完整 JSON 4096 字节。来源变化或排序集合变化使旧游标失效。无标签资料仍可按标题、正文及来源发现；范围含中央包、包内引用、docs/rules、根入口与可核验待审候选，未知来源/读失败单独报告，不自动激活。

选择器采用中英词元、中文相邻字符、英文完整标识符、字段权重与词项稀有度做并集召回。正文低于标题/标签/摘要权重；显式“不是……只想……”按正向子句检索，这不是通用语义或规则适用性证明。近期先验仅来自带逻辑任务身份的模型采用声明：同一任务/修订只取第一次，7 天时间尺度衰减、最多加权 2%；推荐、读取、重复交付不产生热度，版本变化失效。已验证应用与因果质量仍未知。

所有实际调用应携带当前 sessionId/turnId/agentId；会话 256 KiB、回合 64 KiB 在父子代理间共享，交付去重按代理分开。单次工具 JSON 最多 8 KiB，Hook 合并 JSON 最多 12 KiB；协议 framing、CLI 换行与隐藏 token 不在口径内。读取、控制与诊断的故障回应有固定小上限，未计量例外明确标记。旧 v1 账本只导入父代理与实际遇到的旧子代理文件，不宣称发现了无身份元数据的所有历史额度；部署切换仍需停用旧写者，不长期双写。

Hook 对同一回合/代理/上下文代次逐段去重，事件 captureId 不再作为恢复代次。连续 SubagentStart、PreToolUse、旧 footer/execution 别名不会重新发送整段绑定。正常工具事件不重扫库存；显式不同 context_epoch 可请求一次有预算的恢复，旧宿主 SessionStart 的 compact/resume 信号各兼容一次，均不能重置已花额度。宿主不提供代次时不能假定每个新事件都是一次压缩。采集、库存、摘要或账本失败均不改变业务工具权限。

`task_begin` 支持显式 toolCapabilities 的 shell/edit/delegation 集合，将已知包装名映射到精确原生名；源码编辑包含 apply_patch，协作包含 collaborationinterrupt_agent。部署/工作流白名单仍限制展开结果，既有契约不可扩张，历史告警不抹除。`ted_status` 现在报告 violations 数量，避免关闭时才发现告警。源码修复不证明本机旧客户端已修好。

## 本轮真实宿主实验

使用已登录的原生 Codex CLI 0.155.1，在隔离客户端和非同步临时工作区执行；真实客户端配置、信任和用户会话未修改。测试夹具的 Hook 定义逐条核对后通过原生配置 API 登记精确哈希，未使用跳过信任开关。临时登录副本在实验结束时删除。模型回答和原始运行记录只保存在本机，不写中央公开资料。

| 场景 | 已观察结果 | 范围 |
|---|---|---|
| 安装前的会话 | 文件任务完成，Ted 事件为 0 | 未补造历史采集 |
| 同一旧会话安装后恢复 | UUID 不变，文件任务完成，采集到 15 个事件、资料正文加载及任务关闭 | 从恢复后的真实事件接入 |
| 新会话 | 文件任务完成，六类原生事件出现，资料加载及任务关闭 | 一次完整真实运行 |
| 部署配置缺失 | 文件任务继续，仍有原始事件，未伪造绑定任务 | 故障降级真实运行 |
| 第一版 doctor | 组合 MCP 工具被原生审批拒绝；CLI 后备完成 | 不能当作 MCP 成功 |
| 拆分后的 doctor | 原生宿主列出并启用 Ted 技能，模型成功调用 `ted_doctor` 与 `ted_status` | 首次诊断仍多开任务，缺少产物不能关闭；后续加入只读诊断例外复验 |
| 最终只读 doctor 复验 | `$ted doctor` 提示触发成功的 `ted_doctor` 调用；采集 8 个事件，未另开交付任务 | 原生技能注册、工具调用、回合完成和不误开任务五项断言全部通过；不是桌面菜单点击测试 |

原配置模型 `gpt-6.1-sol` 在当前 CLI 登录路径被宿主拒绝。另一次明确选择原生默认模型，运行记录确认为 `gpt-6-astra`。WebSocket 超时后 HTTPS 后备成功；此网络问题和模型可用性不能记为 Hook 成功或失败，也不能把单次识别当作稳定性统计。

当前电脑控制工具禁止操作 Codex 应用，尚未完成真实桌面输入框菜单可见性验收。`skills/list` 返回技能启用和界面元数据、模型实际调用工具，与用户看到菜单是不同证据；不通过其他 UI 控制方式绕过禁令。

## 升级、资料与评分

自动回归使用真实 v1.5.0 / v1.5.1 发布包的安装程序副本，验证旧 MCP 进程、缓存命令、在途回合、多项目、目录搬迁和离线用户存储。新增并发测试证明同一原生事件经 footer / execution / native 别名同时到达时，只处理一次业务回执，避免重复任务锁冲突。SessionEnd 与 Interrupt 的执行期限符合原生短时限。

资料生命周期隔离测试覆盖用户导入、客户端修改、重建保全、明确登记用户资产、中央候选，以及匹配已提交 tag 内容的中央升级登记；错误摘要、未提交内容和路径逃逸拒绝登记。测试夹具不升级真实用户资料。

评分回归覆盖版本和内容摘要绑定、最少 20 个可归因结果样本、临时评分、无效数字、日期型知识版本及趋势证据。周度测试明确证明关闭任务和资料交付都不会自动产生成功结果或用户评分。当前自动观察源以资料交付为主；独立结果归因与用户反馈采集仍有缺口，不能宣称真实优秀评分已形成。

全景图增加最近资料升级与优秀评分区。资料变化只比较本地已存在、位于当前历史中的发布 tag；候选改动不进入已发布升级列表。优秀要求 ≥4.5/5、至少 20 个样本、版本和内容摘要一致、非临时且非静态评估。目录缺失或证据不足显示未知/未评分。

## 可重复运行

本轮完整自动回归通过 196 项 Node 测试和 27 项 Python 测试。此后新增的源码搬迁兼容测试通过，31 项有改动模块的定向回归通过；包、布局、50 条知识索引和 4 个 MCP profile 门禁通过，Ted 技能通过 quick_validate。原生模型实验不在 CI 中自动使用个人登录，操作员明确执行：

```sh
python3 scripts/native-session-acceptance.py --use-existing-login --native-default
# 针对聊天 Ted 技能和只读诊断的复验：
python3 scripts/native-session-acceptance.py --use-existing-login --native-default --case doctor --timeout 240
```

运行器查询原生技能和 Hook 状态，再执行真实会话，并将断言结果写入本机 summary。这些命令启动验收；日常用户操作仍在聊天输入框中完成。桌面验收要另核对 `/` 技能菜单、Ted 名称和说明、选择后模型工具调用及真实结果，不能仅验配置写入。

## 安全回收的版本依据

`experience-recovery-stage` 的复核映射必须声明 `review.spanUnit: "utf8-bytes"`；`sourceSpans` 从 0 连续覆盖完整原文字节，不能有缺口、重叠或切断 UTF-8 字符。`candidateRef` 是候选正文中唯一存在的字面摘录。这是可核验的机械映射，不能证明摘要没有语义损失。

可恢复隔离与永久删除分别授权。摘要 `approved/complete` 不授权删除；如有单独明确的处置决定，在输入顶层提供 `discardAuthorization: {decision: "discard", sourcePath, sourceSha256, reference}`，绑定原文精确路径和版本并引用操作员明确授权。台账如实记录它是本地操作员声明，不能据此声称已认证用户身份。没有该依据的旧记录和新记录到期均保留，可执行恢复。不得从摘要完整、低热度、已升级或到期推导废弃决定。

清理重新核对原文、候选、映射、授权、严格 ISO 日期与保留期。未知同目录文件或符号链接保持待处理；删除只针对核验后的文件，空目录使用非递归移除。通用 MCP 写操作在预算耗尽、账本不可用或响应超限时，返回有界 `operationOutcome`，分别标明实际本地操作事实和上下文交付状态，不把交付失败当作写入未发生，也不把已登记工作流当作任务完成。
