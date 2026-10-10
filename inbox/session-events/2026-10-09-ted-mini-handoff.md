# Ted 从 MacBook Pro 切换到 Mac mini 的执行交接单

更新日期：2026年10月9日 20:00（Asia/Shanghai）。

目标是在 Mini 接收源码与必要私有材料后接续开发、验收及已授权的云计划更新，再让 Pro 休眠。**用户已追加授权整理、提交及推送源码与文档；该授权不包含私有数据或凭据入库。本单不代表 Mini 已收到文件、已登录或已经接管。Pro 不执行新的生产数据写入或云部署，也不立即休眠。**

## 当前状态

| 项目 | 已证实状态 | 接续边界 |
| --- | --- | --- |
| 云服务 | 已部署所有者受保护覆盖接口，版本 `bf71ad65-da02-4305-8861-810da5286b9e` | 接口部署不是学习计划覆盖 |
| 正式云数据 | R8、cloud revision 5、19任务、4项目、3方向、5条命令 | 部署前后五张学习相关表逐字段相同；Mini 必须重新读取当前状态 |
| 候选计划 | R9 已生成并验证，仅当前节点标题和 nextAction 调整，18任务及全部项目 keep | 尚未提交；模拟候选状态不能直接上传代替服务器提交 |
| 覆盖认证 | 现有 owner session 的无交互钥匙串读取失败 -25293 | Mini 正常 Google 登录获取自己的 owner session，不能复制／打印 Pro token |
| Mac | Pro 正式安装1.7.6/build30；1.7.7/build31候选已构建 | 尚未正常安装新版本；真实菜单弹窗详情／返回验收未完成 |
| Android | 更新包0.7.1/code13及受保护下载入口已交付 | 模拟器验收已完成；手机登录、覆盖安装及真实同步仍待验 |
| 验证 | 云 Node220/220、实际 workerd6/6、语法／差异检查通过 | 是已有源码证据，不等于 Mini 环境或生产所有者写入验收 |
| 网络 | 部署及生产health200成功，随后路由探测经现有代理连接重置 | 不应据此判断服务下线；Mini 自行核对网络，不照搬 Pro 代理地址 |

云地址：`https://ted-execution-cloud.tedming9527.workers.dev`。仅下载入口：`/downloads/android`，下载 cookie 没有学习 API 权限。

提交前基线为 `main`，HEAD `e39da69374b436414530a4c0b9af64d18df1ed66`；当时的旧提示“尚未提交、仅拉仓库不够”属于交接创建快照。用户随后明确授权本次源码与文档提交／推送。当前发布范围为 Mac、Android、云端、MCP、需求与原型源码及锁文件；不包含 `artifacts/` 截图、`.local/` 数据／备份、APK、构建缓存或凭据。接收时以实际远端 `origin/main` 和包含本单的最新提交为准，不停留在旧基线；实际推送成功须由执行端提交回执和远端哈希另行核实。

## Git 发布回执

实现提交 `7eb37484d23696767e4b6b9329f5eb3592f51ab6` 已快进推送到 `origin/main`，包含165项源码、测试、原型及文档变更；原16个本地相关提交亦随快进历史发布，没有强推、历史改写或生产部署。本单的回执补充会作为随后独立文档提交，请 Mini 获取最新main，核对实现提交存在且是当前HEAD祖先，再读取本单。

提交前复验：云220、插件74、原型20项通过，原型生产构建通过（已有单包大小提示，不代表视觉验收）。最终暂存路径／内容检查未见密钥、私有数据路径、二进制或构建缓存；本轮不重复已通过且源码未变化的原生界面验收。Pro剩余未跟踪 `artifacts/` 为本次明确排除的截图产物，不能将它们或 `.local/` 私有材料当作已经推送。Google owner认证和R9云覆盖仍未完成，与Git发布无关。

## 文件与私有材料

在 Mini 上自行定位工作目录，逻辑位置为 `$TED_PROJECTS_ROOT/ted-personal-execution-system`；不要假设 Pro 和 Mini 的用户名、绝对路径、钥匙串、SDK 或已安装插件相同。

必须接收和核对：

