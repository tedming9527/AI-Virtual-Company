# 外部学习科学与能力发展审计 · r1 复审

归档说明：以下完整报告在结论形成之后，按父任务另行授权写入本文件；归档不改变固定 r1 快照、manifest、独立 AI 身份、审计范围或已形成结论，也未修改被审文件。

结论：LRN-M1—M5/L1 中，5 项在规则层面已修复，1 项部分修复，未发现回退。可以按修订后的方法继续试行；本轮不能证明用户理解改善、认知负荷下降、14 小时安排可持续，或能力已经提升。

审计人：许知衡 · 外部学习科学与能力发展审计师。独立 AI 角色，非公司员工、现实人类或监管者，不提供无偏认证。

## 范围与证据边界

- 日期：2026-09-22。
- run_id：`2026-09-22-company-capability-ai-efficiency-v1`。
- 固定快照：`/private/tmp/ted-company-audit-r1.9n3TCf`。
- `MANIFEST.tsv` SHA-256：`aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde`，与委派值一致；162 个清单文件的内容哈希全部匹配。
- 已完整读取 r0 学习审计、r1 共用需求说明、导师 TEACHING_PLAYBOOK／USER_CAPABILITY_ASSESSMENT／MEMORY／KNOWLEDGE、四周计划、METRICS、能力档案、市场来源登记，以及产品、前端、后端、设计、测试的 PROFILE／MEMORY／SKILLS 入口。另核对了导师五段式教学与下一课接手卡。
- 未读取实时公司源，未修改文件，未运行教学或更新学员状态。本轮证据为文件完整性检查与独立模型语义复审，不是课堂、fixture、真实项目或用户学习效果验证。
- 本轮不新增学习科学定律或效果推断，因此未追加外部研究来源；r0 所列研究不被用于认证整套方案。

下文 `fixed` 仅表示原发现的规范缺口已闭合；效果未知不会被改写成“有效”，也不会单独被用来否定规则修复。

## 逐项复核

| 发现 | Verdict | r1 复核结果 |
|---|---|---|
| **LRN-M1：稳定能力归因过宽** | **fixed** | 两次只报告同向观察；三次仅触发复核，最多支持限定任务族、相同条件下对下一任务的初步预测，并要求核对后续结果。一次真实验收只确认该次范围；数量明确属于管理约定。[能力评估协议](/private/tmp/ted-company-audit-r1.9n3TCf/employees/backend-training-architect/USER_CAPABILITY_ASSESSMENT.md:34)、[METRICS](/private/tmp/ted-company-audit-r1.9n3TCf/METRICS_POLICY.md:27)口径一致。 |
| **LRN-M2：陌生领域诊断与通过门槛混同** | **fixed** | 已明确“短诊断不计失败 → 补必要事实／完整最小例 → 用户解释 → 延迟独立检索”。缺事实归需求缺口；不要求猜业务，也不据此重讲熟悉的编程基础。[共用说明](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/learner-adaptive-requirement-communication.md:37)、[带教约定](/private/tmp/ted-company-audit-r1.9n3TCf/employees/backend-training-architect/TEACHING_PLAYBOOK.md:11)及岗位入口一致。 |
| **LRN-M3：分层说明变成全量清单** | **fixed** | 首次呈现限定为目标、主线、关键对象／状态、一个重要失败与关键未知；六层转为内部核对，已有上下文链接复用，异常先判适用性，再按风险展开，机械改动免全套。[共用说明](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/learner-adaptive-requirement-communication.md:35)已实现 r0 建议。内部执行成本是否降低仍未知。 |
| **LRN-M4：时间调整与末周复习不闭合** | **fixed** | D0 以实际学习日计；核心误解先缩小切片、纠错、暂停辅线，再改期迁移。W4 消费者幂等自身 D+7 明确为下一周期 `pending`，替换已有复盘并登记移出事项；W4 RAG 若为新主题也同样处理。[计划](/private/tmp/ted-company-audit-r1.9n3TCf/output/2026-09-19-career-market-and-learning-plan.md:57)、[跨周期安排](/private/tmp/ted-company-audit-r1.9n3TCf/output/2026-09-19-career-market-and-learning-plan.md:100)没有将计划日写成完成日。 |
| **LRN-M5：缺少共同判据** | **partial** | 五维、不设总分、四种状态、关键错误预先指定、初答保留、核心语义来源与提示分级均已补齐。但“部分＝缺必需关系”和“理解通过”之间仍有一个较小执行歧义，见下文。[共同判据](/private/tmp/ted-company-audit-r1.9n3TCf/employees/backend-training-architect/USER_CAPABILITY_ASSESSMENT.md:42) |
| **LRN-L1：数量门槛被理解为统计保证** | **fixed** | 100 条、每方向 20 条、三期同向已明确仅为管理采样／复核目标；配额不自动提高置信度，三期只称同向观察。市场登记为历史表述提供了明确的现行解释，计划与 METRICS 同步。[市场登记](/private/tmp/ted-company-audit-r1.9n3TCf/memory/learner/MARKET_SOURCE_REGISTRY.md:10)、[计划规则](/private/tmp/ted-company-audit-r1.9n3TCf/output/2026-09-19-career-market-and-learning-plan.md:115) |

