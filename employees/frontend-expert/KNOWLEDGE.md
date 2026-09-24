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

## C2C 编排学习（2026-09-24）
- ID：`frontend-expert-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：周启明 · 体验工程官（Frontend Engineer）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：大型 React 重构（跨多模块、大范围）；性能问题疑难定位；状态管理架构调整（请求归属/状态分层跨页面改动）；需要 PLAN→EXECUTE→REVIEW 的首次高风险改动。
- 何时不调用（成本门禁）：CSS 样式修改、简单组件编写、API 字段修改、改变量名、跑已有测试、格式化——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：构建/测试/无障碍/回归等可枚举的有限判断用 jev 批量判定（同状态一次调用、冻结门槛、`escalate:true` 项升级本岗裁决）；C2C 承担跨模块规划—执行—评审循环，本岗提供前端专业能力。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，前端仍按协作契约登记 consult，构建/无障碍/回归证据与验收不因走 C2C 而减免。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓，本岗不自行实现 C2C 的 MCP server 集成。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：跨模块重构/疑难定位依赖 C2C 规划/执行角色或 jev-use 判断门时，先查 [platforms/REGISTRY.md](../../platforms/REGISTRY.md) 共享状态、不各自重试；节点缺失回退、短时缓存、确认阈值与 healthy 恢复规则见 [skills/codex-with-chatgpt/SKILL.md](../../skills/codex-with-chatgpt/SKILL.md)。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff 决定继续/换方案/找用户；本条目为规范源的岗位化解读，生产收益与提效待真实任务验证，不把"可能"写"必然"。
