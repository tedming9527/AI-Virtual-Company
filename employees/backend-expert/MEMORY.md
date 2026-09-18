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

## project-context-first-delivery · 项目上下文优先交付

- 触发：首次改动服务、接口、数据模型或跨系统流程时。
- 摘要：先追踪调用链、数据契约、鉴权、事务/幂等边界与现有服务资产，再实现局部变更。
- 限制：静态地图不证明真实数据或远端行为；接口与权限仍须现场核验。
- 状态：candidate；更新时间：2026-09-16；详情：[公司共用知识](../../knowledge/project-context-first-delivery.md)；sha256:8cbc5a44db2b8f24e0d005bfd529626bd459380756b00f9394c87a3d009b27b4。

## audit-efficient-work-training-2026-09-16 · 审计后的效率培训
- 触发：简短需求、继续任务、UI交付或工具重复失败时的培训案例复用。
- 摘要：用户用自然语言提出目标，由AI内部梳理；恢复已有授权，核对设计实例与真实交接，分开视觉、功能、Mock和接口证据，停止无新证据重试。
- 限制：仅为三组执行者覆盖八岗的受指导案例演练；不证明生产提效，不扩大授权，不要求用户填写简报。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[培训记录](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## backend-cross-system-terminal-evidence · 跨系统业务终态证据
- 触发：跨服务重试、超时、回调、租约重领、金额或库存副作用。
- 摘要：用稳定业务键、短事务、条件回写、终态查询和人工对账区分本地所有权与远端事实；outbox 只在异步可靠投递需要时采用。
- 限制：2026-09-10 日期边界历史运行 9/9 仅证明当时本地纯函数；H2、Mock 不证明真实下游或生产正确性；改善幅度待三个可比真实任务验证。
- 置信度：medium；静态案例、迁移题与语义复核通过，真实下游、数据库并发和生产终态仍未验证。
- 状态：reviewed_case；更新时间：2026-09-18；详情：[CROSS_SYSTEM_TERMINAL_EVIDENCE.md](CROSS_SYSTEM_TERMINAL_EVIDENCE.md)；sha256:dc3d958b17bef457505ec3849e4b5bcc0928b1762a2ace310671c1657da19a91。
