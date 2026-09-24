# 用户专业能力与市场价值档案

Owner：沈砚舟 · 后端培训导师（资深后端架构师）
建立日期：2026-09-18
用途：支持能力提升、训练设计、岗位匹配与条件化市场价值评估。用户可随时要求查阅、更正、暂停或删除。

## 当前目标与已知边界

- 已知职业发展方向：从前端工程能力扩展到 Java 后端独立交付，并提升架构、证据与 AI 协作能力。深圳求职不再把纯前端作为保底方向；核心目标为业务型全栈工程师，差异化目标为 AI 应用全栈工程师，Agent/RAG 应用工程师作为机会目标。既有前端能力作为全栈交付优势，而不是独立求职方向。以上均为发展目标，不是已确认的后端或 AI 工作年限；计划在 2026 年底前具备可信投递条件。
- 当前能力水平：后端独立交付仍为 `unknown`。用户自述具有 12 年前端开发经验，覆盖 Web、微信原生/H5、Taro、React 与 Vue；该履历用于设计学习起点，不替代可复核项目或代码证据。
- 当前市场价值：`unknown`。后续评估需补齐目标岗位、地区、薪酬口径、工作年限、真实项目责任与可验证成果；不从内部角色或 AI 员工能力反推。

## 能力维度快照

| 维度 | 当前结论 | 证据层级 | 置信度 | 下一验证 |
|---|---|---|---|---|
| 需求澄清与目标定义 | unknown | 尚无归档观测 | low | 陌生切片先短诊断（不计失败），补足必要事实/完整最小例，再由用户解释并识别关键未知；按五维记录初答与提示来源，延迟独立检索另验 |
| 架构、边界与变更影响 | unknown | 尚无归档观测 | low | 对一条真实链路说明事实归属、状态、依赖、异常和恢复 |
| 前端工程 | 有较长从业经历的用户自述；工程水平待验证 | 用户自述履历，未附项目或代码证据 | medium（履历事实）/ low（能力判断） | 用一项真实页面交付与浏览器证据建立基线 |
| Java/Spring 与 SQL | unknown | 课程方向，不是独立能力证据 | low | 完成一条纵向业务链并通过真实持久层验收 |
| 事务、并发与可靠性 | unknown | 尚无归档观测 | low | 处理一个失败路径或并发反例并解释最终状态 |
| 测试、证据与故障定位 | unknown | 尚无归档观测 | low | 独立选择相称测试并定位一次非预设失败 |
| AI、Skill 与工具协作 | 一次可归属的证据边界判断；稳定能力仍未建立 | 用户明确改为分项证据展示与用户最终判断；实现与审计均由 AI/员工完成 | low | 在未见工具评估任务中独立定义证据、风险和淘汰决策，并复核真实结果 |
| 业务理解、沟通与交付 | unknown | 尚无归档观测 | low | 补足事实后闭卷重建真实业务主线、关键状态与失败结果；按实际学习日和表现安排未见变体，预测影响并选择验证证据 |

未来验证口径（2026-09-22 r1 校准）：缺业务事实归需求缺口，不计学员失败。五维状态与帮助来源按 `USER_CAPABILITY_ASSESSMENT.md` 记录，不设总分；三个具体可比任务尚待选择，只能支持限定任务族/条件下对下一同类任务的初步预测，一次项目验收只确认该次范围。10+3+1 为预算上限，实际负担与最优性未知；W4 自身 D+7 留到下一周期 `pending`，替换原复盘内容且不加时。本次仅校准未来验证安排，无用户新增作答或能力提升。

## 观测记录

### 2026-09-24 · XXL-JOB 批次对账与事务可见性故障

