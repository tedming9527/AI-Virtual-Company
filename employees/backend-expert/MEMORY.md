# backend-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## backend-expert-core · 跨系统幂等
- 触发：重试、远端成功回写失败、租约重领。
- 摘要：业务操作重试保持稳定幂等键，分别检查本地所有权与远端副作用。
- 限制：owner校验仅保护本地；fencing须下游支持；沙箱不证明生产。
- 状态：reviewed_case；更新时间：2026-09-11；生产效果待验证。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；包含原有历史约定，只有相关时读取。
- 原文版本：sha256:4c712f28b498c119af14b31dd1ece6d77f3743614730e79b07548a57418c8f24；漂移/冲突须回原文复核，不能直接执行陈旧摘要。

## backend-expert-experience-transfer · 跨系统迁移门禁
- 触发：跨系统重试、副作用或金额终态未知。
- 摘要：分离本地领取与远端事实，稳定业务键配合有限重试、查询、对账和终态证据。
- 限制：仅为 reviewed_case；生产 SLA、下游幂等和金额精度仍未知。
- 状态：reviewed_case；更新时间：2026-09-13；生产能力 false。
- 详情：[KNOWLEDGE.md](KNOWLEDGE.md)；共用规则见 [experience-internalization-v2](../../knowledge/experience-internalization-v2.md)。
- 原文版本：sha256:4c712f28b498c119af14b31dd1ece6d77f3743614730e79b07548a57418c8f24。
