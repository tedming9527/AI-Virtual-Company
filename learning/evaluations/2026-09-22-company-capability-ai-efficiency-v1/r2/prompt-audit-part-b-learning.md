# r2 提示词与学习材料审计 · Part B / learning

- 日期：2026-09-22
- 审计人：尹清言 · 提示词与学习材料审计专家；独立 AI 审计角色，非现实人类、非监管者，不提供外部认证。
- 实际模型身份：`unknown`。岗位名、平台自述和派发请求均不替代独立运行时鉴证。
- 唯一受审文件全集：`/private/tmp/ted-company-audit-r2.TMxBjh/MANIFEST.tsv`；从中精确筛选 `learning/**`，共 **41 个文件**。
- Manifest SHA-256：`4563e7d4b950a6bac927f9c61b9b17c020a0a0d8ae35824c6cb5181614186521`。
- 全文语义审读：**41/41，FULLY_REVIEWED**；515,166 bytes。逐份读取全文；一次聚合输出中被截断的 r0 知识治理报告随后单独全文重读。检索和哈希只辅助定位/完整性，不替代语义审读。
- 完整性：41/41 内容 SHA-256 与 manifest 相符，0 mismatch；此结果不是语义通过。
- 范围：提示/文档信息架构、可执行性、现行与历史效力、版本/状态、能力归因、模型/隔离/监督/授权表述、重复上下文、用户可理解性。未复跑历史业务、MCP、fixture、课程或平台行为，未联网重证技术/研究来源，未回读实时公司源补证。
- 输出所有权：仅本报告；未修改快照及其他源文件。开放式语义审计由本审计承担；查阅 JEV Skill 的路由边界，没有把生成性审计或确定性 hash 核对伪称外部 JEV 裁决。

## 总体结论

材料的主要价值是清楚区分案例、规范、运行和生产效果，并保留失败、修订与 unknown。**不建议重写全部训练，也不因年代较早而批量判过期。** 本范围没有充分证据定 P0/P1；发现 **P2 7 项、P3 4 项**。严重度表示文档被复用后的决策影响，不是事件发生概率。

最优先修订的是：未覆盖的历史模型身份纠错、JEV 默认完整流程缺退出、人工置信数值门槛、当前状态与历史状态混写。其余为历史证据索引和可执行语义的局部改进。41 份文件 disposition：pass=22，evidence-gap=2，improve=12，conflict=4，obsolete=1。pass 仅指本次文档质量范围；evidence-gap 不等于材料造假；obsolete 只指执行效力已结束，不要求删除。

## 问题与建议

### PB-01 · P2 · 历史模型/独立性纠错尚未覆盖所有直达入口

- 位置：`learning/internalization/runs/2026-09-13-spark/ai-engineer-audit.md` 的 `actual_model: gpt-5.3-codex-spark`；`learning/professional-capability-research-2026-09-18/REPORT.md` 的“模型门禁通过”“未降级代跑”；`learning/jev-mcp-training-2026-09-22/ai-engineer.md` 的“本次恢复补测验证了……模型身份”；同目录 README 的“经独立复核全部通过”。
- 事实：第二轮综合报告已经有 KG-06 就地纠错，JEV REPORT 与 knowledge-deposit-review 已有 AI-06 就地纠错；上述独立入口没有同等明确的关联。第一轮报告虽然排除“密码学证明”，仍将请求/调度证据裁成模型门禁通过。
- 影响：读者直接命中旧文件时，可能把请求值、服务返回 model 字段或独立角色名称当成真实运行身份/隔离已证实。没有证据证明当时用了错误模型或复核不独立。
- 建议：保留原文，入口附同一纠错规范引用：requested_model、tool_reported_model、actual_model 分列；actual_model 未鉴证为 unknown；语义非作者复核与上下文隔离分列。README 一句话限定为“合成训练记录通过；历史独立性证据上限见纠错”。不造回执、不补造 fork 参数。

### PB-02 · P2 · 训练记录继续向未来发布完整默认流程

