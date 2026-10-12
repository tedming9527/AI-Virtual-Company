# pack-manager —— 技能包管理器（预置 MCP）

中央仓库预置的 MCP 安装包。**目录名即工具名**：`mcp/pack-manager` 可作为 `pack-manager` 工具包被发现；客户端注册与启动由部署适配器单独完成并验证。

## 能力（命令协议 → 预定义流程）

| 命令 | 对应流程 | 说明 |
|---|---|---|
| `init` | FR-2 初始化 | 读 bootstrap → 扫描规约 → 发现 MCP 包 → 分层索引 → 骨架/预设 → 汇报（含版本号；客户端安装与加载另行验收） |
| `check` | FR-4 check_update | 当前 vs 中央最新版本差异 |
| `upgrade` | FR-4 upgrade | 升级（major 需 `--force` 人审） |
| `sync` | FR-8 回传 | 待回传日志统计 |
| `panorama` | FR-9 全景图 | 生成 panorama/index.html |
| `validate-packs` | FR-1/FR-10 校验门 | 校验 bootstrap + 全部包 meta + 类型一致性 + 非空入口（role 可为 PROFILE.md） |
| `validate-log` | FR-8 schema 校验门 | 校验使用日志（免审合并前提） |
| `score` | FR-8 双分融合 | LLM 静态分 + 实证分 → 质量分（含样本校正） |
| `anomaly` | FR-8 异常触发 | 成功率骤降检测 |
| `cleanup` | FR-7 TTL 清理 | runtime/ 约定目录清理 |
| `server` | 对外 MCP 适配器 | stdio JSON-RPC（list_packs / check_update / upgrade / generate_panorama / submit_log） |

## 版本可见性（FR-5）

所有流程的最终汇报语句均以「…当前版本 vX.Y.Z」结尾，版本号取自 `runtime/lockfile.json`（唯一权威来源）。

## 运行

```bash
node mcp/pack-manager/src/cli.js <command> ...
# 或安装为命令
npm link   # 之后可直接 pack-manager <command>
```
