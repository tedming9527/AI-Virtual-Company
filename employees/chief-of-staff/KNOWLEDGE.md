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
