# 外部组织知识与文档治理独立审计 · r0

- run_id：`2026-09-22-company-capability-ai-efficiency-v1`
- r0 manifest SHA-256：`d8feca13d164866ce1f53153b11a04688b7b66f662a3425142e1d3d01da90561`
- 独立角色：裴谨言 · 外部组织知识与文档治理审计师；独立 AI 审计角色，非现实人类、非公司员工、非监管者，不提供现实外部认证。
- 原审计只读范围：`/private/tmp/ted-company-audit-r0.20djmU` 固定快照；未联网、未修改快照或公司源、未读取快照外公司路径。
- 证据边界：快照缺件不等于公司源断链；源文件是否存在及其当前内容未回读，保持 unknown。
- 本次归档：仅将已交付报告原样保存至本文件，补充本元数据；不改变原审计发现、证据或结论。

审计结论：r0 不能整体判定通过。知识的证据边界大多谨慎，但发布一致性、目录覆盖和审计输入完整性存在缺口。未发现 Critical；发现 3 项 High、3 项 Medium、2 项 Low。全部为只读审查，未联网、未修改文件、未读取快照外公司路径。

审计人：裴谨言 · 外部组织知识与文档治理审计师；独立 AI 审计角色，并非公司员工或现实外部认证机构。

审计范围与版本：

- 固定快照：[r0](/private/tmp/ted-company-audit-r0.20djmU)；run_id：`2026-09-22-company-capability-ai-efficiency-v1`。
- 源 Git HEAD：`4e16e9e63a493613301d757d3fc93f1a288df362`，另有未提交修改，不能把 HEAD 当作全部受审内容。
- MANIFEST SHA-256：`d8feca13d164866ce1f53153b11a04688b7b66f662a3425142e1d3d01da90561`；154 个登记文件逐项 hash 一致。
- 完整审查八岗全部 PROFILE、MEMORY、KNOWLEDGE、SKILLS，共 32 文件；公司 INDEX、catalog、指定治理文件、9 月 18 日专业能力审计及综合研究、9 月 22 日 JEV 沉淀复核、本次需求说明复盘。对快照 128 个 Markdown 做了相对链接机械扫描；这不等于逐篇语义认证。
- 重新执行全量 `check-knowledge`：46 项，2 个 hash 错误，0 个 warning；状态分布为 38 个 `reviewed_case`、5 个 `candidate`、3 个 `stale`。

1. High · KG-01：AI 工程师条目出现三方版本分裂，仍保留已审状态。

证据：[catalog](/private/tmp/ted-company-audit-r0.20djmU/knowledge/catalog.json:257)、[岗位目录](/private/tmp/ted-company-audit-r0.20djmU/employees/ai-engineer/MEMORY.md:5)、[当前详情](/private/tmp/ted-company-audit-r0.20djmU/employees/ai-engineer/KNOWLEDGE.md:30)。

| 位置 | SHA-256 |
|---|---|
| catalog 的 `ai-engineer-core`、`ai-engineer-experience-transfer` | `6ab1ab5873c2a4f431585521eb6453ba9037ef627f74d4e86d62b74009d2f36d` |
| MEMORY 两条及 radar 条目 | `151ae39912cf094336f9338a43b424b09ab8e99ed58f960b9bde8ae04199d830` |
| 当前 KNOWLEDGE 正文及 manifest | `1b9b8f0423fcc8c9e491fe3cb1d5d970bdfba2b1dcd4ab4d6c5254de0f9e5f14` |

事实：两个旧 ID 的全量校验失败，目录仍标 `reviewed_case`；本次需求复盘已在[收口记录](/private/tmp/ted-company-audit-r0.20djmU/inbox/session-events/2026-09-22-adaptive-requirements-training.md:74)记录该漂移。推断：多条知识共用一个正文、并发更新目录与 catalog，扩大了维护耦合。unknown：没有旧版完整正文，不能证明仅新增 radar 而旧语义完全未变，也不能认定哪个 hash 是应恢复版本。

消费者影响：来源与时间治理的检索入口已失去“摘要对应已审正文”的保证。

建议由辛澈 · AI工程师核对前后正文、证据与实际修改归属，顾清妍 · 质量测试工程师独立复核；完成前停止采用受影响摘要，按政策标记失效或在当前事件明确隔离。语义审定后同一变更同步详情、目录和 catalog。

