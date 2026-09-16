# design-master · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## design-master-core · 设计风险
- 触发：不可逆操作、像素还原、反馈、无障碍。
- 摘要：按阶段设计确认/反馈，视觉还原与已知可用性缺陷分开交付。
- 限制：不能承诺系统不支持的取消撤销；已知缺陷不能淡化为未知。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:777c42704fdcd4d7c88f9a5d7463db5ab55ae29a5f507b58955b4825b5856713；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## design-master-experience-transfer · 高风险交互迁移门禁
- 触发：不可逆操作、AI 自动执行或取消/补偿能力未知。
- 摘要：采用预览、确认、执行和终态链路；交互承诺不得超出真实系统能力。
- 限制：仅为 reviewed_case；字段空值、焦点、读屏和对比度尚未实测。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:777c42704fdcd4d7c88f9a5d7463db5ab55ae29a5f507b58955b4825b5856713。

## project-context-first-delivery · 项目上下文优先交付

- 触发：首次介入项目设计、组件改造或跨页面交互时。
- 摘要：先识别设计系统、已有交互模式、内容层级和无障碍约束，再决定是否新增视觉或组件模式。
- 限制：地图不替代目标 Figma 实例、用户研究或交互验收。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。
