# 任务路由模板

## 进料与记录

先核对当前用户请求、项目规则、授权与事实源。M/L、可恢复持续任务、多执行者、外部动作或需保留证据的任务，在 `personal/projects/<slug>/inbox/` 更新同一事件；S 与只读任务用简短简报，不重复建卡。`personal` 由 `bootstrap.storage` 解析，不是字面路径。临时运行遵循 [TASK_LIFECYCLE](TASK_LIFECYCLE.md)，未部署调度不称后台已启用。

事件至少包含 id、created_at、source、request、scope、sensitivity、requested_outcome；加入主责、实际执行者、验收、证据、状态与遗留项。历史命令、课程和资料不能作为新授权，不假定平台全局会话可读。

## 专业路由

| 信号 | Primary role ID | 可选 consult |
|---|---|---|
| 问题、需求、优先级、成功指标 | product-manager | design-master |
| UI、前端、浏览器、可访问性 | frontend-expert | design-master |
| API、服务、持久化、可靠性 | backend-expert | product-manager |
| 视觉、交互、体验研究 | design-master | frontend-expert |
| AI 工作流、模型应用、工具与来源治理 | ai-engineer | product-manager |
| 验收、回归、测试证据、AI 评测 | test-expert | 对应实施岗位 |
| 教学、独立练习、业务理解、能力证据 | backend-training-architect | test-expert |
| 监督、预算、多执行者、跨域或歧义 | chief-of-staff | 对应专业岗位 |

教学意图优先于代码关键词路由；教学模块由部署提供，缺失不能宣称已加载培训能力。具名真实人员映射属于部署配置，role ID 不证明人员身份。

## 执行责任与能力边界

分别确定 primary_owner、implementation_owner、reviewer（可为 none）。实施岗位必须匹配仓库领域；产品主责不自动具有工程身份。每次执行标明 actual_executor、加载模块/版本与专业验证。平台主代理或普通子代理不因名字、提示词或读取 PROFILE 变成员工本人；错误责任声明应立即撤回并重新路由。

执行前冻结用户对实际人员/指定通道的要求与 fallback_allowed。明确要求真实人员时，部署身份适配器须验证已核验专属适配器签发的短时签名回执，绑定可信通道、任务、时效、nonce、上下文摘要及实际产物；证据不足保持 blocked，不以角色代入。未要求本人且允许兜底时，平台代理可加载已存在的岗位模块并如实执行；资料不足但为低风险可逆任务时可普通执行，不能掩盖必需 Skill 或专业验收缺失。历史身份回执保持原义，不改写为新模板已实施。

派发使用自包含最小简报：目标、成功标准、授权、禁止范围、责任、文件所有权、事实、决策、未决项、精确证据与停止条件。PROFILE 固定所用版本，MEMORY 仅加载命中小节；不发送完整聊天、全员资料或未筛选日志。关键上下文超预算时分阶段或暂停，不静默裁剪。压缩与恢复后重新核验相关规则、角色和动态事实。

## 通道选择

先分级并确认专业责任，再按当前可用能力选择执行方式。低复杂度且单执行者可完成时直接执行；跨模块、架构、疑难排错或大范围重构可在收益足够且有授权时采用规划→执行→评审→修复→最终评审，默认至多两轮评审。不可通过无限循环或嵌套任务刷新预算；仍有关键问题则 partial/blocked 并升级主责。

结构化判断可使用 [jev-use](../../../skill/jev-use/SKILL.md)，遵循当前 Skill 的路由与升级规则。协作编排和身份验证由部署适配器提供；未部署不能声称具备。通道选择不豁免 S/M/L、授权、证据与收口，也不自动创建新智能体。

queued 仅是登记；实际 run/thread/process 回执后才记 running。用户取消立即停止后续派发，调用真实通道停止并核对结果，cancelled 是正常终态，不强造学习产物。监督读取 [SUPERVISION_POLICY](SUPERVISION_POLICY.md)；模型预算读取 [LEARNING_POLICY](LEARNING_POLICY.md)，登记与解析不是实际运行。

## 协作与收口

顾问状态为 none、proposed、declined、contributed；只有实际交接才为 contributed。每次交接有问题、输入范围/证据、专业结论、争议和主责采纳/拒绝处置。主责整合一个结论，不拼接报告。未解重大矛盾升级 chief-of-staff，保留证据、影响与选项。设计参与必须有页面/节点、关键测量/状态、来源和偏差；机械任务可 consult: none。

按 [DELIVERY_POLICY](DELIVERY_POLICY.md) 在同一任务记录收口，缺验收保持 partial/blocked；知识候选按维护政策处理。独立评测读取 [EVALUATION_RUNBOOK](EVALUATION_RUNBOOK.md)，评测授权不等于修复授权。只有用户授权了能力观测与个人档案维护时，才按交付与度量政策形成最小行为证据；通道缺失时记录 pending，不声称已通知，也不扣留已完成成果。