Adopt：受控失效、逐项语义复核、保留首次失败。Reject：只刷新 hash、回退其他任务合法修改，或直接断言知识内容错误。

2. High · KG-02：唯一显式 `verified_context` 岗位知识未进入 catalog，校验器存在覆盖盲点。

证据：[radar 目录条目](/private/tmp/ted-company-audit-r0.20djmU/employees/ai-engineer/MEMORY.md:21)和[详情](/private/tmp/ted-company-audit-r0.20djmU/employees/ai-engineer/KNOWLEDGE.md:32)均存在 `ai-capability-source-link-radar`；46 项 catalog 没有此 ID。

[校验器](/private/tmp/ted-company-audit-r0.20djmU/scripts/check-knowledge.mjs:11)只遍历 catalog；第 20 行在整份索引做 `includes`，不限定对应 ID 段落；也未核对 owner、updated 或反向发现目录漏登记。每岗有至少一条目录项即可满足第 24–25 行，不保证全部条目受检。

事实：上述遗漏能由当前文件直接复现。推断：即使修掉两个已知 hash 错误，“全量绿色”仍不能证明目录完整；字段移到其他条目也可能躲过检查。此类移位负例本轮未做文件变异实测。

建议补登记 radar，但发布状态必须由证据复核决定；校验器增加“目录知识 ID → catalog”的反向覆盖、按 ID 段落核对字段，以及 owner/date 检查。公司共享知识的岗位引用应作为引用检查，避免制造重复 catalog ID。

Adopt：修复覆盖范围及条目绑定。Reject：把当前“46 项全量”称为所有可发现知识的完整检查。

3. High · KG-03：r0 缺少多项直接支撑能力结论的证据，完整能力复审受限。

机械扫描发现：357 次快照内相对链接中，114 次指向 66 个未携带目标。重点缺件包括：

- 八岗核心知识引用的 9 月 11 日两份训练原件。
- 9 月 13 日八岗迁移审计及相关内化原件。
- 9 月 18 日第一轮八岗研究及其质量复核；[最近能力审计](/private/tmp/ted-company-audit-r0.20djmU/learning/professional-capability-audit-2026-09-18/REPORT.md:15)直接依赖这些材料。
- radar 的 README、发现审计、发布审计及采集结果四份证据，支撑其 `verified_context` 和 32/32、33/33、20 源运行、私有站发布主张。
- 部分历史 fixture、运行结果及读取账本。

事实：这些目标不在 r0；manifest 本身没有对应遗漏原因及影响说明。unknown：公司源文件是否存在、原始结果是否准确，均未回读。不能把“快照未携带”改写成“源文件已断链”。

消费者影响：可审查主张是否谨慎，不能重新认证其历史运行事实；尤其不能接受 radar 的验证等级已在本轮得到复核。

建议下一版仅补齐本轮实际决定所需的最小证据，其他省略项登记原因和结论上限；冻结新快照，不在 r0 原地补件。

Adopt：最小证据闭包及省略清单。Reject：复制全部历史聊天、越界回读，或因快照缺件将所有源知识一律标 stale。

4. Medium · KG-04：在用的来源治理标准与 `stale` 知识入口存在效力歧义。

[COMPANY 第 9 条](/private/tmp/ted-company-audit-r0.20djmU/COMPANY.md:26)要求所有研究遵循 Research Source Governance；[公司目录](/private/tmp/ted-company-audit-r0.20djmU/knowledge/INDEX.md:32)却将该条标为 stale、不得直接指导执行。[正文](/private/tmp/ted-company-audit-r0.20djmU/knowledge/research-source-governance.md:40)仍写统一评分和强制排除，并在第 59–62 行保留历史模型档位建议。

事实：当前治理引用、目录失效状态、历史执行性措辞并存。推断：直接读 COMPANY 的执行者与先读 INDEX 的执行者可能采取不同流程。当前知识政策虽规定安全治理不因 stale 自动失效，但未明确区分此标准哪些部分仍是现行规则、哪些只是历史方法。

建议保留现行的原始来源、独立性、时效、专业责任和授权原则；明确唯一现行入口。旧评分、来源名单和模型例子保留历史身份，必要时指向替代版本，由辛澈 · AI工程师与陈知行 · 路由官共同确认。

