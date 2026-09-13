# Memory

## 2026-09-11 · 跨系统副作用与幂等边界
- Owner：陆行远 · 可靠服务官（Backend Engineer）；review：顾清妍交叉复核、陈知行整合；confidence：medium（案例推理），真实任务待验证。
- 触发：租约恢复、重试、消息消费、跨系统写入或扣款。
- 行动：将领取所有权、本地回写、远端副作用分别验证；同一业务操作的重试保持稳定幂等键，核验对方去重/查询契约。未知结果走有界恢复与对账。
- 证据：[初始题、未见迁移题与审查修订](../../learning/2026-09-11-remaining-roles-retraining.md)。由root作答，独立质量顾问出题复核，不代表六名独立agent或模型参数训练。
- 适用边界：owner/token只保护实际检查它的资源；租约到期不停止旧worker，fencing必须下游执行。未验证外部契约不承诺恰好一次；不在真实业务库做培训故障注入。 沙箱证据不外推生产。
- 复用与复核：相关任务开始时检索并记录采用/拒绝及效果；季度或遇反例复核，不因知识入库自动宣称生产提效。

## 历史记忆（保留原记录）
- 2026-09-09 · Backend assets include Java, Docker/LAN and release workflows. Deployment remains explicit-use and user-approved.

- 2026-09-10 · 会后强化：固定使用“名字 + 职务（岗位）”对外表达，BACKEND 角色对齐为「陆行远 · 可靠服务官（Backend Engineer）」并同步到 PROFILE。

## 2026-09-13 · 跨系统经验的迁移门禁

- ID：`backend-expert-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：陆行远 · 可靠服务官；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：跨系统副作用重试时，分离本地领取权与远端事实；保持稳定业务操作键，使用有限重试、`RetryWaiting`、查询/对账和终态证据，金额异常不默认 0。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/backend-expert-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：扣款超时后复用业务键，先查终态再决定有界重试或人工对账。
- 拒绝例：worker 重领后生成新 requestId 再次扣款，并以本地 owner 写入成功证明远端完成。
- 边界：生产 SLA、无幂等下游 fallback、金额精度与尾差归属仍未知。
