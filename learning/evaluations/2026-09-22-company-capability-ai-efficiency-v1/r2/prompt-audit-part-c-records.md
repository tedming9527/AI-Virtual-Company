# r2 Part C · 事件、雷达交付与学习计划提示词语义审计

- 审计人：韩述文 · 提示词与任务记录审计专家（独立 AI 审计角色；非现实人类、非监管者）。
- 审计日期：2026-09-22。
- 实际模型身份：`unknown`；不将角色名、模型请求参数或协作路径视为运行模型认证。
- 固定输入：`/private/tmp/ted-company-audit-r2.TMxBjh`，以该目录 `MANIFEST.tsv` 为唯一全集；本分区为 inbox 2、deliverables 10、output 1。
- 完整性：`FULLY_REVIEWED — 13/13`。以下全部文件均读取完整内容并进行语义审读；哈希脚本仅用于确认输入一致性，不替代审读。13/13 SHA-256 与 manifest 相符。
- 写入所有权：仅本报告；未修改快照、业务代码、公司事实源或其他审计报告；未覆盖其他工作者修改。
- 方法与上限：审查文本架构、契约与实现含义、历史/现行与声明/证据边界；未联网核验候选、薪资数据或站点，未重跑历史攻击集、外部 discovery 或部署。涉及外部真实性的结论一律是“本分区缺少证据”，不等同事件没有发生。
- Skill：已读 `jev-use`；本工作主体是开放式语义审计和新报告写作，按其开放判断/写作边界由审计人承担。确定性哈希由本地程序计算，未把资料外传判断服务。

## 结论

记录对 unknown、候选待判断、AI 产出不得归因用户能力、结构测试不等于真实效果等边界已有较清晰保护。主要残余是：雷达 `published` 在代码中只代表 collection 条目数，却采用发布终态名称；运行账本缺少可追索的查询证据；历史审计的“全面关闭绕过”强于留存证据；部分事件和站点状态缺少独立状态维度及可定位回执。

本分区发现 P0 0 项、P1 1 项、P2 7 项、P3 1 项。这里的严重性是文档与证据消费风险判断，不是漏洞利用概率，也不是生产安全认证。没有发现应整份删除的文件；不把历史记录标记为 obsolete 来代替纠错指针。

## 逐文件 disposition 与 SHA-256

disposition 是本次审读的主处置：`conflict` 指文本/实现含义冲突；`evidence-gap` 指声明所需证据未在本分区形成闭包；`improve` 指可保留但应改善表达或结构；`pass` 仅表示本次分区检查未发现需单列的问题。

