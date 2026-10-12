# AGENTS.md —— 中央仓库入口（平台中立版）

本仓库是「多类型 AI 技能包生命周期平台」的中央仓库：定义、分发、治理 skill / knowledge / framework / role 四类技能包，统一下发预设并管理版本。

## 目录结构（约定大于配置）

- `packs/<type>/<name>/`：四类包，每包含 SKILL.md（或等价入口文档）+ meta.json；**新增包 = 建目录即被发现**，无需改任何配置
- `presets/<name>/`：统一下发预设（bootstrap.json 的 `presets` 有序声明，后者覆盖前者）
- `mcp/`：预置 MCP（目录名即工具名，自动注册）；`mcp/pack-manager/` 为平台引擎
- `rules/`：跨包全局规则；`docs/`：开发文档；`panorama/`：全景图产物落点
- `runtime/`：本地运行态唯一落点（cache / logs / lockfile，按 TTL 清理；不写系统 tmp）
- 个人数据不入本仓库：由部署期 `bootstrap.storage` 指向个人目录（规约见 [docs/08](docs/08-个人目录规约.md)，`doctor` 校验）

## 命令入口

```sh
node mcp/pack-manager/src/cli.js <command>
# init / check / upgrade / sync / panorama
# doctor / config / import-scan / bind      （个人目录治理）
# validate-packs / validate-log / validate-layout   （规约门禁）
```

## 防逃逸与只读规约

- 仓库根与 `packs/` 布局受 `validate-layout` 门禁：根级白名单之外的内容、`packs/` 下无 meta.json 的散落目录都会被拒绝
- 各类产生物有固定落点：会话事件/立项登记 → 个人 `inbox/`；交付物 → 个人 `deliverables/`；学习记录 → 个人 `learning/`；外部导入 → 个人 `staging/`（import-scan 打标台账）；本机视图/缓存 → 仓库 `runtime/`
- 外部资产一律先入个人 `staging/`（自动打标 → 台账 → 人工复核 → 转正），不得直接拷入 `packs/`
- 不写入密钥、凭据、个人路径与账号标识
- 改动走 PR → 人审 → 打 tag → CI 校验（validate.yml）→ 全景图发布（panorama.yml）
