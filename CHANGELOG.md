# Changelog（版本账本，与 tag 对应）

## [Unreleased]

## [1.1.0] - 2026-10-13

### Changed

- 中央仓库统一为 skill / knowledge / framework / role 四类通用包；实例运营资料迁入部署个人存储，原件保留。
- 八岗方法及框架政策通用化；重建 50 条知识索引与正文哈希、11 项技能登记；方法模板不继承个人历史实测。
- 存储由中央声明、本机 runtime/storage.json 与环境变量分层提供；显式云映射失败不静默回退，默认本机运行态保持在 runtime。
- 强化非空入口、packs 根与仓库布局门禁，修复回执符号链接检查及测试隔离；配置按预设声明顺序合并。
- 初始化汇报区分包发现、索引生成、客户端安装与实际上下文加载；实现和部署缺口见 docs/09。
- PR 与 tag 发布均验证布局、包入口、知识索引、MCP 元数据及通用层测试；全景图使用中央干净检出的数据。

### Implemented（FR-3 / FR-11 / FR-12 / FR-13）

- **FR-3** 命令协议补齐 4 个动作词：`doctor` / `config` / `import-scan` / `bind`（意图映射 + 预定义流程 + CLI 入口）；修复既有缺陷「检查更新」被 upgrade 分支抢占（docs/03：应为 check dry-run）
- **FR-11** 个人目录规约落地：`mcp/pack-manager/src/core/personal.js`——`init` 幂等补建骨架（不删除不移动）、`doctor` 六类校验（missing/unexpected/naming/tampered/state/layout，exit code 表示结果）；init 可幂等补齐个人目录 `staging/`、`preset/`、`custom/`、`.project-state.json`、`.personal-manifest.json`、`README.md`
- **FR-12** 配置分层：中央 `presets/base/`（bootstrap `presets` 有序声明）→ 个人 `preset/base/` 只读 + `.preset-manifest.json` + sha256；用户改过 preset 同步时保留 `.local` 副本；`custom/` 永不触碰；`config` 命令合并输出并逐项标注来源
- **FR-13** 导入暂存：`import-scan` 外部资产入 `staging/imports/`，规则自动打标（general-candidate/personal/needs-human）+ `imports-registry.json` 台账（来源/标签/状态/哈希），状态 pending-review 待人工复核
- **FR-2** init 流程接入第 3/5 步：个人目录骨架补建 + 预设同步；版本漂移修复（lockfile current 1.0.0 → 1.0.1）
- 修复 `scripts/mcp-governance.mjs` Node 18 兼容（`import.meta.dirname` → `fileURLToPath`），MCP 治理脚本免环境变量可运行；旧公司部署 bootstrap 已迁出，不作为中央模板初始化证明
- 新增隔离测试 `personal.test.mjs`（7 项：幂等/六类 doctor/哈希冲突 .local/来源标注/打标台账/多项目绑定）

### Docs（架构定稿 v3）

- 框架说明升级：新增 [docs/08-个人目录规约]（个人存储强制骨架、manifest/state、doctor 校验、preset/custom、staging/experience）
- 框架图升级：`docs/assets/architecture-v3.svg`（三类存储、统一通用化升级路线、配置分层）；生成脚本 `scripts/generate_architecture_svg.py`
- 统一通用化升级路线：所有候选数据（技能/知识/角色/配置，含 ai-config 拆解、本地自定义角色）走「自动打标 → 台账 → 人工复核 → 转正」
- 同源原则：全景图生成脚本与统计规则随仓库分发，中央/本地同一份代码，差异仅数据
- docs/01-07 同步：四类包（补 role）、三存储模型、完整动作词、FR-11~FR-14

## [1.0.1] - 2026-10-12

### Changed

- 根级治理/策略文档 16 份归位 `packs/framework/company/policies/`（AGENTS.md 保留仓库根）
- 个人项目信息安置规约：memory/learning/inbox/deliverables/output/meetings/research/schedule/plugins/.agents/.codex/infrastructure 迁移至个人目录（部署期由 bootstrap.storage 配置解析，规约见 docs/08；中央仓库只存通用架构）
- bootstrap.json storage 新增 personal 定义，memory 指向更新
- 根级空壳目录清理（skills/employees/config/tmp 移除）；活动文件路径引用同步

## [1.0.0] - 2026-10-12

### Added

- **FR-1** 中央仓库目录规约：`bootstrap.json`（极简）/ `mcp/` / `packs/`（skill · knowledge · framework）/ `rules/` / `panorama/` / `docs/`；约定大于配置，新增包即建目录自动发现。
- **FR-2** 初始化流程：读 bootstrap → 扫描规约 → 自动安装预置 MCP → 分层注入；汇报带版本号。
- **FR-3** 命令协议：`github://owner/repo[@ref]` + 动作词（init/check/upgrade/sync/panorama），三层解析，确定性代码。
- **FR-4** 版本管理：semver 比较、本地 lockfile 钉版本 + override 标记、check_update / upgrade（major 人审）。
- **FR-5** 版本可见性：所有流程最终汇报语句带当前生效版本号。
- **FR-6** 本地运行时：本地演化（记忆/技能/等级）约定、等级函数、晋升触发、只上报聚合指标。
- **FR-7** 临时信息迁移：`runtime/` 自定义项目约定目录（cache TTL / logs 保留窗口），系统临时目录不再增长。
- **FR-8** 治理：日志 schema 校验门（免审合并前提）、双分融合评分、TTL 清理、异常触发。
- **FR-9** 全景图：生成器（扫描 → 聚合 → 渲染 HTML）+ GitHub Pages CI + 本地手动触发。
- **FR-10** 清理：无占位/示例测试代码，CI 校验门真实生效（validate.yml）。
