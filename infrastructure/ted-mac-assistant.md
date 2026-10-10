# Ted Mac Assistant 基础设施

## 2026-10-10 当前规范（优先于全部下方历史记录）

`$TED_PROJECTS_ROOT/ted-personal-execution-system/` 是 App、云端、MCP 与 `ted-learning-sync` 的唯一代码事实源。公司仓库只保留初始化、路由、授权和 MCP Profile，不再保存插件或导师 Skill 副本。公司初始化经用户长期授权执行：不存在则克隆；存在则验证 origin、拒绝 tracked 改动/分叉，只快进 `origin/main`；检查本机 App 但不自动安装；按插件源码指纹安装或更新 `ted-mac-assistant@ted-execution`。未跟踪构建产物不删除，可选基础设施失败不影响 `company_ready`。

导师项目更新统一通过该项目 MCP 的 V4 版本化契约：先读实时状态、mentor contract 与 quickstart，使用 revision、operationId、最小节点变更和回读。公司 Markdown、网站、定时任务提示词都不是第二套计划事实源。原“学习进度站”改为个人竞争力与薪酬分析站，只展示能力证据、岗位匹配、市场样本、薪酬口径、数据日期和置信度；不展示学习安排、课程清单或提醒日程。

周期任务拆分为：个人竞争力/薪酬分析每两个月一次；学习进度检查每周一次。前者更新市场和能力分析视图，后者从 Ted MCP 读取项目进展、证据、阻塞与复核需求，不创建日程。触发成功不等于 MCP 调用成功；缺连接、授权或新证据时保持旧结论并标记 unavailable/unknown。

### 线上 MCP 目标架构

1. `apps/ted-execution-cloud` 提供 HTTPS Streamable MCP，云端 D1 保存版本化项目计划、执行事件、提交证据、导师反馈和能力观察；Mac 保持本地优先，通过幂等 operationId 与 revision 同步，不以更新时间直接覆盖冲突。
2. 公司导师资料仍以 iCloud 公司库为规范源。新增显式“导师发布包”：只导出经筛选的 PROFILE、教学规则、市场评估口径和必要知识摘要，带 schema 版本、内容 hash、签名、生成时间与失效策略；不上传完整公司库、员工私密记忆、机器路径或凭据。
3. 远程 MCP 返回数据契约版本和导师发布包版本。云端任务在读写前校验兼容性；公司资料变化后由授权发布流程推送新包，不允许模型自行抓取本机公司目录。
4. OAuth scopes 至少拆分 `project:read`、`project:write`、`mentor:feedback:write`、`capability:read`、`capability:write`。个人竞争力站默认只读发布后的分析视图，无权读取完整学习任务或公司资料。
5. 远程 MCP 使用 OAuth 2.1/PKCE 与服务端 token 校验；账号密码、access/refresh token、API key、OAuth client secret 不进入提示词、仓库或前端。Sites 服务端凭据只放运行时 Secret。无人值守任务不能完成首次交互授权，授权过期后必须 fail closed。

目前已验证的是本机 stdio→Unix Socket MCP；远程 HTTPS MCP、OAuth、导师发布包、云端周期任务访问尚未实现或验收，不得描述为已上线。

详细方案见 [Ted Remote MCP 与导师发布包设计](ted-remote-mcp-design.md)。

初始化与检查入口：

```sh
cd "$AI_VIRTUAL_COMPANY_ROOT"
scripts/check-company-bootstrap.sh
scripts/ted-mac-assistant-bootstrap.sh ensure
scripts/ted-mac-assistant-bootstrap.sh plugin-check
scripts/ted-mac-assistant-bootstrap.sh doctor
```

App 缺失时只有用户明确要求才执行 `install`。插件或导师资料更新后，目标客户端必须重开新会话并实际调用 `ted_status`/V4 snapshot；安装成功不能替代运行验收。卸载新市场插件使用 `codex plugin remove ted-mac-assistant@ted-execution`。

## 2026-10-04 历史入口（已被上方 2026-10-10 规范取代）

业务源码已迁至 `$TED_PROJECTS_ROOT/ted-personal-execution-system/`，包含 `apps/ted-mac-assistant`、`apps/ted-execution-android`、`apps/ted-execution-cloud` 和随 App 打包的 `plugins/ted-mac-assistant`。`TED_PROJECTS_ROOT` 的 macOS 默认值为 `$HOME/Documents/ted-projects`。公司 Bootstrap 不再要求 App 源码放在公司文档内；组件缺失只报告可选基础设施不可用，不自动复制、安装或修改离线 Mac mini。

