id: 2026-09-16-supervision-claim-gate
created_at: 2026-09-16T00:00:00+08:00
source: codex
request: 实现公司侧任务未登记或监督心跳超时即告警、阻止无证据宣称已受监管，将 Codex 平台 fail-closed 接管写入公司初始化，并提供 /ted-takeover 手动恢复入口。
scope: AI-Virtual-Company initialization, Codex hooks, supervision governance, recovery skill and local runtime tooling
sensitivity: internal
requested_outcome: implementation
level: M
owner: 陈知行 · 路由官（Chief of Staff）
actual_executor: Codex current task
consult: none
skills considered: development-experience; openai-docs; skill-creator
skills used: development-experience（复发性治理缺陷收敛）；openai-docs（核验 Codex hooks 官方能力）；skill-creator（创建 ted-takeover 公司 Skill）
acceptance: 未登记、无效回执、非运行状态和过期心跳均输出结构化告警且拒绝监管声明；真实活动监督回执可通过；Codex 启动、恢复和每次 prompt 均执行初始化门禁；/ted-takeover 可手动恢复当前会话且不追认历史。
status: implementation_complete_pending_platform_trust
initialized_at: 2026-09-16
outcome: 公司初始化已通过；监管门禁、Codex hooks、公司 Skill 规范源与用户 Skill 符号链接均已实现并验证。用户级 hook 配置已登记，等待在 Codex `/hooks` 审核信任后才可声明平台拦截生效。
evidence: scripts/supervision-gate.mjs; scripts/supervision-gate.test.mjs; scripts/codex-company-takeover-hook.mjs; .codex/hooks.json; skills/ted-takeover/SKILL.md; INITIALIZATION_POLICY.md; SUPERVISION_POLICY.md
remaining: 用户级 hook 和 skill 需安装并信任；组织级不可关闭需要 requirements.toml/MDM 管理员下发；主动通知仍需持久监控通道。
next_action: 用户在 Codex `/hooks` 审核并信任当前 hook 定义；随后用新建会话、恢复旧会话和未登记监管声明完成平台验收。