LRN-M5 的剩余问题属于 **Low 级语义歧义**，未发现实际误判。协议将“缺必需关系”定义为“部分”，但通过条件主要要求没有关键因果错误、关键未知处置合理、必需维度已观察。于是，一个遗漏必需关系但未说出相反结论的答案，可能被一位执行者判为通过，另一位判为待补证。[共用正文](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/learner-adaptive-requirement-communication.md:121)也保留了这种读法。

这里需要澄清的是必需因果是否覆盖，不需要增加总分，也不应要求所有任务都完整考察五维。

## 用户适配与执行负担

**岗位说明已经优先考虑用户的实际起点。** 文档把“多年工程经验”“当前业务熟悉度”“后端学习阶段”分开：采用用户自述的前端经验设计入口，同时保留具体能力尚待验证的边界。这允许省略已熟悉的组件基础，又不把前端经验直接外推成采购业务、服务端权威或后端可靠性知识。

| 岗位 | 已落实的适配 |
|---|---|
| 林知夏 · 目标规划官（Product Manager） | 先讲目标、角色、主线与未知，借页面／请求经验搭桥；缺事实不降格编程能力。[入口](/private/tmp/ted-company-audit-r1.9n3TCf/employees/product-manager/MEMORY.md:5) |
| 周启明 · 体验工程官（Frontend Engineer） | 从熟悉的交互与请求映射到业务实体，省略组件基础；明确页面、按钮与 Mock 不能证明服务端事实。[入口](/private/tmp/ted-company-audit-r1.9n3TCf/employees/frontend-expert/MEMORY.md:5) |
| 陆行远 · 可靠服务官（Backend Engineer） | 在 DTO／字段前说明实体、状态和权威；区分正常空列表、业务拒绝与未知终态，可靠性细节随风险展开。[入口](/private/tmp/ted-company-audit-r1.9n3TCf/employees/backend-expert/MEMORY.md:5) |
| 苏映雪 · 信任设计官（Design Master） | 一页作为说明入口，不能因视觉简化隐去状态、权威和失败；明确一页不是压缩硬门槛。[入口](/private/tmp/ted-company-audit-r1.9n3TCf/employees/design-master/MEMORY.md:5) |
| 顾清妍 · 质量测试工程师（Test Expert） | 检查裁剪后的必要语义与验证，使用共同五维；缺事实不归因学员，结构检查不冒充学习效果。[入口](/private/tmp/ted-company-audit-r1.9n3TCf/employees/test-expert/MEMORY.md:5) |

**本轮不只是把清单移到内部。** 它同时改变了说明顺序、诊断归因、异常展开方式、共同上下文复用与机械任务豁免。用户不再被要求先理解全部字段或学完所有异常，才能继续当前任务。

但内部六层核对、八类异常适用性、写操作约束和五维记录仍有执行成本。文档尚不能证明这些成本会被复用机制抵消，也不能证明首次一页减少了用户补讲时间。应继续记录现有规则要求的实际分钟和移出事项，不把内部化本身当作提效证据。

**一主两辅与 10+3+1 可以保留。** 四周安排实际只启用当周一条辅线，短视频复用 W1 业务故事；主线受阻时辅线暂停。14 小时及各环节分钟数均已标为待校准的上限，没有被包装成研究确定的最优配比。[四周计划](/private/tmp/ted-company-audit-r1.9n3TCf/output/2026-09-19-career-market-and-learning-plan.md:53)

三个可比真实任务仍待选择；token、可观测性与 RabbitMQ 不被直接当成三个可比样本。三任务只能校准方法并形成有条件的下一任务预测，不能计算因果提效或宣称稳定能力。这一边界应继续保留。

## Round 2 最小建议与停止条件

建议只做以下两项，不扩建评估体系：

1. **补齐 LRN-M5 的通过条件。** 在现有共同判据中明确：本题预先确定的必需因果关系尚有遗漏时，记“部分／待补证”；补齐前不记理解通过。非关键扩展信息不应被列为必需关系。不增加总分、字段或独立表单。
2. **统一“一页”的语义。** 将设计入口已经写明的“一页是入口，不是压缩硬门槛”上提到共用正文；必要语义超出时分步展开，不以压缩文字或隐藏重要未知满足版面限制。这是局部一致性优化，不是重新打开 LRN-M3。

不应修改的部分：

- 一主两辅、当周唯一辅线与 10+3+1 上限；没有实测依据，不重新分配固定配比。
- 先补事实再评、风险相称的真实验证、初答与提示记录、理解／实现／运行／生产效果分账。
- AI／员工产物不计作用户实现能力；职责清单不构成能力认证。
- 共用知识的 `candidate` 状态、正式市场样本 `0/100` 与个人市场价值 `unknown`。
- W4 D+7 的 `pending`；未真实发生的教学不得补记完成。
- 历史失败及已明确被现行解释取代的旧记录，不为整齐而覆盖。

两项局部复核后即可结束本轮文档整改，不追加模拟题来补齐用户能力。r0 已公开的保留题最多用于规则回归，不能再当作用户未来的未见题。

目前用户实际认知负荷、14 小时可持续性、延迟保持、未见迁移、跨岗位评分一致性、后端独立交付、净管理成本及真实求职影响，均保持 **unknown**。这些结论需要下一次真实教学或任务中的用户本人表现，不能由本报告替代。
