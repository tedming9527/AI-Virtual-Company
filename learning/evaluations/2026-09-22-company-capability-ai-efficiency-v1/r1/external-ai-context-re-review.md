---
run_id: 2026-09-22-company-capability-ai-efficiency-v1
snapshot_version: r1
snapshot_manifest_sha256: aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde
auditor: 梁策 · 外部 AI 系统与上下文架构审计师
auditor_identity: 独立 AI 审计角色；非公司员工、非现实人类、非监管者
company_read_scope: /private/tmp/ted-company-audit-r1.9n3TCf
audit_boundary: 审计结论仅基于固定 r1 快照、任务交接与注明日期的官方一手资料；未回读实时公司源形成结论
archival_boundary: 归档写入发生在审计结论形成之后；只新增本报告文件，不修改被审文件或结论
archival_note: 以下完整报告原样保留；正文“未写入文件”描述结论形成时的状态，不表示本次归档未发生
---

复审结论为 **partial**：AI-02、AI-03 已修复；AI-01、AI-04、AI-05 仍 open；AI-06 为 partial。没有证据支持生产效率改善。固定治理与岗位目录的字符体量反而有所增加。

审计人：梁策 · 外部 AI 系统与上下文架构审计师。独立 AI 审计角色，非公司员工、非现实人类、非监管者。

审计日期：2026-09-22。任务标识：`/root/external_ai_r1_review`。本报告未写入文件，未修改快照或实时公司源。

## 1. 版本、范围与验证结果

受审快照：[r1](/private/tmp/ted-company-audit-r1.9n3TCf)。

- Manifest SHA-256：`aefd6781eb8abfc8d02975f84c028a29532db4cc586bdeefda33e72d32b98dde`
- 源 Git HEAD：`4e16e9e63a493613301d757d3fc93f1a288df362`
- 源工作区存在未提交修改和未跟踪文件，HEAD 不能单独代表本轮版本。
- 审计开始与结束均核验 manifest，162 个文件无不一致。
- 本轮未读取 r0 目录或实时公司源。r0 比较数据来自 r1 保存的完整独立审计原报告，不能描述为本轮重新运行 r0。
- 请求模型、推理强度及上下文继承配置应由主任务保留真实派发回执；本审计没有独立运行时身份鉴证接口，`actual_model: unknown`。

完整读取包括 r0 AI 审计、受影响初始化/公司/路由/评测/度量政策、MEMORY 与 KNOWLEDGE 政策、Skill 登记、hook 与原有测试、两个 checker 和新增 fixture、八岗 MEMORY/SKILLS、AI 岗位知识正文及 JEV 卡、JEV 综合报告与知识沉淀复核、当前事件。其余 JEV 卡进行了字符/hash 测量，不声称全部重新完成语义认证。

| 实际检查 | 结果 | 证据上限 |
|---|---|---|
| Manifest 全文件 SHA-256、字符、字节核验 | 162/162 一致 | 快照完整性 |
| `check-company-bootstrap.sh` | exit 0；2 个 active Skill | 当前检查项通过 |
| `check-knowledge.mjs <r1>` | exit 0；47 条；errors/warnings 均为空 | ID 段落、覆盖与漂移检查 |
| `knowledge-bootstrap-audit.test.mjs` | 7/7 通过 | 指定合成结构正反例 |
| 原 `codex-company-takeover-hook.test.mjs` | 4/4 通过 | 原测试覆盖的行为 |
| 缺 bootstrap 可执行文件的只读合成 hook 输入 | 普通/依赖治理两类任务均被阻断 | 脚本行为；非目标平台验收 |
| 目标平台 hook 信任、安装、实际注入 | 未验证 | unknown |
| 真实业务、用户收益、token/费用节省 | 未验证 | unknown |

既有 fixture 只在独立临时目录建立并清理测试副本。额外 hook 复现将 `AI_VIRTUAL_COMPANY_ROOT` 指向快照内现有 `skills/` 子目录，产生 `ENOENT`；没有删除、移动或改写快照文件。

## 2. AI-01—AI-06 逐项裁决

### AI-01 · High · open

**政策已澄清，实现仍不符合政策。**

