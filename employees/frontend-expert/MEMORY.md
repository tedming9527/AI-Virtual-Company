# frontend-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 业务—页面—请求说明
- 触发：陌生业务页面涉及新旧分流、多入口、异步状态或后端写契约。
- 岗位差异：以页面/交互/请求映射实体与权威，核对入口出口、分流及请求责任；实现后附业务—代码—请求—验证映射。
- 限制：一次纠正改变主旅程/请求责任或连续两次局部纠正即按正文暂停编码；按钮、Mock、构建及浏览器状态不证明服务端权限、幂等、事务或终态；效果 unknown。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## frontend-expert-core · 异步竞态
- 触发：搜索、筛选、乱序响应、重复提交。
- 摘要：以当前请求身份保护数据、错误、加载状态，主动构造乱序验收。
- 限制：取消请求不独自保证正确；按钮禁用不证明服务端幂等。
- 状态：reviewed_case；更新时间：2026-09-13；已通过无框架最小迁移题，生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:9ddafa56090946e627f26add3ead62f943adb8710ff1959e59ebb0a805b24a28；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## frontend-page-state-validation · 页面状态分层验收
- 触发：页面状态组合多、视觉快速调整、jsdom 页面测试维护成本上升。
- 摘要：UI 状态用受控 Debug 浮板探索，稳定规则用单测锁定，页面或端到端测试只守关键旅程。
- 限制：浮板不能替代业务正确性、竞态、授权或真实副作用验收；生产默认关闭并共用受审 fixture。
- 状态：reviewed_case；更新时间：2026-09-13；真实项目提效待验证。
- 详情：[PAGE_STATE_VALIDATION.md](PAGE_STATE_VALIDATION.md)。
- 原文版本：sha256:7e0c6b818ce20bd7acb33317a858f4612d3906ae2551876844dfbd377e4f943d；漂移/冲突须回原文复核。

## frontend-expert-experience-transfer · 异步状态迁移门禁
- 触发：把请求竞态经验迁移到新页面、写请求或跨系统副作用。
- 摘要：请求归属控制可见状态；外部副作用去重与补偿仍由后端契约证明。
- 限制：仅为 reviewed_case；真实页面字段、全入口覆盖和关键旅程顺序未验证。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:9ddafa56090946e627f26add3ead62f943adb8710ff1959e59ebb0a805b24a28。

## frontend-page-architecture-visual-validation · 独立页迁移与设计实例核验
- 触发：弹窗、抽屉或浮层迁为独立路由页，并需按 Figma 还原。
- 摘要：路由页拥有页面壳、导航和全状态；内容组件只渲染业务区。Figma/UI 设计判断须有设计师实际交接，尺寸以目标实例、截图和标注确认，测试从路由入口覆盖全部状态。
- 限制：来自任务记录的候选复盘；`actual_executor: not_started` 与 `status: verified` 存在冲突，未补原始提交、运行与浏览器证据前不得称真实页面迁移完成；未形成设计师产物不得登记其已协作。
- 状态：candidate；更新时间：2026-09-16；详情：[PAGE_ARCHITECTURE.md](PAGE_ARCHITECTURE.md)。
- 置信度：low；记录层材料可定位，但实现归属与真实运行尚未证实。
- 原文版本：sha256:e51ab80e1dfa7d7082502f127979a30605db24e60dbe464042c20d66552363bd。

## frontend-project-architecture-discovery · 项目介入前的架构地图

- 触发：首次介入陌生项目，或改动涉及路由、页面结构、通用组件、共享逻辑、样式、构建或测试约定。
- 摘要：先定向绘制入口、路由/layout、通用组件、状态/请求、样式和验证链路；优先复用现有边界，再新增抽象。
- 限制：只读目标链路，不全库加载；架构地图不替代需求、接口、设计和真实运行验收；未确认项保持 unknown。
- 状态：candidate；更新时间：2026-09-16；详情：[PROJECT_DISCOVERY.md](PROJECT_DISCOVERY.md)。
- 原文版本：sha256:d1bebfdd85ceb8dd61b2b33d134069e1f1ad4d51a2bfb127355904dacfd8f8c7；漂移或反例须回原文复核。

