# 外部组织知识与文档治理独立复审 · r1

- run_id：`2026-09-22-company-capability-ai-efficiency-v1`
- 固定受审快照：`/private/tmp/ted-company-audit-r1.9n3TCf`
- r1 MANIFEST SHA-256：`aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde`
- 独立角色：裴谨言 · 外部组织知识与文档治理审计师；独立 AI 角色，非公司员工、非现实人类、非监管者，不提供现实外部认证。
- 审计与归档边界：以下复审结论先于本次归档形成。原审计只读固定 r1 快照，未读取实时公司源、未联网、未修改任何文件；本次仅按后续授权写入本报告文件，不修改被审文件、原报告正文或结论。

---

r1 已修复目录覆盖与字段绑定，但尚不能关闭全部知识治理发现：**3 项 fixed、3 项 partial、2 项 open，未发现足以判定 regressed 的证据。**

审计角色：裴谨言 · 外部组织知识与文档治理审计师。独立 AI 角色，非公司员工、现实人类或监管者；本报告不提供现实外部认证。

审计仅使用固定快照 `/private/tmp/ted-company-audit-r1.9n3TCf`。未读取实时公司源，未联网，未修改任何文件。

**证据完整性与验证范围**

- MANIFEST SHA-256 与指定值一致：`aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde`；162 个登记文件逐项 hash 全部一致。
- 完整阅读 r0 知识审计、r1 catalog/INDEX、知识检查器与夹具、八岗 MEMORY/SKILLS、能力审计及相关治理和雷达证据。
- 当前知识检查结果：47 项，`errors=[]`、`warnings=[]`；状态为 38 个 `reviewed_case`、5 个 `candidate`、1 个 `verified_context`、3 个 `stale`。
- 扫描 134 个 Markdown 的内联相对文件链接：393 次引用中，109 次指向 62 个未携带目标。此为文件目标扫描，不是完整 Markdown/锚点验证；快照缺件不等于公司源断链。

| 发现 | r1 verdict | 结论 |
|---|---|---|
| KG-01 AI 三条发布一致性 | partial | hash 与目录已统一；历史语义及发布依据仍缺独立证据闭包 |
| KG-02 目录反向覆盖 | fixed | radar 已登记；段落绑定、反向发现和共享引用检查有效 |
| KG-03 最小证据闭包 | partial | 补入雷达四份记录，但关键原件与省略说明仍缺 |
| KG-04 来源治理现行效力 | partial | 唯一入口已明确；历史卡新增“现行”复述仍加严 |
| KG-05 重复上下文与维护成本 | open | 重复事实与共同循环尚未收敛，净收益未验证 |
| KG-06 历史模型纠错 | fixed | 旧报告入口有明确、可追溯的纠错指针 |
| KG-07 周度整理身份 | open | 两份整理仍混用知识状态，未明确历史记录身份 |
| KG-08 职责与实践认证 | fixed | 八岗均有边界声明，相关引用元数据已补齐 |

**KG-01 · partial**

[AI 岗位目录](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/MEMORY.md:5)、[正文](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/KNOWLEDGE.md:3)与 catalog 的三个 ID 现已统一指向：

`8bd1ecc592b14853135b8ffa30603333ad30fa1ace2bcc1a494167b6d7d61a4d`

前两条维持案例等级；雷达明确限定为 2026-09-19 历史环境，未认证当前线上状态，也未认证候选可靠性。首次失败保留，发布前独立复核条件没有被删除。这些属于有效修复。

仍不能判为全部 fixed：正文声称已对照 Git 基线、9 月 11 日原件和 9 月 13 日本岗审计，但这些核对输入没有随 r1 携带。我能确认当前摘要与当前正文相符，不能独立确认“旧语义未改”的历史比较，也不能重新认证历史运行及私有站版本 8 发布。

允许结论：三方结构漂移已经消除，历史结论边界已收窄。不得据此宣称三条已获本轮完整发布认证。