Adopt：明确效力与替代关系。Reject：以 stale 为由取消安全边界，或无复核恢复整篇旧标准为 active。

5. Medium · KG-05：目录与共同方法持续膨胀，已增加必读和同步成本，净提效尚无证据。

测量为 Unicode 字符，不是 token：

- 初始化规定的七份基础文件合计 19,767 字符，尚未加条件政策、岗位入口、工具元数据。
- 八岗 MEMORY 合计 25,742 字符；八岗旧 KNOWLEDGE 合计 15,538 字符。每岗 MEMORY 都比其旧 KNOWLEDGE 更长，但 MEMORY 同时覆盖新增专题，不能直接宣称其毫无价值。
- 同一“审计后的效率培训”摘要在八岗目录复制共 3,184 字符，公司 INDEX 另有一份；共享事实改动需维护九处。
- 八张 JEV 岗位卡合计 25,045 字符，均重述共同判断循环。抽查的[AI 卡](/private/tmp/ted-company-audit-r0.20djmU/employees/ai-engineer/JEV_LIKE_JUDGMENT_HABIT.md:16)、[路由卡](/private/tmp/ted-company-audit-r0.20djmU/employees/chief-of-staff/JEV_LIKE_JUDGMENT_HABIT.md:17)仍有有价值的岗位差异，不能整批删除。
- 18 个 catalog 条目共享八份旧 KNOWLEDGE 文件的全文 hash；增加无关章节也会使同文件其他条目失效。

[9 月 11 日评测](/private/tmp/ted-company-audit-r0.20djmU/learning/evaluations/2026-09-11-workflow-v1/REPORT.md:45)已经观察到命中短正文时目录增加读取成本，且净节省未证实。本轮材料仍没有新的可比真实流程成本结果。

建议优先合并重复事实及共同循环，岗位保留触发条件、差异、反例和来源；先在一个重复最明显主题试行。AI 旧正文可在修复时按主题拆卡，以减少整文件 hash 耦合。比较同口径“完成一个真实任务”的读取和维护成本后再推广。

Adopt：局部合并、保留差异、实测净成本。Reject：继续为每次复盘全员新增一套模板，或把上述字符数换算成 token 节省。

6. Medium · KG-06：历史研究报告的“实际模型”措辞未被最新纠正就地关联。

[第二轮综合报告](/private/tmp/ted-company-audit-r0.20djmU/learning/professional-capability-deep-research-2026-09-18/REPORT.md:26)以“实际模型回执”“实际模型”表头登记八岗 `gpt-5.6-sol/high`；[后续独立审计](/private/tmp/ted-company-audit-r0.20djmU/learning/professional-capability-audit-2026-09-18/REPORT.md:13)明确实际模型身份无法独立核验，应记 unknown。

事实：两份可被直接检索的报告对证据属性表述不同。unknown：本审计未取得运行时身份凭证，不能判断历史实际模型。

建议保留历史原文和当时登记值，在旧报告入口增加日期明确的纠错指针；今后区分请求配置、工具回执和运行时鉴证。不要静默改写历史成“当时从未宣称实际模型”。

Adopt：可追溯纠正和旧入口关联。Reject：用请求参数认证实际模型，或用角色名称证明模型能力。

7. Low · KG-07：周度整理条目绕过正式知识发现与证据元数据。

[9 月 21 日整理](/private/tmp/ted-company-audit-r0.20djmU/knowledge/2026-09-21-weekly-curation.md:1)标 `reviewed_case`，但无稳定 ID、来源、Reviewer/置信度、详情入口和 catalog 登记；[9 月 13 日整理](/private/tmp/ted-company-audit-r0.20djmU/knowledge/2026-09-13-weekly-curation.md:1)类似，以 `confidence: reviewed` 混用了审查状态与置信度。

事实：两份文件不能通过正式 INDEX/catalog 被发现；多数内容是既有边界的重述。unknown：会议来源可能在未携带材料中，本轮不能核验。

建议判定它们是“历史整理记录”还是改变未来决策的新知识：前者保留历史、链接唯一现行规则；后者补最小来源并合并到对应现有条目，不为重复原则再造新 ID。

