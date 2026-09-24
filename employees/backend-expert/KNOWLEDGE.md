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

## C2C 编排学习（2026-09-24）
- ID：`backend-expert-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：陆行远 · 可靠服务官（Backend Engineer）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：Spring 架构调整；Redis 并发问题疑难定位；事务问题（跨模块副作用、边界与终态）；性能 Debug；需要 PLAN→EXECUTE→REVIEW 的高风险服务首改。
- 何时不调用（成本门禁）：简单 CRUD、DTO/Mapper 编写、API 字段修改、跑已有测试、格式化——能直接完成就绝不启动 C2C。
- 与 jev-use 组合：build/测试成败、发布就绪、缺陷严重度、迁移处置等可枚举判断用 jev 批量判定（事实在文件/工具输出时由脚本管道进 CLI，`escalate:true` 升级本岗）；C2C 承担跨模块规划—执行—评审循环。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，后端仍按协作契约登记 consult，跨系统终态、幂等与事务取证照常适用。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓，本岗不自行实现 C2C 的 MCP server 集成，未登记通道不猜测可用。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：跨系统取证/排查依赖 C2C 规划/执行角色或 jev-use 判断门前，先查 `platforms/REGISTRY.md` 共享状态、不各自重试；节点可用性只写确认后的状态——连续失败 ≥3 次或滚动 30 分钟窗口内集中 ≥3 次才标 missing，成功即回 healthy，本地存在性检查一次判定（不把"可能"写"必然"）。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；跨系统终态、幂等与事务结论仍须真实下游取证，技能学习不替代实测；生产收益待真实任务验证。