**KG-02 · fixed**

[检查器](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/check-knowledge.mjs:73)按知识 ID 段落核对状态、日期、owner、hash 和详情目标；[反向扫描](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/check-knowledge.mjs:112)覆盖公司 INDEX 和各岗 MEMORY，能发现漏登记 ID，也区分共享知识引用与非规范重复目录。

为遵守不得写文件的约束，我没有运行会创建、删除临时目录的磁盘夹具；改为对原检查器执行内存文件系统注入，得到：

- 合法基线通过。
- A/B 的 status、owner、updated 分别交换时，均定位两条对应错配。
- H-KG-01 联合场景识别 A/B 错配和 C 漏登记。
- 无关 D 的定向检查仍通过。

因此保留题的**结构部分通过**。语义处置应为：A 的冲突解决前不依赖其摘要执行，不能刷新 hash 掩盖错配；D 不因无关项失败自动失效。本轮没有把这些结果冒充真实任务完成或通用语义认证。

**KG-03 · partial**

r1 新增雷达 README、发现审计、发布审计、collection，能够确认历史记录存在、两份报告指向同一个六文件快照，collection 中六个候选均保持 `candidate/hold/pending`。

证据闭包仍不完整：

- AI 正文直接引用的 [9 月 11 日原件位置](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/KNOWLEDGE.md:9)和[9 月 13 日本岗审计位置](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/KNOWLEDGE.md:27)未携带。
- [能力审计](/private/tmp/ted-company-audit-r1.9n3TCf/learning/professional-capability-audit-2026-09-18/REPORT.md:17)直接依赖的第一轮研究报告及相关原件未携带。
- 雷达六文件审计中，仅 README 当前可逐文件核验，且 hash 相符；另五个体系文件未携带。
- collection 的 `discoveries/2026-09-19-v5.json` 未携带，因此 20 源、13 成功、31 命中等计数只能认作记录中的声明，不能独立重算。
- 四份雷达材料未提供私有站版本 8 的原始发布回执。
- manifest 没有记录这些省略的原因及对应结论上限。

32/32、33/33 是所携带历史审计报告中的运行记录，不是本次复跑结果。无需补齐全部 62 个目标，但本轮决定所依赖的原件必须补齐，或明确登记为何省略以及因此不作何种认证。

**KG-04 · partial**

[COMPANY 现行来源治理](/private/tmp/ted-company-audit-r1.9n3TCf/COMPANY.md:34)已经明确唯一现行入口，采用按风险核验、保留缺口和冲突的表述。旧统一评分、强制排除清单、来源名单和模型例子也已明确停止执行效力。

但[旧卡新增的“现行效力”段](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/research-source-governance.md:8)仍复述为“先建立来源地图”“对重要主张独立交叉验证”，遗漏风险适配及无法独立核验时的处置，比 COMPANY 更刚性。它又被放在当前澄清段，不能完全由“下文是历史原文”消解。

最小修复是将该段改为直接指向 COMPANY 的现行章节，避免再维护一套执行性复述；历史正文可继续原样保留。

**KG-05 · open**

当前测量均为 Unicode 字符，不能换算成 token 节省：

- 八岗 MEMORY 合计 28,162 字符；r0 已归档审计记录为 25,742。
- 八岗“审计后的效率培训”重复段仍合计 3,184 字符，公司 INDEX 另有同一事实。
- 八张 JEV 岗位卡仍合计 25,045 字符，共同判断循环仍重复维护。
- AI 三条仍共享同一正文 hash，局部修改仍会牵动其他条目版本。

新增内容中有必要的职责和证据边界，因此不把字符增长直接判为质量退化；但 r0 的重复与维护耦合尚未解决。没有同口径真实任务读取、维护及完成成本，净效率收益仍为 unknown。

**KG-06 · fixed**

