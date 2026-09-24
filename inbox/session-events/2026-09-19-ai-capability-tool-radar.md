---
id: 2026-09-19-ai-capability-tool-radar
created_at: 2026-09-19T00:00:00+08:00
source: codex
request: 建立一套持续采集、更新和淘汰 AI 能力扩展工具的体系，经独立第三方专业审计通过后执行首轮采集，并更新 TED AI Signal 网站。
scope: AI-Virtual-Company research governance and TED AI Signal Site
sensitivity: internal
requested_outcome: implementation, independent audit, first collection, site publication
level: L
owner: 陈知行 · 路由官（Chief of Staff）
actual_executors:
  - root · Sites owner and integration
consult: 辛澈 · AI工程师
consult_status: contributed
consult_question: 如何构造可追溯、版本敏感、会淘汰旧工具的采集体系？
consult_evidence: employees/ai-engineer/VERIFIABLE_AI_WORKFLOW.md and knowledge/research-source-governance.md
consult_disposition: 采用来源分级、版本与失效条件、事实和主张分离、发布前原始来源复核。
independent_auditor: four isolated audit stages completed; final parallel reviewers A and B both returned FAIL
authority_state: authority_confirmed
authority_scope: 当前任务允许外部资料检索、独立专业审计、现有 TED AI Signal 私有站点更新与发布；不授权登录 X、订阅付费服务或公开改变站点受众。
acceptance:
  - 采集体系包含来源地图、筛选门槛、版本和淘汰机制、证据字段及发布门禁
  - 独立评审者未参与实现并给出可定位的通过结论；关键问题必须整改后复审
  - 首轮采集的每个工具回溯到项目或厂商原始来源，并标明状态、版本/日期、能力边界和风险
  - 网站构建通过并发布到原 TED AI Signal 项目，保持现有访问范围
status: completed
execution_state: v5_wide_discovery_published
evidence_state: dual_independent_audit_pass_20_source_run_validated_and_private_site_deployed
business_terminal_state: requested_collection_and_publication_completed
release_state: production_private_owner_only
capability_handoff_status: incorporated
capability_handoff_evidence: 用户提出最终判断归用户，并要求热度、身份、供应链、漏洞与恶意代码扫描分项表达；AI 实现与审计不归属用户。
model_selection: current model; exact model identity and token usage unknown
rework_rounds: 3
human_minutes: unknown
escaped_defects: unknown
observation_window: pending
---

## 工作分解

1. root 复用原站点和原 project_id，建立采集规范、数据结构与站点展示。
2. 独立第三方评审者在不继承实现讨论的上下文中审计体系与候选发布数据。
3. 仅在关键门禁通过后执行首轮采集、构建、发布并核对生产回执。

## 审计与整改

- 第一轮独立审计：`deliverables/ai-capability-radar/audits/2026-09-19-independent-audit.md`，结论 FAIL。
- 高风险发现：发现源冒充、Schema/校验器漂移、过期与审计失败仍可发布、版本追溯与风险门禁不足、生命周期/替代关系不可审计。
- 第一轮整改：升级到 v2 数据契约；发布资格改为派生的 current+recommended；增加主张—证据双向映射、版本/内容哈希、7/30/90 天到期门禁、结构化许可/权限/数据风险、审计文件门禁、生命周期历史、替代图检查和来源运行状态。
- 本地回归：7 项正负例全部通过；模板结构校验通过。整体状态仍未通过，等待新上下文独立复审。

## 最终状态

- 第二轮整改后本地回归扩展为 18/18，通过合法推荐正例、审计快照三方绑定、唯一结论、来源主机、主张指标、未来日期、风险证据和替代图检查。
- 最终并行复审 A2：`deliverables/ai-capability-radar/audits/2026-09-19-final-audit-a2.md`，结论 FAIL。
- 最终并行复审 B2：`deliverables/ai-capability-radar/audits/2026-09-19-final-audit-b2.md`，结论 FAIL。
- 共同未决项：GitHub 托管地址不能证明声明的发布者归属；自由文本中的 unknown/only/outside scope 可绕过自填的 supports/verified 语义；B2 另确认旧 run 日期可冻结推荐过期判断。
- 按用户指定的“审计通过后再收集并发布”顺序，未执行首轮正式采集，未修改或发布 TED AI Signal，未把当前体系登记为已验证公司能力。
- 已达到并超过本任务的受控整改轮次，应停止继续补丁式修复；下一次若继续，应以受治理 publisher registry、结构化测量/风险签核与当前日过期门禁为新版本范围，重新开始独立审计。

## v3 用户判断模式（2026-09-19 新指示）

- 用户决定不再要求系统自动证明发布者身份或自动给出可靠/安全结论；网站改为展示 GitHub、npm、OpenSSF 与实际扫描产生的分项证据标签，由用户做最终判断。
- 标签必须分离热度、维护、身份、供应链、已知漏洞和恶意代码扫描；stars/forks/downloads 只表示关注或使用信号，不得显示为安全认证。
- npm provenance 只证明可验证的源码/构建/发布关联，不等于无恶意代码；扫描通过必须绑定扫描器、版本、精确工件哈希、时间和报告。
- 当前推荐的时效仍与 Asia/Shanghai 实际当前日比较，旧 run 不得冻结过期判断。
- v3 作为新范围重新实现与审计；审计通过后执行首轮采集、登记为公司候选能力并发布原私有站点。

## v3 审计终态