- observation_id：`2026-09-24-category-job-real-reconciliation`
- task_ref：`2026-09-24-category-job-real-reconciliation`
- observed_at：2026-09-24
- task_level：M
- domain_and_risk：Java/Spring、MySQL 事务可见性、XXL-JOB 批次统计与双库同步；本地教学数据，已精确清理
- user_goal：完成一次真实 Job 执行的批次日志、主库事件终态与从库业务终态对账
- user_actions：独立预测单事件批次的计数守恒与成功终态；在明确操作指引下插入教学事件、查询主从库、手工触发 Job、核对结果、提交未提交事务并清理教学数据
- initial_judgment：正确预测 `claimedCount=1` 且四类结果之和为 `1`；正确预测成功后状态为 `SUCCESS`、token 与租约为空
- assistance_level：`guided`（实验设计、SQL、对首次领取为 0 的事务可见性定位均由导师引导）
- revision_process：首次触发 `handleCode=200` 但 `claimedCount=0`；经提示检查后发现插入会话 `@@autocommit=0`，提交后重触发获得预期业务结果
- result_scope：真实 XXL-JOB 运行、真实 MySQL 主从库状态与教学数据清理；不包含独立代码实现或未见变体
- evidence_refs：任务事件中的 2026-09-24 10:40:23 Job 日志、主库事件 `132` 终态、从库 `1100` 终态与清理复核
- evidence_level：真实运行
- attribution：`user`
- capability_signals：能独立预测批次计数守恒和成功终态；能在指导下完成跨系统运行证据收集，并根据提交可见性线索修正实验
- capability_gaps：尚未独立提出“未提交事务导致独立 Job 连接不可见”的假设；未在未见失败分支中独立选择诊断 SQL；独立后端交付能力仍待更多任务验证
- unknown：未见变体迁移、独立设计测试数据与异常分支、生产环境运行能力
- market_relevance：无；单次受指导教学实验不触发市场价值重估
- confidence：medium（本次行为与运行证据），low（对长期独立能力的外推）
- privacy_redactions：无职业能力无关信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无

### 2026-09-22 · 需求说明适配与培训穿插偏好

- observation_id：`2026-09-22-adaptive-requirement-learning-preference`
- task_ref：`2026-09-22-adaptive-requirements-training`
- task_level：M
- domain_and_risk：陌生业务需求理解与后端转型学习；本次只形成教学与协作偏好，不包含用户独立作答
- user_goal：将需求理解训练穿插进既有一主两辅计划，并要求产品、前端、后端以后按其“资深前端但业务域陌生、后端在学习”的能力结构输出易于快速理解的需求说明
- user_actions：用户识别并明确提出“代码已实现但业务仍未理解”的问题，要求由培训导师安排训练并让三岗位吸取经验
- assistance_level：`independent`（提出问题与治理目标）；专业能力执行证据不适用
- result_scope：学习与沟通偏好；不包含业务复述、代码、测试、运行或生产效果
- evidence_refs：当前任务事件 `2026-09-22-adaptive-requirements-training`
- evidence_level：用户明确要求
- attribution：`user`
- capability_signals：能识别交付完成与理解完成并非同一状态，并主动要求调整协作方式
- capability_gaps：本次没有闭卷重建、失败预测或未见变体表现，需求澄清与业务理解能力仍为 `unknown`
- market_relevance：无；不触发市场价值重估
- confidence：high（偏好与授权事实）；low（专业能力判断）
- privacy_redactions：无职业能力无关信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`no_evidence`
- supersedes：无

### 2026-09-18 · 能力评估机制建立

- observation_id：`2026-09-18-capability-assessment-setup`
- task_ref：`2026-09-18-user-capability-assessment-duty`
- task_level：M
- attribution：`user`（仅指用户提出并授权治理目标，不代表专业实现能力）
- assistance_level：`independent`（提出目标）；专业能力执行证据不适用
- evidence_level：用户明确要求 + 公司规则与真实导师审查回执
- review_status：`no_evidence`
- market_relevance：无；不触发薪资重估
- confidence：high（授权事实）；low（专业能力，因本次无相应行为）
- 来源：用户明确要求沈砚舟除培训外，持续记录并评估其专业能力和市场价值；覆盖每个中大型任务会话与培训会话。
- 可确认：用户授权建立专项职业能力档案，并重视持续反馈与市场校准。
- 不能确认：本次是治理要求，不包含可评估的代码、设计、测试、架构作答或真实项目结果，因此不据此提高任何专业能力等级。
- 下一步：从下一次 M/L 或培训会话开始按统一字段采集首个专业能力观测点。

### 2026-09-18 · 初始职业背景访谈

- observation_id：`2026-09-18-initial-career-background`
- task_ref：`2026-09-18-initial-interview`
- task_level：S
- domain_and_risk：职业背景与后端转型基线；仅采集用户主动提供的职业相关信息
- user_actions：用户自述 12 年前端工作经验，做过 Web、微信原生/H5、Taro、React、Vue 类型项目；自评工作认真负责，沟通能力和业务理解能力良好；初步了解 Java 语法、SQL、Docker 等后端技术。
- assistance_level：`independent`
- result_scope：履历与学习起点；不包含代码、设计、测试、真实运行或生产效果证据
- evidence_level：用户明确陈述
- attribution：`user`
- capability_signals：多端前端技术栈、长期工程经历、希望向后端扩展
- capability_gaps：Java/Spring、SQL 建模与调优、事务/并发/可靠性、后端测试、部署运维的实际独立交付证据均待建立
- unknown：前端项目责任范围、代码质量、线上结果；后端技术的掌握深度与独立程度；目标岗位、地区、薪酬口径和时间点
- market_relevance：有经验前端转向后端的背景信息；未触发市场价值估算
- confidence：high（用户自述事实）；low（由履历推断的具体专业能力）
- privacy_redactions：未记录年龄与毕业院校；如用户明确要求用于简历或求职定位，可再补充最小必要信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无

