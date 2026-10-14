# ted-avc-manager —— 技能包管理器（预置 MCP）

中央仓库预置的 MCP 安装包。**目录名即工具名**：`mcp/ted-avc-manager` 可作为 `ted-avc-manager` 工具包被发现；客户端注册与启动由部署适配器单独完成并验证。

## 能力（命令协议 → 预定义流程）

| 命令 | 对应流程 | 说明 |
|---|---|---|
| `init` | FR-2 初始化 | 读 bootstrap → 扫描规约 → 发现 MCP 包 → 分层索引 → 骨架/预设 → 汇报（含版本号；客户端安装与加载另行验收） |
| `check` | FR-4 check_update | 当前 vs 中央最新版本差异 |
| `upgrade` | FR-4 upgrade | 升级（major 需 `--force` 人审） |
| `sync` | FR-8 回传 | 待回传日志统计 |
| `panorama` | FR-9 全景图 | 本地生成 runtime/panorama；`--public` 生成公开 panorama |
| `panorama-topic-add <input.json>` | 用户课题登记 | 本地登记课题标题、简介与会话 ID，不自动猜测文件归属 |
| `panorama-topic-link <input.json>` | 课题文件关联 | 以相对路径、人工依据和 SHA-256 关联个人或仓库文件；变化后提示复核 |
| `topic-create <input.json>` | 创建课题目录 | 首次会话确定课题后，在个人项目 `topics/<topic-id>/` 下建立分类目录 |
| `topic-session-add <input.json>` | 延续课题 | 将后续会话 ID 加入现有课题，不另建重复目录 |
| `topic-session-archive <input.json>` | 归档会话 | 更新课题内会话状态；所有会话归档后课题归档，不删除资料 |
| `topic-copy-legacy <input.json>` | 旧资料按课题整理 | 将明确或近似归属的旧文件复制入课题分类，校验摘要并保留旧路径 |
| `personal-discard <input.json>` | 旧资料待废弃 | 逐项核对后移入 90 天废弃区并记录原路径与摘要 |
| `personal-discard-cleanup [--apply]` | 到期清理 | 默认只读预览；`--apply` 删除到期且摘要未变的废弃文件 |
| `panorama-mcp-check <名称>` | 网上 MCP 按需检查 | 对已启用的远程 HTTPS MCP 发起只读握手，结果仅存本地缓存 |
| `panorama-mcp-quality <名称> --github owner/repo [--npm 包名] [--deep]` | 网上 MCP 网络指标 | 默认读取 stars、维护时间、npm 近一周下载；`--deep` 再读 OpenSSF 与公开安全公告 |
| `panorama-source-snapshot [--check\|--deep]` | 发布来源快照 | 发版准备时采集第三方包公开指标，发布构建时校验来源与版本 |
| `governance-weekly-status\|prepare\|complete <input.json>` | 周度资料治理 | 会话到期提示后台子代理；准备冻结摘要与窗口，完成只保存来源匹配的待人工复核建议 |
| `experience-recovery-stage <input.json> [--apply]` | 已提炼原文回收 | 校验完整覆盖复核声明与摘要，默认预览；应用后进入至少 90 天可恢复区 |
| `experience-recovery-reconcile [--apply]` | 中断移动协调 | 默认预览，核对来源与目标摘要后修复准备态 |
| `experience-recovery-cleanup [--apply]` | 到期清理 | 默认预览；到期后重新核对目标、引用和摘要才允许删除 |
| `experience-recovery-restore <id>` | 恢复原文 | 原路径无冲突且摘要一致时恢复 |
| `validate-packs` | FR-1/FR-10 校验门 | 校验 bootstrap + 全部包 meta + 类型一致性 + 非空入口（role 可为 PROFILE.md） |
| `validate-log` | FR-8 schema 校验门 | 校验使用日志（免审合并前提） |
| `score` | FR-8 双分融合 | LLM 静态分 + 实证分 → 质量分（含样本校正） |
| `anomaly` | FR-8 异常触发 | 成功率骤降检测 |
| `cleanup [--apply]` | FR-7 TTL 清理 | 默认预览；原始日志至少保留 30 天，且须有核验汇总、任务终态与无调查保留回执 |
| `server` | 对外 MCP 适配器 | stdio JSON-RPC（list_packs / check_update / upgrade / generate_panorama / submit_log） |
| `install-codex-hooks <deployment.json> <codex-home>` | Codex 原生适配 | 显式安装署名注入与 Stop 校验；精确定义信任和真实触发另行验收，见 docs/10 |

