# product-manager · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 业务主线先于契约
- 触发：跨端/跨系统陌生业务，或字段清单、代码完成掩盖业务理解缺口。
- 岗位差异：明确目标、角色、范围、主线、实体、权威与验收；字段映射业务节点，关键 unknown 指定责任人与补证动作。
- 限制：缺业务事实先补需求，不降格读者编程能力；纯机械改动不套全框架，必要验证不省；单案例，学习/生产效果 unknown。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## product-manager-core · 效果归因
- 触发：产品目标、指标上涨、需求发现。
- 摘要：先定义问题与护栏，核验分母、人群与样本可比性。
- 限制：点击率上涨不证明因果，同类样本仍可能混杂，实验需授权。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:25d9490fdadcb17db2a4fc59aaaa9c1822357a0b74e2da1697e98ddd0ae85836；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## product-manager-experience-transfer · 指标口径迁移门禁
- 触发：用旧经验解释新指标或决定放量。
- 摘要：固定问题、分母、人群、窗口、剔除规则、护栏和归因边界；关键 unknown 阻断放行。
- 限制：仅为 reviewed_case；统一分母模板和窗口参数尚未形成生产标准。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:25d9490fdadcb17db2a4fc59aaaa9c1822357a0b74e2da1697e98ddd0ae85836。

## project-context-first-delivery · 项目上下文优先交付

- 触发：进入陌生项目、跨页面需求或指标可能受系统边界影响时。
- 摘要：先定位用户旅程、现有流程、成功指标、约束与可复用能力，再定义需求范围。
- 限制：地图不替代用户研究、指标证据或业务授权；未知保持 unknown。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## product-measurable-ai-pilot · 可测量 AI 试点门禁

- 触发：AI 功能准备立项、试点、扩大样本或用指标上涨证明效果。
- 摘要：先固定问题、基线、分母、人群、窗口、护栏与停止条件；关键 unknown 阻断放量，`pilot_note` 仅是非放量观察。
- 限制：阈值由当前试点事实所有者确认；仅为 reviewed_case，不授权实验或发布，不证明生产能力或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；Owner：林知夏 · 目标规划官；Reviewer：顾清妍 · 质量测试工程师。
- 置信度：medium；报告与迁移题经独立语义复核，真实生产效果待验证。
- 详情：[MEASURABLE_AI_PILOT.md](MEASURABLE_AI_PILOT.md)。
- 原文版本：sha256:ca8cebad910b1ef4e2683dfc78755fe6efd3f0213c5c1f97fe8033af4e757021；真实任务出现反例、口径/权限变化或累计三个可比任务时复核。

## product-jev-like-judgment-habit · 产品岗位 JEV-like 判断习惯

- 触发：产品优先级、试点继续/暂停/放量、证据等级、护栏状态或下一验证动作等基于既有事实的判断。
- 摘要：先分流判断/取证/生成，再压缩状态、冻结 `noul/choice/score`、同状态批处理、显式不确定性并升级例外；JEV MCP 可选，未升级项才可执行。
- 限制：仅为已复核模拟案例；生产收益未知，不扩大数据或权限；生成任务、升级项及高风险最终决定仍由具名岗位负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；Owner：林知夏 · 目标规划官；Reviewer：顾清妍 · 质量测试工程师。
- 详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)。
- 原文版本：sha256:aaff0bb5d8aa2765365e47c0fdbad240ee992a263d54015ae4e78c08ed9159e4；出现真实反例、工具/阈值/权限变化或累计三个可比生产任务时复核。

## product-manager-c2c-orchestration · C2C 编排学习
- 触发：大型跨模块多角色需求拆解、复杂技术方案评审、跨角色执行计划编排。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt，PM 保留问题框架/优先级/成功指标；单需求澄清、常规排序、指标口径直接完成不启动；需求分级/方案对比/计划门禁等判断批量交给 jev，PRD 生成仍归 PM。C2C 仅执行通道，任务分级/事件/consult 状态/TASK_CLOSEOUT/能力交接照常适用，PM 不因走 C2C 移交问题框架；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记/未验证一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产能力待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:25d9490fdadcb17db2a4fc59aaaa9c1822357a0b74e2da1697e98ddd0ae85836。
