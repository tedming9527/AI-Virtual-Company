# 第 1 轮内部质量复核

- run_id：`2026-09-22-company-capability-ai-efficiency-v1`；日期：2026-09-22。
- 复核：顾清妍 · 质量测试工程师（Test Expert）；执行标识：`/root/test_round1_quality_review`。
- 对象：冻结 r1 的其他七岗入口、治理与知识集成及本地校验脚本。本人仅编写测试岗 MEMORY/SKILLS 和本报告；自写岗位文件不纳入独立语义通过结论，留给裴谨言 · 外部组织知识与文档治理审计师复核。
- 独立性：对被审七岗与脚本为非作者复核；本执行者收到分工、三份 r0 发现和主会话集成消息，不称盲审或完全隔离外审。上下文继承参数及实际模型身份未由本执行者独立鉴证，记 `unknown`；不以岗位或请求配置证明模型身份。
- 版本：r1 临时快照目录标识 `ted-company-audit-r1.9n3TCf`；162 个 manifest 文件；MANIFEST SHA-256 `aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde`。本地定位回执由[原事件](../../../../inbox/session-events/2026-09-22-independent-company-capability-audit.md)维护，不将临时目录视为可迁移资产。
- 总体 verdict：`partial`。结构及指定 fixture 通过，岗位文档整改大体一致；AI-01 行为冲突未修、KG-04 仍有语义残余、KG-03 历史证据仍不完整。不得将本轮全绿检查等同整体治理通过或真实项目效果提升。

## 1. 实际验证与证据上限

以下命令在冻结 r1 执行；bootstrap 和 hook 测试显式将 `AI_VIRTUAL_COMPANY_ROOT` 指向 r1。`git diff --check` 只在源 Git 工作区执行。先读脚本确认范围；fixture 只在系统临时目录创建自身测试文件，不修改 r1 或业务项目。

| 检查 | 实际结果 | verdict 与上限 |
|---|---|---|
| 重新计算 manifest 162 项 SHA-256 | 0 mismatch；检查时对应公司源文件 0 drift | PASS：固定输入完整；此前实时工作区定向读取的版本与 r1 对应一致，不代表全文 162 文件语义验收 |
| `scripts/check-company-bootstrap.sh` | 退出 0；检查 2 个 active Skill 规范源和必需元数据，不输出 Skill 正文 | PASS：检查范围内的公司结构可用，不证明 hook 安装/信任或岗位内容语义 |
| `node scripts/knowledge-bootstrap-audit.test.mjs` | 7/7，fail 0 | PASS：段落级 status/owner/date 互换、摘要移位、漏登 ID、错误共享目标/状态、active Skill 缺件与元数据负例受检；无关单 ID 检查不被其他项失败连带阻断 |
| `node scripts/check-knowledge.mjs .` | 47 entries，0 errors，0 warnings | PASS：catalog→ID 段落→详情 hash，以及 INDEX/MEMORY 反向覆盖和显式共享引用绑定；不认证摘要语义或源事实真实性 |
| `node scripts/codex-company-takeover-hook.test.mjs` | 4/4，fail 0 | PASS：现有启动、监督声明、尾注与否定表达用例；测试未覆盖 bootstrap 失败时的任务范围分流，不能关闭 AI-01 |
| 独立 bootstrap 失败 fixture | 普通只读任务、明确治理监督任务均输出 `decision: block`；两次进程退出均为 0 | FAIL（对 AI-01 政策契约）：进程成功不等于行为符合政策。仅复现 CLI 行为，不证明目标平台已信任或实际执行该 hook |
| `git diff --check` | 退出 0，无输出 | PASS：源工作区当前已跟踪差异的空白检查；不覆盖未跟踪文件的 Git diff，也不替代语义复核 |
| Markdown 相对链接机械扫描 | 393 次引用；109 次指向 62 个快照未携带目标 | PARTIAL：快照证据闭包仍不全；不是认定公司源断链，未用公司源补读这些缺件 |

新增 AI-01 fixture 使用现存 r1 hook，从一个本次创建的空临时公司根调用 `UserPromptSubmit`，分别给出“仅解释已有代码，不依赖公司治理”和“必须经公司治理并持续监督”的输入。二者都因缺少 bootstrap 程序进入统一 block 分支；测试后仅清理该空临时目录。没有禁用 hook、绕过审批或改写授权边界。