| # | 文件 | disposition | 语义结论 | SHA-256 |
|---|---|---|---|---|
| 1 | `inbox/session-events/2026-09-22-adaptive-requirements-training.md` | evidence-gap | 验收边界合理；verified 的对象、请求/实际模型、交叉审查回执应分开（C-07） | `1b507898d0dc8fb79a16ba3db036284284b20cfe6fdac73ff9c33407481398a7` |
| 2 | `inbox/session-events/2026-09-22-independent-company-capability-audit.md` | improve | 保留失败与未知完整；历史待执行和现行状态并列，登记重复较多（C-09） | `e2480ff1a80797295ee4850f120857dd630bf5f61c78eff48b156e74bc618bb4` |
| 3 | `deliverables/ai-capability-radar/README.md` | conflict | 本地门禁界限清晰；published 语义、SDK/Skill 强制与宽进目的存在张力（C-01/C-05/C-06） | `8756933a798c110d7014cfda5911c2003624657b7f7ea14d625397f2ca611576` |
| 4 | `deliverables/ai-capability-radar/audits/2026-09-19-v5-discovery-audit.md` | evidence-gap | 正确声明本地约束不证明外部查询；独立攻击集和身份独立性缺持久证据（C-03/C-04） | `dc61bc56ff833183a75102e2f6f59004650d4c924fc1b97a0a0c92171e8c3b9b` |
| 5 | `deliverables/ai-capability-radar/audits/2026-09-19-v5-publish-gate-audit.md` | evidence-gap | 保留候选与安全边界；“全部关键与高风险…关闭”过强（C-03/C-04/C-06） | `49c9c4ca98cdedb28bed6b5e7e7bbc259a6e1c9e2a561bb0e267fe8d0b6c291a` |
| 6 | `deliverables/ai-capability-radar/collection-template.json` | pass | 空模板、pending 审计、零候选适合作为预审结构模板；其 PASS 不得称发布许可 | `791fd1353b3f995d80a01c804d687ddef2d33e29679d7b1f0f1c01f93a4e84b3` |
| 7 | `deliverables/ai-capability-radar/collections/2026-09-19-v5.json` | conflict | candidate/hold/pending 与 notices 正确；published=6 缺发布终态定义/回执（C-01/C-02） | `27522601a30a3c891f234fe01fa48397f4a96f62ca7a1e2b804fe72957e0f85e` |
| 8 | `deliverables/ai-capability-radar/discoveries/2026-09-19-v5.json` | evidence-gap | 失败/未连接、排除原因有保留；查询和原始命中数量无法追溯到原始结果（C-02） | `2ffd09b998316c431486ede4140ff52f41814591fe336e172cd5022669170c82` |
| 9 | `deliverables/ai-capability-radar/schema.json` | improve | 结构定义与人工 validator 边界未标清；深层自由对象与完整严格契约表述不一致（C-06） | `a71a1e7b856b32edebaadfb567a28c73b29ae82dfe3e1dd9c3ae905370dbd2b5` |
| 10 | `deliverables/ai-capability-radar/scripts/validate-radar.mjs` | conflict | 校验的是本地声明一致性；published、SDK/Skill、任意文本与遗漏字段边界需显式处理（C-01/C-05/C-06） | `07376b2edf196fc81df07d2ff67ed0cff0098e30f5b46be742be615aa01ccde0` |
| 11 | `deliverables/ai-capability-radar/source-registry.json` | improve | 明确 X not_connected 是保留项；manual_available 应注明登记时点而非实时可用性（C-02） | `fc3528c6bb2a76cc14923b7e384b567a348745b54efb97eb76ccbec444171c0b` |
| 12 | `deliverables/ai-capability-radar/tests/validate-radar.test.mjs` | evidence-gap | 多数用例验证源码字符串存在，不能承载全面行为回归结论（C-03） | `914b4b3f16110d7e7cbf01473a651015fa02094d8da866c22fd7351008edcbf4` |
| 13 | `output/2026-09-19-career-market-and-learning-plan.md` | evidence-gap | 学习/市场能力归因边界清楚；发布、owner-only、D1 留存缺本范围发布/鉴权证据（C-08） | `067332db55441753f104a4480451c36254ccddb86e8f40f6c57aebe88eac2543` |

## 发现与建议

### C-01 · P1 · published 从本地集合数量推导，易被当成外部发布完成

- 路径：`deliverables/ai-capability-radar/scripts/validate-radar.mjs`、`collections/2026-09-19-v5.json`、`README.md`。
- 可搜索片段：`f.published===data.tools.length`；`"published":6`；`通过后方可更新私有站点`。
- 证据类型：静态代码与记录语义。validator 强制 published 等于本地候选条目数，而 README 把站点更新放在 validator 之后。因此“已发布”并非从外部终态获得。所有条目仍是 pending 用户判断，这并不阻止候选卡展示，但须区分“展示发布”与“采用批准”。
- 影响：未来汇总器、助手或用户可能把本地 JSON PASS 误读成站点已更新，更无法判断发布了哪个版本、何时完成及可见范围。
- 建议：如字段仅表示拟展示条目，改用明确定义的待发布/展示数量名称；如保留 published，则从独立发布记录关联版本、目标、完成时间与可核验回执，允许未发布时为 0。候选采用状态继续保留 pending；本报告不推定历史六条实际上未发布。