[初始化政策第 35 行](/private/tmp/ted-company-audit-r1.9n3TCf/INITIALIZATION_POLICY.md:35)明确禁止缺少任务语义时统一阻断整个任务。但是 [hook 第 60 行](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/codex-company-takeover-hook.mjs:60)仍在三个事件先执行 bootstrap，失败统一返回 `blocked:true`；第 95–96 行将其转成 `decision:block` 或 `continue:false`。

新增的只读合成输入实际返回：

| 事件 | 普通只读解释 | 明确依赖公司治理 |
|---|---|---|
| `SessionStart` | `continue:false` | `continue:false` |
| `UserPromptSubmit` | `decision:block` | `decision:block` |
| `Stop` | `continue:false` | `continue:false` |

六次进程均 exit 0，但输出均具有阻断含义。**退出码成功不能替代业务放行。**

[原有 4 项测试](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/codex-company-takeover-hook.test.mjs:5)分别检查正常入口上下文、无证据监管声明、尾注和否定措辞，没有模拟 bootstrap 失败，没有比较两类任务，也没有检查失败路径的 CLI JSON 输出。新增 7 项 fixture 验证的是 checker/完整性检查，不能填补该 hook 行为缺口。

按本次任务交接，hook 修复曾遭审批拒绝，因此保持 open；快照事件只记录待授权和不得绕过审批，没有保存拒绝原回执。本审计不补写其具体原因，也未尝试修改 hook 或绕过审批。