## frontend-framework-aware-delivery · 框架与系统一致性

- 触发：React/Next 陌生项目的跨页面改动、性能/可访问性审查、通用组件或共享状态的改造。
- 摘要：先复用项目入口、路由、状态/请求层和设计系统；再审查状态完整性、可访问性、响应式、性能与渲染验证，避免平行组件和未测量优化。
- 限制：外部 Skill 不替代目标项目的框架版本、业务接口、设计和真实性能证据；非 React/Next 项目重新判断适用性。
- 状态：candidate；更新时间：2026-09-16；详情：[EXTERNAL_SKILL_LEARNING.md](EXTERNAL_SKILL_LEARNING.md)。
- 原文版本：sha256:0fecd8c4dae4e8869cbab57be95acec1b0f5d86997335327aedba787ca59e1da；外部来源变化或项目反例须回原文复核。

## project-context-first-delivery · 项目上下文优先交付

- 触发：跨模块前端改动，或需与服务、设计、测试共同理解项目边界时。
- 摘要：将入口、路由、组件、状态/请求、样式与验证地图置于公司共用项目上下文中，优先复用既有资产。
- 限制：前端地图仍须回到目标框架、接口、Figma 与实际渲染验证。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## frontend-design-evidence-state-architecture · 设计证据驱动的页面架构与全状态正确性
- 触发：Figma 驱动的独立页迁移，且包含异步搜索、选择返回、直达入口或多状态组合。
- 摘要：将公司证据账本适配到路由壳、内容区、状态契约和请求归属；设计、代码、浏览器与接口结论分别取证，按风险分层验收。
- 限制：历史项目选择页只作记录层样本；不证明页面已实现、已验收、生产能力形成或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；Owner：周启明 · 体验工程官（Frontend Engineer）；Reviewer：顾清妍 · 质量测试工程师（Test Expert）；production capability：false。
- 置信度：medium；报告案例、迁移题与独立复核通过，真实页面和接口仍未验证。
- 详情：[DESIGN_EVIDENCE_STATE_ARCHITECTURE.md](DESIGN_EVIDENCE_STATE_ARCHITECTURE.md)；sha256:7eee6597d822a6f58e6275da2edf35a0ae998139e083fcd890191c7371c5d0e9；漂移、反例或真实证据冲突时停止采用并复核。

## frontend-jev-like-judgment-habit · 前端类型化判断循环
- 触发：已有最小充分事实，需要对构建、测试、无障碍、响应式、性能预算、回归严重度或候选版本下一动作作有限判断。
- 摘要：分开取证/判断/生成与证据类型，冻结题型和门槛后按同状态批处理；低把握、冲突、高风险或工具不可达项升级，未升级项才执行；JEV MCP 可选。
- 限制：仅为 2026-09-22 去身份化模拟案例；生产收益、时延和成本 unknown；不扩大数据或权限，生成、不可枚举与升级项归具名负责人。
- 状态：reviewed_case；更新时间：2026-09-22；Owner：周启明 · 体验工程官（Frontend Engineer）；Reviewer：顾清妍 · 质量测试工程师（Test Expert）。
- 置信度：medium；训练记录、综合报告和独立复核支持方法可复用，但尚无真实生产样本。
- 详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；证据：[前端训练](../../learning/jev-mcp-training-2026-09-22/frontend-expert.md)、[综合报告](../../learning/jev-mcp-training-2026-09-22/REPORT.md)、[质量复核](../../learning/jev-mcp-training-2026-09-22/quality-review.md)；原文版本：sha256:dc2123bff135f0800266d7960b80c69f9e67a6a4f7448694d813482a0075e361；漂移、反例、阈值失准或证据冲突时停止直接采用并回原文复核。

## frontend-expert-c2c-orchestration · C2C 编排学习
- 触发：大型 React 重构、性能疑难定位、状态管理架构调整、跨模块前端改动需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；CSS/简单组件/API 字段修改直接完成不启动；构建/测试等有限判断批量交给 jev，升级项回本岗。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产能力待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:9ddafa56090946e627f26add3ead62f943adb8710ff1959e59ebb0a805b24a28。