hook 在 r0、r1 与当前源的 SHA-256 均为 `a5f3aa7f74dfe6fd6c66df9fd7d284dc5e4426077f863a63d18ef1a3c0ef0fbd`，源 `git diff --name-only -- scripts/codex-company-takeover-hook.mjs` 无输出。**hook 未改，专项授权仍待定**；不得把本次政策澄清或测试通过写成实施完成。

## 2. 逐项复核

| 发现 | verdict | 本轮可确认内容与 remaining |
|---|---|---|
| AI-01 | OPEN / High 保留 | 初始化政策已明确只阻断依赖治理的范围；hook 统一阻断现状经 fixture 复现。后续须在具体授权范围内由辛澈 · AI工程师修实现并验证两类任务及目标平台契约 |
| AI-02 / KG-01 | PASS（发布结构与摘要边界） | AI 三条共用正文、MEMORY、catalog hash 一致；正文新增修订范围及历史环境限制，前两项仍 reviewed_case。未重新认证历史案例运行 |
| KG-02 | PASS（结构覆盖） | radar 已登记为第 47 项；ID 对应段落字段与反向目录覆盖通过正反例。共享知识使用同 canonical ID，未另造重复 catalog ID |
| AI-03 | PASS（指定 fixture） | active Skill 入口、目录与必需发现元数据缺失会失败；不会因校验存在性把全体 Skill 正文注入会话 |
| KG-03 | PARTIAL | radar README、两份历史审计及 collection 已进入 r1；多数早期训练/迁移/第一轮能力研究、课程与旧 fixture 仍未携带。无法重新认证历史能力或雷达真实采集/发布 |
| KG-04 | PARTIAL / residual | COMPANY 现行入口与历史评分/模型例子的失效边界已明确，但旧卡新增“现行效力”段仍将规则概括成“先建立来源地图…对重要主张独立交叉验证”，超出 COMPANY 按风险核验、缺证保留的当前措辞；需原作者或主会话在后续批准轮次统一，复核者未代改 |
| KG-06 | PASS（纠错入口） | 9 月 18 日综合报告保留原表头与登记值，并增加 actual model unknown 的就地纠错指针；不把请求配置认证为实际模型 |
| AI-06 | PARTIAL | 新手册要求实际标识、上下文继承、请求配置和身份鉴证分列；历史“新 turn”独立性凭证未补齐，仍 unknown |
| LRN-M1 | PASS（文档） | 三个任务仅触发限定任务族复核，一次验收只确认本次范围；未新增用户稳定能力结论 |
| LRN-M2 | PASS（文档） | 短诊断不计失败，先补事实/完整最小例再解释；熟悉前端经验不被陌生业务缺口否定 |
| LRN-M3 | PASS（文档） | 首屏目标、主线、对象/状态、关键失败与未知；团队内部完整核对适用项，按风险展开，不因少讲而少验证 |
| LRN-M4 | PASS（文档） | 实际 D0 与表现驱动改期；W4 自身 D+7、必要的 RAG 延迟检查均留下一周期 pending，并替换原复盘，不加时补清单 |
| LRN-M5 | PASS（文档） | 共用五维为正确/部分/错误/未观察，无总分；初答、关键错误、核心语义提出者及帮助等级保留；缺事实与未观察不记 0 |
| LRN-L1 | PASS（文档） | 100/20/三期声明为管理目标，不是统计充分性或稳定趋势；个人市场价值仍 unknown |
| KG-08 | PASS（其余七岗入口范围） | 各岗 SKILLS 明确职责不等于实践认证；新增需求共享引用具日期、candidate 与来源；导师原有职责边界保留。测试岗自写入口仅做结构自检，独立语义验收 pending |
| AI-04 / AI-05 / KG-05 | DEFERRED | 本轮保留必读契约；常驻入口、版本复用、JEV 共用循环/轻量退出与摘要去重仅为第 2 轮试验候选。没有净 token、时延或维护成本收益结论 |
| KG-07 | OPEN | 周度整理文件仍未明确转为历史整理记录或合并到 canonical 知识；不因存在 reviewed_case 字样计新增能力，本轮未代改 |

