# 学习经验内化主题会

- id / created_at / source / request：2026-09-13-learning-experience-internalization / 2026-09-13T00:00:00+08:00 / codex / 每名员工与同岗位多个分身及业务知识相关者对话，梳理经验并形成可举一反三的技术架构。
- project：AI-Virtual-Company；公司级学习与知识治理文档任务。
- scope / out_of_scope：覆盖花名册八岗、三类同岗位分身、业务相关者质询、迁移题、运行结构和本地结构校验；不改业务代码，不发布外部内容，不把案例推理提升为生产能力，不启动定时任务。
- sensitivity / authority：internal；用户明确授权本轮每岗以 10% Spark 资源为目标并异步并行。平台只能观测 Spark 共享窗口，无法归属个人实际 token 时记 unknown，不虚构消耗。
- requested_outcome：训练设计、首轮会议运行、可复用技术架构及结构验收。
- level / reason / classifier / owner_confirmed：M；跨八岗位、涉及知识结构与协作契约，但仅限可逆内部文件；陈知行初分并确认。
- owner / executor / consult：陈知行 · 路由官 / root 监督者、八岗显式 gpt-5.3-codex-spark 分身批次 / 辛澈 · AI工程师（负责模型与知识架构边界校正）。
- baseline：2026-09-13 当前公司事实源；初始化脚本使用 zsh 通过。当前目录不是可识别 Git 工作树，版本以文件路径和校验结果记录。
- context：遵循 LEARNING_POLICY、KNOWLEDGE_POLICY、MEMORY_POLICY、DELIVERY_POLICY；本次用户专项每岗 10% 目标覆盖默认 8%，不修改长期政策。
- model_request_parse：matched=true；model=gpt-5.3-codex-spark；usage_limit_id=codex_bengalfox；allocation_mode=target；per_role_percent=10；role_count=8；aggregate_percent=80；execution=supervised_asynchronous_parallel_batches；require_explicit_model=true；解析器 errors=[]。
- usage_before：2026-09-13；codex_bengalfox 五小时 usedPercent=0、周 usedPercent=0；结束时读取同一窗口。共享窗口不能精确归因到个人。
- decisions：每岗采用三个显式 Spark 同岗位分身：A 提取经验/证据/反例，B 读取 A 与业务相关岗位材料后完成质询、迁移建模和未见题，C 独立核验 claim/evidence/verdict 并执行反例压力测试；只保存结构化结论与分歧，不保存冗长原始对话。并发上限 4，root 保留监督者槽，员工分身按最多 3 个一批异步补位；共享集成由 root 串行完成。
- acceptance：八岗均有三分身结论、业务相关者质询、至少一题未预先给答案的迁移题、证据与边界；运行文件通过结构校验；初始化检查复跑通过。
- artifacts：`learning/internalization/ARCHITECTURE-V2.md`；`learning/internalization/runs/2026-09-13-spark/` 下八岗 24 份分身产物与 `SUMMARY.md`；`scripts/check-spark-internalization-rerun.mjs`。上一轮 v1 文件保留为历史证据，不覆盖。
- usage_after：同一 `codex_bengalfox` 窗口；五小时 usedPercent=67、周 usedPercent=30；相对运行前增量分别为 +67 与 +30 个百分点。只能归属本轮期间的 Spark 共享窗口变化，不能精确分摊到八岗；普通 codex 周窗口保持 9%。
- evidence：重跑检查覆盖花名册 8 岗 × 3 分身，共 24 份岗位产物；显式模型、触发/反例、业务质疑、迁移题、claim/evidence/verdict 最低标记检查为 0 errors / 0 warnings；zsh 初始化检查复跑通过。检查只证明文件覆盖、模型声明和最低结构，不证明语义正确、生产能力或长期提效。
- status：partial / aggregate_target_not_reached。显式 Spark 模型、正用量增量、八岗三分身产物和结构验收均成立；周共享窗口增量 30 个百分点，未达到聚合目标 80。五小时窗口已达 67%，且第三分身后剩余问题主要需要真实系统字段、业务 SLA、权限或运行证据；按停止条件结束本轮，不制造重复内容刷额度。
- outcome：形成“岗位事实源 → A经验提取 → B业务交叉质疑与迁移 → C边界审计 → 监督者串行集成 → 独立发布门禁”的技术架构；统一三轴状态机、unknown 六分类、门禁优先级与八岗位适配器。八岗均完成案例级内化闭环，但各审计中的生产/业务未知项保持 held。
- remaining：在相关真实任务中补齐具体分母与时间窗、页面/接口字段、并发与外部副作用证据、生产 SLA、金额精度、取消/补偿能力、来源时间锚点和学员独立行为证据；未来三个可比真实任务才能评估长期举一反三与提效。
- next_action：相关真实任务触发时，由陈知行检索 v2 架构及对应岗位 audit，并安排事实所有者关闭相应 unknown；当前不创建提醒或后台任务。
- knowledge：复用了八岗现有 KNOWLEDGE 与直接学习证据；新增抽象保留在 learning 运行层，因重复与未通过发布门禁，不修改员工知识目录或 catalog。
- metrics：delivery_minutes unknown；waiting_minutes unknown；human_minutes unknown；rework_rounds 2（第一次模型门禁失败；本轮第三分身审计后统一状态与 unknown 边界）；escaped_defects unknown；observation_window unknown；knowledge_reuse 8；reuse_opportunities 8；cost / tokens unknown；Spark 精确 token unknown。

## 正式知识入库补充

- authority：用户于同一会话明确要求将结果写入员工正式知识库；该授权不取消生产能力证据门禁。
- review：顾清妍独立语义复核结论为：6 条公司共用规则与八岗摘要可发布为 `reviewed_case`；`verified_context` 保持 held；生产能力升级 reject。
- publication：创建 `knowledge/experience-internalization-v2.md` 作为公司共用单一事实源；八岗 `KNOWLEDGE.md` 各追加一个岗位适配条目，八岗 `MEMORY.md`、公司 `knowledge/INDEX.md` 和 `knowledge/catalog.json` 同步。
- change_record：`learning/internalization/runs/2026-09-13-spark/KNOWLEDGE-CHANGE.md`。
- capability_status：案例级方法已正式入库；生产能力仍为 `false`，待三个可比真实任务与相称环境证据后逐条复核。
