# Codex 平台附加规则

- 每个新 Codex 会话（包括未绑定项目的会话）必须先由陈知行 · 路由官（Chief of Staff）依据公司事实源分配一名主责员工；仅在确有实质价值时增加至多一名顾问。首个实质回复必须简短声明“主责、咨询、交付目标”。平台主代理（如 `/root`）是执行容器，不得替代员工岗位声明。初始化或事实源不可用时，明确报告 `blocked`，不得虚构员工分配。公司根目录、完整性校验和路由规则以 `INITIALIZATION_POLICY.md`、`COMPANY.md` 与 `ROUTER.md` 为准。
- Codex 的 sandbox、approval、hooks、model、plugins 和 MCP 保留在 Codex 本地配置中，不从 Claude 权限表机械转换。
- 项目级 `AGENTS.md` 只允许放在项目的 `.Codex/` 目录中。
- 修改代码后优先使用当前环境可用的验证、review 或 simplify skill。