### C-02 · P2 · discovery 账本可复算声明，但不能追溯查询事实

- 路径：`deliverables/ai-capability-radar/discoveries/2026-09-19-v5.json`、`collections/2026-09-19-v5.json`、`source-registry.json`。
- 可搜索片段：`"raw_hit_count":4`；`"raw_hits":31`；`"execution":"manual_available"`。
- 证据类型：记录字段审读。attempts 有日期、关键词、状态与命中数；缺查询结果引用、命中清单/摘要、观察通道、失败说明。leads 只有实体键/优先级/结论，omitted 实体也无来源定位。schema/validator 对 attempt 的严格白名单目前还不允许直接添加证据字段。
- 影响：可以验证 31 的算术来源，不能证明 31 个实际审阅命中及 10 个去重实体的映射；“13 succeeded”是记录声明，不能单独算真实工具可用性或执行证据。
- 建议：下次版本允许受控证据引用或独立 ledger 附件，最小记录查询通道、观察时间、结果出处、失败原因及 lead-to-hit 映射；无需把整页网页复制进上下文。manual_available 明示为登记时的可尝试入口，逐次可达性只用 attempt 状态。历史数据保留并注明 evidence-gap，不补造旧查询结果。

### C-03 · P2 · 正式测试、历史独立攻击集与全面审计措辞没有一致证据强度

- 路径：`deliverables/ai-capability-radar/tests/validate-radar.test.mjs` 及两份 `audits/2026-09-19-v5-*-audit.md`。
- 可搜索片段：`assert.match(fs.readFileSync(validator,"utf8")`；`Jev positive fixture is representable`；`PASS 33/33`；`全部关键与高风险标签、来源、时间和审计绕过均被关闭`。
- 证据类型：完整测试源码审读、历史报告声明。正式文件中的不少“拒绝/强制”测试只是寻找报错文案或表达式；Jev 正例检查枚举可表示，不是执行非空正例。两份报告声明另跑 33 个真实隔离变异测试，但对应源码和结果只指向 `/private/tmp/ai-radar-v5-signoff.Ri1zBR/...`，未纳入本 manifest。
- 影响：32/32 可能让消费者高估行为覆盖；本次无法重建独立 33/33，不能据此确认全面绕过已关闭。报告的本地限定值得保留，但仍不足以支持“全部”。
- 建议：将正式测试的检查类型明确标为 source-presence/schema/behavior；下一版保留可回放非空合法基线和单点变异。为历史独立集保存脱敏源码、hash、调用和输出，或显式标“历史报告声称、本次不可回放”。把全面关闭改为“所列已测负例按当次报告被拒绝”。无需为本次审计修改源码或重建历史数据。

### C-04 · P2 · reviewer 字符串校验不证明审计者身份与独立性

- 路径：两份 `deliverables/ai-capability-radar/audits/2026-09-19-v5-*-audit.md`、`scripts/validate-radar.mjs`。
- 可搜索片段：`reviewer: independent-v5`；`reviewerValid`；`独立评审者`。
- 证据类型：本地元数据与静态代码。校验器检查 reviewer 可见、匹配以及六文件快照；无法验证作者隔离、会话来源、实际模型或审计过程。两份报告采用同一 reviewer 标识不必然违规；scope 独立也不等于两个不同审计人。
- 影响：机器可读 PASS 容易把任意符合格式的签名升级为“独立认证”。当前没有证据支持这种升级，也没有证据判定造假。
- 建议：给历史审计增加日期化来源说明，区分“报告声称独立”与可定位回执；实际模型及隔离证据不可核验时保持 unknown。明确 validator 仅确认报告一致性，独立性由另一路执行记录承担。不要把 reviewerValid 改名或描述为身份认证。