事实是代码与政策冲突；若目标平台启用并信任该 hook，普通业务可能受误阻断是有行为依据的推断；当前安装与实际影响范围仍 unknown。OpenAI 当前文档确认相应事件的阻断字段及 hook 信任要求；这不证明本机已启用。[官方 Hooks 文档](https://learn.chatgpt.com/docs/hooks)，核对日期 2026-09-22。

### AI-02 · Medium · fixed，限本次漂移与漏登记范围

三项 AI 知识现在共同引用实际正文 hash：

`8bd1ecc592b14853135b8ffa30603333ad30fa1ace2bcc1a494167b6d7d61a4d`

[岗位目录](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/MEMORY.md:7)、正文与 catalog 一致；catalog 已纳入 `ai-capability-source-link-radar`，总数由 46 增至 47。

[知识检查器](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/check-knowledge.mjs:90)现在按 ID 对应段落检查字段；第 112 行开始反向扫描公司目录和全部岗位 MEMORY，能够发现未登记 ID。[新增 fixture](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/knowledge-bootstrap-audit.test.mjs:58)覆盖 status/owner/date 跨段交换、摘要移位、目录遗漏，以及共享引用目标/状态错配。

这次不只是刷新 hash：[AI 正文](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/KNOWLEDGE.md:3)补充了首次失败、案例等级和历史环境边界；radar 的 `verified_context` 明确限定于 2026-09-19 留存记录，未扩展为本轮实测或当前线上状态。

残余限制：

- 本轮通过支持结构一致性和已读取摘要的范围一致性，不重新认证历史运行。
- 三个条目仍共享整份正文 hash；改动 radar 会再次牵动另两条摘要的复核。
- 其他共享引用的语义正确性不能由 `errors=[]` 推导。

### AI-03 · Medium · fixed，限 active Skill 入口与必要元数据

[bootstrap 第 79 行](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/check-company-bootstrap.sh:79)已读取 active 登记行并验证规范目录、入口路径、根目录约束、`SKILL.md`、front matter、`name` 与 `description`，同时防止重复资产 ID。

[fixture 第 101 行](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/knowledge-bootstrap-audit.test.mjs:101)实际覆盖入口缺失、description 缺失、多行 description、规范目录缺失、retired 资产例外，以及正文不输出到会话。7/7 通过。

OpenAI 官方说明 Skill 先暴露名称/描述，选中后才加载正文，且入口需要相应元数据。本轮实现保留了“脚本核对文件”与“正文注入模型上下文”的区别。[官方 Build skills 文档](https://learn.chatgpt.com/docs/build-skills)，核对日期 2026-09-22。

残余限制是完整性校验仍不等于 Skill 行为安全审计、完整 YAML 语义认证、平台安装成功或岗位能力认证；这些不是本项已经完成的范围。

### AI-04 · Medium · open，体量指标较 r0 退步

[ROUTER 第 59 行](/private/tmp/ted-company-audit-r1.9n3TCf/ROUTER.md:59)明确将入口精简与版本复用留到第 2 轮，本轮没有缩小必读范围。这是诚实的阶段状态，不能记为修复。

固定七份治理材料由 **19,767 增至 19,989 字符**。八岗 MEMORY 由 **25,742 增至 28,162 字符**。

同时，[ROUTER 第 57 行](/private/tmp/ted-company-audit-r1.9n3TCf/ROUTER.md:57)仍说基础治理只加载一次，[hook 第 45 行](/private/tmp/ted-company-audit-r1.9n3TCf/scripts/codex-company-takeover-hook.mjs:45)仍要求本轮完成事实源加载、路由和任务登记，缺少“已加载且版本未变”的复用表达。“任务登记后再执行”也没有表达 ROUTER 对小任务的持久登记豁免。

新增岗位说明纠正了能力归因，但部分 MEMORY/SKILLS 承载了首次说明方案、五维证据协议、整改 ID、待复核状态和示例，超出轻量发现入口。尤其[质量岗位 SKILLS](/private/tmp/ted-company-audit-r1.9n3TCf/employees/test-expert/SKILLS.md:9)再次展开共用需求说明规则。

因此，规则的准确性有所加强，常驻与入口体量没有改善；实际重复读取频率和运行延迟仍 unknown。

### AI-05 · Medium · open

[JEV 综合报告第 43 行](/private/tmp/ted-company-audit-r1.9n3TCf/learning/jev-mcp-training-2026-09-22/REPORT.md:43)仍把完整判断循环设为相关问题默认流程，第 86 行仍将完整无 JEV 协议列为日常默认方式。

[AI 岗位卡第 12 行](/private/tmp/ted-company-audit-r1.9n3TCf/employees/ai-engineer/JEV_LIKE_JUDGMENT_HABIT.md:12)仍覆盖筛选、分级、路由、质量与下一动作，并要求先进入循环。没有新增明确出口：

- 退出码、hash、计数等事实直接由确定性程序处理；
- 单项、低风险、证据直接充分时由主责直接判断；
- 多项同状态且有实质判断成本时才使用完整循环。

八张 JEV 卡仍为 **25,045 字符、54,269 字节**，与 r0 报告一致。MCP 可选、升级交给责任人的边界保留良好，但“工具可选”不等于“整套流程可轻量退出”。

官方延迟指南支持减少不必要请求和合并同状态工作，也明确不应默认使用 LLM。该原则支持试验方向，不证明本轮能够提速。[官方 Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)，核对日期 2026-09-22。

### AI-06 · Low · partial

[评测手册第 22 行](/private/tmp/ted-company-audit-r1.9n3TCf/EVALUATION_RUNBOOK.md:22)新增了正确要求：区分请求配置、工具回执、运行时鉴证与上下文继承；无法追回历史回执时保留 `independence: unknown`，并在旧入口添加纠错指针。

但本项对应的旧材料没有完成纠错：

- [知识沉淀复核第 8 行](/private/tmp/ted-company-audit-r1.9n3TCf/learning/jev-mcp-training-2026-09-22/knowledge-deposit-review.md:8)仍称“独立新 turn”。
- 同文件第 111 行仍依据 turn、只读边界和独立产物称“统一闭环”。
- [综合报告第 39 行](/private/tmp/ted-company-audit-r1.9n3TCf/learning/jev-mcp-training-2026-09-22/REPORT.md:39)继续转述该独立性结论。
- 未找到与这次历史审查对应的执行标识、继承设置或明确 `independence: unknown` 纠错入口。

9 月 18 日研究报告的模型身份纠错属于另一项历史问题，不能替代 AI-06 的闭环。这里仍是独立性证据不足，不是证明原审查不独立。

## 3. 同口径上下文测量

测量采用 UTF-8 文件原文的 Unicode code point 数及原始字节数。七份治理文件名单与 r0 相同：初始化政策、AGENTS、COMPANY、ROUTER、MEMORY_POLICY、KNOWLEDGE_POLICY、Skill 登记。

| 材料集合 | r0 | r1 | 变化 |
|---|---:|---:|---:|
| 七份治理字符 | 19,767 | 19,989 | +222，约 +1.12% |
| 七份治理字节 | 32,563 | 33,952 | +1,389 |
| 八岗 MEMORY 字符 | 25,742 | 28,162 | +2,420，约 +9.40% |
| 八张 JEV 卡字符 | 25,045 | 25,045 | 0 |
| 八张 JEV 卡字节 | 54,269 | 54,269 | 0 |

r1 八岗 MEMORY 合计 52,893 字节；SKILLS 合计 5,927 字符、10,479 字节。快照内没有 r0 SKILLS 同口径总量，本报告不补算其增量。

| 岗位 | PROFILE＋MEMORY 必读入口字符 | SKILLS 字符 |
|---|---:|---:|
| 辛澈 · AI工程师 | 3,939 | 248 |
| 陆行远 · 可靠服务官 | 3,348 | 1,031 |
| 沈砚舟 · 后端培训导师 | 5,035 | 537 |
| 陈知行 · 路由官 | 2,718 | 272 |
| 苏映雪 · 信任设计官 | 3,487 | 771 |
| 周启明 · 体验工程官 | 5,492 | 949 |
| 林知夏 · 目标规划官 | 3,490 | 743 |
| 顾清妍 · 质量测试工程师 | 3,351 | 1,376 |

治理加单一主责入口为 **22,707—25,481 字符**，尚未计条件政策、命中知识、平台规则与任务材料。SKILLS 不属于初始化政策明确要求的 PROFILE＋MEMORY 组合，不能全部算作每次冷启动必读。

重复内容有两类：

- 八岗“审计后的效率培训”段落完全相同。按每段末尾保留一个换行归一化，共 **3,184 字符、5,880 字节**，与 r0 报告同口径字符值一致；公司 INDEX 另有入口。
- 六岗需求说明入口合计 **4,226 字符、8,868 字节**，包含节后空行。这些不是完全相同文本，具有岗位差异，但重复了首次一页、3—7 步主线、五维理解与能力归因边界。
- 八岗 MEMORY 中，长度至少 20 字符的跨岗完全相同行，扣除每种首份后为 **6,532 字符**。这是机械重复量，包含必要元数据和安全限制，不能直接当成可删除量。

检查器的长度告警针对 catalog 的 canonical `summary + limit`，不覆盖所有岗位共享引用段落；所以 `warnings=[]` 不能证明入口已经轻量。

这些数字是文件材料体量，不是会话实际 token、自动注入量或缓存命中量，也不证明平台截断、生产提效或性能退化。

## 4. 第 2 轮最多三项最小改动

1. **补 AI-06 的历史纠错指针。**  
   陈知行 · 路由官在 JEV 知识沉淀复核及转述入口各补一条带日期的边界说明；有真实回执则链接，没有则标 `independence: unknown`。保留原文与原判断，不补造 `fork_turns=none`。

2. **做一个主题的入口去重与轻量退出试点。**  
   辛澈 · AI工程师会同陈知行 · 路由官，优先合并完全相同的效率培训摘要；JEV 先在 AI 岗位引入确定性事实、直接判断、批量循环三路选择，避免一次迁移八岗全部流程。岗位保留触发、差异、关键限制和来源。按既有四场景比较冷启动、继续任务、压缩恢复、冲突材料，出现遗漏即停止推广。

3. **AI-01 仅在审批限制解除且授权范围明确后修实现。**  
   辛澈 · AI工程师负责最小分支与合成负例，顾清妍 · 质量测试工程师独立核对普通任务、明确治理任务、缺少任务语义三类输入及三个事件的输出。目标平台信任/安装验证另列。审批未解除时保持 open，不借文档去重、替代脚本或停用门禁绕过限制。

## 5. 不应删除的边界与收口条件

应保留四类独立状态，保留授权与安全规则、知识失配回读、压缩后必要上下文恢复、来源与版本、模型身份 unknown、具名升级责任、MCP/CLI 可达性区分，以及结构/案例/真实运行/生产效果的分层。

岗位职责清单不能升级为实践认证；AI 与员工整改不能记为用户能力；历史运行不能自动认证当前状态；审批拒绝不能通过改路径或换工具规避。

本轮剩余问题为 **High 1、Medium 2、Low 1**；另两项 Medium 已在限定范围关闭。可以确认校验覆盖改善和已核验知识恢复一致，不能宣布整体通过、hook 已修复、上下文已优化或生产效率已提升。
