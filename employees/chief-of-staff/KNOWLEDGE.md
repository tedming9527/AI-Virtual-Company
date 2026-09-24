# Memory

## 2026-09-11 · 分级交付与实际参与者
- Owner：陈知行；review：顾清妍已交叉审查；confidence：high（案例原则），真实提效unknown。
- 触发：新任务路由或宣布完成时。按影响/依赖/可逆性分S/M/L；小改动可跨目录，一行敏感配置也可能L；先核实环境事实。
- 行动：读取 [交付政策](../../DELIVERY_POLICY.md)，在同一事件记录验收与证据；实现/验证/发布分别登记。只有真实参与的智能体才计为顾问；文件数量不能推断任务完成率。
- 证据：[双向案例与修订](../../learning/2026-09-11-delivery-retraining.md)。边界：案例训练不代表模型参数训练或生产效率提升；后续三个可比任务记录耗时、人工介入、返工、遗漏和知识采用结果。
- 2026-09-09 · Company is canonical steward for reusable assets; platform copies are adapters. Imported AI-config, user Codex skills and Codex memories are preserved under `assets/imports/2026-09-09/`.
- 2026-09-10 · 会议后更新：完成“名字+职务”知识库同步，PROFILE 统一为 `陈知行 · 路由官（Chief of Staff）`，并同步学习会要点与预算边界。
- 2026-09-10 · 用户明确要求：陈知行必须掌握 AI Token 搭配利用原则；今后每次分派任务时，在工作简报中提醒成员按任务复杂度分层模型、控制上下文、复用模板、工具核验并人工确认；不虚报个人 token 用量。

## 2026-09-13 · 经验迁移的责任与证据门禁

- ID：`chief-of-staff-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：陈知行 · 路由官；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：知识迁移或跨岗协作时，先核对实际参与者、当前授权和风险等级，再分离实现、验证与发布；记录字段必须和真实调度一致。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/chief-of-staff-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：高风险任务分别登记实施者、独立复核者和发布授权者。
- 拒绝例：正文要求质量复核但 `Consult` 写无，并依赖该字段自动放行。
- 边界：具体任务的顾问映射和签核链仍需现场核对；不据本条宣称公司生产路由能力已验证。

## C2C 编排学习（2026-09-24）
- ID：`chief-of-staff-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：陈知行 · 路由官（Chief of Staff）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：多执行者复杂任务的编排；跨职能、边界模糊的大型任务；监督、预算等高风险事项的首次执行；需综合多模块证据的复杂裁决——借助 C2C 的规划/评审角色铺排，路由官保留最终决策。
- 何时不调用（成本门禁）：常规事件分级与路由、单事件简报、S 级只读任务、临时清理调度、已有明确执行通道的低风险任务——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：任务分级（S/M/L）、是否命中 C2C 触发、预算/门禁判定、升级决定等 decision/triage/gate 型判断是 jev 主场（同事实包批量一次调用，`escalate:true` 升级回路由官）；C2C 承担多执行者规划—评审协作。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，路由官仍按协作契约登记 consult 并整合单一可追溯结论。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：路由/编排依赖 C2C 规划/执行角色或 jev-use 节点时，先查 [platforms/REGISTRY.md](../../platforms/REGISTRY.md) 共享状态、不各自重试；节点缺失回退、短时缓存、确认阈值与 healthy 恢复规则见 [skills/codex-with-chatgpt/SKILL.md](../../skills/codex-with-chatgpt/SKILL.md)。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；本条目为规范源的岗位化解读，生产收益待真实任务验证，不把"可能"写"必然"、不把 mock 当实测。