- 官方资料核对确认：GitHub stars 只表示近似关注度；npm provenance 提供源码/构建/发布的可验证关联，但 npm 明确说明它不保证没有恶意代码；npm audit 只覆盖已知依赖漏洞；OpenSSF Scorecard 是自动检测的供应链实践信号而非安全认证。
- v3 将热度、维护、身份、供应链、已知漏洞、恶意代码扫描拆成 18 个固定标签定义和对应 contract，并把最终决定改为 `user_judgment`；本地正式回归最终为 21/21。
- 首轮独立审计：`deliverables/ai-capability-radar/audits/2026-09-19-v3-independent-audit.md`，FAIL；发现信号未与来源、项目和值结构充分绑定。
- 第一轮整改复审：`deliverables/ai-capability-radar/audits/2026-09-19-v3-independent-reaudit.md`，FAIL；发现 endpoint、npm 肯定状态和工件归属绕过。
- 第二轮整改最终审计：`deliverables/ai-capability-radar/audits/2026-09-19-v3-final-audit.md`，FAIL；旧问题已关闭，但仍存在 endpoint 前缀接受任意尾段、旧版本 npm provenance 解锁新版本 current 两类高风险展示绕过。
- v3 已达到两轮整改上限，停止继续补丁。按用户要求的“审计通过后采集并发布”顺序，未执行正式采集、未吸收为已验证公司能力、未修改或发布 TED AI Signal。

## v4 来源直达范围（2026-09-19 用户裁决）

- 用户明确要求系统只提供仓库/包地址来源，项目可靠性由用户自行确认。
- GitHub/npm 地址改为严格规范路径，不接受查询参数、片段、结尾斜杠或任意多余路径尾段。
- npm provenance 从采集、展示与生命周期提升中移除，旧版本证明不能替任何新版本提供标签。
- 所有发布条目固定为 `candidate + hold + pending`，原始平台计数只作观测，不表示可靠、安全、可信或推荐。
- v4 作为用户重新定义的新产品范围独立审计；审计通过前继续禁止正式采集和站点发布。
- v4 首轮独立审计为 FAIL：发现 URL 解析归一化、空白 reviewer、原始信号不同日和宽松时间解析四类缺口；进入一次集中整改与复审。
- v4 第一次复审仅剩 Unicode 零宽格式字符可充当 reviewer；门禁增加真实字母/数字要求并拒绝 Unicode 控制与格式字符，进入最终复审。

## v4 完成回执

- 最终独立审计：`deliverables/ai-capability-radar/audits/2026-09-19-v4-independent-audit.md`，PASS；正式回归 46/46、独立扩展保留题 72/72、非空集合端到端审计绑定通过。
- 审计快照：`sha256:f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8`。
- 首轮采集：`deliverables/ai-capability-radar/collections/2026-09-19.json`；3 个来源直达候选，校验器 PASS。采集对象为 Jianying Headless、Browser Use、Stagehand；均为 candidate/hold/pending，未安装、未扫描、未作可靠性结论。
- 站点源码与远端新提交完成 rebase，保留原有文章归档功能；build、ESLint、预览请求与 `git diff --check` 通过。
- TED AI Signal 保存为版本 6，commit `b098eeb371a62ea42fdad0f7402004194d1ca09a`，私有生产部署 `appgdep_6aaea2b4634c81918d51f8b7fa27caa9` 返回 succeeded，URL 为 `https://ted-ai-signal.tedming9527.chatgpt.site`。
- 访问范围保持 `custom` owner-only：1 名 owner、0 外部访客、0 群组；未改为公开。
- 已吸收到 `employees/ai-engineer/KNOWLEDGE.md` 与发现目录 `employees/ai-engineer/MEMORY.md`，状态 `verified_context` 仅覆盖本地门禁与本次私有站发布链路，不证明候选工具可靠或安全。
- 用户反馈博客与工具内容同页混排过乱；站点重新设计为“能力雷达 / 文章归档”两个互斥主视图，默认展示能力雷达，文章、播客与日期归档单独保留。build、ESLint、本地 200 预览通过，版本 7、commit `3cd1c5a82fc4e643eb224aa0ea4b30f70462f1d2`、部署 `appgdep_6aaea4ad67ec8191b82e5f6734a1f8f3` 返回 succeeded；访问范围仍为原 owner-only。

## v5 宽进严出完成回执

- 独立发现覆盖审计与发布门禁审计均 PASS；快照 `sha256:23ed5a00d9c49077babfcff31dc2c7d296a012e839c97153dc4380a6c315272f`，正式回归 32/32、独立隔离 33/33。
- source registry 扩至 20 个入口、13 类 family；schema 支持 hosted API、Agent Skill、MCP、桌面应用、协议、SDK、仓库与包，并允许同实体多入口。
- 正式运行尝试 20/20 来源，13 个成功；31 条人工审阅命中去重成 10 个实体，6 个发布候选、4 个带理由淘汰。X 未连接记为 unavailable；GitHub API 返回 403，未生成新的 stars/forks 标签。
- 用户点名 Jev 以一个 hosted model/API 实体收录，并同时绑定 TypeSafe 官方发布页、文档、JavaScript SDK 与 Skills；厂商性能主张未转写为系统事实。
- 网站 build、ESLint、`git diff --check` 通过；版本 8、commit `2b01ed71944b3e2f716fff2cd745eecd14c545ec`、部署 `appgdep_6aaeaef4b4d08191b8d84e253465310a` 返回 succeeded。
- 生产 URL 保持 `https://ted-ai-signal.tedming9527.chatgpt.site`，访问范围仍为 `custom` owner-only：1 名 owner、0 外部访客、0 群组。
