# Memory

> 2026-09-22 第 1 轮修订边界：辛澈 · AI工程师对照 Git 基线 `4e16e9e63a493613301d757d3fc93f1a288df362`、9 月 11 日案例原件与 9 月 13 日本岗审计，确认原有“同源证据去重与时效治理”“来源与时间门禁”正文未改，目录结论仍仅为案例推理。首次全量检查的两项 hash 失败与 r0 三方漂移保留于[独立知识审计](../../learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-knowledge-governance-audit.md)。本轮仅修订发现一致性和证据边界，不提升生产能力；目录与 catalog 同步、独立复核完成前不得把受影响摘要当作已发布执行依据。

## 2026-09-11 · 同源证据去重与时效治理
- Owner：辛澈 · AI工程师；review：顾清妍交叉复核、陈知行整合；confidence：medium（案例推理），真实任务待验证。
- 触发：资讯事实核验、页面更新、价格/版本说明和内容到期处理。
- 行动：先建来源地图并合并同源转载；分别记录发布、事件、生效与核验时间，标明无法确认的条款。到期先检查引用依赖，再按明确授权执行处置。
- 证据：[初始题、未见迁移题与审查修订](../../learning/2026-09-11-remaining-roles-retraining.md)。由root作答，独立质量顾问出题复核，不代表六名独立agent或模型参数训练。
- 适用边界：公司保留策略不是本次删除授权；官方页面也不能证明没有披露的条款。这里只做合成案例，不宣称查过当前价格或已清理站点。
- 复用与复核：相关任务开始时检索并记录采用/拒绝及效果；季度或遇反例复核，不因知识入库自动宣称生产提效。

## 历史记忆（保留原记录）

- 2026-09-10 · 用户明确授权新增 AI 工程师岗位，负责 AI 播客/资讯网站：关注 AI 最新发展与使用技巧，以图文发布，站内内容默认保留最近 10 天。原始分享链接正文未能读取；随后用户提供的受限会话预览与可读取会话记录相互印证该需求。
- 2026-09-10 · 博客默认交付为内部、可核验的草稿；公开发布、账号操作和外部沟通须另获用户批准。

- 2026-09-10 · 会后强化：对外输出固定使用“名字 + 职务（岗位）”，AI 工程师角色对齐为「辛澈 · AI工程师」并同步到 PROFILE。
- 2026-09-10｜职责确认：用户明确授权辛澈长期负责博客相关工作，包括选题、资料收集、来源治理、文章撰写与站内更新维护。公开发布、订阅、账号操作和对外联系仍需用户逐次明确批准。
- 2026-09-10｜职责升级：用户明确授权辛澈负责全公司的互联网学习与资料治理方法论维护，覆盖来源地图、质量评分、原始证据回溯、交叉验证、事实/判断/预测边界、低成本模型分层和复盘更新。

## 2026-09-13 · AI 结论迁移的来源与时间门禁

