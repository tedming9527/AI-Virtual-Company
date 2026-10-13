# company — 组织治理框架模板

本包提供可部署的组织治理方法、平台适配说明与候选中介层规范。它不是某个组织的活态身份、用户授权、员工参与或生产实施证明。组织名称、人员、平台、模型、存储与调度均由部署实例配置。

## 阅读入口

- [任务编排](policies/TASK_ORCHESTRATION.md)：任务多技能组合、流程节点和真实运行证据。

- [AI_RULES.md](AI_RULES.md)：授权、安全、真实署名与专业工具规则。
- [policies/COMPANY.md](policies/COMPANY.md)：专业角色与治理边界。
- [policies/INITIALIZATION_POLICY.md](policies/INITIALIZATION_POLICY.md)：事实源核验与独立状态。
- [policies/ROUTER.md](policies/ROUTER.md)：任务路由、执行与协作。
- [policies/PROJECT_BINDING_POLICY.md](policies/PROJECT_BINDING_POLICY.md)：部署实例的显式项目绑定。
- `policies/` 其余文件：交付、度量、学习、记忆、知识、评测、监督与生命周期。
- [platforms.json](platforms.json) 与 [targets/](targets/)：平台适配契约；记录不等于已连接。
- [intermediary/BOOTSTRAP.md](intermediary/BOOTSTRAP.md)、[policy.json](intermediary/policy.json)、[routing.json](intermediary/routing.json)、[migration.json](intermediary/migration.json)：候选初始化、上下文、角色执行与发布迁移规则；状态保持 `candidate`。
- [README.md](README.md)：配置与验证说明；[meta.json](meta.json)：包元数据。

按任务读取必需规则与命中的 Skill 全文，不默认注入全部岗位和知识。新增框架配置加入本包；安装、平台入口写入、发布和权限变更遵守当前用户授权及仓库流程。
