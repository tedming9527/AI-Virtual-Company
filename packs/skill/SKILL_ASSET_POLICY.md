# Company skill assets

Skills are company-owned, optional capabilities—not ambient instructions for every project conversation.

## Selection rule
路由负责人先完成工作路由。主责岗位再决定一个技能是否实质改善正确性、安全性、速度或可复用流程。使用最小适配集合；不因技能存在而加载。

## Recordkeeping
For non-trivial work, the work brief records `skills considered`, `skills used`, and a one-line rationale. A skill becomes a company asset only after it proves reusable; retire or revise it when it adds friction without improving outcomes.

## Bound-project baseline
Project bindings load only routing, budget and approval boundaries. They never automatically load the company skill library.

## Platform publication

初始化时按当前运行平台同步规则入口。规范源只维护在 `packs/framework/company/` 与 `packs/skill/`；系统/插件/外部包保留原维护者来源，按清单引用或受审导入。

初始化校验 active Skill 规范源并指向岗位地图与目录，默认不发布客户端 Skill，不代表执行正文或取得其中业务操作权限。环境同步由部署期配置的工具完成；首次同步保留本机备份，未知漂移报冲突。模型能力与工具可用性按运行时核验，不跨平台复制模型名。详见 `packs/framework/company/README.md`。