- 位置：`learning/jev-mcp-training-2026-09-22/REPORT.md`“以后各岗位……默认先执行”“日常默认思维方式”，九步循环与随后七步替代协议；各岗训练中的重复协议；frontend-expert.md 路由表把“构建是否成功”直接列为模型判断。
- 事实：工具可选已有说明，但无需完整循环的确定性事实、单项直接判断出口仍缺。报告开头的历史标识仅纠正独立性，不明确撤回后文未来时执行效力。
- 影响：训练示例可覆盖后续轻量化入口；已知 exit code、hash 等事实也被模板化为模型往返。各岗位重复共同循环增加维护面，但本审计不将字符量换算成 token 或真实成本。
- 建议：训练正文保持历史，入口标“学习证据，非现行执行规范”，只链接一个现行 canonical。现行入口三路：确定性脚本、证据直接充分的主责判断、同状态多项复杂判断的批量协议；只在第三路加载完整模板。岗位保留各自硬风险、反例和升级负责人，不去掉授权、证据层级及数据边界。

### PB-03 · P2 · 后端无 JEV 协议强制未校准的人工小数阈值

- 位置：`learning/jev-mcp-training-2026-09-22/backend-expert.md`“人工规则阈值……0.80 作为主模型自评的接受阈值”，及 JSON `manual_acceptance_threshold:0.8`、`confidence:"0..1"`。
- 事实：文件正确区分首次 JEV 0.92、恢复 JEV 0.80 与人工口径，但仍要求无校准接口的主模型产生可比较小数；其他岗位和综合报告明确未校准写 unknown。
- 影响：把“本地工作约定”标注上后，仍不能解释 0.79 与 0.80 的可复算差异；机器可读 schema 不允许 unknown，会推动补数后自动采纳。
- 建议：人工路径以证据完备、冲突、关键未知和风险作条件判断；confidence 可为 unknown/定性等级。如以后使用校准概率，另绑定模型/任务族/校准集和版本。保留历史 JEV 阈值原值，不重新解释已发生的 verdict。

### PB-04 · P2 · 最终状态、批次参数与历史阶段缺少统一入口

- 位置：`learning/professional-capability-research-2026-09-18/ai-engineer.md` 页首“独立复核 pass”与“当前 unknown：顾清妍独立复核结论”；同目录 quality-review.md 的首轮总体 held 与末段最终 pass；`learning/jev-mcp-training-2026-09-22/test-expert.md` 末尾待复核与目录最终复核；product-manager.md“第六节……继续有效”继承恢复前 0.92，而恢复批次是 0.70；`learning/evaluations/.../r1/internal-quality-review.md` 末尾待外审与同快照外审完成；deep-research/EXECUTION.md 的固定模型、85% 停止线、每分钟监控。
- 影响：短检索命中可能采用旧 pending/held、旧阈值或已结束批次执行命令。这里不认定历史记录应被覆盖，也不把个人额度 unknown 改成已知。
- 建议：首页只加“本文件类型/适用批次/最新裁决指针”；保留过程原文，阶段章节写明当时状态。EXECUTION 标 archived execution specification，默认不具新任务效力；恢复协议参数通过 batch_id 定位，不能用全文最后出现值猜测。

### PB-05 · P2 · “未見/独立”仍有强于现有证据的措辞

- 位置：`learning/professional-capability-deep-research-2026-09-18/quality-review.md`“精确检索……这只能证明当前公司本地证据未预给同题”；JEV quality-review.md 的独立质量复核及八岗 pass。
- 事实：精确题面无命中只证明搜索范围内未发现逐字重复，不能排除同义题、先前上下文、答案提示或同一作者；JEV 复核诚实承认没有原始服务日志，但缺逐执行者/上下文关系凭证。第一轮 research/quality-review 已使用更谨慎的“未原样复制”边界，值得复用。
- 影响：把训练示例的迁移表现误称为盲测泛化；角色不同不能证明上下文隔离。
- 建议：分别记录未预写答案、逐字检索未命中、实际派发上下文、作者关系；不能取得的历史项目为 unknown。已公开题仅用于规则回归，不能再次当用户未见题。不得为修文档重新训练制造通过记录。

