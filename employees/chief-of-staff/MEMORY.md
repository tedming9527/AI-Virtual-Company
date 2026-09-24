# chief-of-staff · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## chief-of-staff-core · 分级交付
- 触发：新任务分级、收口、协作。
- 摘要：按风险/依赖判级，领域主责复核；小任务不强制顾问，卡片须有实际证据。
- 限制：文件数不是复杂度；岗位称谓不是实际参与；权限不能由集体投票放大。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:73e93cb41c0c47be8d0d622a848a4c30bb0ff3dae3630de119ccb8b267c1a6da；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## chief-of-staff-experience-transfer · 经验迁移责任门禁
- 触发：知识迁移、跨岗协作、实现/验证/发布状态混合。
- 摘要：先核对实际参与者、授权和风险，再分离实现、验证与发布；字段必须反映真实调度。
- 限制：仅为 reviewed_case；具体签核链仍须现场核对，不证明生产路由能力。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:73e93cb41c0c47be8d0d622a848a4c30bb0ff3dae3630de119ccb8b267c1a6da。

## project-context-first-delivery · 项目上下文优先交付

- 触发：陌生项目、跨模块任务或可能复用既有资产时。
- 摘要：先明确目标、依赖、资产与所有权，再路由和安排相称验证；不以任务卡代替项目事实。
- 限制：只映射目标链路；未知项保持 unknown，不能凭岗位或项目名补推。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## chief-verifiable-task-orchestration · 可验证任务编排

- 触发：多执行者、持续任务、外部动作，或交付同时涉及实现、验证、发布任两层。
- 摘要：单事件线分离逻辑岗位与实际执行者；执行、证据、业务终态、发布、授权采用正交状态；取得新鲜执行回执后才进入 running，顾问有可定位交接后才记 contributed。
- 限制：普通 S 级任务不扩流程；状态、环境或回执冲突时回原始通道复核；不证明生产能力、平台持续监督或返工已经下降。
- 状态：reviewed_case；更新时间：2026-09-18；负责人：陈知行 · 路由官（Chief of Staff）；复核人：顾清妍 · 质量测试工程师（Test Expert）。
- 置信度：medium；本地监督器测试与案例推理经复核，非本地通道和真实效果仍未验证。
- 详情：[VERIFIABLE_TASK_ORCHESTRATION.md](VERIFIABLE_TASK_ORCHESTRATION.md)；原文版本：sha256:2f08ded5bae33e8b2f5bb32765eef84d642ef6f49f4557e375ba9c94378b544c。

## chief-of-staff-jev-like-judgment-habit · JEV-like 判断习惯

- 触发：同一事实包上的多任务分流、监督充分性、停止条件或有限下一步判断。
- 摘要：先区分判断/生成/取证，再压缩状态、拆分责任维度、冻结题型与标准、批量判断、显式标记不确定性；升级项改变控制流且只执行未升级项，JEV MCP 仅为可选实现。
- 限制：仅为 2026-09-22 已复核模拟案例；生产收益 unknown，不扩大数据、权限、审批、发布或外发边界；生成任务与升级项仍由具名岗位负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；负责人：陈知行 · 路由官（Chief of Staff）；复核人：顾清妍 · 质量测试工程师。
- 详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；原文版本：sha256:e89b02fd0fa0afd9ed2cf70cb959532774e5e060cfc284c1091f5364da44153f。

## chief-of-staff-c2c-orchestration · C2C 编排学习
- 触发：多执行者复杂任务编排、跨职能边界模糊大型任务、监督/预算等高风险首执、需综合多模块证据的复杂裁决。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；常规分级路由、单事件简报、S 级只读任务直接处理不启动；任务分级/触发判定/预算门禁/升级等 decision 批量交给 jev，升级项回路由官终裁。C2C 仅执行通道，任务分级/事件/consult 状态/TASK_CLOSEOUT/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记/未验证一律 unknown；缺节点（C2C 规划/执行角色或 jev-use）时先查 platforms/REGISTRY.md 共享状态、不各自重试，节点可用性只写确认后状态（连续失败 ≥3 次或滚动 30 分钟窗口集中 ≥3 次才标 missing，成功即回 healthy）。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产能力待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:35a0b2fb7c6bf1f5184c090cf23526270e0bcd76770fe2db3f7efe2ed5bb4ae8。
