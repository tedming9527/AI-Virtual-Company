# 设计证据驱动的页面架构与全状态正确性

- ID：`frontend-design-evidence-state-architecture`
- 日期：2026-09-18
- Owner：周启明 · 体验工程官（Frontend Engineer）
- Reviewer：顾清妍 · 质量测试工程师（Test Expert）
- 状态：`reviewed_case`
- 置信度：medium（报告案例、迁移题与独立复核）；production capability：false

本条承接公司级[可验证工作证据账本](../../knowledge/verifiable-work-evidence-ledger.md)，只保存前端领域适配，不复制设计岗的节点/变量交接职责。它不证明真实页面已实现、已验收、生产能力形成或返工已经下降。

## 触发

- Figma 驱动的弹窗、抽屉或浮层迁为独立路由页。
- 页面包含异步搜索、选择后返回刷新、直达入口或 loading/empty/error/content 等组合状态。
- 设计、代码、构建、Mock、浏览器与接口证据容易被混写为一个“已通过”结论。

## 稳定行动规则

1. **先建前端证据映射。** 对关键尺寸、状态与行为分别记录设计节点或截图推断、代码位置、浏览器观察、接口回执及 unknown；没有苏映雪 · 信任设计官（Design Master）的可定位交接，不登记设计已协作。截图、构建和 Mock 不能替代节点属性、真实视口或接口事实。
2. **先分职责再拆组件。** 路由页拥有页面壳、导航、直达/返回策略及 loading/empty/error/content；内容组件只处理业务区。实现前定向核对入口、layout、既有组件、状态/请求层与样式边界，只有独立变化原因才新增抽象。
3. **同一请求身份保护完整可见状态。** 用 `requestStamp` 或等价所有权统一约束 data、loading、error 与 retry；旧响应不得覆盖新视图。Abort 只处理传输，不证明服务端取消、幂等或副作用终止。
4. **按风险分层验收。** Debug fixture 探索视觉组合，纯逻辑测试锁定映射、权限和请求归属，路由/端到端测试守关键旅程；真实视口与真实接口各自单列。不是每个小改动都必须启用全部手段。

## 成功案例与反例

**成功案例只发生在证据纠偏层。** 初版成长报告把项目选择页写成“有限成功”，顾清妍指出历史记录的 `actual_executor: not_started` 与 `status: verified` 冲突，且本轮没有代码、测试原始回执、浏览器或接口证据。报告随后降级为“历史任务记录所述的有限正向样本（记录层样本）”，定向复核关闭 held。该案例证明同层证据纠偏流程有效，不证明项目选择页已实现、已验收或设计协作成功。

**反例：** `flexible` 曾把 abort 后的请求转换成空列表成功；视觉上可能出现干净 empty，但业务语义把取消伪装成成功。若旧请求还能改写 loading/error，页面会同时失去数据与错误真值。不得用 AbortController 或按钮禁用替代请求归属和后端契约。

## 适用、禁止与失效边界

- **适用：** 有页面结构迁移、多状态、异步竞态或设计还原风险的前端任务；按任务风险裁剪步骤。
- **禁止：** 不为简单文案/颜色修改强加全套流程；不把截图推断写成 Figma 节点事实；不把测试/构建写成浏览器或接口通过；不以顾问姓名代替交接；不把前端请求取消写成服务端副作用已取消。
- **失效：** 目标项目的路由、容器、状态模型或接口契约与本条假设不同，真实节点/浏览器/接口推翻案例结论，fixture 漂移，或出现请求归属仍无法保持状态真值的反例时，立即停止套用并复核；未确认项保持 unknown。

## 指标与 unknown

- 主指标：`rework_rounds`，只计因不满足已约定布局、状态或行为而退回的轮次；新增需求另记 `scope_changes`。
- 辅助指标：首次报验已验收状态数/必需状态总数。后续三个可比 UI 任务只用于校准基线，不提前承诺下降比例或因果提效。
- Unknown：历史 Figma 节点是否漂移；项目选择页的真实代码、执行者、测试原始回执、浏览器、接口失败态、可访问性及设计交接；本方法的生产效果和长期返工改善。

## 证据

- [前端专业能力报告](../../learning/professional-capability-research-2026-09-18/frontend-expert.md)
- [独立质量复核及 held 关闭](../../learning/professional-capability-research-2026-09-18/quality-review.md)
- [历史项目选择页任务记录](../../inbox/session-events/2026-09-16-project-picker-page.md)
- [独立页架构复盘](PAGE_ARCHITECTURE.md)与[页面状态分层验证](PAGE_STATE_VALIDATION.md)
- [Vanke 前端蒸馏](../../learning/2026-09-13-vanke-frontend-code-distillation.md)及[质量复核](../../learning/2026-09-13-vanke-frontend-code-distillation-review.md)
- [最小度量口径](../../METRICS_POLICY.md)

复核触发：三个可比真实 UI 任务完成、遇到上述失效证据，或来源状态/hash 漂移时重新评审；在此之前保持 `reviewed_case`。
