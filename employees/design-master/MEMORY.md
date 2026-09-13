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