### 2026-09-18 · 求职定位目标澄清

- observation_id：`2026-09-18-career-positioning-goal`
- task_ref：`2026-09-18-initial-interview`
- task_level：S
- domain_and_risk：求职定位；避免将目标包装为既有履历
- user_actions：用户希望未来能够以“前端、后端、AI 全栈”复合能力介绍自己，并认为单一前端年限可能影响面试定位。
- assistance_level：`independent`
- result_scope：职业目标与简历策略讨论；不构成后端或 AI 工作年限证据
- evidence_level：用户明确陈述
- attribution：`user`
- capability_signals：具备主动重构职业定位的意愿
- capability_gaps：真实后端与 AI 全栈项目责任、可复核产出、线上运行和面试案例尚待建立
- unknown：各阶段的实际开始时间、工作职责占比与可对外验证材料
- market_relevance：待在明确目标地区、岗位和时间点后再做市场核验
- confidence：high（目标陈述）；low（未来能力和市场影响）
- privacy_redactions：无新增敏感信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无

### 2026-09-18 · 初始访谈基线

- observation_id：`2026-09-18-initial-interview-baseline`
- task_ref：`2026-09-18-initial-interview`
- task_level：M
- domain_and_risk：前端经验、后端/AI 转型与求职定位；以下项目经历均为用户自述，待后续以代码、产物或可定位项目材料核验
- user_actions：用户描述曾作为 4 人前端团队组长，从 0 到 1 主导“友邻”商户购物平台 C 端的 Umi 选型与商品详情、购物车、确认订单、支付结果、订单列表等核心模块；以 TypeScript 类型、类似 Redux 的内存态和统一更新函数建立多入口下单数据契约。用户独立设计并实现过基于 Ant Design 的配置驱动报表/表单高级组件，JSON 配置涵盖筛选控件、表头和 Promise 接口函数。用户目前对陌生任务的习惯是文档与源码并读、借助 AI 分析、确认边界后执行并与上下游对齐。
- initial_judgment：希望用“全栈或 AI 全栈”定位求职，但认可尚未取得的后端/AI 实践不能包装为已有年限
- assistance_level：`independent`
- revision_process：在访谈中明确区分：交易前端架构、组件抽象与团队协作是既有自述；接口设计、数据库、部署、线上排障、自动化测试、后端和 AI 应用交付暂无实际经验
- result_scope：用户自述的职业基线；未查看代码、项目资料、运行环境、测试记录或业务指标
- evidence_refs：当前会话中的用户明确陈述
- evidence_level：用户自述
- attribution：`user`
- capability_signals：C 端交易链路前端架构、TypeScript 数据契约与状态管理、配置驱动组件抽象、技术分工、文档/源码驱动协作
- capability_gaps：Java/Spring、SQL、Docker 的独立项目实践；接口与数据建模；事务/并发/可靠性；后端测试和部署；AI 应用交付；业务结果度量与后端任务责任均待建立
- unknown：项目规模与业务结果；前端代码质量和实际维护效果；目标岗位的具体技术要求与薪酬口径；后端任务何时获得及其实际范围
- market_relevance：目标地区为深圳，目标岗位为全栈工程师或 AI 应用全栈工程师；计划每天投入约 2 小时、必要时周末补充，目标在 2026 年底前达到可信投递条件。当前工作可能出现“报表展示 + 接口实现”的后端任务机会，但尚未确认。
- confidence：high（用户自述的目标、偏好和经历陈述）；low（能力等级、市场匹配和项目结果）
- privacy_redactions：未记录年龄、毕业院校及其他无必要个人信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无

### 2026-09-18 · 深圳求职方向收敛