旧公司 App 源码与旧构建缓存保留在新项目忽略的 `.migration-archive/`，个人运行数据库和已安装 App 未迁移。用户自行维护 GitHub。公司插件目录仍作为已安装市场的发行适配层，不能覆盖独立项目的最新实现。

当前需求取消导师 Scheduler 和 Apple Calendar/Reminders 依赖；导师由用户发起检查。Cloudflare D1 为目标云端权威源，本地支持离线；上线状态以实际 API、登录、同步和设备证据为准。Android 已有候选 APK 与 API 36 自动化证据，但生产包、真实登录和模拟器视觉验收不得用构建通过替代。以下 1.5 及更早内容仅保留历史，不作为当前验收结论。

状态：原生 SwiftUI/SQLite/UserNotifications · app 1.5.0 源码 · macOS 14+。安装和运行版本须实时核对。

## 1.5 当前规范（取代下方 Apple 历史章节）

Calendar/Reminders 运行依赖已移除：不请求、监听或读写 EventKit；旧系统条目不删除，旧 Apple 工具禁用。SQLite/领域事件是任务、项目、路线、番茄和证据事实源；原生 UserNotifications 提供专注与截止提醒。现有 iCloud 不可变事件同步暂保留，SQLite/WAL 不同步。

工作台包含项目→排序里程碑→行动、阶段最多一主两辅、结果与验收分离、7/30 天开始时路线投入图、逾期警告、三主题和紧凑菜单。MCP 标准契约可通过资源或 `ted_get_contract` 发现；19 个工具，外部任务写入与导师观察分别由用户授权。

两台 Mac 分别安装新版，确认原生通知权限、唯一路线/截止通知协调设备、iCloud Drive 和真实对端回执；不再要求 Calendar/Reminders 权限。账号与通知权限是本机配置，不能从规范源同步推定已授权。

云端新源码 `apps/ted-execution-cloud/` 采用 Workers/D1/Google PKCE，默认关闭认证入口并无公开部署。Cloudflare/Google 实际配置、历史导入、云前沿、受保护操作确认、云备份与多端验收仍须完成；不能把 App 登录或本机回读当成上云成功。免费计划禁止自动升级，限额按提供商当前条款核对。

App 加密备份是本机事件→AES-256-GCM→用户 iCloud；钥匙串采用不参与同步的登录钥匙串（本地 ad-hoc 构建没有 Data Protection Keychain entitlement）。恢复密钥由用户单独保管。备份回读不是对端已下载，备份校验不是覆盖恢复；保留算法已实现、自动清理未启用。

导师入口保持 ChatGPT 云端 Scheduler；没有本地导师 timer。原任务实际连接与回执尚未验收。安装说明、旧校验脚本、历史 Apple 工具不得用于声称本版仍在写入系统日历。

Android 完整设计在 `apps/ted-execution-android/DESIGN.md`，明确支持 Android16/API36；暂无 APK/真机验收。

## 1.1–1.4 历史记录（非当前操作说明）

## 定位与边界

保留 Apple Calendar / Reminders，支持同一 Apple ID 下手机查看与提醒；Menu Bar 提供 Mac 的今日 / 本周 / 导师快速视图。时间块明确配置 Calendar 提醒（默认开始时）；有到期时间的 Reminder 配置绝对时间 alarm。Apple 系统负责到点提醒，不依赖 ChatGPT 到点再运行。手机通知是否送达须检查同步、通知权限与专注模式，不能用 Mac 写入回执替代验收。

1.3.1 起，Menu Bar 同时监听应用内写入和 EventKit/iCloud 外部变更；刷新期间到达的新变更会在当前读取结束后再读取一次，避免学习任务已经同步但界面停留在旧空快照。该刷新只更新展示，不创建任务或接管 Scheduler。

1.4.0 在 Menu Bar 加入用户主动启动的番茄工作法：默认 25 分钟专注、5 分钟休息，显示实时剩余时间，可随时取消，结束由 macOS 原生通知提示。它是一次性的本地专注工具，不读取课程进度、不自动启动，也不替代或复制 ChatGPT Scheduler。

另有 Mac Assistant 自己的原生通知通道，仅发送即时、已授权的导师消息，不重复到点提醒。首次使用需用户确认系统通知权限；菜单栏“通知测试”可申请权限并发送测试。工具不接受未来触发时间，不创建本地学习调度器。