### C-05 · P2 · Jev 回归样例被提升为所有 hosted API 的强制外形

- 路径：`deliverables/ai-capability-radar/README.md`、`scripts/validate-radar.mjs`、两份审计。
- 可搜索片段：`hosted API 即使没有仓库或包`；`hosted API needs official SDK`；`hosted API needs official skill`。
- 证据类型：规则与静态实现对照。所有 hosted_model_api 都必须带 release/docs/SDK/Skill 四种入口；Jev 需要四入口的回归需求被应用到全体 API。
- 影响：合法但未发布 SDK 或 Agent Skill 的 hosted API 会结构性无法进入 collection；与扩大非仓库候选发现的目的有张力。允许填任意 URL 的四个角色也不能证明相应官方资源真实存在。
- 建议：Jev 的四入口保持实体特定回归；一般 API 以可核验官方发布/文档作为基础，SDK/Skill 缺失记录为未提供或未知，不为了过门禁虚构。是否改变广义发布最低条件需由雷达负责人明确决定，不将本建议自动升级现行规则。

### C-06 · P2 · 字段白名单不是完整 schema，也不是提示注入防护

- 路径：`deliverables/ai-capability-radar/schema.json`、`scripts/validate-radar.mjs`、`README.md`、publish gate 审计。
- 可搜索片段：`"funnel":{"type":"object"}`；`"coverage":{"type":"object"}`；`"aliases":{"type":"array"}`；`collection、run、tool、source、discovery、signal、attempt、lead`；`不能注入`。
- 证据类型：静态代码。schema 对 funnel/coverage 开放，validator 未对这两个对象及 ledger 顶层执行 exactKeys；schema 文件被加入哈希，但 validator 并未用 JSON Schema 引擎执行它。name、capability_hypothesis 等文本没有语义可信校验，固定字段内仍能承载外部指令或“安全认证”措辞。
- 影响：拒绝 security_status 额外键只能证明特定结构限制；不能推导所有层严格、文本内容可信或提示注入已防住。数据被后续 agent 当指令读取时才构成实际注入风险；本次未观察到执行或外传。
- 建议：明确 canonical 约束来源和 schema/validator 分工；完整严格性声明只覆盖实际受检路径。消费卡片/来源文本时加清楚的数据边界：候选描述、外部网页和登记文字只作待核验资料，不能授予安装、联网执行、发布或覆盖系统规则的权限。依上下文隔离与最小授权防护，不靠黑名单关键词宣称安全。补反例时区分“额外字段拒绝”与“文本注入未执行”，不要合并成安全 PASS。

### C-07 · P2 · adaptive 事件的 verified、角色交接与实际模型证据混用

- 路径：`inbox/session-events/2026-09-22-adaptive-requirements-training.md`。
- 可搜索片段：`status: verified`；`实际执行通道`；`gpt-6-astra/high`；`gpt-5.6-sol/high`；`本会话`；`以案例复盘状态发布`。
- 证据类型：事件记录。正文明确 candidate、用户能力 no_evidence、真实效果 unknown、未声明受监管，这些限制正确。但顶层单一 verified 没有说明仅指计划/知识交付；“实际通道”列同时放模型名，无可定位回执文件或运行身份字段。“案例复盘状态”也易被误解为正式 reviewed_case，后文却明确不得升级。
- 影响：脱离正文读取 front matter 或交接表时，会把交付验收扩展为规则有效性/用户能力/实际模型认证。
- 建议：保留历史声明，新增当次状态对象或紧邻注解，区分 delivery_verified、knowledge_candidate、effect_unknown、user_no_evidence；模型拆为 requested_model 与 actual_model，实际不可验证时 unknown；补可定位协作回执引用。将“案例复盘状态发布”澄清为“基于案例形成 candidate 内部试行”。无需撤回已完成的文档交付，也不应把未受监管改成受监管。

