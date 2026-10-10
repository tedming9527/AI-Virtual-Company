# Ted Company Bootstrap

公司初始化先验证组织事实源和必需编排资产，再维护可恢复的本机基础设施。`scripts/check-company-bootstrap.sh` 的公司事实源检查保持只读；经用户长期授权，其可选尾部会安全获取/快进更新 `ted-personal-execution-system`、检查 Ted Mac Assistant 是否已安装，并在插件源码指纹变化时更新 MCP。可选步骤失败不会把公司事实源误判为损坏。

## 初始化顺序

1. 验证公司规则、花名册、路由与 `codex-with-chatgpt` / `jev-use` 规范源。
2. 运行 `scripts/ted-mac-assistant-bootstrap.sh ensure`：不存在则克隆项目，存在则只做 `origin/main` 快进；tracked 改动、错误 remote 或分叉一律停止自动更新，未跟踪构建产物不会被删除。
3. 检查本机 `.app` 是否存在；缺失只降级报告，不自动安装。
4. 从外部项目 `plugins/ted-mac-assistant` 生成本机市场并安装；仅当源码指纹变化时重装，成功后移除旧 `ted-company` 插件市场。
5. 若 App 缺失，由用户明确触发 `scripts/ted-mac-assistant-bootstrap.sh install`；升级使用 `upgrade`。
6. 安装后运行 `doctor`，并由用户确认原生通知及当前版本实际请求的系统权限；Calendar/Reminders 集成已经退役，不再作为初始化条件。
7. 运行 `plugin-check`、`doctor` 并在新客户端会话发现和调用 `ted_status`。安装、启用、发现工具、真实写入分别验收，不互相替代。云端任务不能直接访问仅存在于 Mac 的 stdio/Unix Socket MCP；没有受认证远程 MCP 时报告 unavailable。
8. 双 Mac 分别同步项目、安装与授权；本机应用、插件缓存与系统权限不通过 iCloud 复制。

## 治理边界

- 公司 Bootstrap 只负责安装、升级、健康检查、权限状态提示和卸载入口。
- 学习计划、学习提醒、ChatGPT Scheduler 与导师观察只由专属学习/事业导师管理。
- 其他公司员工不得创建学习提醒或主动催学，也不得把基础设施健康检查解释成学习管理权。
- Ted Mac Assistant 使用本机执行事实与 `Ted-Learning` 数据；仅执行专属导师已授权的受限写入，不运行本地 timer，不充当 Scheduler。历史 Calendar/Reminders 描述不再授予运行能力。

完整运维说明见 `infrastructure/ted-mac-assistant.md`。