### PB-06 · P2 · 文件路由与数据留本地容易混淆

- 位置：JEV backend-training-architect.md“文件……留在本地脚本中处理”、frontend-expert.md“文件数据应留在会话外”、backend-expert.md“原始数据不进入对话”，与各岗 CLI 路由表。
- 事实：材料已经声明只发送合成数据，综合报告明确 TypeSafe 是远端；本次没有发现真实敏感信息外发证据。但分散可复制的路由模板主要按事实位置选 CLI，没有把“离开对话”与“留在机器”同时写清。
- 影响：未来读者可能误把 CLI 当本地推理，或认为文件在本机就可直接 pipe 到外部判断服务。
- 建议：canonical 入口明确“CLI 可直连外部后端；先确认数据类别、授权接收方和允许范围。位置只选择传输方式，不授予外发许可”。训练样例保留，不把当前已遵守的数据边界判成泄露。

### PB-07 · P2 · 学习历史记录不能自行闭合其运行主张

- 位置：09-11 workflow REPORT 的 audit.md、读取账本、fixture 链接；09-13 spark audit 的 extract/transfer 输入；JEV quality-review 与 deposit review 的原始服务回执缺口；deep-research chief 的 27/27、frontend 的 1/1 等历史报告记录。
- 事实：r2 scope 已明确有意省略且限制证据上限，这是有效改进。41/41 语义阅读不等于依赖证据全覆盖；本审计没有越界补读。Spark 审计另有“4 个迁移稿”却列五个文件，以及“逻辑正确 + 工程化可落地”的强表述。
- 影响：文档可证明有记录、边界与推理，不能重新认证历史调用或运行真实发生，更不能证明当前平台效果。
- 建议：保留 r2 scope；对用于发布/能力裁决的历史主张才补“claim—原始证据是否携带—结论上限”，无需扩大快照。Spark 改进用追加纠错限定为合成语义审查、工程可验证候选；计数按实际列项订正。不要为了消灭 evidence-gap 复制全历史聊天或升级知识。

### PB-08 · P3 · 质量门禁文字可能被当成操作授权

- 位置：`learning/professional-capability-audit-2026-09-18/quality-review.md`“允许指定资产进入提交与推送阶段”。
- 影响：该句本应表达当时资产质量就绪，但直达阅读缺当期用户授权对象/版本的限定，容易被用作今天提交/推送依据。没有证据表明发生了未授权操作。
- 建议：增加“仅质量就绪结论；实际操作仍依据当前明确授权及指定资产版本”。不更改历史 pass，不代用户授予提交、推送或发布权。

### PB-09 · P3 · 本地 Markdown 的行号锚点不便可靠定位

- 位置：`learning/jev-mcp-training-2026-09-22/quality-review.md` 多个 `ai-engineer.md#L59` 等链接。
- 影响：普通本地 Markdown 渲染器未必支持 GitHub 式 #L 行锚点，追加纠错还会移动行号。
- 建议：用稳定章节锚点加短可搜索片段；需要精确版本时同时记录文件 hash。链接目标文件存在不等于片段有效。

### PB-10 · P3 · 无关修正示例与范围纪律不一致

- 位置：`learning/jev-mcp-training-2026-09-22/test-expert.md` 无 JEV 表 F：“可顺手修正，但不是发布门槛”。
- 影响：非阻断错字不自动获得修改授权；示例可能教会顺手扩范围。
- 建议：写为“记录为非阻断；仅在本次授权范围内修正”。不把小错升级发布阻断。

### PB-11 · P3 · 前端页面状态表缺少互斥/优先级说明

- 位置：`learning/professional-capability-deep-research-2026-09-18/frontend-expert.md` 第 3 节“页面状态……派生”。
- 事实：ready 定义允许可选资源独立展示，partial 定义必需 ready 且可选失败，refreshing 定义有当前数据且刷新中；这些条件可以同时成立。
- 影响：作为研究图示尚可理解，直接按枚举实现时会产生分支优先级歧义，尤其 partial 页面在后台刷新时。
- 建议：声明表为正交可组合状态，或给聚合优先级和数据可展示性的条件；用一个“可选失败＋刷新中”反例解释。此为文档可执行性问题，本次未实现/验证 hook，不判定真实业务代码有 bug。

