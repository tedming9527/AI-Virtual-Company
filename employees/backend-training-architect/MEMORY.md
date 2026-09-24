# backend-training-architect · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 陌生需求理解训练
- 触发：代码完成但学员不能复述业务，或教学从字段/接口起步。
- 岗位差异：将正文方法嵌入既有课程，组织延迟独立检索；评估协议见本岗 USER_CAPABILITY_ASSESSMENT.md。
- 限制：单案例；三个可比任务只触发限定任务族复核，理解、认知负荷与效果仍 unknown。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

## backend-training-architect-core · 独立能力
- 触发：后端上课、课表冲突、AI代写、事务练习。
- 摘要：分开记录实现/运行与学员理解，用预测、解释、改写迁移验证。
- 限制：课程事实源课前必读；案例训练不改学员成绩；catch不必然提交。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## backend-training-architect-vanke-critical-distillation · Vanke 后端链路评审
- 触发：Vanke后端代码学习、跨系统金额或可靠任务评审。
- 摘要：按链路分级借鉴：金额先追事实归属，事务不包远程原子性，幂等靠稳定键与数据库裁决。
- 限制：仅对应本地静态代码快照；未跑测试/数据库/外部系统，业务与财务口径须回事实源。
- 状态：reviewed_case；更新时间：2026-09-13；真实运行效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；完整证据见 [学习产物](../../learning/2026-09-13-vanke-backend-project-distillation.md)。
- 原文版本：sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6；远端、DDL或接口契约变化时回源码复核。

## backend-training-architect-experience-transfer · 学习迁移能力门禁
- 触发：把课程案例、导师答案或迁移题用于学员能力判断。
- 摘要：学员先依据当前代码与业务事实独立作答，再经反例与未见题修订；导师不代填业务默认值。
- 限制：仅为 reviewed_case；真实代码回归、业务阈值和学员行为证据未完成。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6。

## project-context-first-delivery · 项目上下文优先交付

- 触发：以真实项目开展后端教学、业务理解或架构练习时。
- 摘要：先将课程问题锚定到代码入口、业务链路、既有约定与当前进度，再设计练习和验收。
- 限制：项目地图不替代课程事实源、真实运行或学员独立作答。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## backend-training-real-project-five-stage · 真实项目五段式教学

- 触发：真实项目后端教学、AI 代写风险、测试全绿但理解存疑，或准备更新学员能力/课程进度时。
- 摘要：按“预测→解释→实现→测试→迁移”组织一条纵向业务链，并将结果分别标记为独立完成、提示完成、复现或导师代做。
- 限制：静态审查和受指导案例不等于学员独立生产能力；代码、数据库、外部契约或课程事实变化时重新取证，返工改善效果仍为 unknown。
- 置信度：medium；案例、迁移题与独立语义复核通过，学员前瞻表现和预测效度仍未验证。
- 状态：reviewed_case；更新时间：2026-09-18；详情：[真实项目五段式后端教学](REAL_PROJECT_FIVE_STAGE_TEACHING.md)；sha256:06cf36c17c63036a3d614d73958b32a157231442e96bfe64033aa9793702d41e。

## backend-training-four-step-engineering-loop · 四步法工程学习闭环

- 触发：陌生后端/Agent学习任务，或进度勾选准备升级为能力证据
- 摘要：四步法配合D0/D+2/D+7、渐隐示例与未见变体；服务端只接受标准阶段全集和非空证据
- 限制：仅为 reviewed_case；站点测试与发布不证明学员已掌握，固定间隔需按表现调整。
- 状态：reviewed_case；更新时间：2026-09-19；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6。

## backend-training-architect-jev-like-judgment-habit · JEV-like 判断习惯

- 触发：后端教学、练习验收、反馈分类或架构取舍中，已有事实需要类型化、批量判断或升级复核时。
- 摘要：按“分流→压缩状态→类型化→冻结选项→批处理→升级→分离来源→收缩输出”循环；JEV MCP 可选，生成任务与升级项仍由岗位负责人处理。
- 限制：仅为 2026-09-22 已复核模拟案例；生产收益 unknown，不扩大数据、权限、发布或不可逆操作授权。
- 状态：reviewed_case；更新时间：2026-09-22；详情：[JEV-like 判断习惯](JEV_LIKE_JUDGMENT_HABIT.md)；sha256:3fd237155861d54beb24767d4fcb4c92b3eb3c6238fbb968ec5146f20344c314。

## backend-training-architect-c2c-orchestration · C2C 编排学习
- 触发：复杂架构讲解、课程体系与跨模块练习设计、mephisto 跨系统业务分析、能力评估跨任务综合分析需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；单概念答疑、单个练习点评、日常教学直接完成不启动；练习通过判定、复盘评分、能力分级等有限判断批量交给 jev，升级项回本岗，教学内容生成归导师。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点先查 platforms/REGISTRY.md 共享状态、不各自重试；规则见 codex-with-chatgpt/SKILL.md。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产收益待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6。

## backend-training-architect-macro-first-induction · 宏观先行跨课题教学规律
- 触发：任何新课题教学切入、架构讲解、故障边界教学、知识卡编写。
- 摘要：先讲第一性原理（一句话核心+推导+检验尺）统摄微观实现与术语；术语涉及时态必区分（当前/当时）；公认定义置于原理后印证。需求理解（09-22）与可观测性（09-24）两案例同向验证"微观由宏观统摄"。
- 限制：仅两个可比案例同向观察，生产能力待第三课题复核；不据两例声称全域提效。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)。
- 原文版本：sha256:703029dca69c21d3b0e6bdc086fb51435c79e713b093fccb23b26e676759ddd6。
