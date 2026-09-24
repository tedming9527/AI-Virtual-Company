# Memory

## 2026-09-11 · 问题定义与效果归因
- Owner：林知夏 · 目标规划官（Product Manager）；review：顾清妍交叉复核、陈知行整合；confidence：medium（案例推理），真实任务待验证。
- 触发：需求方案先行、效果汇报或指标变化。
- 行动：先定义问题、目标指标和护栏，再核验基线、分母、样本可比性。描述性变化与因果效果分开；负向护栏不得被点击率掩盖。
- 证据：[初始题、未见迁移题与审查修订](../../learning/2026-09-11-remaining-roles-retraining.md)。由root作答，独立质量顾问出题复核，不代表六名独立agent或模型参数训练。
- 适用边界：合成数字不是实际项目效果；没有对照或足够证据不声称因果；实验上线需要对应授权。 同类样本匹配不消除全部混杂。
- 复用与复核：相关任务开始时检索并记录采用/拒绝及效果；季度或遇反例复核，不因知识入库自动宣称生产提效。

## 历史记忆（保留原记录）
- 2026-09-09 · Product work should preserve durable evidence and state its verified outcome; task relevance, not automatic injection, determines asset use.
- 2026-09-10 · 会议后更新：完成“名字+职务”知识库同步，PROFILE 统一为 `林知夏 · 目标规划官（Product Manager）`，并补齐学习会对指标与可复用动作的约束说明。

## 2026-09-13 · 迁移决策中的指标口径门禁

- ID：`product-manager-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：林知夏 · 目标规划官；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：用历史经验解释新指标时，固定问题、分母、人群、窗口、剔除规则、护栏与归因边界；任一关键项 unknown 时阻断正式放行。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/product-manager-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：比较转化率前先定义组别、窗口、重复提交去重与风险护栏。
- 拒绝例：成功率上涨就直接放量，而样本结构、并发重复和取消能力未知。
- 边界：统一分母模板、观察窗口和决策状态参数尚未成为生产标准。

## C2C 编排学习（2026-09-24）
- ID：`product-manager-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：林知夏 · 目标规划官（Product Manager）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：大型需求拆解（跨模块、多角色）；复杂技术方案评审；跨角色执行计划编排——借助 C2C 的规划/评审角色，但不替代产品经理，PM 保留问题框架、优先级与成功指标定义。
- 何时不调用（成本门禁）：单一需求澄清、常规优先级排序、指标口径定义、简单方案说明——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：需求分级/优先级（choice）、方案对比结构化判定（score）、计划门禁等可枚举判断用 jev 批量判定（`escalate:true` 升级回 PM）；PRD、方案等生成内容仍归 PM，不交给 jev/C2C 代写。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，PM 仍按协作契约登记 consult，问题框架、优先级与成功指标定义不因走 C2C 而移交。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：复杂方案评审/计划编排依赖 C2C 规划/执行角色或 jev-use 节点时，先查 [platforms/REGISTRY.md](../../platforms/REGISTRY.md) 共享状态、不各自重试；节点缺失回退、短时缓存、确认阈值与 healthy 恢复规则见 [skills/codex-with-chatgpt/SKILL.md](../../skills/codex-with-chatgpt/SKILL.md)。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；本条目为规范源的岗位化解读，生产收益待真实任务验证，不把"可能"写"必然"、不把 mock 当实测。
