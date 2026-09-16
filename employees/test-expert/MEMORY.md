# test-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## test-expert-core · 证据匹配
- 触发：验收、并发、集成、知识成长。
- 摘要：主张与证据范围一致，视觉/行为、本地/远端、mock/真实DB分别验收。
- 限制：构建成功不等于整体功能通过，知识数量不代表实战提效。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:8530d64d823c968f33a8f2b6e153e8d8c56974d724d05ed38bef18742a9199fb；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## test-expert-experience-transfer · 同层证据迁移门禁
- 触发：将测试、案例或结构检查结论迁移到新环境。
- 摘要：主张、环境、失败代价、副作用与终态证据必须同层；阶段证据不得替代生产验证。
- 限制：仅为 reviewed_case；真实运行和 unknown 采集枚举未落地。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:8530d64d823c968f33a8f2b6e153e8d8c56974d724d05ed38bef18742a9199fb。

## project-context-first-delivery · 项目上下文优先交付

- 触发：介入陌生项目的验收、回归、可靠性或评测任务时。
- 摘要：先识别关键链路、状态矩阵、现有测试层次、mock 边界和可观察证据，再选择验证策略。
- 限制：测试地图不替代真实接口、数据、权限或生产环境证据。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败时的培训案例复用。
- 摘要：用户用自然语言提出目标，由AI内部梳理；恢复已有授权，核对设计实例与真实交接，分开视觉、功能、Mock和接口证据，停止无新证据重试。
- 限制：仅为三组执行者覆盖八岗的受指导案例演练；不证明生产提效，不扩大授权，不要求用户填写简报。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[培训记录](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。
