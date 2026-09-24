# 公司共用知识发现目录

只检索相关条目，命中后完整读详情及当前政策。以下历史资料未重新验收技术结论，标stale，不直接指导执行。catalog.json为机器校验清单，不必全量加载。

## learner-adaptive-requirement-communication · 面向跨领域读者的需求说明与理解门槛
- 触发：读者有工程经验但对业务域或目标技术栈陌生，或代码已完成但仍不能复述业务主线、实体、数据权威与失败结果。
- 摘要：首次以一页为信息入口而非压缩硬门槛，先给目标、3—7步主线、关键对象/状态、一个重要失败和关键未知；先补事实再按五维验证，必需因果仍遗漏时不得通过。
- 限制：单案例 candidate；三个可比任务仅触发限定任务族复核；不替代事实所有者、真实接口和生产验证，不把AI/员工产出记为用户能力。
- 状态：candidate；索引核对日：2026-09-22；Owner：backend-training-architect；Contributors：product-manager、frontend-expert、backend-expert。
- 详情：[learner-adaptive-requirement-communication.md](learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## verifiable-work-evidence-ledger · 可验证工作的证据账本
- 触发：跨岗位协作、模型或工具调用、完成/验收声明、外部副作用。
- 摘要：分开执行、证据、业务终态、发布与授权五个正交状态；每个完成主张绑定同层证据，unknown 不用猜测填平。
- 限制：仅为 reviewed_case；不规定统一工具、SLA 或签核链，不证明生产能力或返工已经下降。
- 状态：reviewed_case；索引核对日：2026-09-18；Owner：chief-of-staff；Reviewer：test-expert。
- 详情：[verifiable-work-evidence-ledger.md](verifiable-work-evidence-ledger.md)；sha256:74cfadd23db6f952fd410617357700ca8a0b56642e3a526e4c694420786d109d。

## project-context-first-delivery · 项目上下文优先交付
- 触发：首次介入陌生项目、跨模块改动或可能复用既有资产时。
- 摘要：先建立与目标相连的入口、边界、通用资产、契约、验证与 unknown 地图；优先复用，再新增抽象。
- 限制：仅为 candidate；不是全库阅读，不替代用户需求、实时系统事实、权限或生产验证。
- 状态：candidate；索引核对日：2026-09-16；Owner：chief-of-staff；详情：[project-context-first-delivery.md](project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## experience-internalization-v2 · 学习经验内化与迁移决策架构
- 触发：把复盘、培训或岗位经验用于新任务，或准备声明能力提升。
- 摘要：用三分身提取、质疑和迁移；责任/证据/执行/发布分层，unknown 阻断无证据外推。
- 限制：仅为 reviewed_case；本轮执行是 simulated，不证明生产能力或真实系统已实现统一状态模型。
- 状态：reviewed_case；索引核对日：2026-09-13；Owner：chief-of-staff；Reviewer：test-expert。
- 详情：[experience-internalization-v2.md](experience-internalization-v2.md)；sha256:87a43b850fb96fbc082118a67e9f6d9c26b171e457b29b6a0c645bc7c6fa2502。

## research-source-governance · 资料来源治理
- 触发：读取历史资料来源评分、交叉验证方法或模型例子。
- 摘要：本卡只保留历史线索；现行规则唯一入口是 COMPANY.md 的“现行来源治理”章节。
- 限制：状态 stale；旧统一评分、强制排除清单、来源名单和模型例子不具执行效力；授权与专业核验边界仍按现行规则执行。
- 状态：stale；索引核对日：2026-09-22；Owner：ai-engineer。
- 详情：[research-source-governance.md](research-source-governance.md)；sha256:f9b26760a457191e5a9e8c3bbd305d642e7b3d2df7eab956fe499645633cff3b。

## 2026-09-09-ai-delivery-principles · AI交付历史原则
- 触发：AI交付、用户控制、来源说明。
- 摘要：保留用户控制、可追溯性和不确定性；质量与控制指标分别定义。
- 限制：2026-09-09历史指导，现行交付政策优先；不据此扩权。
- 状态：stale；索引核对日：2026-09-11；Owner：chief-of-staff。
- 详情：[2026-09-09-ai-delivery-principles.md](2026-09-09-ai-delivery-principles.md)；sha256:f2ddee4fbeaca42c072e67f21ea8d14ef36112af498c7e104f754f83e55122a8。

## 2026-09-09-mephisto-author-review · 作者评审历史快照
- 触发：mephisto作者样本、导师适配。
- 摘要：只引用当时抽样证据，授课回原代码与课程事实源。
- 限制：不是职级事实或全库质量认证；版本过期必须复核。
- 状态：stale；索引核对日：2026-09-11；Owner：backend-training-architect。
- 详情：[2026-09-09-mephisto-author-review.md](2026-09-09-mephisto-author-review.md)；sha256:9f91fed860adc4fe0f8bcc382a09c8c158e3fa11132c30d3f9a2f3f18ee80230。

岗位知识按 employees/<role>/MEMORY.md 定向检索；治理与安全必读规则不受本目录状态影响。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败时的培训案例复用。
- 摘要：用户用自然语言提出目标，由AI内部梳理；恢复已有授权，核对设计实例与真实交接，分开视觉、功能、Mock和接口证据，停止无新证据重试。
- 限制：仅为三组执行者覆盖八岗的受指导案例演练；不证明生产提效，不扩大授权，不要求用户填写简报。
- 状态：reviewed_case；更新时间：2026-09-16；Owner：chief-of-staff；详情：[培训记录](../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## c2c-orchestration-route · C2C 编排与平台集成路线
- 触发：新任务选择执行通道、新增平台/模式、或评估 C2C 是否升级为插件/MCP 时。
- 摘要：维持"规则+技能映射+登记表加行"，不采用 MCP server 升级（暂缓）；平台按 (平台,模式) 登记、未知标 unknown，C2C 仅执行通道不豁免任务治理。
- 限制：治理决策非经验结论；MCP 暂缓仅在规则映射失效时再评估；平台登记只填已核实事实。
- 状态：verified_context；索引核对日：2026-09-24；Owner：chief-of-staff。
- 详情：[c2c-orchestration-route.md](c2c-orchestration-route.md)；sha256:a613c45f71362cc478297dc84fa12d6015716ec74d1f6abde40724000d9f45d3。
