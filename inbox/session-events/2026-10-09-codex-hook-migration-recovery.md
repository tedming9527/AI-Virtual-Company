# Codex Hook 跨设备恢复

- id / created_at / source：2026-10-09-codex-hook-migration-recovery / 2026-10-09 / codex
- request：根据公司事实源补全因跨电脑同步缺失的 Codex 全局 Hook。
- scope：恢复用户级 `SessionStart` 与 `Stop` 注册；不恢复已废弃的 `UserPromptSubmit`，不修改公司 Hook 实现。
- sensitivity / authority：内部；用户已明确授权恢复本机 Hook 配置。
- requested_outcome / level：实现与验证 / M（平台用户级配置写入与新会话验收）。
- primary_owner：陈知行 · 路由官（Chief of Staff）
- implementation_owner：辛澈 · AI工程师（逻辑责任分配）
- reviewer / consult：none
- actual_executor：platform agent
- status：partial（安装与本地适配器验证通过；真实 Codex 新会话入口验收待完成）
- acceptance：用户级 Hook 配置存在且 JSON 有效；仅注册 `SessionStart,Stop`；Hook 测试、bootstrap 和直接事件探针通过；新建 Codex 会话收到 `TED_CODEX_PLATFORM_TAKEOVER_V1` 后才将 `platform_hook_verified` 记为已验证。
- outcome：已恢复用户级 `~/.codex/hooks.json`，权限 `600`，仅注册 `SessionStart,Stop`；命令使用本机 Node 18 与公司 Hook 的绝对路径，避免依赖启动目录。
- evidence：恢复前用户级与项目级 `hooks.json` 均缺失；历史提交及 2026-09-29 事件证明此前全局配置仅保留 `SessionStart,Stop`；安装副本与暂存配置一致；JSON 解析通过；Hook 测试 15/15；bootstrap 通过；直接 `SessionStart` 探针产生 `TED_CODEX_PLATFORM_TAKEOVER_V1`，`Stop` 合规尾注探针放行。
- remaining：重启或新建 Codex 会话，确认宿主实际读取用户级 Hook 并向新会话注入标记；取得该证据前 `platform_hook_verified` 仍为 unverified。
- next_action：用户下一次启动新会话后检查初始化上下文；若无标记，再核对当前 Codex 版本的 Hook 配置入口。
- capability_handoff_status：no_evidence（本任务没有可归属于用户专业能力变化的行为证据）。
