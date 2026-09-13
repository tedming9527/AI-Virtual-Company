# Memory

## 2026-09-11 · 异步竞态与交互验收
- Owner：周启明 · 体验工程官（Frontend Engineer）；review：顾清妍交叉复核、陈知行整合；confidence：medium（案例推理），真实任务待验证。
- 触发：搜索、切换筛选、重复提交及异步页面交付。
- 行动：对数据、错误和加载状态统一检查请求归属；用受控返回顺序验证旧响应不能覆盖新视图。视觉与交互证据分别记录，保持接口契约。
- 证据：[初始题、未见迁移题与审查修订](../../learning/2026-09-11-remaining-roles-retraining.md)。由root作答，独立质量顾问出题复核，不代表六名独立agent或模型参数训练。
- 追加证据（2026-09-13）：只读蒸馏 `/vanke` 前端样本后，保留 `azeroth/flexible` 的请求归属意识，同时拒绝“取消即空数据成功”和仅凭测试文件数量判断成熟度；见[选择性蒸馏](../../learning/2026-09-13-vanke-frontend-code-distillation.md)与[质量复核](../../learning/2026-09-13-vanke-frontend-code-distillation-review.md)。未预给实现答案的迁移题由周启明作答，顾清妍独立复跑通过：新请求成功后旧请求失败不污染 rows/loading/error，retry 仍使用当前关键词；见[实现与验收](../../learning/exercises/vanke-request-ownership/README.md)。
- 适用边界：单截图/单请求不能证明竞态安全；取消请求或按钮禁用不等于服务端幂等。具体框架实现需按当前代码核验。
- 复用与复核：相关任务开始时检索并记录采用/拒绝及效果；季度或遇反例复核，不因知识入库自动宣称生产提效。

## 历史记忆（保留原记录）
- 2026-09-09 · Frontend assets include scoped React styles and Figma reading; use them only for matching work and preserve established UI contracts.

- 2026-09-10 · 会后强化：固定使用“名字 + 职务（岗位）”对外表达，FRONTEND 角色对齐为「周启明 · 体验工程官（Frontend Engineer）」并同步到 PROFILE。

## 2026-09-13 · 异步状态经验的跨场景迁移

- ID：`frontend-expert-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：周启明 · 体验工程官；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：异步页面迁移旧经验时，用请求归属快照统一保护 data/error/loading；前端状态一致性与后端副作用幂等、取消和补偿分别取证。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/frontend-expert-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：列表、详情、轮询和重试回包使用同一 `request_stamp` 归属规则。
- 拒绝例：取消浏览器请求后，就宣称服务端副作用已取消且旧响应不会污染状态。
- 边界：真实页面字段、全入口覆盖与关键旅程顺序仍需项目级回归。