- observation_id：`2026-09-18-shenzhen-role-strategy`
- task_ref：`2026-09-18-career-market-brainstorm`
- task_level：S
- domain_and_risk：35 岁阶段的深圳技术岗位选择；职业策略不是市场录用承诺
- user_actions：用户明确认为纯前端岗位不再适合作为保底方向，并认可将目标收敛为全栈或 AI Agent/AI 应用相关岗位。
- assistance_level：`independent`
- result_scope：求职方向与学习资源配置，不构成后端或 AI 工作履历
- evidence_level：用户明确确认
- attribution：`user`
- positioning：核心目标为业务型全栈工程师；差异化目标为 AI 应用全栈工程师；Agent/RAG 应用工程师为机会目标；纯前端不再作为独立投递方向
- strategy_boundary：不将尚未获得的后端或 AI 职业经历包装为工作年限；以真实全栈项目、测试、部署、故障路径和 AI 应用作品建立证据
- market_constraints：深圳市场、35 岁阶段、12 年研发经历带来的资深岗位预期，以及正式后端履历和 AI 生产证据不足
- learning_allocation：Java/Spring 业务后端与可靠性为主线；AI Agent/RAG 为职业差异化辅线；既有前端能力用于形成完整作品
- market_relevance：目标岗位发生稳定变化，后续市场调研和薪酬评估应停止以纯前端岗位作为保底基准
- confidence：high（用户确认的职业策略）；low（尚未完成岗位样本和薪酬评估）
- privacy_redactions：仅记录与岗位策略直接相关的年龄阶段，不记录生日或其他身份信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：`2026-09-18-career-positioning-goal` 中未收敛的宽泛“前端、后端、AI 全栈”定位

### 2026-09-19 · 首轮市场基线与四周计划

- observation_id：`2026-09-19-shenzhen-market-baseline`
- task_ref：`2026-09-19-career-dashboard`
- task_level：L
- domain_and_risk：深圳业务全栈、AI 应用全栈和 Agent/RAG 公开招聘审计；市场数据不等于个人可获 Offer
- user_goal：2026 年底前形成可信投递条件；每天约 2 小时，主线为 Java/Spring 业务全栈，两条辅线为 AI 应用/Agent 与 AI 短视频表达
- result_scope：80 条平台内去重候选、四个平台可用性审计、官方工资基准、四周可执行计划、私有职业站点；未完成正式 100 样本
- evidence_refs：`memory/learner/MARKET_SOURCE_REGISTRY.md`、`output/2026-09-19-career-market-and-learning-plan.md`、私有 Sites 项目 `appgprj_6aaaca4b63ac8191ac4746507d5624a1`
- evidence_level：公开岗位卡、平台规则页、深圳人社局/人社部/国家统计局官方数据、已核对的学习进度文件；不含真实投递与 Offer
- attribution：`mixed`（用户提供职业事实；AI/员工完成市场采样、站点和计划；不计为用户实现能力）
- capability_signals：用户对一主两辅配比、真实边界、按周勾选、延期提醒和持续市场复核的目标明确
- capability_gaps：后端独立交付、AI 应用作品、自动化测试、部署与故障定位仍缺用户本人证据
- market_relevance：67 条 BOSS/猎聘候选中，端到端负责至少出现 44 次，LLM 至少 27 次，Agent/工具/工作流至少 22 次，Java/Spring 至少 13 次；这支持“业务全栈主线 + AI 应用辅线”，但不支持声称已有后端或 AI 工作年限
- confidence：low（正式有效样本 0/100；候选 80/100；平台时效与完整 JD 不足）
- privacy_redactions：为用户私有职业站点记录最小必要年龄阶段和 985 院校背景；不记录生日、证件或联系方式
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无

### 2026-09-19 · 薪资与学习计划审计修订

- observation_id：`2026-09-19-career-dashboard-audit-v3`
- task_ref：`2026-09-19-career-dashboard`
- task_level：L
- result_scope：默认隐藏的三档求职报价实验、四步法工程改编、D0/D+2/D+7 复盘、服务端验证闸门、稳定语义阶段迁移和 D1 集成测试
- attribution：`ai_or_employee`；assistance_level：`ai_or_employee_done`（AI 审计角色与沈砚舟完成方案、代码、测试及发布；不计为用户本人后端或 AI 能力）（2026-09-24 审计修复）
- user_preference：敏感薪资默认隐藏；学习指导需要理论依据、可执行任务和专业审计，审计问题先修复再优化
- capability_effect：`no_evidence`；站点和计划改进不提升用户个人能力，后续以用户亲自完成、解释、运行和未见变体为准
- market_value_boundary：个人市场价值仍为 `unknown`；20–24K、25–29K、30–34K 只是低置信度分批投递报价实验
- evidence_refs：`output/2026-09-19-career-market-and-learning-plan.md`、`memory/projects/2026-09-19-career-dashboard.md`、Sites 版本 4
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：本文件同日“深圳首轮低置信度基线”中“尚不生成任何区间”的执行表达；不 supersede 个人价值 `unknown` 结论