雷达证据范围：两份历史审计记录 32/32、33/33；collection 中记录 20 attempted、13 succeeded、31 raw hits、10 deduped、6 published。这里只核对记录及限制一致，未执行那些测试或联网重采。collection 的 `ledger_ref` 指向的逐源账本，以及原六文件执行环境/服务端发布回执，未在当前最小快照中形成可重放闭包；站点版本 8、当前线上状态、候选可靠性均不能由此重新认证。`verified_context` 仅保留明确限定的历史记录身份。

## 3. 七岗语义检查与测试岗排除

- 陈知行 · 路由官（Chief of Staff）：初始化失败范围、来源治理效力、模型纠错与第 2 轮护栏相容；剩余 hook 实现差异及历史独立性缺口已显式列出。
- 辛澈 · AI工程师：AI 摘要发布结构修复、radar 历史边界和 active Skill/目录正反例相符；来源卡残余措辞不得覆盖 COMPANY 的唯一现行入口。
- 沈砚舟 · 后端培训导师（资深后端架构师）：教学顺序、五维、归因、预算、W4 尾轮与市场目标在协议、计划和共用知识一致；没有把本轮整改归为用户能力。三项可比任务仍待选择，效果 unknown。
- 林知夏 · 目标规划官（Product Manager）：先业务主线与权威，短诊断和事实缺口分开；首次最小说明不压缩必要验收。
- 周启明 · 体验工程官（Frontend Engineer）：以页面/交互/请求搭桥；按钮、Mock、构建和浏览器不能认证服务端权限、事务或终态。
- 陆行远 · 可靠服务官（Backend Engineer）：实体、状态、权威先于 DTO；空结果、业务拒绝与结果未知分离，超时不直接推出业务失败。
- 苏映雪 · 信任设计官（Design Master）：一页为信息入口，不隐藏角色、失败、权威和 unknown；页面流畅或视觉简化不冒充理解与可用性。
- 顾清妍 · 质量测试工程师（Test Expert）：本岗采纳 LRN-M3/M5、KG-08，只有 MEMORY/SKILLS 两文件为本执行者整改产物；该项尚待非作者独立复核，不由本报告自签 PASS。

以上为定向模型语义复核，不是新用户理解测验、员工盲测或真实业务验收。既有 JEV 训练增量在本任务前存在，本执行者未改其正文，也不认领其成果。

## 4. 失败保留与未决

1. r0 的 46 条知识中两个 AI 正文 hash 失败，以及 radar 漏登记，保留在三份 r0 外审；r1 绿色不覆盖初始失败。
2. 本执行者首次错误使用 Bash 调用 Zsh bootstrap，因 `typeset -A` 不兼容退出 2；按 shebang 入口重跑后通过。这是调用方式失败，不是 bootstrap 产品缺陷。
3. 主会话回执说明首次 r1 冻结把 r0 的 `SOURCE_GIT_HEAD/STATUS` 元数据误当公司源路径而失败，未改源；随后新快照成功。本条是接收的执行回执，非本执行者独立重演。
4. 复核附加探测 `SNAPSHOT_SCOPE.md` 返回不存在，未将该可选文件当作必需门禁；快照遗漏范围以本报告的扫描与结论上限说明。没有据此补读快照外历史证据。
5. 本轮事件已记录 JEV 批量判断 14 项因网络不可达返回 `escalate: true / unreachable`。本执行者发现本地 CLI 存在、MCP 判断工具不可调用，未重复远端重试或将规则判断伪称 JEV 已通过；结构判断来自确定性命令，语义 verdict 由复核者承担。
6. 仍须完成：测试岗文件外部独立复审；AI-01 专项授权与实际修复/平台验收；KG-04 残余统一；KG-03 历史缺件按所需结论补最小证据或保持限制；KG-07 与效率候选在共享最多两轮预算内裁定。

四层收口：**结构 PASS（限定范围）；fixture PASS，另有 AI-01 政策行为 FAIL；模型语义 PARTIAL；真实项目/学习/生产与净效率效果 unknown。** 本轮审计与员工整改不新增用户专业能力证据，不能据检查全绿宣称生产能力提升。

2026-09-24 审计修复：本报告为 r1 快照；后续外审与最终结论见 r2 各分片报告。
