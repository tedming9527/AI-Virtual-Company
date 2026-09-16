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
- 限制：一次真实项目复盘，不证明长期返工率改善；未形成设计师产物不得登记其已协作；不替代路由、无障碍和接口契约核验。
- 状态：candidate；更新时间：2026-09-16；详情：[PAGE_ARCHITECTURE.md](PAGE_ARCHITECTURE.md)。
- 原文版本：sha256:f1d9adf88b5cdbb89a43bedeade043a75cabba1e30b833dd99d3fb5e84fe1c2e。