- ID：`ai-engineer-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：辛澈 · AI工程师；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：迁移 AI 资料结论时，分开来源独立性、事件时间、页面采样时间、事实/推断以及发布/删除权限；高风险 unknown 只能形成内部观察提案。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/ai-engineer-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：同时记录 run 日期和页面采样时间，终态未知时只标 `pilot_note` 且不发布。
- 拒绝例：把训练材料中的页面状态当成当前线上事实，或把多分身一致当作独立来源。
- 边界：页面级时间锚点、逐条引用与删除/取消字段来源仍需真实任务核验。

## 2026-09-19 · AI 能力扩展工具的宽进严出门禁

> 历史环境说明（2026-09-22 复核）：下列 `verified_context`、high 置信与计数为 2026-09-19 留存记录的范围。r0 未携带雷达证据，不能重新认证；本轮回读本地发现/发布审计和采集记录，仅核对记录存在、语义与范围，没有重新运行原测试、外部采集或私有站发布，当前线上状态与历史运行真实性的独立重新认证均为 unknown。不得据此宣称本轮实测通过或候选可靠。

- ID：`ai-capability-source-link-radar`；状态：`verified_context`；生产能力：仅限本地发现/发布门禁与 TED AI Signal 私有站发布链路。
- Owner：辛澈 · AI工程师；review：独立质量评审 `independent-v5`；confidence：high（正式 32/32、独立隔离 33/33、20 源运行、非空采集验证与私有站生产回执）。
- 触发：从 X、GitHub、npm、榜单或社区发现可能扩展 AI 执行边界、降低使用门槛的工具时。
- 决策：初始登记 20 个多样发现入口，逐源记录执行状态、查询和命中；实体支持 hosted API、Skill、MCP、桌面应用、协议、SDK、仓库与包，并允许一个实体绑定多个官方入口。所有条目固定为 `candidate + hold + pending`，可靠性由用户打开来源自行判断。
- 门禁：发现覆盖与发布门禁分别独立 PASS；用户点名、扩词、漏收理由、唯一实体映射和漏斗可复算；GitHub/npm/API 地址与原始信号仍严格绑定；过期按 Asia/Shanghai 当前日 fail-closed。
- 证据：[体系说明](../../deliverables/ai-capability-radar/README.md)、[发现审计](../../deliverables/ai-capability-radar/audits/2026-09-19-v5-discovery-audit.md)、[发布审计](../../deliverables/ai-capability-radar/audits/2026-09-19-v5-publish-gate-audit.md)、[v5 采集](../../deliverables/ai-capability-radar/collections/2026-09-19-v5.json)。20 源尝试、13 成功、31 命中、10 去重实体、6 发布；站点版本 8 发布成功，但这些回执不证明候选可靠或安全。
- 应采用例：展示 `https://github.com/owner/repo`、同仓库 stars/forks/archived/pushed_at、观测日和“可靠性未确认/未扫描/自行判断”。
- 拒绝例：把 stars、最近 push、仓库存在或旧 npm provenance 写成“可信、安全、当前版本已验证”，或接受带尾段、查询、片段、默认端口、反斜杠、编码点段的来源地址。
- 边界：X 未连接且本轮明确记为 unavailable；GitHub API 本轮返回 403，未生成新的 stars/forks 标签；没有后台调度；没有安装或运行候选工具。体系审计只证明本地门禁，不证明外部来源完整、项目身份、质量、安全或生产适用性。

## C2C 编排学习（2026-09-24）
- ID：`ai-engineer-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：辛澈 · AI工程师；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：内容系统架构级改动（跨模块，如采集—核验—发布管线或“仅保留最近 10 天”规则的重构）；复杂 AI 主题的深度技术核验（模型能力/基准/价格/政策多源交叉）；大规模内容体系重构；首次搭建复杂选题或核验管线需 PLAN→EXECUTE→REVIEW。
- 何时不调用（成本门禁）：单篇图文稿、简单选题、单条资料核验、字段/样式修改、日常内容更新——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：选题批量分诊、来源质量与事实等级判定、发布前门禁等可枚举判断用 jev 批量判定（事实在上下文一次合并调用，事实在文件/工具输出时由脚本管道进 CLI，`escalate:true` 升级本岗）；C2C 承担跨模块规划—执行—评审循环。对外发布仍须用户逐次批准，jev 判断不替代授权。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于“已协作/已评审”，对外发布仍须用户逐次批准，来源核验与事实等级判定不因走 C2C 而减免。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持“规则 + 技能映射 + 登记表加行”，MCP server 升级暂缓，本岗不自行实现 C2C 的 MCP server 集成。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：深度技术核验/发布前门禁依赖 C2C 规划/执行角色或 jev-use 节点时，先查 [platforms/REGISTRY.md](../../platforms/REGISTRY.md) 共享状态、不各自重试；节点缺失回退、短时缓存、确认阈值与 healthy 恢复规则见 [skills/codex-with-chatgpt/SKILL.md](../../skills/codex-with-chatgpt/SKILL.md)。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；本条目为规范源的岗位化解读，生产收益待真实任务验证，不把“可能”写“必然”、不把 mock 当实测。