## 版本可见性（FR-5）

所有流程的最终汇报语句均以「…当前版本 vX.Y.Z」结尾，版本号取自 `runtime/lockfile.json`（唯一权威来源）。

## 全景图评分证据

新会话先确定用户课题，以 `topic-create` 输入 `{ "id": "topic-id", "title": "课题标题", "description": "范围", "sessionId": "会话 ID" }` 建立个人项目 `topics/<topic-id>/`。后续记忆、会议、资料、交付等直接写入该课题内对应分类目录；物理位置就是归属证据。`topic-session-archive` 输入 `{ "topicId": "topic-id", "sessionId": "会话 ID" }` 只归档会话，全部会话归档后课题才归档，均不删除文件。

旧文件可通过 `topic-copy-legacy` 输入 `{ "topicId": "topic-id", "paths": ["memory/旧文件.md"], "reason": "按内容归类的依据" }` 复制入课题；工具核对 SHA-256 并在课题内写 `migration.json`，保留旧路径以免断开历史引用。废弃区需要单独用 `personal-discard` 输入 `{ "path": "inbox/旧文件.md", "reason": "核对后的具体理由" }` 逐项移入。`personal-discard-cleanup --apply` 只处理 90 天到期且摘要仍一致的项目；本机调度需单独接入并核验。

旧顶层目录和仓库文件需要跨目录关联时，`panorama-topic-add` / `panorama-topic-link` 可写入仅本机使用的 `runtime/panorama-topics.json`；若课题目录已有同 ID，页面合并显示。关联输入为 `{ "topicId": "topic-id", "path": "deliverables/旧文件.md", "reason": "与课题相关的具体依据", "sessionId": "会话 ID" }`。`path` 可指向个人项目固定目录内的文件，或以 `repo/` 开头指向中央仓库内的文件。页面列出关联依据、会话和摘要核对状态；未登记的旧文件留在兼容目录中，不凭名称自动归类。

通用包和通用候选在本地、公开视图共用 `panorama/scores.json` 中已审核、可公开的评分快照；本地技能候选只读取 `runtime/scores.json`。未提供可信快照时统一显示“未评分／证据不足”。键和 `identity` 必须一致，评分范围为 0–5，必须绑定 `contentDigest`、`source`、`assessedAt` 和至少 20 个可归因样本。通用包 identity 为 `pack:<类型>/<名称>@<版本>`，PR 候选为 `pr:<PR号>:<head提交>:<类型>/<名称>`，本地技能候选为 `skill-candidate:<候选ID>:<bundle摘要>`。内容或版本改变后旧评分不显示。

网上 MCP 只纳入客户端配置的远程 HTTPS 服务；本地 stdio 和回环地址不算网上 MCP。配置、授权、协议握手及互联网质量证据分别展示。质量查询需要显式指定对应的 GitHub 仓库，npm 包为可选关联；查询结果仅是带来源与时间的参考信号，不构成安全认证。

从网络升级的通用 skill、knowledge、framework 或 role 在 `meta.json` 中声明 `origin`，至少包含不带密钥和查询串的 HTTPS `url` 及固定 `revision`；可选 `repository`（GitHub `owner/repo`）与 `npm` 包名。发版准备阶段运行 `panorama-source-snapshot`，审核生成的 `panorama/source-quality.json` 后将其纳入待发布版本；发布构建运行 `--check`，拒绝与当前包版本、URL 或 revision 不符的旧快照。默认只查 stars、最近维护、npm 当前版本及近一周下载；`--deep` 才查 OpenSSF 和公开安全公告。公开和本地页面都从该快照读取网络证据，并用 🔗 图标链接到原始 URL。网络接口不可用时保留来源与采集时间，网络质量显示未核验，不推算分数。页面的 ? 按钮说明 stars 和下载量的参考阶梯；该阶梯不是官方质量评级，也不混入内部质量分。

## 运行

```bash
node mcp/ted-avc-manager/src/cli.js <command> ...
# 或安装为命令
npm link   # 之后可直接 ted-avc-manager <command>
```