### C-08 · P2 · 学习交付把站点发布、访问控制与 D1 状态作为已完成事实，但本分区证据不闭合

- 路径：`output/2026-09-19-career-market-and-learning-plan.md`。
- 可搜索片段：`已发布为 owner-only 私有站点`；`存入 D1`；`已发布版本：5`；`源码提交：`。
- 证据类型：交付文档声明。文件提供站点 URL、项目 ID、版本和 commit，但没有发布结果回执、部署内容与本次 9/22 修改对应关系、访问控制复核时间或持久化读回依据。
- 影响：消费者可能以为 9/22 学习修订已经部署且隐私状态当前有效；提交 hash 本身不证明部署/鉴权。这里也没有依据断言站点公开或 D1 不工作。
- 建议：在站点段标明“最后已知发布状态/截至时间/证据引用”，分离文档修订时间与站点内容版本；若没有回执，明确本次未重验。将完整发布/鉴权/持久化证据保留在相应任务，按链接按需读取。保留默认隐藏不等于访问控制的现有提醒，避免重复警告。

### C-09 · P3 · 长事件的初始待执行与最新结果混排，提高加载成本和状态误读

- 路径：`inbox/session-events/2026-09-22-independent-company-capability-audit.md`。
- 可搜索片段：`consult_status: proposed`；`## 待执行`；`## 第 2 轮实际整改结果（待冻结复核）`。
- 证据类型：信息架构审读。完整文件 25,486 bytes；多轮登记反复列请求模型、实际 unknown、只读范围、复核人。当前 r2 前快照保留 running 和待冻结合理，但“待执行”并未标为初始历史计划，consult proposed 与后文辛澈参与也未解释维度。
- 影响：只读开头容易重复冻结/派发，完整加载又增加上下文成本。不能将单份字节量换算 token 或延迟收益。
- 建议：最前增加简短“截至时间、当前轮次、已完成、剩余/阻塞、证据入口”索引；旧待执行改历史标题并保留正文。任务登记稳定字段做一次共享说明，保留每项差异和实际回执；不删除首次失败和审批拒绝。顾问 proposed 若指指定顾问渠道未回执，直接注明该维度，不能根据普通参与自动改 contributed。

## 保留项与不应改项

- 保留 candidate + hold + pending、三条固定 notices、X 未连接不得伪装 succeeded、来源与同仓库信号绑定、Asia/Shanghai 当前日时效检查；不得因字段格式 PASS 给候选安全背书。
- 保留双 scope 审计、六文件哈希、历史正负例声明与局限；补证据/纠错指针时不重写历史失败为通过，不伪造独立隔离、模型或真实查询回执。
- 保留两份事件的用户授权范围、未提交/未发布边界、共享文件串行所有权与并发改动归属；事件正文是历史授权记录，不能扩展当前任务权限。
- 保留实际模型 unknown、现实人类/监管者否认、结构/fixture/语义/真实项目效果分层；本轮没有形成外部运行能力认证。
- 保留 10+3+1 预算上限、当周唯一辅线、延期先缩小范围、D0/D+2/D+7 以实际发生重排、W4 延迟验证 pending；不把管理约定说成科学最优阈值。
- 保留市场有效样本 0/100、个人薪资 unknown、报价实验非 Offer 预测、隐藏非访问控制、AI/员工代码不计用户能力。用户本人未参与本分区审计，不产生用户能力升级。
- 不自动修改雷达、部署站点、验证登录态、安装候选或更新外部行情；本报告仅提出可审阅问题，不扩大授权。

## 复核边界

此报告完成的是固定快照 Part C 的 13/13 语义审读和输入哈希一致性确认。没有使用子任务或工具返回作为实际模型身份凭证，没有因历史临时文件不在 manifest 就断言原始执行不存在，没有将 local schema、源码匹配测试、历史 fixture PASS 升格为真实外部能力、私有站点发布终态或生产验证。