### 2026-09-19 · AI 工具雷达证据边界调整

- observation_id：`2026-09-19-ai-capability-tool-radar-user-judgment`
- task_ref：`2026-09-19-ai-capability-tool-radar`
- observed_at：2026-09-19
- task_level：L
- domain_and_risk：AI/Skill/工具协作、产品决策边界与安全证据表达；错误合并热度、身份和安全信号可能误导工具采用
- user_goal：不再要求系统自动证明发布者身份或自动给出可靠/安全结论；由系统展示可核验证据标签，用户保留最终判断
- user_actions：用户明确把最终可靠性判断收回到人工决策，并要求展示 GitHub stars/forks、npm 对应证据以及病毒/安全检测标签
- initial_judgment：早期范围要求系统自动证明发布者身份并给出可靠/安全结论
- assistance_level：`light_prompt`（用户在收到独立审计失败及其问题边界后主动调整目标；具体实现由 AI/员工完成）
- revision_process：将单一可靠/安全结论修订为分项证据展示，要求热度、维护、身份、供应链、已知漏洞和恶意代码扫描分别表达，不把关注度或 provenance 当作安全认证
- result_scope：需求与判断边界；不包含用户本人完成的 Schema、校验器、采集、审计、测试、扫描或发布
- evidence_refs：`inbox/session-events/2026-09-19-ai-capability-tool-radar.md` 的“v3 用户判断模式”及“v3 审计终态”
- evidence_level：任务事件中的用户明确指示摘要；AI/员工实现与审计结果仅作为触发上下文，不归因给用户
- attribution：`user`（仅限目标修订、证据分层要求和最终判断责任）
- capability_signals：能在审计暴露自动判定边界后调整人机责任；能要求把流行度、来源关联、供应链实践、已知漏洞与恶意代码扫描拆成不同证据，避免把代理指标包装成安全结论
- capability_gaps：尚未观察用户独立验证标签来源、定义数据契约、判断具体工具风险、执行扫描、定位绕过或完成发布门禁
- unknown：该判断能否迁移到未见工具或真实工件；用户能否识别过期、版本错配、扫描覆盖不足和伪阳性/漏报；独立技术实现能力
- market_relevance：对 AI 应用全栈岗位中的人机边界、证据表达与风险沟通有相关性；单次判断不足以改变岗位级别或薪资结论，不触发市场价值重估
- confidence：medium（用户指示与修订边界清晰；仅有一个任务且原始实现、审计和测试均非用户完成）
- privacy_redactions：无职业能力无关信息
- observer：沈砚舟 · 后端培训导师（资深后端架构师）
- review_status：`incorporated`
- supersedes：无；仅新增单次观测，不覆盖其他维度的 `unknown`

## 市场价值记录

### 2026-09-19 · 深圳首轮低置信度基线

- 目标岗位：业务型全栈（核心）、AI 应用全栈（差异化）、Agent/RAG（机会）；纯前端不作保底。
- 地区与日期：深圳，2026-09-19。
- 平台数据：BOSS 40、猎聘 27、51job 13，共 80 条平台内去重候选；拉勾正式有效样本 0。尚未完成跨平台去重和逐条 30 天时效、完整 JD、仍在招复核，因此正式有效样本为 0/100。
- 候选岗位卡：BOSS 月薪中位数约 24K，业务型全栈约 21.3K，AI 应用/Agent 约 36.3K；猎聘约 35K，但样本结构偏中高端、猎头和专家岗，两者不得直接合并。
- 官方校准：深圳“计算机程序设计员”历史税前年工资 P25/P50/P75/P90 为 14.56/21.57/29.22/37.57 万元；调查期为 2024 年，不是当前岗位报价。
- 用户证据上限：12 年前端、交易链路和配置化组件为用户自述；后端、AI、自动化测试、部署和运行证据不足。
- 当前结论：职业路线可暂定为“Java/Spring 业务全栈主线 + AI 应用辅线”，个人市场价值与正式推荐薪资保持 `unknown`。可用 20–24K / 25–29K / 30–34K 三档做低置信度分批投递实验，但不得当作 Offer 预测。达到 100 个正式有效样本、三个方向各不少于 20 条，并取得个人端到端验收与真实投递/面试反馈后，才生成正式推荐。
- 置信度与失效：low；候选岗位卡 30 天后需重采，官方工资基准按年度替换。