1. 先取得 Git 发布回执并在 Mini 拉取最新 `origin/main`，包括 `apps/`、`plugins/`、`docs/`、`prototypes/`、`scripts/`、锁文件与构建配置；核对最新提交及本单。若 Mini 已有独立改动，先备份并在新目录 clone，不强制 reset 或覆盖 Mini 原目录。未发布的截图产物可留在 Pro，不是源码接管前置；下面的私有候选和备份仍须单独接收。
2. 本单及最新需求：`prototypes/learning-continuity-v2/REQUIREMENTS.md`、`prototypes/learning-continuity-v3/README.md`、`docs/learning-tempo-v1.contract.md`、`docs/direction-history-v1.mentor-data-spec.md`、`docs/owner-plan-replacement-v1.contract.md`、`docs/VALIDATION.md`。
3. 单独、私有地接收 `.local/mentor-cloud-refresh-20261009.IzHtrW/` 内的必要数据文件：`plan-request.json`、`cloud-before.json`、`candidate-cloud-state.json`、`validation-report.json`、`learning-before.sql`、`learning-after.sql`、`backup-receipt.json`、`deployment-receipt.json`，以及测试日志。目录0700、数据文件0600。这些被 Git 忽略，不能靠 Git 拉取取得；不要发到公开仓库、公开下载入口或公司共享知识正文。
4. 保留 Pro 上关闭数据库备份及完整恢复证据，定位 `.local/verification/learning-tempo-execution-20261009.cjUUrR/` 和原备份v2演练目录。Mini 如果需要迁移 Pro 学习库，先验证实际备份／加密恢复能力；不要拷贝正在运行的 SQLite 主文件而遗漏 WAL，不用旧事件-only v1备份冒充完整业务投影恢复。若材料未接收，明确列为缺口。
5. 原 APK 或其受保护云下载入口。APK 应用ID `com.ted.execution`，大小11,830,211字节；SHA256 `79fcef1d2c0cd9fa8175b85f04357550a30cb5de605735dad2632cc9d914aad8`；证书SHA256 `e612328d2f05755c9865e67e7ceca2b29e7f91eee49e98febfbd1f8bf6cdccfd`。不要卸载手机应用或清除数据来制造验收结果。

无需照搬构建缓存、node_modules、Pro 编译的私有探测二进制。Mac 包应按 Mini 实际架构重建／检查。忽略部署配置 `apps/ted-execution-cloud/wrangler.local.jsonc` 属于本机配置，必须在 Mini 私下重建或受保护迁移并验证已有资源绑定；共享 `wrangler.jsonc` 含关闭式占位配置，**禁止直接拿它部署生产**。Wrangler、Google、钥匙串、签名和导师宿主权限均重新核对；不把凭据原文写入文件、聊天或交接单。

公司 iCloud 中的交接副本只含本单，不包含源码、私有学习备份或凭据；写入该位置不证明已同步到 Mini。

## Mini 的执行顺序

1. 接收材料并给出接管回执：Mini 工作目录、源码基线／完整脏工作区状态、必要私有文件是否齐全、文件哈希验证结果、当前机器身份与架构。先读取 Mini 项目指令和适用 Skill；刷新公司事实源，不按 Pro 的旧员工／模型／工具声明直接执行。
2. 在 Mini 验证源码：云目录执行 `npm run check` 与 `npm test`；实际 workerd 测试需要已验证的官方 Miniflare，执行 `node --test test/runtime/*.test.mjs`，或用 Mini 的 `TED_MINIFLARE_MODULE` 指向其真实安装。不要照抄 Pro npx 缓存绝对路径。其他端按交接文件和现有验证脚本选择风险相关检查，不为迁移重复全部视觉测试。
3. 正常恢复 Mini 的 Ted／Google owner 登录和精确云帐号／设备绑定，先只读读取。登录成功不等于用户同意将 Mini 已有本地库上传关联；不同设备／帐号不得复用 Pro 的游标、设备序号或待发队列。若登录、授权范围或绑定无法核验，停止覆盖，继续无写入工作。
4. 在真正执行覆盖前重新备份当前云五表并验证。对新鲜服务器状态计算 canonical SHA256，与候选R9的来源、完整协调清单及原历史逐字段核对。如果云仍是R8/revision5，可保留原计划内容；若有新版本，停止旧候选提交，重新协调，不自动把 expectedRevision 换新强行覆盖。
5. 依据 `owner-plan-replacement-v1.contract.md` 构造封闭所有者 envelope，绑定 **Mini真实 session 的 deviceId**、新鲜云revision/hash、已验证备份引用、明确授权理由及相同内外 operationId。原 `plan-request.json` 是计划请求，**不是最终 owner envelope**；需要移植作者设备时按新完整请求计算哈希，不能把旧计划请求哈希当作所有者请求哈希。
6. 先调用只读 preview，检查保留结论和候选版本，再提交完全相同的 envelope。preview 不预留版本、不提供身份或同意证明。请求超时只重试相同 ID／内容；冲突先读实际 durable receipt，严禁换 ID 重复写入、直接 SQL 更新或伪造 owner session。
7. 云提交后回读、比对回执和服务器实际状态，确认历史、旧任务、成长图、原始时间字节及权限不变。正式 R9/cloud6 只在没有其他写入、本次恰好成功一次时成立，不能先宣布固定版本。随后再验证 Mac／Android 正常采用；云端回执不代表其他设备已同步。
8. 完成 Mini 接管回执后，再通知用户可让 Pro 休眠。后续写入只在一个执行端进行，禁止两台机器并行重放生产覆盖。

Mini 的部署管理员授权、owner登录、导师MCP授权是不同权限。接口已经部署，无需为切机重复部署、迁移表或旋转密钥。需要修改／部署时仍核对原授权、当前版本和已有绑定。