## 用户起点与信息架构

适合保留的表达是：先给目标、角色、状态、权威与失败，再连接页面/请求经验；陌生业务事实缺失不作为前端基础不足。09-11 六岗案例、09-16 效率训练、09-18 导师深入研究及 r0/r1 学习审计都在这一点有具体行动，不只是口号。

主要阅读负担来自重复九步循环、11 节整齐报告、并列状态维度和全套协议。它们适合审计原件，不适合作为每次给用户的首段。建议现行入口仅显示“本次要解决的事—关键因果—一个重要失败—下一步”，详细协议按任务风险展开，链接历史案例；这是信息呈现建议，不宣称已减少认知负荷。不要为了短，把服务端终态、提示来源或真实验证删掉。

## 保留项与不应改项

- 保留 r0/r1 历史发现、首次失败、held→pass 轨迹、模型 unknown 与就地纠错；不重写成首次即通过。
- 保留合成/Mock/结构/静态/运行/生产分层，保留 JEV MCP 与 CLI 分通道可达性。
- 保留岗位的专业差异：前端请求归属、后端副作用、设计能力与可感知反馈、产品分母与护栏、导师帮助来源、测试证据关闭、路由原生回执。
- 保留旧材料作为研究/案例证据。obsolete 的 EXECUTION 仅撤回新任务执行效力；不删除、不迁走、不静默改模型值。
- 不按文档数量、pass 数、共同答案、小数置信或共享额度推算岗位能力/用户能力/提效百分比。
- 不把 AI/员工产物记给用户；不把已经公开的题再记为未见迁移。
- 不修改业务代码、真实课程进度、用户能力状态、平台 hooks、权限、账号、插件安装或发布状态。
- 本报告 pass 是提示与文档范围结论；不替代技术主张复核、真实能力评测、实际模型鉴证或平台行为验收。

## 逐文件 disposition 与内容身份

每行均完成全文语义阅读。SHA-256 是固定 r2 快照内容身份，不是源当前版本认证；本表为 41/41 完整清单。pass 不代表依赖文献、平台或业务结果重新验证；improve 表示局部可读性/效力改进；conflict 表示本文件或同行规则有可定位冲突；evidence-gap 表示指定历史主张缺独立原件；obsolete 表示历史执行规格不再适用于新任务。

