# ai-engineer · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

2026-09-22 本轮语义复核：辛澈 · AI工程师已对照 Git 基线和案例原件核对以下三条共用正文。前两条保留案例等级，雷达仅保留 2026-09-19 历史环境范围；本轮不重新认证历史运行与当前线上状态。首次失败与修订边界见详情；catalog 同步及独立复核完成前不发布受影响摘要。

## ai-engineer-core · 来源与时效
- 触发：资讯、转载、价格、过期内容。
- 摘要：合并同源转载，区分页面更新/事件/生效日期，保留证据缺口。
- 限制：转载不是独立证据，保留规则不自动授权删除或发布。
- 状态：reviewed_case；更新时间：2026-09-22；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:c3ef51b0b6f5a2a4d5e052f6793e6e263db46583f0b712b55fb9f6e521f82e5b；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## ai-engineer-experience-transfer · 来源与时间迁移门禁
- 触发：迁移 AI 资料结论、模型状态或发布判断。
- 摘要：分开来源独立性、事件时间、页面采样、事实/推断与发布权限；高风险 unknown 只作内部观察。
- 限制：仅为 reviewed_case；页面时间锚点、逐条引用与删除/取消字段仍待核验。
- 状态：reviewed_case；更新时间：2026-09-22；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:c3ef51b0b6f5a2a4d5e052f6793e6e263db46583f0b712b55fb9f6e521f82e5b。

## ai-capability-source-link-radar · AI 能力扩展工具宽进严出门禁
- 触发：发现可能扩展 AI 执行边界或降低使用门槛的仓库、npm 包或社区线索。
- 摘要：20 个多样入口宽进，逐源留痕；实体类型与多入口证据分离；发现覆盖和发布门禁双审计；固定 candidate/hold/pending，用户自行判断。
- 限制：verified_context 仅指 2026-09-19 本地门禁、一次 20 源运行与私有站版本 8 的历史记录；r0 未携带证据，本轮未重新认证运行或线上状态；不证明候选可靠、安全或适合生产；X 未连接，无后台调度。
- 状态：verified_context；更新时间：2026-09-22；Owner：辛澈 · AI工程师；历史 Reviewer：independent-v5；本轮：辛澈 · AI工程师语义自审，独立复核待完成。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；体系见 [AI 能力扩展雷达](../../deliverables/ai-capability-radar/README.md)；sha256:c3ef51b0b6f5a2a4d5e052f6793e6e263db46583f0b712b55fb9f6e521f82e5b。

## project-context-first-delivery · 项目上下文优先交付

- 触发：介入 AI 功能、内容系统、信息管线或模型能力评估时。
- 摘要：先核对来源、数据/内容流、模型调用边界、既有评测与发布约束，再提出改动。
- 限制：地图不替代模型实测、来源核验、账号权限或对外发布授权。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## verifiable-ai-workflow-evidence-ledger · 可验证的 AI 工作证据账本
- 触发：AI 研究、模型/工具比较、Skill 调用、预算监督或涉及外部读写与发布判断时。
- 摘要：来源主张与模型选择、运行回执、Skill 状态、只读发现、授权、写工具回执、结果证据正交记录；外部写入须先 `authority_confirmed`。
- 限制：仅为 reviewed_case；不授予外部操作权限，不证明生产能力、平台能力、个人精确用量或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；Owner：辛澈 · AI工程师；Reviewer：顾清妍 · 质量测试工程师。
- 置信度：medium；真实研究记录与案例推理经复核，真实账号写入、异常恢复和业务终态仍未验证。
- 详情：[VERIFIABLE_AI_WORKFLOW.md](VERIFIABLE_AI_WORKFLOW.md)；sha256:680162f473b516a75ad07a01083f60b121583645a2ee1d41a56b1712d63b14dd。

## ai-engineer-jev-like-judgment-habit · AI 工程岗位 JEV-like 判断习惯
- 触发：对已取得的 AI 模型、工具、来源、迁移或测试事实做可枚举筛选、分级、路由和下一动作判断时。
- 摘要：先走三路轻量入口：确定性事实由程序直出，单项低风险且证据充分由具名主责直接判断，多项同状态且有实质判断成本才进入完整类型化循环；冲突/高风险仍升级，JEV MCP 可选。
- 限制：仅为 2026-09-22 已复核模拟案例；生产收益 unknown，不扩大数据或权限；生成任务、升级项与高风险结论仍由辛澈 · AI工程师或相应具名负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；Owner：辛澈 · AI工程师；Reviewer：顾清妍 · 质量工程师。
- 详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；sha256:eafdc03084c208a3056d5425e926dc866d9df581329a138b0f3dcfda64689826。

## ai-engineer-c2c-orchestration · C2C 编排学习
- 触发：内容系统架构级改动、复杂 AI 主题多源深度核验、大规模内容体系重构、首次搭建选题/核验管线需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；单篇图文稿、简单选题、单条核验直接完成不启动；选题分诊、来源质量与发布门禁等有限判断批量交给 jev，升级项回本岗，对外发布仍须用户逐次批准。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产收益待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:c3ef51b0b6f5a2a4d5e052f6793e6e263db46583f0b712b55fb9f6e521f82e5b。
