# Claude Code 部署适配模板

- 仅在当前项目绑定已加载且关联可核验时，按 [初始化政策](../policies/INITIALIZATION_POLICY.md) 与 [路由](../policies/ROUTER.md) 取得当前事实源并声明主责、咨询与目标。
- 规则根由 AI_VIRTUAL_COMPANY_ROOT 或显式部署配置定位，未配置时 unavailable，不猜系统/用户目录。组织名、执行通道与个人存储由部署配置。
- 项目入口按当前平台受支持的 CLAUDE.md 发现机制设置，保留项目规则；permissions、hooks、model、plugins、MCP 与命令包装属于平台本地配置，不由本包覆盖。
- 规则同步、身份鉴证与 Hook 验收由部署适配器提供；未部署不能声称具备，也不能把模板或安装副本当真实启动、人员参与或不可绕过证明。
- role ID、逻辑责任、资料引用、实际执行与监督分别记录，最终署名遵循 [AI_RULES](../AI_RULES.md)。初始化失败仅影响依赖范围，不虚构组织接管或人员回执。
