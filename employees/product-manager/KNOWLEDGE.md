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
