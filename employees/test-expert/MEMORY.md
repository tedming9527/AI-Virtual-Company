# test-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 需求说明与理解证据
- 触发：陌生需求、说明裁剪、理解验收或跨岗证据复核。
- 岗位差异：按正文核对本题必需因果及证据，区分少展示与少验证；理解判据与提示分级回正文。
- 限制：结构、fixture、模型语义与真实项目效果分开；本轮无真实效果证据，保持 unknown。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## test-expert-core · 证据匹配
- 触发：验收、并发、集成、知识成长。
- 摘要：主张与证据范围一致，视觉/行为、本地/远端、mock/真实DB分别验收。
- 限制：构建成功不等于整体功能通过，知识数量不代表实战提效。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:ea855981586f58ea9d14978f03a237442c04319faa0a63946fad029189fa0bf2；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## test-expert-experience-transfer · 同层证据迁移门禁
- 触发：将测试、案例或结构检查结论迁移到新环境。
- 摘要：主张、环境、失败代价、副作用与终态证据必须同层；阶段证据不得替代生产验证。
- 限制：仅为 reviewed_case；真实运行和 unknown 采集枚举未落地。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:ea855981586f58ea9d14978f03a237442c04319faa0a63946fad029189fa0bf2。

## project-context-first-delivery · 项目上下文优先交付

- 触发：介入陌生项目的验收、回归、可靠性或评测任务时。
- 摘要：先识别关键链路、状态矩阵、现有测试层次、mock 边界和可观察证据，再选择验证策略。
- 限制：测试地图不替代真实接口、数据、权限或生产环境证据。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## claim-evidence-gate · 主张—证据同层门禁
- 触发：任何“完成、通过、已验证、可放行”主张。
- 摘要：用主张—风险—环境—证据—结论矩阵保证证据同层；unknown 分 existence/semantics/scope/terminal，再按风险处置并独立判断发布。
- 限制：构建、Mock、截图和案例训练不能外推真实终态或生产能力；返工改善待三个可比任务验证。
- 置信度：medium；案例、迁移题与独立语义复核通过，真实高风险发布门禁效果仍未验证。
- 状态：reviewed_case；更新时间：2026-09-18；详情：[CLAIM_EVIDENCE_GATE.md](CLAIM_EVIDENCE_GATE.md)；sha256:4795426df6087a80e588b61e8e4757e3479277f1f1d397309946229cd1f769f9。

## test-expert-jev-like-judgment-habit · JEV-like 判断习惯
- 触发：验收、回归、可靠性、AI 评测、缺陷分诊、发布放行或任何质量主张，需要在已有事实上快速作可枚举判断时。
- 摘要：顾清妍先压缩主张、风险、环境、同层证据与 unknown，再冻结 `noul/choice/score` 标准并同状态批处理；不可补偿硬风险、低把握、冲突或工具不可达一律升级，机器先验、人工基线与最终裁决分栏记录。
- 限制：仅为已复核合成案例；JEV MCP 可选，生产收益与长期稳定性 `unknown`；工具不扩大数据、权限或授权，生成任务、开放式问题和升级项仍由顾清妍或具名岗位负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；证据：[个人训练](../../learning/jev-mcp-training-2026-09-22/test-expert.md)、[全员报告](../../learning/jev-mcp-training-2026-09-22/REPORT.md)、[独立复核](../../learning/jev-mcp-training-2026-09-22/quality-review.md)；sha256:06a9e09708ee18da296e0903ced94757dc9055e4caac59dcf5b6939e5e4b63f6。

## test-expert-c2c-orchestration · C2C 编排学习
- 触发：跨模块测试策略设计、疑难回归/可靠性定位、AI 评测体系搭建、测试架构重构需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；跑已有测试、新增单用例、简单断言修改、常规冒烟直接完成不启动；build/测试成败、缺陷严重度、发布门禁、回归范围等有限判断批量交给 jev，证据须真实执行、mock 不算实测，升级项回本岗。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产效果待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:ea855981586f58ea9d14978f03a237442c04319faa0a63946fad029189fa0bf2。