[第二轮历史报告入口](/private/tmp/ted-company-audit-r1.9n3TCf/learning/professional-capability-deep-research-2026-09-18/REPORT.md:3)新增 2026-09-22 纠错，明确区分请求配置、工具接受/启动回执与运行时身份鉴证，实际模型保持 unknown，并链接后续能力审计和 r0 发现。

历史“实际模型”表头及原登记值保留，没有静默改写历史。该整改满足 KG-06 的追溯要求；它没有、也不应证明当时实际模型身份。

**KG-07 · open**

[9 月 13 日整理](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/2026-09-13-weekly-curation.md:3)仍写 `confidence: reviewed`；[9 月 21 日整理](/private/tmp/ted-company-audit-r1.9n3TCf/knowledge/2026-09-21-weekly-curation.md:4)仍写 `Status：reviewed_case`。

两份文件仍无明确“历史整理记录”分类、规范来源或现行规则入口，亦未进入正式知识发现机制。其内容大多是现有边界重述。建议保留为历史记录并链接现行规则，不为这些重复原则新增知识 ID 或能力计数。

**KG-08 · fixed，限文档治理层**

完整核对八岗 SKILLS 后，八岗均明确职责范围不等于逐项实践认证；七岗新增了最近能力审计入口，导师保留原有清晰边界并由岗位目录提供证据发现入口。需求说明引用的状态、日期及 canonical 关系已补齐，结构检查未发现这些引用的漂移。

这说明消费者更容易区分岗位职责与证据，不说明八岗实践能力已经提升。

对顾清妍 · 质量测试工程师自写文件的独立复核：

- [MEMORY](/private/tmp/ted-company-audit-r1.9n3TCf/employees/test-expert/MEMORY.md:5)保留 candidate、首次最小说明与内部完整核对的区别，并明确 AI/员工产出不计用户能力。
- [SKILLS](/private/tmp/ted-company-audit-r1.9n3TCf/employees/test-expert/SKILLS.md:5)的五维判据、帮助来源、初答保留及不设总分，与共用需求说明和导师评估协议一致。
- 相关详情及审计入口在快照内可定位；没有将结构、fixture、模型语义或 Mock 扩张为真实业务终态证据。

**本次独立复核给予这两份文件文档语义层通过**，不据此认证测试岗位生产能力、用户理解效果或认知负荷改善。

**第二轮最多三项最小整改**

1. **关闭 KG-01/03 的证据与发布边界。** 辛澈 · AI工程师与陈知行 · 路由官补齐 AI 两条旧案例比较所需的最小原件，或保留隔离；为未携带证据登记“主张—缺件—省略原因—结论上限”。雷达若只保留历史记录身份，无需为本审计重新外采或发布；若要认证计数、测试或版本 8，则须提供对应原始证据。冻结 r2 后独立复核。
2. **消除 KG-04 的现行复述分叉。** 旧卡澄清段仅指向 COMPANY 现行章节，保留历史正文与纠错日期，并同步必要 hash。
3. **局部处理 KG-05/07。** 先选“效率培训”重复主题收敛为规范条目引用，岗位只保留差异；将两份周度整理明确为历史记录并链接现行规则。JEV 共同循环可作为同一局部试验的候选，不进行全员模板重写，不提前宣称净提效。

**不应修改项**

- 保留 r0、首次 hash 失败、历史审计原文与纠错轨迹。
- 保留 candidate、reviewed_case、stale、unknown 及历史环境限制，不因本次复审升级等级。
- 保留前端旧页面迁移的 candidate/low 和执行状态冲突说明。
- 保留岗位方法中的专业差异、反例、授权、安全和必要验证边界。
- 不因快照缺件批量标记源知识失效，不因资料仅有数天历史批量过期。
- 不把员工整改、结构检查或独立 AI 审计登记为用户本人能力提升。

本轮可以确认知识发现结构及部分治理表述得到改善。**八岗稳定生产能力、真实交付提升、净 token/费用/时间节省、长期返工下降，以及用户本人能力或市场价值提升，均仍为 unknown 或未验证。**