## 剩余开发和验收

按依赖优先继续：

- 完成正常所有者认证、受保护候选覆盖及回读；历史和最小权限优先。
- Mini 本机验证并正常安装日期精度已修复的 Mac1.7.7；保留旧包和本机数据库备份。不要在旧1.7.6中制造正式新提交／确认来绕过更新前置。
- 在可操作桌面实际打开菜单栏小窗，验收任务详情、返回、详情开关和结束记录不意外隐藏。已有隔离窗口／源码／构建不能替代真实菜单开关证据；Mini通过也不等于Pro旧安装已经通过。
- 检查宿主真实工具目录和能力协商：单节点 preview／patch／history 可用、全量入口仍关闭，未来开始时间门禁及精确日期不被旧客户端丢失。
- 完善跨端按线活动来源和当前节点驻留的权威数据契约／同步投影。现有实现为 partial；断链或云快照缺来源时保持未知，不新增第二套学习进度，不用任务更新时间猜活动。
- Android手机正常Google登录、同签名覆盖安装、云计划读取、移动端纵向操作以及复制提示词；保持任务名和简单描述，不加仓库／项目本机匹配。实际安装须用户在手机确认。
- Web主流组件原型的真实浏览器视觉／焦点／滚动返回验收，在可用通道执行；此前浏览器拒绝不可绕过。

保留既定需求：桌面成长路径横向、移动端纵向；已完成节点可折叠但不删历史；活动按稳定线路ID聚合，正数专注、完成／提交等真实动作才刷新，复制／打开／导师改计划／同步不刷新；计划开始未到时不显示活动时长或中断提示；七状态、植物与柔和语义色，深色／减少动态效果，非责备性恢复提示。教学操作采用最小节点修改为常态，完整协调仅用于这次显式授权的例外流程。

本期不做甘特图／基线；标签、Aspect／Perspective仍为后续讨论。用户已取消完整VoiceOver验收与公开发布签名／公证，不重新加入阻塞清单。

## 备份和回退依据

最新五表内容哈希：`7b23400f0b4077254c06a11098787ffa3e9bbdaa14eb439e7796812d742291fe`；原始云状态哈希：`68f720a22b491c17b73d14cd8e49039c1c6ea05100cbb55858d74a9cab663df2`。备份SQL文件SHA256：`d9fa525f8dd783b0048f4d68962151a497f2285deb8c29da3596af311ba7bf14`。这是2026年10月9日的已验状态，不是永久最新值。

计划请求哈希：`e177f73c541e454a1787fa0e55a3feeae069897c2f7e959f30e402579ed0bd83`，计算对象为原 `{command:'reconcile_plan',request}`，不是最终所有者 envelope。

五表备份仅含 `entities/events/execution_v4_commands/execution_v4_consent/execution_v4_state`，不含帐号、设备、session或凭据，不宣称完整帐号恢复。Worker代码可参考前版 `e04e58f3-6693-46c9-ae4f-e86f84a1c80a`；**代码回滚不会回滚学习数据**。数据回退另行采用已验证恢复方案，不直接SQL覆盖或清空重建。

## Pro 休眠条件

Pro 的 `caffeinate -ims` PID98711仍有永久系统／空闲／磁盘防休眠断言。接管确认前保留；Mini 不继承该进程，也应按自身需要建立防休眠。接管后需在Pro核对PID仍确为本次 caffeinate再只停止该进程，然后由用户正常休眠；不要使用全局 killall、修改整机电源策略或关闭其他任务的断言。

本单创建时所有已派发子任务均已完成，没有接管中的后台子代理。Mini尚未验证，不能声称已迁移。Pro后续不主动继续业务执行，等待Mini接管确认；若需Pro补传文件，仅做明确范围的交接。

## 可粘贴到 Mini 的接续指令

> 先核对远端main发布回执并在Mini拉取最新源码，读取仓库 docs/HANDOFF-MAC-MINI-20261009.md，以仓库最新版本而非旧iCloud快照为准。核验提交、私有候选及备份已接收，刷新项目规则和必要公司事实源。输出Mini接管回执，之后按单中顺序接续：正常所有者登录和新鲜备份、受保护候选预览／覆盖／回读、Mac新版本及真实菜单验收、Android真实同步和跨端按线来源完善。此前授权保留，但不要把候选、部署或旧测试冒称正式覆盖成功，不扩大导师权限、不伪造时间、不直接改生产数据库、不覆盖Mini原有改动；本次Git发布已经授权，Mini后续新提交／推送仍按新的明确授权执行。缺凭据或版本冲突先停止覆盖，其余无写入工作可继续；确认材料完整后再通知用户让Pro休眠。

本次交接文档的逻辑任务主责为林知夏 · 目标规划官（Product Manager）；工程专业责任沿用周启明 · 体验工程官（Frontend Engineer）和陆行远 · 可靠服务官（Backend Engineer）。实际整理与验证执行者为 platform agent，无具名员工本人参与回执。
