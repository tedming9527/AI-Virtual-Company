---
id: 2026-09-13-ai-content-publishing-business-line-research
created_at: 2026-09-13T00:00:00+08:00
source: codex
request: 调研 AI 自动创建内容并发布到中国社交和内容平台的市场、竞品、变现与合规，评估其作为公司业务线的可行性。
project: AI-Virtual-Company；文档研究任务
scope: 市场规模、平台收益逻辑、九类直接竞品、差异化、业务阶段、验证指标、风险控制
out_of_scope: 不开发产品、不注册或运营平台账号、不发布内容、不承诺收益、不处理带货和佣金结算
sensitivity: internal
authority: 仅公开信息研究与内部业务建议；无外部发布或账号操作授权
requested_outcome: 形成可直接提交董事会的竞品与业务可行性报告，给出决议事项、是否立项、预算、阶段门槛和停止条件。
level: M
reason: 涉及跨平台规则、竞品定价、业务定位与后续资源投入，需形成可追溯决策依据。
classifier: Codex current task
owner_confirmed: 林知夏 · 目标规划官（Product Manager）
owner: 林知夏 · 目标规划官（Product Manager）
executor: Codex current task
consult: none
baseline: 2026-09-13 公开网页与平台规则；非代码任务，无仓库提交基线
context: 中国社交平台的点赞与普通流量通常不直接计价；收益依赖账号资格、广告或创作激励；AI 内容受生成合成内容标识办法和各平台规则约束。
decisions: 建议董事会批准总上限人民币16.5万元的两阶段创业资金；首期1.5万元用于6周自有账号实验，全部商业与法律闸门通过后方可释放第二期15万元，用3个月验证3家付费设计客户；暂不做公开通用SaaS或外部代运营；优先复用现成发布连接器，把差异化放在事实核验、AI标识、审批、收益归因和单位经济。
acceptance: 董事会报告须包含决策摘要、市场与监管事实、至少8个竞品、价格或免费边界、战略定位、商业模式、预算、单位经济、阶段闸门、停止条件、风险和拟议决议，并附来源链接。
artifacts: meetings/decisions/2026-09-13-ai-content-publishing-business-line-board-memo.md；research/2026-09-13-ai-content-publishing-business-line.md；output/pdf/2026-09-13-ai-content-publishing-business-line-board-report.pdf；仅新增报告、PDF成品和本任务事件记录。
evidence: 2026-09-13 核验CNNIC、中国网信网、人大网、市场监管总局、微博与知乎平台规则，以及蚁小二、快工场、第六帧、超级编导、SupaWriter、新榜矩阵通、闲人新媒体管家、易媒助手、96智推等公开页面；董事会报告覆盖9个竞品、7个可模仿对象、2026年多渠道分发新规、1至2人组织方案、三项战略选项、两阶段人民币16.5万元融资方案、阶段放款闸门、董事会异议答复和陈述建议；PDF共16页，已逐页渲染检查，中文、表格、预算、闸门与拟议决议显示完整。
status: verified
remaining: 多渠道分发新规对纯SaaS及自营账号模式的具体适用边界尚无律师意见；各平台入驻机制、账号实时收益资格、实际RPM、结算周期、发布接口稳定性及蚁小二免费额度是否完整覆盖CLI/API均未通过真实账号验证。
knowledge: none；本轮不更新公司知识库，待真实实验形成稳定证据后再提候选。
metrics: 竞品样本9个；可模仿对象7个；首期验证6周、人民币15000元；第二期3个月、人民币150000元；总授权上限人民币165000元；执行人员1至2人；首批账号3至5个；第二阶段付费客户目标3家、续费目标至少2家、单客户毛利率目标不低于50%；真实收入unknown；实际RPM unknown；账号资格unknown；发布成功率unknown。
next_action: 按V2确认交付负责人和内部执行者可用工时，建立单主题单平台配置并核验本人账号收益资格；实际签约、收款、软件开发和公开发布未在本轮执行。
---

## V2范围变更与设计交付（2026-09-13）

- 用户新增条件：外部个人创业者表达10万元购案意向；内部1人做对照。用户进一步明确1000元/月为工具运营预算，人工另算。
- 当前决策建议：旧版16.5万元融资建议被V2替代。内部90天分月试点现金上限3000元，人工与公司交付投入另计；一主题、一主平台、每周3条为计划目标。两个不同操作者仅形成配对观察，不声称因果证明。
- 交付范围：新版董事会方案、个人操作手册、故障处理与复制模板、工作台开发规格及阅读入口。10万元拟议产品是定制部署、工具资产、训练和90天有界支持；实际软件、合同、收款和买方验收待实施。
- artifacts_v2：meetings/decisions/2026-09-13-solo-content-v2-board-plan.md；deliverables/solo-content-v2/README.md；deliverables/solo-content-v2/01-个人操作手册.md；deliverables/solo-content-v2/02-故障处理与模板.md；deliverables/solo-content-v2/03-工作台产品规格.md。
- 知识采用：已读取employees/product-manager/KNOWLEDGE.md的product-manager-core效果归因条目，将两组经验、账号基线、工时、支持投入列入记录，并限制因果措辞；未新增知识或全局记忆。
- 验证范围：纸面核对预算合计、付款分期合计、相对文档链接、手册步骤与故障回退、设计与已实现边界。现有PDF属于V1历史材料，入口已注明，未将旧PDF冒充V2。
- 证据：用户预算答复；本次复核蚁小二官方价格页和网信办多渠道分发规定；真实收益、平台权限和买方可用性尚无实测证据。
- status_v2：设计交付verified；软件实现not_started；账号试点not_started；交付人与平台资格待确认。模型GPT-6；精确任务成本和实际人工工时unknown。