公司只管理基础设施的安装、升级、doctor 与健康检查；专属学习/事业导师拥有学习计划、提醒、ChatGPT Scheduler 和导师观察的业务管理权。其他员工不催学、不改学习计划。Dashboard 只展示，不是第二套学习事实源。

本机只执行导师已授权的动作，不创建学习 timer，不替代 ChatGPT Scheduler；不扩展 IDEA、Focus、复杂 Computer Use、公开服务或网络隧道。MCP 的 mentor-approved 是工作流声明，不是员工身份认证；同一用户下其他程序仍可能访问本机 socket，不宣称员工身份安全隔离。

## 规范源与发布副本

- 应用规范源：`$TED_PROJECTS_ROOT/ted-personal-execution-system/apps/ted-mac-assistant/`
- 插件规范源：`$TED_PROJECTS_ROOT/ted-personal-execution-system/plugins/ted-mac-assistant/`
- 公司发行适配层：`plugins/ted-mac-assistant/`；只用于当前本地市场安装，不替代独立项目源码
- 导师 Skill：skills/ted-learning-sync/；插件内 Skill 是安装时从该规范源发布的副本。
- 公司市场：.agents/plugins/marketplace.json
- 登记：ASSET_REGISTRY.md 与 skills/ASSET_REGISTRY.md

规范源通过 iCloud 同步，客户端安装缓存、启用状态和 TCC 权限是本机配置，不随规范源同步自动生效。初始化检查源与 Skill 副本一致性；安装/修复获得授权后通过现有 Bootstrap 入口执行，不自动扩大权限。

## 数据与接口

核心学习事实规划在 iCloud Drive/Ted-Learning。config.json 配置筛选，dashboard/mentor-observation.json 展示导师观察。Calendar/Reminders 是时间块/待办的系统事实源；integrations/apple-timeblocks.json 仅保存任务键到已写时间块日期的辅助映射，不记录凭据、帐号或跨设备绝对路径，不接管学习进度。

签名主应用内的私有 Unix socket 接收 MCP 请求：本机 Application Support/TedMacAssistant/runtime，目录 0700、socket 0600、同 UID 检查、单实例锁、输入限制，无网络监听。Python stdio adapter 只转发，EventKit 使用主应用的授权身份。

| 工具 | 范围 |
|---|---|
| ted_status | 活进程与系统权限；不证明 Scheduler 接通 |
| ted_snapshot | 学习范围时间块、未完成待办、导师观察 |
| ted_ensure_targets | 明确授权后创建唯一可写的 iCloud Ted Learning 日历/列表；无来源或有歧义则拒绝，不降级到其他容器 |
| ted_upsert_time_block | 固定 taskKey 创建/更新非重复时间块与系统 alarm；默认到点或显式提前0/5/10/15/30/60分钟，写后回读 |
| ted_upsert_reminder | 固定 taskKey 创建/更新待办与到期 alarm；省略 due 清除到期时间及提醒，不重开已完成任务 |
| ted_complete_reminder | 只完成工具标记的任务；不是知识验收；重复完成 unchanged |
| ted_notification_status | Mac Assistant 独立通知权限及声音/提示设置；不是 Calendar/Reminders 的通知设置 |
| ted_notify | 已授权的即时 Mac 原生消息；稳定 notificationKey 七天防重复；无未来触发时间 |
| ted_checkpoint_status | 每日检查点配置、导师自报的当日回执；不查询 ChatGPT 后台 |
| ted_configure_checkpoint | 用户确认原任务时间/时区后配置回执检查，不改变原任务 |
| ted_record_checkpoint | 导师为真实已结束运行上报 completed/failed，稳定 runKey 防重复 |

仅写 Ted Learning 的工具标记条目：ted-learning://task/<taskKey>。未知参数、无授权、冲突或只读目标均拒绝。超时后重试同一 taskKey，不能换键制造副本。多个操作非事务，须报告部分成功并补齐失败部分。

时间块恢复查找为请求日期及辅助映射日期各前后366天；映射损坏 fail closed。手工移到范围外且丢失映射时先人工核对。iCloud 是最终一致，V1 不保证跨 Mac 原子写入，只指定一台写入机。

## 安装、升级与初始化

