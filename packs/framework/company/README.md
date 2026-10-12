# 组织治理框架模板

本包是中立规则源。部署实例通过受控适配器加载获准版本，并配置组织显示名、项目绑定、实际执行通道与平台能力。中央仓库不保存用户授权记录、人员实名或本机配置。

## 配置约定

- `AI_VIRTUAL_COMPANY_ROOT` 显式定位规则根；未配置或无法解析时报告 unavailable，不猜测用户目录或操作系统路径。
- 部署存储覆盖顺序为 `bootstrap.storage` → 本机 `runtime/storage.json` → `AVC_PERSONAL_DIR` / `AVC_MEMORY_DIR` / `AVC_ICLOUD_ROOT`。`storage.personal` 必须解析为 `<personal-root>/projects/<slug>`；本文与各政策中的 `personal/projects/<slug>/` 是该已解析项目路径的逻辑表示，不是再次拼接路径。`storage.memory` 可指定记忆目录。事件进 `inbox/`，交付进 `deliverables/`，学习与评测进 `learning/`，项目记忆进 `memory/`，导入候选先入 `staging/`。本机缓存、日志和锁进中央仓库 `runtime/`。参见 [个人目录规约](../../../docs/08-个人目录规约.md)。
- `icloud://` 仅在显式配置可用的 `icloudRoot` 或 `AVC_ICLOUD_ROOT` 后解析，否则报错。完全未配置个人存储时仅回退 `runtime/personal/projects/<bootstrap.name>`，用于本机临时验证，不证明跨设备存储已部署；`doctor` / `config` 不创建目录，`init` 才补建骨架。
- 平台、模型、时区、调度和预算由部署配置显式提供；环境变量只能作为该适配器经验证的输入，不能凭品牌、安装目录或历史配置推断。
- 从 [Skill 目录](../../skill/) 按任务发现能力，完整阅读选中的 `SKILL.md`。目录存在、可安装、已连接、已加载与实际执行分别留证据。

## 验证与部署边界

从中央仓库根可运行现存入口：

```sh
node mcp/pack-manager/src/cli.js validate-packs
node mcp/pack-manager/src/cli.js validate-layout
node mcp/pack-manager/src/cli.js doctor
node mcp/pack-manager/src/cli.js config
```

这些命令只验证各自声明的结构或配置，不证明公司初始化、项目绑定、平台 Hook、人员身份或持续监督。平台规则同步、身份鉴证、可信发布器、预算解析与模型计量由部署适配器提供；未部署不能声称具备，也不存在可在本包直接运行的这些命令。平台配置改动须保留现有内容、先核对差异与恢复方案，再按已授权范围执行；新会话验收与静态校验分别报告。

阅读 [初始化政策](policies/INITIALIZATION_POLICY.md) 与 [平台目标说明](targets/)；中介层候选文件不会自行激活、安装 Hook 或修改客户端配置。