| # | 路径 | SHA-256 | disposition | 逐文件语义结论 |
|---:|---|---|---|---|
| 1 | `learning/2026-09-11-remaining-roles-retraining.md` | `e0c6edf9e4c992bea30b838717c53d3483e878c2799f3e6451e5a17d4bfc3c58` | pass | 合成题、真实执行者、unknown 模型、案例/实战分层及季度复核清楚；保留六岗差异。 |
| 2 | `learning/audit-efficient-work-training-2026-09-16/REPORT.md` | `92f1659cb86e99e4a794bc0bf3567f9a7553eac8d8257bfad4d89a4a7e508680` | pass | 三组模拟八岗、辅助迁移与真实效率分开；普通任务轻量豁免及不覆盖最高规则清楚。 |
| 3 | `learning/evaluations/2026-09-11-workflow-v1/REPORT.md` | `b19e803a17f19aa33a9625d4cf6d1a448a258bf04ce5e4548a95aca862d6d6f2` | evidence-gap | 报告边界谨慎；audit/fixture/读取账本未在本全集携带，不能重证历史实验（PB-07）。 |
| 4 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-ai-context-audit.md` | `f9aa29b628a62eb74d85b59b860def81eb37fd4d4d0c30c86df95e7fa5f36598` | pass | 明确全文与片段范围；r0 局部发现、平台启用 unknown 和保留题未执行分离。 |
| 5 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-knowledge-governance-audit.md` | `bff00a022232c84452ee9cd42ebcf87685f1afcf337725f85d8d63e303d5cd01` | pass | 分清快照缺件与源断链；保留历史和知识等级，建议可追溯。 |
| 6 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-learning-audit.md` | `d88f0cfe2699da3456ff41d31c66260152b5d24d8d2df01e6c28b33f2c104f73` | pass | 尊重资深前端起点，首次诊断、支架、任务族和真实学习 unknown 明确。 |
| 7 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-ai-context-re-review.md` | `32133e11edc8f97cef27e791cb9e23dd249b7631f07ab279de90cfc3f483d634` | pass | r1 fixed/open/partial 与代码/fixture/平台证据分层清楚；按版本保留。 |
| 8 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-knowledge-re-review.md` | `70bae1b23f18c52f6ed1223b3a6ef83d7c0a754ee75d70e8e21fbf7c829deba0` | pass | 结构 fixed 与历史证据 partial 分开；双向覆盖、canonical 去重建议具体。 |
| 9 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-learning-re-review.md` | `287dc56168d8b1156906a4ff60ed7b4c5bb2c9998cda6dad395445a68d5cb25c` | pass | fixed 只指规则层；一页非硬上限、必需关系遗漏、真实认知负荷 unknown 清楚。 |
| 10 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/internal-quality-review.md` | `5aae8f40a4b546fc769e7f11eb95e38e60acec78e43f098c270f7faa37f8af0e` | improve | 末段仍列测试岗外审待完成，快照已含对应外审；补历史阶段及后续结果指针（PB-04）。 |
| 11 | `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r2/SNAPSHOT_SCOPE.md` | `95963faa9cca3e5929f24c38dcac21bd30aaa2ad0496c4a302ec98925ef11cea` | pass | manifest 为全集；有意省略、模型/隔离 unknown、用户能力 no_evidence 边界清楚。 |
| 12 | `learning/internalization/runs/2026-09-13-spark/ai-engineer-audit.md` | `a8ccbbfa6c9d654bc8472abab5b8908310c50a3a787fbc30b6d9737fca12aee2` | conflict | actual_model 声称与当前缺鉴证边界不一致；迁移落地强表述及 4/5 计数需历史纠错（PB-01/07）。 |
| 13 | `learning/jev-mcp-training-2026-09-22/README.md` | `bdb84063a53f93860218a6086cd25cc9043e64a7969901c8cecce0a1457de87e` | improve | 短入口将独立复核全部通过直接前置，未呈现 corrected independence unknown 与案例上限（PB-01/04）。 |
| 14 | `learning/jev-mcp-training-2026-09-22/REPORT.md` | `c3ee9ae2a13f2e486472807cf175719b5fa739fc936824a098a89cf49bdd3914` | improve | AI-06 就地纠错有效；九步/七步循环仍以未来时日常默认发布，缺轻量退出与现行 canonical（PB-02）。 |
| 15 | `learning/jev-mcp-training-2026-09-22/ai-engineer.md` | `b8d233206f54137373dedf276f3a88104a441daae3d509330dec27c7a9e3549c` | improve | 恢复 7 题和原 8 题已分口径；“验证模型身份”应限定为服务返回字段，调用阈值不替代专业裁决（PB-01）。 |
| 16 | `learning/jev-mcp-training-2026-09-22/backend-expert.md` | `c397953d3358523c9a6a63f8fae7b43627b15198e784e8917e494f263320b14e` | conflict | 无校准人工自评必须达到 0.80、schema 限 0..1，与 unknown 置信边界冲突（PB-03）；保留 JEV 三阈值历史。 |
| 17 | `learning/jev-mcp-training-2026-09-22/backend-training-architect.md` | `3e1842fbe3d217eb2bc40287207d636300c72d28e5c1ce4f4c6bf42ffbd0c89d` | improve | 0.95→0.75 已记明，但重试只改连接/模型的叙述须区分恢复批次；CLI 文件路由不是本地推理（PB-06）。 |
| 18 | `learning/jev-mcp-training-2026-09-22/chief-of-staff.md` | `f9af877ec05f9ea2601aacf746b1c369f111c13658f0d1949e4b76f32732e5cd` | pass | 修复主责与发布门禁拆题是有效岗位差异；人工 confidence 未计量、CLI/MCP 分开。 |
| 19 | `learning/jev-mcp-training-2026-09-22/design-master.md` | `b7cd2a0becd7b53e0493d7ddc38cafdc4c685d81d5f45096ce64a410482281b6` | pass | 枚举局限、阈值边界、合成无障碍与真实测试分离；保留条件通过而非全局放行。 |
| 20 | `learning/jev-mcp-training-2026-09-22/frontend-expert.md` | `0300d66060cea938b59ef3b19015e791aba2b4ad32afc397bd1cbe69ef980a51` | improve | 把 exit-code 构建成功也默认交类型化模型；需确定性出口，且保留文件外部发送权限前置（PB-02/06）。 |
| 21 | `learning/jev-mcp-training-2026-09-22/knowledge-deposit-review.md` | `2ea505f8dc3cef29668a5ecc5b94c772f3ec88b39c0631f327af4751ccae9a8f` | pass | 已就地更正 new turn 不等于隔离；历史 hash 与后续修改失效条件明确，不重认历史服务收据。 |
| 22 | `learning/jev-mcp-training-2026-09-22/product-manager.md` | `1d379c20cd7b09ae280fcc971ebdb14dafd25b14f33167a933f9940cdffd632e` | improve | 首轮 0.92 与恢复 0.70 都记录，但第六节继续有效引用易携带旧阈值；补最终协议参数指针（PB-04）。 |
| 23 | `learning/jev-mcp-training-2026-09-22/quality-review.md` | `e6c86f3c1923d48affa8d5201078830af920a5a6091f1a18dd402f0ef8fa1aba` | evidence-gap | 独立性与历史调用原始收据不可重证；64 项 CLI 不可达只是失败；精确 #L 锚点不稳（PB-05/07/09）。 |
| 24 | `learning/jev-mcp-training-2026-09-22/test-expert.md` | `0bc9ad19a5d3884ff0a11665fb9767f2f986f925b02c142e5cedef697d183b0e` | improve | 案例边界总体好；F 项“可顺手修正”会扩大范围，末尾待复核未连到最终结果（PB-04/10）。 |
| 25 | `learning/professional-capability-audit-2026-09-18/REPORT.md` | `576101b1f6f2fe6c38fda75da8c685a809f3a3ad032fb9c1f44c1f7a0ed56d99` | pass | 研究增量/真实交付/生产三层清楚；实际模型 unknown、前端旧候选纠错和三任务限制保留。 |
| 26 | `learning/professional-capability-audit-2026-09-18/quality-review.md` | `906c53a9b604a3a6ae68d2d916dbc83f0e0b899d8a45813df8eee4216d5870be` | improve | 允许进入提交推送阶段须注明只表示质量准备就绪，不构成当下授权；历史版本绑定待补（PB-08）。 |
| 27 | `learning/professional-capability-deep-research-2026-09-18/EXECUTION.md` | `e502aaecde5445d30495c6912c23c811aa06d749089327c898734b3b8b1ef78f` | obsolete | 只对已结束 09-18 批次有效；固定模型/85%/每分钟监控不得作为新任务现行指令（PB-04）。 |
| 28 | `learning/professional-capability-deep-research-2026-09-18/REPORT.md` | `4752af484034288f46992cd2e3babd4c684438acc0becdd0313bbdc856272241` | pass | KG-06 纠错在入口覆盖旧表头；状态 7 partial+1 research_complete 的层级说明充分。 |
| 29 | `learning/professional-capability-deep-research-2026-09-18/ai-engineer.md` | `5938b94c98e9cb032c716fb42d9808fc753ca73f0b1edb79cbd45af1343a0d91` | pass | 以 09-18 采样定位工具状态；scope/对象/下游结果与研究完成分开，不承诺当前可用。 |
| 30 | `learning/professional-capability-deep-research-2026-09-18/backend-expert.md` | `45474354a7ead32c98f43e9ecd5fed0496ef1e60b63585973f03fa3cc26330c6` | pass | 非幂等受限执行按条件而非行业，反例和目标契约 unknown 充分；是研究协议。 |
| 31 | `learning/professional-capability-deep-research-2026-09-18/backend-training-architect.md` | `4f197094920ffd160927defa1f0935c4a6b4efcdef8ec28b7bb8a6d5ae5ba4b0` | pass | 区分前端经验/业务模型/语法帮助，已泄题须换变体；不把导师代码分析计为用户能力。 |
| 32 | `learning/professional-capability-deep-research-2026-09-18/chief-of-staff.md` | `9cc832b42765f7a391dfa305bee0d41126e6a3afe8b0718b01df7fccee14a142` | pass | execution 与 operation 身份分工、取消两阶段、本地 27/27 与平台 unknown 清楚。 |
| 33 | `learning/professional-capability-deep-research-2026-09-18/design-master.md` | `afefef22bec15fb5c9687b16d3d4a0e0d7aec15cf3b196b1b2cac1e193eda606` | pass | 概念字段不冒充 API；Figma 未读、辅助技术未验明确，低风险可裁剪。 |
| 34 | `learning/professional-capability-deep-research-2026-09-18/frontend-expert.md` | `842f99595493680a27ec2452512ae71fad79bcfd315b86cc7ed4dba50056773a` | improve | 页面聚合 ready/partial/refreshing 可同时成立，示意表缺优先级或正交维度说明（PB-11）。 |
| 35 | `learning/professional-capability-deep-research-2026-09-18/product-manager.md` | `831323316c7d3bc3c16459487ac74b045c0ef426fa74d3613ba1e2451395c6e5` | pass | 指标分母/成熟窗口/unknown、供应商声明与真实回执分开；无试点不推效果。 |
| 36 | `learning/professional-capability-deep-research-2026-09-18/quality-review.md` | `1fb1d800645c16b45431339dbff76c61c72ad1e8a44a1d65e9761a1dd78d9bf9` | improve | “本地未预给同题”由精确检索无法充分证明；补观察范围和生成隔离 unknown（PB-05）。 |
| 37 | `learning/professional-capability-deep-research-2026-09-18/test-expert-review.md` | `6aab4785c9fcbb4c20314e76f20eb8c55bfbed3e63c0b97bf2e075caa3fe479c` | pass | 单笔终态/能力解阻/隔离放行分开；知识候选不授发布权，无当期生产声明。 |
| 38 | `learning/professional-capability-deep-research-2026-09-18/test-expert.md` | `9915e130fd665e4decc9b0fd86d889f565be6c565f2c7f5445b92655323e6f20` | pass | 四类 unknown 的关闭主张具体，协议未执行与供应商仅对照明确；保留高风险条件。 |
| 39 | `learning/professional-capability-research-2026-09-18/REPORT.md` | `f3260d7162f9bd705adc2ab456a8263e623c080a05674fb63e0f4bbd7316f01b` | conflict | 派发回执仍导出“模型门禁通过/未降级”，不足证明 actual_model；需连 KG-06 纠错（PB-01）。 |
| 40 | `learning/professional-capability-research-2026-09-18/ai-engineer.md` | `10afedef8c4f38e5bed4bd846d7e046ecbb670d7b06571fcca4a823ccf3b4abe` | conflict | 页首及末尾 reviewed_case/pass 与“当前 unknown：顾清妍独立复核结论”同时存在（PB-04）。 |
| 41 | `learning/professional-capability-research-2026-09-18/quality-review.md` | `c2239309c84f02885d1cea27729e40e5072e0ba8be37309a7149e8954164c6c1` | improve | 首轮 held 与最终 pass 轨迹完整；首页应指最终章节，避免检索截断拿首轮作当前（PB-04）。 |

## 最小后续范围

先对 PB-01/03/04 做精确入口纠错；PB-02/06 共用一个现行判断入口，其余历史只指向它；再按需处理 PB-05/07 的证据上限和四项 P3。不要求另起全员培训或补做业务实验。最终复核应检查纠错指针能否在直达旧文件时被看到、最新状态是否唯一可定位、unknown 是否允许、单项确定性任务能否退出完整流程。未取得真实任务证据前，效率和能力效果继续 unknown。

