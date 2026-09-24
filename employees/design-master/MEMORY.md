# design-master · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 首次说明与可信信息层级
- 触发：为陌生业务读者组织说明、流程图或页面状态。
- 岗位差异：用熟悉的页面/请求衔接业务实体与权威；信息分层不得隐藏必要语义或 unknown。
- 限制：不能把受理画成完成、承诺未证实的撤销/恢复，或用视觉流畅度/总分代替理解；本轮无真实可用性验证，认知负荷与效果 unknown。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## design-master-core · 设计风险
- 触发：不可逆操作、像素还原、反馈、无障碍。
- 摘要：按阶段设计确认/反馈，视觉还原与已知可用性缺陷分开交付。
- 限制：不能承诺系统不支持的取消撤销；已知缺陷不能淡化为未知。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:8020db88d33309176a4de8009c85f51b35b02883931530afadf7cdb4b65b11cc；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## design-master-experience-transfer · 高风险交互迁移门禁
- 触发：不可逆操作、AI 自动执行或取消/补偿能力未知。
- 摘要：采用预览、确认、执行和终态链路；交互承诺不得超出真实系统能力。
- 限制：仅为 reviewed_case；字段空值、焦点、读屏和对比度尚未实测。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:8020db88d33309176a4de8009c85f51b35b02883931530afadf7cdb4b65b11cc。

## project-context-first-delivery · 项目上下文优先交付

- 触发：首次介入项目设计、组件改造或跨页面交互时。
- 摘要：先识别设计系统、已有交互模式、内容层级和无障碍约束，再决定是否新增视觉或组件模式。
- 限制：地图不替代目标 Figma 实例、用户研究或交互验收。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## design-figma-trust-state-evidence · Figma 精确读取与可信状态证据
- 触发：Figma 驱动页面涉及节点、变量、布局、组件多状态或无障碍；高风险动作需要表达终态、取消或补偿能力。
- 摘要：按节点/变量/布局/组件状态/系统能力/无障碍分层建证据账本；未取证保持 unknown，无可定位设计交接时保持 `consult: none`（证据缺口另记 `evidence_state: unknown`）。（2026-09-24 审计修复）
- 限制：项目选择页仅为记录层样本；不证明设计实施、真实协作、生产能力、长期提效或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；Owner：苏映雪 · 信任设计官（Design Master）；Reviewer：顾清妍 · 质量测试工程师。
- 置信度：medium；案例研究与独立语义复核通过，目标 Figma、浏览器和辅助技术仍未实测。
- 详情：[FIGMA_TRUST_EVIDENCE.md](FIGMA_TRUST_EVIDENCE.md)；sha256:0122cc47f0fa69d0988e3903fa3f858c00ca74d8a96c3b8313f6a6b99635db5b。

## design-master-jev-like-judgment-habit · 设计岗位 JEV-like 判断习惯
- 触发：对已取得的交互、风险、系统能力、无障碍或研究事实做可枚举发布处置、证据分级和下一动作判断时。
- 摘要：按“判断/取证/生成分流 → 压缩信任状态 → noul/choice/score → 冻结尺度与设计硬门槛 → 同状态批处理 → 显式不确定性与升级 → 岗位质疑 → 只执行未升级项”循环；JEV MCP 仅为可选判断器。
- 限制：仅为 2026-09-22 已复核模拟案例；生产收益 unknown，不扩大数据或权限；生成任务、升级项及敏感、高风险或不可逆结论仍由苏映雪 · 信任设计官或相应具名负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；Owner：苏映雪 · 信任设计官（Design Master）；Reviewer：顾清妍 · 质量测试工程师（Test Expert）。
- 置信度：medium；八岗训练与独立复核通过，但真实项目、用户、无障碍和长期收益尚未验证。
- 详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；sha256:2db76304d931f023ebb9cb6ec982f6e1e78f6134a40e0057e120689aaf69a77a。

## design-master-c2c-orchestration · C2C 编排学习
- 触发：复杂设计系统搭建/演进、设计→前端实现的大规模 Review、全站/大规模页面一致性检查需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；单页视觉微调、单组件样式、局部 flow、Figma 标注直接完成不启动；一致性判定/设计验收门禁/候选方案选择等有限判断批量交给 jev，升级项回本岗。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产能力待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:8020db88d33309176a4de8009c85f51b35b02883931530afadf7cdb4b65b11cc。
