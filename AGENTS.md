# AGENTS.md —— 中央仓库入口（平台中立版）

本仓库是「多类型 AI 技能包生命周期平台」的中央仓库：定义、分发、治理 skill / knowledge / framework / role 四类技能包，统一下发预设并管理版本。

## 目录结构（约定大于配置）

- `packs/<type>/<name>/`：四类包，每包含 SKILL.md（或等价入口文档）+ meta.json；**新增包 = 建目录即被发现**，无需改任何配置
- `presets/<name>/`：统一下发预设（bootstrap.json 的 `presets` 有序声明，后者覆盖前者）
- `mcp/`：预置 MCP（目录名即工具名，自动注册）；`mcp/ted-avc-manager/` 为平台引擎
- `rules/`：跨包全局规则；`docs/`：开发文档；`panorama/`：全景图产物落点
- `runtime/`：仓库自身的运行元数据与本地视图落点。中介层不得将 ChatGPT 自动创建的临时任务副本重定向到此目录；沿用客户端原有的工作区落点。中介层自己创建副本时，须先核对真实路径不在 iCloud 等同步目录，无法确认则停止创建。用户放在 Documents 中的正式项目不属于临时副本，不由本规则移动或清理。
- 个人数据不入本仓库：由部署期 `bootstrap.storage` 指向个人目录（规约见 [docs/08](docs/08-个人目录规约.md)，`doctor` 校验）

## 命令入口

```sh
node mcp/ted-avc-manager/src/cli.js <command>
# init / check / upgrade / sync / panorama
# doctor / config / import-scan / bind      （个人目录治理）
# validate-packs / validate-log / validate-layout   （规约门禁）
```

## 防逃逸与只读规约

- 仓库根与 `packs/` 布局受 `validate-layout` 门禁：根级白名单之外的内容、`packs/` 下无 meta.json 的散落目录都会被拒绝
- 各类产生物有固定落点：会话事件/立项登记 → 个人 `inbox/`；交付物 → 个人 `deliverables/`；学习记录 → 个人 `learning/`；外部导入 → 个人 `staging/`（import-scan 打标台账）；仓库运行元数据/本地视图 → `runtime/`。ChatGPT 自管的临时工作区沿用客户端原有落点；中介层创建的临时副本只允许落在确认不参与 iCloud 同步的位置。清理副本前核对未提交改动、交付位置和运行引用；不得仅凭目录名或 TTL 删除，更不得处理用户正式项目。
- 长期课题中尚未完成的源码、手写配置、依赖锁文件和决策记录是持久资料，应保存到课题或用户正式项目并可跨机器恢复；`node_modules`、编译输出和预览缓存是可重建运行产物。若持久源码位于 iCloud，安装与构建应在本机工作副本进行，按核对后的源码清单回写长期课题，不能指望 `.gitignore` 阻止 iCloud 同步依赖。
- 通用包与个人自定义资产使用同一套按资产身份、版本和内容摘要分组的周期统计与评分规则。加载、实际采用、任务结果和用户反馈分开计数；样本不足标记未评分/证据不足。统计可建议升级、降级或审计优化，不自动更改资产。汇总只保留窗口、样本量、分数、趋势和建议，不复制会话内容、个人路径或逐条工具日志；活动任务及未完成回执不参与瘦身，已核验的原始事件在汇总完整后按保留窗口清理。
- 外部资产一律先入个人 `staging/`（自动打标 → 台账 → 人工复核 → 转正），不得直接拷入 `packs/`
- 不写入密钥、凭据、个人路径与账号标识
- 改动走 PR → 人审 → 打 tag → CI 校验（validate.yml）→ 全景图发布（panorama.yml）
