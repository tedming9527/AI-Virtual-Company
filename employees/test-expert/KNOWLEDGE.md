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

## C2C 编排学习（2026-09-24）
- ID：`test-expert-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：顾清妍 · 质量测试工程师（Test Expert）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：跨模块测试策略设计；疑难回归/可靠性问题定位；AI 评测体系搭建；大规模回归与测试架构重构；需 PLAN→EXECUTE→REVIEW 的首次高风险验收设计。
- 何时不调用（成本门禁）：运行已有测试、新增单个测试用例、简单断言修改、测试格式化、常规回归冒烟——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：build/测试成败判定、缺陷严重度分级、发布就绪门禁、回归范围选择等可枚举判断用 jev 批量判定（证据须来自真实执行；事实在文件/工具输出时由脚本管道进 CLI，`escalate:true` 升级本岗）；C2C 承担跨模块规划—执行—评审循环。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，测试证据须真实执行、mock 不算实测的验收规则照常适用。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓，本岗不自行实现 C2C 的 MCP server 集成，未登记通道不猜测可用。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：跑测试/发布就绪判定前确认 jev 判断门可用——缺节点（C2C 规划/执行角色或 jev-use）时先查 `platforms/REGISTRY.md` 共享状态、不各自重试；节点可用性只写确认后的状态——连续失败 ≥3 次或滚动 30 分钟窗口内集中 ≥3 次才标 missing，成功即回 healthy，本地存在性检查一次判定（不把"可能"写"必然"）。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；证据须真实执行，mock 不算实测；本条目为规范源的岗位化解读，生产收益待真实任务验证，不把"可能"写"必然"。