Adopt：明确类别并去重。Reject：因文件存在或写了 reviewed_case 就计作新增能力。

8. Low · KG-08：能力清单和部分岗位目录元数据不足，容易被误当成能力认证。

多数 SKILLS 只是 Java、React、设计、测试等职责词汇清单，例如[后端](/private/tmp/ted-company-audit-r0.20djmU/employees/backend-expert/SKILLS.md:1)、[前端](/private/tmp/ted-company-audit-r0.20djmU/employees/frontend-expert/SKILLS.md:1)。导师[SKILLS](/private/tmp/ted-company-audit-r0.20djmU/employees/backend-training-architect/SKILLS.md:11)已经明确“应覆盖的能力，不冒充逐项实践认证”，其余岗位缺少同样清楚的解释和证据入口。

另有四岗新需求说明引用缺更新时间，示例：[前端目录](/private/tmp/ted-company-audit-r0.20djmU/employees/frontend-expert/MEMORY.md:5)；catalog 只检查公司 INDEX，未覆盖这些镜像引用。

建议用一句共同定义说明 PROFILE/SKILLS 是职责范围，再链接最近能力审计；真实能力只按“证据、环境、独立程度、日期、上限”登记，不建立新的全员评分体系。引用条目补 canonical ID/更新时间或采用可校验引用形式。

Adopt：声明与证据分离、补缺元数据。Reject：把职责列表判成虚假履历，或把新增描述算能力提升。

不应修改项：

- 保留 r0、首次校验失败、SOURCE_GIT_STATUS 和历史审计原文。
- 保留 `reviewed_case`、`candidate`、`unknown` 及“生产效果未验证”的限制；不因再次审阅或多个 AI 同意升级。
- 保留前端旧页面迁移 `candidate/low` 及 `not_started` 与 `verified` 冲突说明。
- 保留 JEV 卡中 MCP 可选、不可达升级、数据与权限不扩张的边界。
- 不因资料仅有 3–11 天历史而批量标 stale；季度复核尚未到期，失效应有版本、事实或依赖依据。
- 不把本轮 AI 审计、员工答案和整改成果记作用户本人能力。
- 不为缩短上下文删除安全、授权和必要验收要求；不自动安装工具或新增后台任务。

最多两轮整改：

1. 第一轮先解决发布一致性与证据覆盖：KG-01/02/03，核对 radar 的独立证据，修正 ID/状态/hash/引用关系及校验盲点；同时明确 KG-04/06 的现行效力和纠错指针。创建 r1，保留 r0。
2. 第二轮仅做必要的去重和发现入口收敛：KG-05/07/08；执行受影响结构正反例、一次新上下文定向检索，以及下面的保留题。未补齐原始能力证据的部分维持 partial/unknown，不能另开“知识修复两轮”重置预算。

新保留题 H-KG-01，先固定题面和判据，尚未执行：

> 在一次性合成副本中，A、B 两条知识正文 hash 都正确，A 应为 reviewed_case、B 为 stale。索引全文件包含所有正确值，但同步器把两条的状态、owner、日期写入了对方段落；另外加入一个有完整摘要的 C，却漏登 catalog。要求只复用 A 完成低风险任务，D 为无关且一致的条目。

通过判据：

- 校验器定位 A/B 的段落级错配和 C 漏登记，不因整文件 `includes` 成功而放行。
- 执行者对 A 先处理冲突，不依赖“全量绿色”作语义结论；不刷新 hash 来掩盖问题。
- D 不因无关条目失败自动失去使用资格。
- 不联网、不回读副本外路径、不提升任何知识等级；保留失败及修复证据。
- 结构结果和执行者语义判断分开验收。

公司能力结论的证据上限：

当前可以确认存在覆盖八岗的职责定义、案例方法、反例和审计记录；最近专业能力审计明确八岗真实独立交付提升均为 `unverified`。JEV 沉淀可支持“记录完整、方法经案例复核”，其复核自身也说明没有独立原始服务端收据。

本轮不能证明八岗稳定生产能力、真实交付提升、长期返工下降、准确率提升或净 token/成本节省；也不能重新认证 radar 的局部 `verified_context`。建议对外结论限定为：**已形成有边界的岗位方法资产；知识发布一致性需要整改，生产能力和效率收益仍须真实任务证据。**
