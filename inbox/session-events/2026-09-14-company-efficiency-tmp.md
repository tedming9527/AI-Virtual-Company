# 公司效率优化与临时任务生命周期

- id：2026-09-14-company-efficiency-tmp
- created_at：2026-09-14
- source：codex；sensitivity：internal
- request：按审计建议优化，增加临时任务 tmp 与定期清理，可停止无价值任务。
- scope：公司治理、预算解析、临时任务工具、本机清理调度；不迁移或清理历史任务，不安装模型框架、不修改业务项目。
- requested_outcome：implementation
- level：M；可逆内部工具与规则，清理只移隔离。
- owner：陈知行 · 路由官（Chief of Staff）
- executor：root（规则/解析/集成）；辛澈 · AI工程师（子任务 tmp_lifecycle，仅生命周期脚本与测试）。
- consult：顾清妍 · 质量测试工程师（独立新上下文 review_optimization）。实际模型未取得完整回执，不记为Spark，也不结算旧学习额度。
- acceptance：预算来源与执行人分开；running有执行标识；blocked可恢复；取消为正常收口；清理保留活动任务并拒绝非法路径；后台首次运行结果可查。
- status：verified（仅本轮规则、工具与本机调度范围）
- evidence：两个node:test文件12项行为测试通过；zsh bootstrap通过；LaunchAgent label com.ai-virtual-company.tmp-cleanup，run interval 86400，runs 1，last exit code 0；首次cleanup --apply返回空列表，没有移动/删除既有资料。
- review：独立审查发现维护入口不易发现、blocked缺入口、“依次”漏解析、取消原因hash未核对四项；已逐项修复并补行为测试。范围为语义复核与冷启动发现，不是完整隔离评测。
- outcome：普通任务条件加载学习/绑定规则；预算汇集辛澈默认单负责人；tmp默认7天，过期终态隔离，活动仅关注；隔离7天后仅列永久删除候选。回执保存原因、运行标识与时间，不能自行证明外部模型或产物验收。
- artifacts：TASK_LIFECYCLE.md；scripts/task-lifecycle.mjs；scripts/task-lifecycle.test.mjs；scripts/resolve-model-learning-request.test.mjs；schedule/README.md。
- metrics：实际费用/token、人工作业时间unknown；启动/结束区间由新工具后续自动记录，不将墙钟时长当实际计算时间；长期提效未验证。
- remaining：Agno未安装；未进行Agno与现有执行方案的模型调用对比，不宣称框架迁移或真实性能优化已完成。清理无自动永久删除；换机或Node路径变化需重新核验本机调度。
- next_action：下一批同类研究任务采用相同模型/输入/验收标准，对比现有单执行者与Agno一条检索→证据整理→报告验收流程；先校准3个任务的耗时、人工介入、返工、遗漏与实际费用，不能据此宣称长期因果提效。仅在执行通道与调用成本明确后开展真实模型试点。
- knowledge：none；本轮直接更新规则与运行工具，不另造知识文章。

## 监督闭环修复接续

- authority：用户明确要求继续修复，并在确认修复后提交、推送；仅提交本任务相关文件。
- owner/executor：陈知行 · 路由官（root集成）；辛澈 · AI工程师（budget_parser_v2、supervisor_runtime两个独立实现子任务）。
- review：顾清妍 · 质量测试工程师（review_supervision_fix，未继承实现历史的独立上下文）。模型与精确token未知；本轮不是Spark额度学习。
- problem：原解析只覆盖全员且总额误乘人数；生命周期只校验回执格式；缺少持续执行、实际停止确认和失联识别。
- implementation：花名册动态解析全员/名单/单人，预算总额/逐人分离、默认上限、明确歧义拒绝；本地supervisor实际派发、依赖/并发补位、心跳、超时、取消握手、进程组收尾、只读失联状态、不可重复run ID；生命周期只能关联观察到的本地执行，不以任意回执文字冒充running。
- review_findings：预算正文“每位”污染、block/start覆盖仍活跃关联、正常leader退出遗留同组后代、max_tokens被静默忽略四项均已真实负例复现并修复复核。
- validation：2026-09-14，三套node:test共62项通过（parser39、runtime16、lifecycle7）；zsh bootstrap通过；受控真实子进程测试与独立负例复测通过；定向git diff --check通过。
- evidence：scripts/resolve-model-learning-request.test.mjs；scripts/supervisor-runtime.test.mjs；scripts/task-lifecycle.test.mjs；templates/supervision-plan.example.json；SUPERVISION_POLICY.md。
- verified_scope：人员预算解析与本地进程监督/生命周期集成；无剩余已证实阻断。
- limits：没有新增模型、原生智能体或平台额度适配器；这类约束在本地runner被blocked。前台运行需宿主保持存活；主动setsid/detached脱离原组的后代不在停止保证内。异常可观察于状态/事件/返回码，但未新增跨会话消息通知。tmp每日清理不是监督心跳，亦未安装模型监督守护服务。未进行全公司隔离评测或真实性能比较。
- publication：待提交、推送回执；工作区其他历史事件改动不包含在本批。
