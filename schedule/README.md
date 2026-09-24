# Scheduling

## Temporary task cleanup (2026-09-14)

公司清理入口：`node scripts/task-lifecycle.mjs cleanup --apply`。每天最多需要运行一次；规则见 `TASK_LIFECYCLE.md`。只隔离已到期终态任务，不永久删除，不启动研究或模型。`cleanup` 不加 `--apply` 为只读预览。
该调度不负责执行监督。实际本地任务由 `scripts/supervisor-runtime.mjs run --plan FILE` 在运行期间持续检查，原生智能体由当前主会话持续等待回执，详情见 `SUPERVISION_POLICY.md`。本轮未安装独立模型监督守护服务；不能把清理的成功退出当作研究任务受监督的证据。

本轮在当前 Mac 安装本地 LaunchAgent，label 为 `com.ai-virtual-company.tmp-cleanup`，间隔 86400 秒。绝对路径和 Node 安装位置只保存在本机 LaunchAgents 配置，不作为跨设备公司规则；换机后须重新安装并核验。实际状态通过 `launchctl print gui/$(id -u)/com.ai-virtual-company.tmp-cleanup` 检查。未加载或执行失败时，按 ROUTER 在下次公司任务开工机会性清理，不能声称后台成功。机器休眠、关机、iCloud 不可读时不保证准点；日志在本机临时目录。没有变化不发送消息。

The source of truth is `company-schedule.yaml` (default: Sunday 20:00 Asia/Shanghai). A Codex thread automation for the weekly run is desired_state; its last_observed_state and observed_at are recorded locally and remain unknown until a fresh thread receipt.（2026-09-24 审计修复）

For an optional local macOS fallback, copy `com.ai-virtual-company.weekly.plist.template` to `~/Library/LaunchAgents/com.ai-virtual-company.weekly.plist`, replace `__ROOT__` with this folder’s absolute path, then load it with `launchctl bootstrap gui/$(id -u) ...`. The fallback creates an inbox event; it deliberately does not impersonate or scrape any conversation.
