# backend-expert · 知识发现目录

本文件只负责发现；命中后完整读详情，不用摘要代替执行依据。详细历史原文保留在同目录，旧相对链接语义不变。

## learner-adaptive-requirement-communication · 后端业务优先说明
- 触发：后端需求直接展开 DTO/字段，或实体、状态、权威与失败恢复未清。
- 岗位差异：先用页面请求映射实体、状态机和系统边界，再展开契约；写约束按风险核对。
- 限制：缓存/上下文不证明最终事实、权限或 exactly-once；空列表、业务拒绝、未知终态分开，超时不等于失败；真实契约、数据库与下游仍须取证。
- 状态：candidate；更新时间：2026-09-22；详情：[canonical](../../knowledge/learner-adaptive-requirement-communication.md)；sha256:95da60653832e9428bf81db997a1d31db125ef912f43e5896aa0a99043fdf804。

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
- 触发：简短需求、继续任务、UI交付或工具重复失败；命中后读正文及本岗案例。
- 限制：受指导演练，不证明生产提效，不扩大授权。
- 状态：reviewed_case；更新时间：2026-09-16；详情：[canonical](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)；sha256:92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680。

## backend-cross-system-terminal-evidence · 跨系统业务终态证据
- 触发：跨服务重试、超时、回调、租约重领、金额或库存副作用。
- 摘要：用稳定业务键、短事务、条件回写、终态查询和人工对账区分本地所有权与远端事实；outbox 只在异步可靠投递需要时采用。
- 限制：2026-09-10 日期边界历史运行 9/9 仅证明当时本地纯函数；H2、Mock 不证明真实下游或生产正确性；改善幅度待三个可比真实任务验证。
- 置信度：medium；静态案例、迁移题与语义复核通过，真实下游、数据库并发和生产终态仍未验证。
- 状态：reviewed_case；更新时间：2026-09-18；详情：[CROSS_SYSTEM_TERMINAL_EVIDENCE.md](CROSS_SYSTEM_TERMINAL_EVIDENCE.md)；sha256:dc3d958b17bef457505ec3849e4b5bcc0928b1762a2ace310671c1657da19a91。

## backend-jev-like-judgment-habit-v1 · 后端类型化判断循环
- 触发：后端测试分诊、发布就绪、严重性、下一步动作或迁移处置需要有限判断时。
- 摘要：先分流判断/取证/生成，再压缩状态、类型化、冻结选项、同状态批处理、显式不确定性并升级例外；JEV MCP 可选。
- 限制：仅为 2026-09-22 已复核模拟案例，生产收益未知；不扩大数据或权限，生成任务与升级项仍由陆行远 · 可靠服务官或对应具名负责人处理。
- 状态：reviewed_case；更新时间：2026-09-22；详情：[JEV_LIKE_JUDGMENT_HABIT.md](JEV_LIKE_JUDGMENT_HABIT.md)；sha256:2709b8a02111670cb018d6f6daef9905542f9561fccee027fafdce0f479ac969。

## backend-expert-c2c-orchestration · C2C 编排学习
- 触发：Spring 架构调整、Redis 并发/事务问题、性能 Debug、跨模块服务改动需 PLAN→EXECUTE→REVIEW。
- 摘要：命中 C2C 触发且成本门禁通过才启动 codex-with-chatgpt；CRUD/DTO/Mapper 直接完成不启动；build/测试成败等有限判断批量交给 jev，升级项回本岗。C2C 仅执行通道，分级/事件/consult/收口/能力交接照常适用；平台×模式能否用 C2C 查 platforms/REGISTRY.md，未登记一律 unknown；缺节点（C2C 规划/执行角色或 jev-use）时先查 platforms/REGISTRY.md 共享状态、不各自重试，节点可用性只写确认后状态（连续失败 ≥3 次或滚动 30 分钟窗口集中 ≥3 次才标 missing，成功即回 healthy）。
- 限制：循环上限 2 个 Review Cycle，超限 BLOCKED 升级 CoS；岗位化解读、生产效果待真实任务验证；consult: none。
- 状态：reviewed_case；更新时间：2026-09-24；详情：[KNOWLEDGE.md](KNOWLEDGE.md)；原文版本：sha256:60d194540bce7d30a5928ad1f1d4cfa5076f3c98a01a9948d97874f123b88391。