```sh
cd "$AI_VIRTUAL_COMPANY_ROOT"
scripts/check-company-bootstrap.sh
scripts/ted-mac-assistant-bootstrap.sh install
open "$HOME/Applications/Ted Mac Assistant.app"
scripts/ted-mac-assistant-bootstrap.sh plugin-install codex
scripts/ted-mac-assistant-bootstrap.sh plugin-check
scripts/ted-mac-assistant-bootstrap.sh doctor
```

首次启动由用户本人确认原生通知及当前版本实际请求的系统权限。升级用 upgrade 与 plugin-upgrade codex；先退出旧应用，再重新启动。bundle ID 不变不等于权限一定保留，以实时工具结果为准。插件安装入口从独立项目构建发布包，并保持公司 Skill 规范源与发行适配副本一致；由官方 CLI 登记市场和安装，不覆盖其他插件配置。

默认构建使用当前 Command Line Tools SDK。Swift/SDK 不匹配时更新工具链，或显式传入兼容的已安装 SDKROOT，不将第一台机器的 SDK 路径固定到跨设备规范。

## ChatGPT 与原 Scheduler

支持本地市场的客户端可执行 plugin-install chatgpt-desktop，发布同一插件配置。该入口只证明官方 CLI 安装配置；目标 ChatGPT 版本是否加载、既有任务是否可调用仍须单独验收。刷新插件/重开目标聊天后，实际发现并调用 ted_status、ted_snapshot。

在原“学习调度检查点”保留导师职责、频率和课程上下文，启用 Ted Mac Assistant 插件并显式使用 ted-learning-sync。网页/云端任务没有受支持的本机连接时，不能访问私有 socket；应在支持本地工具的桌面执行环境中配置同一导师任务，入口以当前客户端实际界面为准。不偷偷改成 Codex 定时器或本地 timer。

执行机必须开机、桌面宿主运行、应用已安装并授权。无人值守工具审批在目标客户端按最小范围设置，不默认放开全部工具。只有取得原任务的实际写入回执才标记 Scheduler connected。

上述开机条件针对写入/即时消息调用；已同步且有 alarm 的 Calendar/Reminders 由 Apple 在设备上负责提醒，不要求 Mac Assistant 或 ChatGPT 在到点时继续运行。手机未同步或设备/通知不可用时不能保证送达。

可加入原任务的持久指令：

> 使用 ted-learning-sync 执行导师检查点。先核对当前课程证据，不以旧截图充当当前进度。已有授权的明确任务与起止时间需要同步时，以稳定 taskKey 调用真实工具，写入 Ted Learning 日历与提醒事项并回读确认。只有 verified 回执才报告已写入。工具不可用、权限不足或信息缺失时明确报告未写入及原因，不切换 Google Calendar、不创建本地 timer。提醒完成不是知识验收，学习管理仅属专属导师。

## Doctor、自检与运行证据

doctor 先显示上一次主应用权限快照，再调用活进程 ted_status；缓存不是实时权限证明。check 检查应用安装；plugin-check 检查 Skill 副本一致、客户端已安装/启用；都不能替代目标聊天实际工具调用。

```sh
cd "$TED_PROJECTS_ROOT/ted-personal-execution-system/apps/ted-mac-assistant"
swift run --disable-sandbox TedMacAssistantSelfTest
cd "$TED_PROJECTS_ROOT/ted-personal-execution-system/plugins/ted-mac-assistant"
python3 scripts/test_mcp_server.py
python3 scripts/mcp_server.py --call ted_status
```

真实集成测试 python3 scripts/verify_real_bridge.py --execute 会创建明确标注“联通验证（非课程安排）”的时间块及验证待办，测试重复、更新、完成后保留时间块和已完成验证待办；需明确授权，不是 doctor 的自动步骤。每天使用稳定测试键；同日完成后再次运行会拒绝重开，属预期保护。

2026-09-30 实际 MCP→私有 socket→签名 app→EventKit 验收通过：日历/待办创建、重复不新增、更新、完成、重复完成、防重开、展示数据回读、无授权拒绝。1.2 的 Calendar 到点 alarm 与 Reminder 绝对时间 alarm 也已真实回读；实际到点送达未验收。

1.2 验证时独立通知权限为 denied，拒绝发送保护通过。2026-09-30 17:36（北京时间）1.3 活进程重新读取为 ready，alerts/sounds enabled；明确标注“非导师回执”的原生验证消息 sent、acceptedBySystem true、通知中心回读 true，重复与重启后同键均 unchanged。重启后通知中心已无该条目，但去重回执仍有效；没有将通知中心存在或系统接受冒充可见弹窗验收。独立通知状态不替代 Calendar/Reminders 各自设置。

