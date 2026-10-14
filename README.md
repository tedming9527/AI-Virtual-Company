# AI-Virtual-Company

**多类型 AI 技能包的生命周期平台** —— 中央定义分发、本地自演化、人审治理、持续改进闭环。

本仓库即**中央仓库**：技能包注册表（约定大于配置）+ 初始化引导源 + 版本账本 + 全景图发布源。

## 快速开始

```bash
# 1. 保全并安装客户端受管环境（原生接入另行验收）
yarn setup
# 或 npm run setup；用户资料初始化单独使用 init-personal，不隐式创建个人目录

# 2. 版本管理（版本可见：汇报必带当前版本号）
node mcp/ted-avc-manager/src/cli.js check
node mcp/ted-avc-manager/src/cli.js upgrade [--force]   # major 需 --force（人审）

# 3. 治理（日志 schema 校验门 → 免审合并前提）
node mcp/ted-avc-manager/src/cli.js validate-packs
node mcp/ted-avc-manager/src/cli.js validate-log <file.json>

# 4. 全景图
node mcp/ted-avc-manager/src/cli.js panorama            # 本地生成 runtime/panorama/index.html

# 5. 对外 MCP 适配器（stdio）
node mcp/ted-avc-manager/src/cli.js server
```

## 聊天输入框中的 Ted

安装包含 Ted 技能的版本并让宿主重新加载后，在输入框键入 `/`，从技能列表选择 **Ted**；也可明确输入 `$ted doctor`。这是交给模型执行的聊天入口。菜单项来自原生技能及其界面元数据，MCP 提供固定动作工具；仅有 MCP 工具列表不能证明输入框菜单已可见。

| 补充给 Ted 的要求 | 对应操作 |
|---|---|
| 检查更新 / `update` | 检查安装、本地声明与公开最新 Release，不自动安装 |
| 创建本地全景图 / `panorama` | 生成本地 HTML，展示最近发布的资料变化 |
| 汇总评分 / `scores` | 展示有效评分、优秀项、样本量及证据不足项 |
| 检查 / `doctor`、`status` | 只读检查资料目录、事件和会话接入 |
| 修复 / `repair` | 返回修复方案与确定性安装入口，执行另按用户授权 |

支持 MCP prompts 的宿主另有 `ted` prompt。`/ted` 保留为文本触发约定；不把它或 `@Ted` 字符串当作已验证的原生菜单注册。具体安装与验收范围见 [聊天入口与验收](docs/15-Ted聊天入口与验收.md)。

## v1.2.0 管理入口

服务名、目录及主命令统一为 `ted-avc-manager`（旧 `pack-manager` 命令保留兼容别名）。本地配置和安装需显式迁移；更名不证明插件市场安装。

- `find-skill` / `register-skill`：区分通用、本地原创和外部已安装技能；外部资产先暂存复核。
- MCP `list_assets` / `recommend_assets`：返回元数据，使用时通过绑定回合的 `load_asset` 获取正文。
- `task_begin` → `load_asset` → 原生 Pre/Post 工具观察 → `task_closeout`：固定角色、资产、白名单和工具预算。
- `panorama --local`：个人视图位于 `runtime/panorama/`；`panorama --public --catalog-ref vX.Y.Z`：只用已发布通用目录和公开 PR。

执行适配见 [11](docs/11-执行介入架构.md)，资产感知见 [12](docs/12-资产发现与使用追踪.md)。客户端发现、正文交付和实际使用分别验收。

