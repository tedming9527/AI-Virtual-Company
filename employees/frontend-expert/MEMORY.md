# frontend-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## frontend-expert-core · 异步竞态
- 触发：搜索、筛选、乱序响应、重复提交。
- 摘要：以当前请求身份保护数据、错误、加载状态，主动构造乱序验收。
- 限制：取消请求不独自保证正确；按钮禁用不证明服务端幂等。
- 状态：reviewed_case；更新时间：2026-09-13；已通过无框架最小迁移题，生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:f0139e389c9d959fd800980ccb998b92fdf5cd55051874a5aaae0275e4a6ca46；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

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
- 原文版本：sha256:f0139e389c9d959fd800980ccb998b92fdf5cd55051874a5aaae0275e4a6ca46。

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
- 触发：简短需求、继续任务、UI交付或工具重复失败时的培训案例复用。
- 摘要：用户用自然语言提出目标，由AI内部梳理；恢复已有授权，核对设计实例与真实交接，分开视觉、功能、Mock和接口证据，停止无新证据重试。
- 限制：仅为三组执行者覆盖八岗的受指导案例演练；不证明生产提效，不扩大授权，不要求用户填写简报。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[培训记录](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## frontend-design-evidence-state-architecture · 设计证据驱动的页面架构与全状态正确性
- 触发：Figma 驱动的独立页迁移，且包含异步搜索、选择返回、直达入口或多状态组合。
- 摘要：将公司证据账本适配到路由壳、内容区、状态契约和请求归属；设计、代码、浏览器与接口结论分别取证，按风险分层验收。
- 限制：历史项目选择页只作记录层样本；不证明页面已实现、已验收、生产能力形成或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；Owner：周启明 · 体验工程官（Frontend Engineer）；Reviewer：顾清妍 · 质量测试工程师（Test Expert）；production capability：false。
- 置信度：medium；报告案例、迁移题与独立复核通过，真实页面和接口仍未验证。
- 详情：[DESIGN_EVIDENCE_STATE_ARCHITECTURE.md](DESIGN_EVIDENCE_STATE_ARCHITECTURE.md)；sha256:7eee6597d822a6f58e6275da2edf35a0ae998139e083fcd890191c7371c5d0e9；漂移、反例或真实证据冲突时停止采用并复核。