原 Scheduler 绑定、当前宿主发现插件工具、UI 视觉和手机通知送达均仍需验收。只读宿主探测在不新建聊天的情况下未发现 Ted 工具，不宣称已自动接通。

## 启动／唤醒／解锁后的回执检查（1.3）

原任务每日时间确认后，在菜单栏 → 导师 → “缺回执检查时间”填写 HH:mm/IANA 时区并保存（宽限10分钟），或由专属导师调用 ted_configure_checkpoint（宽限0–120分钟）。预填22:00/Asia/Shanghai只是待确认输入，不会自动启用或更改 ChatGPT 原任务。V1 仅支持一条每日检查点，其他频率不配置。

共享配置在 Ted-Learning/scheduler/checkpoint.json；真实导师回执在 scheduler/receipts/<taskKey>/<yyyy-MM-dd>/<runKey>.json。导师在**真实检查结束后**调用 ted_record_checkpoint，上报配置的 taskKey、原计划运行日 scheduledDay、稳定 runKey、completed/failed、authorization: mentor-approved；再 ted_checkpoint_status 回读。它是导师自报，不是 ChatGPT 后台认证；检查结束不等于知识验收或所有业务写入成功。

应用启动、唤醒、用户会话恢复时检查当日配置与回执；菜单打开／刷新只更新显示。超过检查点加宽限且缺成功回执才提交即时通知，同一 taskKey/计划运行日每台 Mac 最多一次，退出重启也不重发。宽限跨午夜时沿用原计划运行日，直到下一次检查点到时。缺失变失败不会换提示键；成功优先，后来失败不擦掉成功。损坏、非法、未来回执均报无法核对，不推断未执行。iCloud 同步可能延迟，两台 Mac 去重独立。

通知与菜单按钮仅打开官方 ChatGPT 客户端（未安装则 chatgpt.com），用户核对后手动运行原任务；不自动发送消息／点击 Run，不读取聊天数据库，不调用私有 API。应用一直运行但未发生启动／唤醒等事件时不会在检查点到时检查；没有 timer。V1 不安装登录项，想登录即检查可由用户在系统设置添加已安装应用。

通知权限拒绝时只保留菜单状态／入口，不宣称有弹窗。恢复权限后下次启动／唤醒可提示。原任务没有启用回执工具时将一直缺回执；须先核对原任务工具接通，不能盲目反复补跑。回执工具独立于 Calendar/Reminders 授权工作。

## 第二台 Mac mini

1. 同一 Apple ID 开启 iCloud Drive、Calendar、Reminders，等待公司规范和 Ted-Learning 同步。
2. 安装 Command Line Tools，配置公司根目录本地映射，运行公司 bootstrap。
3. app install，启动并分别确认 TCC 权限；权限不跨设备同步。
4. 需要调用工具时执行 plugin-install codex 或 plugin-install chatgpt-desktop；plugin-check、doctor，再在目标客户端调用 ted_status。
5. 先确认第一台的 Ted Learning 日历/列表已同步；同步未完成时不要重复创建同名容器。
6. 指定一台写入机，另一台默认只查看；同一 ChatGPT 导师 Scheduler 不在两台分别重复调度。
7. 读取共享检查点配置和回执；独立授权 Mac mini 的应用通知。需要登录即检查时由用户把 app 加入该 Mac 登录项，不建立第二套 Scheduler。

## 权限恢复与卸载

系统设置 → 隐私与安全性 → 日历/提醒事项中允许应用；异常时由用户明确执行/授权：

```sh
tccutil reset Calendar com.tedcompany.mac-assistant
tccutil reset Reminders com.tedcompany.mac-assistant
open "$HOME/Applications/Ted Mac Assistant.app"
```

重新确认系统弹窗并运行 doctor。重置会撤销原授权，不自动执行。

先停用原任务中的插件依赖，再用 codex plugin remove ted-mac-assistant@ted-company 或客户端设置移除插件。app uninstall 只移入废纸篓；公司规范、Ted-Learning、日历/提醒事项、验证条目保留，清除真实数据另需授权。V1 无登录项，重启后需手动打开。

参考：[官方本地插件封装](https://developers.openai.com/plugins/build/plugins)、[官方定时任务要求](https://learn.chatgpt.com/docs/automations)。文档作为设计依据，当前客户端以真实调用验收。