Codex 客户端安装/升级脚本 `scripts/update-local-client.py`（Python 3.11+）会在注册 MCP 后为 `task_begin`、`load_asset`、`task_closeout` 补齐单工具 `approval_mode = "approve"`；保留已有工具策略，不改变全局审批或 Hook 信任。已有安装可按 [监控工具审批配置](docs/11-执行介入架构.md#监控工具审批配置) 单独补齐，无需重新升级或推送。

## 目录规约（约定大于配置）

根级仅保留：

| 路径 | 职责 |
|---|---|
| `README.md` | 仓库说明（可发布为 Pages 首页） |
| `bootstrap.json` | 极简初始化清单（name/version/update/storage） |
| `package.json` | yarn/npm 安装向导与客户端状态命令，无第三方依赖 |
| `CHANGELOG.md` | 版本账本（与 tag 对应） |
| `AGENTS.md` | 根级 Agent 指引（治理/策略文档例外留根） |
| `rules/` | 全局框架 / 规则（跨包约束） |
| `docs/` | 开发文档（架构/规约/命令协议/治理/全景图/升级需求） |
| `assets/` | 静态资源 |
| `packs/` | 多类型包注册表（skill/knowledge/framework/role…，每包 SKILL.md + meta.json） |
| `mcp/` | 预置 MCP 安装（目录名即工具名） |
| `platforms/` | 平台适配 |
| `templates/` | 模板 |
| `scripts/` | 脚本 |
| `panorama/` | 全景图生成产物 |
| `runtime/` | 仓库运行元数据与本地视图；大缓存和中介层创建的临时副本须留在非 iCloud 位置 |
| `.github/` | CI / 工作流 |
| `.gitignore` | 忽略规则 |

- **治理/策略文档位置**：`packs/framework/company/policies/`（16 份，AGENTS.md 例外保留仓库根）
- **实现状态**：见 [docs/09](docs/09-实现与验收状态.md)，源码、本机验证和部署启用分别记录。
- **个人项目信息**：不存于仓库，由部署存储配置解析到个人目录（本机 runtime/storage.json 或环境变量覆盖中央声明）（规约见 [docs/08](docs/08-个人目录规约.md)）；memory/learning/inbox/deliverables/output/meetings/research/schedule/plugins/.agents/.codex/infrastructure 等固定目录均安置于该处，`doctor` 校验

**新增专业包 = 建目录放对位置，自动被发现，禁止改配置文件。**

## 版本

- 版本账本：`CHANGELOG.md` + `git tag v*`（semver）
- 本地生效版本：`runtime/lockfile.json`（唯一权威来源）
- 所有流程汇报语句带当前版本号（FR-5）

## 发布流程

特性分支 PR 经人审合并 `master` 后，`master-release` 自动验证、打不可变 tag、创建 Release 并发布 Pages。每个发布 PR 须递增版本和更新 CHANGELOG；tag 不单独触发 Pages 部署。详细约定见 [发布流程](docs/14-master发布流程.md)。

## 治理要点

- 反馈双通道：使用日志 PR（免审 + schema 校验门）/ 晋升 PR（人审）；
- 评分：LLM 静态分 + 用户实证分（挂版本），防刷（最低样本量）；
- 隐私：只上报聚合指标，不带原文；日志保留窗口后删除；
- 信任锚：人审发布；安装/升级前验哈希/签名。

详细文档见 [docs/](docs/)。

## 客户端安装与升级

从完整中央源码运行 `yarn setup` 或 `npm run setup`。向导明确选择客户端、客户端目录和已有用户资料项目；目前仅实现 Codex，其他客户端不写入配置。对话要求初始化也必须引导调用这个入口。

非交互示例：

```sh
npm run setup -- install --client codex --codex-home <客户端目录> --personal-project <已有用户项目目录> --yes
yarn client:status
# 中断事务恢复：npm run setup -- recover --client codex --codex-home <客户端目录>
```

安装器先保全，再全量重建受管客户端环境；不合并 Git、不发布、不清空用户数据、不改变其他插件或原生审批。安装后须由宿主信任/重载，真实事件到达后分阶段显示捕获、接入、上下文交付和任务合同；不会仅因写配置就报告成功。原生会话为主线，一个任务可涉及多个项目；目录缺失不阻断采集，经验按实际改动的项目来源整理。

中央源码暂不可用时，可从已安装的 `ted-avc-manager client-status` 独立诊断；安装器需完整源码，事件采集不要求中央源码在线。
