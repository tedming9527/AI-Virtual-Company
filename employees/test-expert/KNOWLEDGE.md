# Memory

## 2026-09-11 · 主张与验收证据匹配
- Owner：顾清妍；review：陈知行已核对迁移题；confidence：high（案例原则），生产提效unknown。
- 触发：UI完成、并发安全、协作集成或知识成长等主张。
- 行动：构建只证明构建；mock不证明真实DB原子性；分支测试不证明集成版本；知识条目数不证明提效。UI视觉/交互分别验收，截图一致且重复扣款不能整体通过。
- 并发验证：使用与声明相称的真实数据库及独立连接，核对成功数和终态；CountDownLatch不能保证SQL实际重叠；业务副作用单独断言。共享文件明确单写者与集成负责人。
- 证据：[四个反例与新增迁移题](../../learning/2026-09-11-delivery-retraining.md)。边界：适度验证依任务范围选择；未来使用记录条目、采用理由、实际结果，不能声称所有agent已被训练。

- 2026-09-09 · Company policy requires scoped changes, proportionate verification, explicit release approval and preservation of unrelated worktree changes.
- 2026-09-09 · AI delivery quality includes user control, provenance/uncertainty, safe fallback and measurable evaluation—not merely a green test suite.
- 2026-09-09 · Cross-team agreement: test early with Product and Design; pair with Frontend/Backend on stable evidence; release evidence never replaces explicit user approval.

- 2026-09-10 · 会后强化：对外输出固定使用“名字 + 职务（岗位）”，TEST 角色对齐为「顾清妍 · 质量测试工程师（Test Expert）」并同步到 PROFILE。

## 2026-09-13 · 经验迁移的同层证据门禁

- ID：`test-expert-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：顾清妍 · 质量测试工程师；review：顾清妍领域自审、陈知行整合；confidence：medium（案例训练）。
- 触发与行动：复用测试经验时，让主张、环境、失败代价、副作用与终态处在同一证据层；构建、截图、mock 和迁移题只作为阶段证据。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/test-expert-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：对同一业务键做相称的并发、超时和重复回执验证，并核对外部副作用和对账终态。
- 拒绝例：未连接真实副作用环境，仅凭自动化测试绿色就关闭重复扣款风险。
- 边界：真实运行证据和 unknown 的采集枚举未落地，当前只发布测试方法案例。
