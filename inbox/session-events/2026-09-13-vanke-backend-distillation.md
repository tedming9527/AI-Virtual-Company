---
id: 2026-09-13-vanke-backend-distillation
created_at: 2026-09-13T09:59:43+08:00
source: codex
request: 后端工程师去蒸馏优先的 /vanke 下后端项目，学习其代码经验
scope: $VANKE_WORKSPACE_ROOT 下本地可读后端仓库；公司学习与知识沉淀目录
sensitivity: internal
requested_outcome: research
level: M
level_reason: 涉及多个后端仓库的优先级判断、代码证据抽样与跨项目经验整合，不修改产品仓库
owner: 沈砚舟 · Backend Training Architect
actual_executor: /root/shen_vanke_distill（主责审查与整合）；/root/lu_vanke_review（顾问独立复核）
consult: 陆行远 · 可靠服务官
acceptance:
  - 列出候选后端仓库并给出可追溯的优先级理由
  - 对优先仓库抽取真实代码链路与工程经验，区分事实、推断和待验证项
  - 形成可复用学习产物并由顾问交叉核对
  - 只写公司学习与知识资产，不修改 /vanke 产品仓库
status: verified
model: unknown
reasoning_effort: unknown
budget_plan: 定题与资料定位 1%；自主探索 5%；交叉讨论与校正 1.5%；知识入库 0.5%
usage_observability: 平台未提供逐岗位精确 token 统计，以可观察里程碑监督
expected_artifact: learning/2026-09-13-vanke-backend-project-distillation.md
stop_condition: 优先项目已形成有代码证据的经验卡，顾问复核完成；或连续两轮无新增证据
---

## 运行记录

- 2026-09-13 09:59 +08:00：公司 bootstrap 通过；完成必读治理文件和后端培训岗位入口加载。
- 已命中既有知识：Mephisto 作者评审与 Flexible/BlackSam/Katarina/Camille 跨系统边界；仅作线索，当前代码仍需复核。
- 2026-09-13：只读枚举 27 个本地 Git 仓库，确认 Java/Spring 候选为 Azeroth/Pandaria、Mephisto、Yanxuan-BlackSam、Camille、Sisyphus；随后只精读 4 条高价值链路，未修改 `/vanke` 产品仓库。
- 交叉复核：主责初排 Pandaria 第一；陆行远以“仓库 README 的占位/重建性质、存量业务相关性、跨系统真实链路”为证据提出调整。最终采用存量业务学习顺序 `BlackSam > Mephisto > Camille > Pandaria > Sisyphus`，同时保留 Pandaria 为现代工程练习基线；无未决重大分歧。

## Outcome

- 候选优先级和四条精读链路已形成统一结论：
  - P0 BlackSam 维修提成月汇总：业务/金额事实最有价值；长事务、逐人吞错、异常降级 0 和测试缺口只作反例。
  - P1 Mephisto 产品包快照/金额分摊/权益：历史快照、尾差归属、唯一键与 `INSERT IGNORE` 值得学；先查后写并发窗口、事务内远调和巨型 Service 不照抄。
  - P2 Camille 提交后算薪推送：`afterCommit + 状态 + 重试` 意图可借鉴；无 outbox、非唯一重试键、查询后写入竞态和无逐条租约使其只适合作为改造题。
  - P3 Pandaria 工单/支付链：行锁、条件更新、幂等日志和同进程数据库回滚测试适合作为练习基线；人工 DDL、权益恢复缺口和批任务中断风险不能写成生产成熟度。
- 所有结论区分代码事实、工程推断和待验证；未按仓库体量、提交量、作者或目录风格推断质量。

## Evidence

- 主产物：[`learning/2026-09-13-vanke-backend-project-distillation.md`](../../learning/2026-09-13-vanke-backend-project-distillation.md)
- 代码快照：BlackSam `main@ec40b0ffe1`；Mephisto `codex/main-author-study-20260909@bdb5dc31f`；Camille `main@aeaaa3c7`；Azeroth `main@8d7e304`；Sisyphus `master@2514879`。审查时五个工作区 `git status --porcelain` 均为空；未拉远端。
- 关键证据路径已逐项写入主产物，包括金额公式/SQL、产品包快照与测试、after-commit/重试 DDL、工单状态机/支付恢复窗口。
- 知识结构校验：`node scripts/check-knowledge.mjs . backend-training-architect-vanke-critical-distillation`、核心条目定向校验和全 catalog 校验均为 `errors: []`、`warnings: []`；范围仅为结构与漂移，不是语义或生产认证。
- 运行边界：未运行 Maven、MySQL、Redis、XXL-JOB 或外部接口；没有构建/集成/生产验收证据。

## Knowledge

- 新增 `backend-training-architect-vanke-critical-distillation`：`employees/backend-training-architect/KNOWLEDGE.md`。
- 更新发现目录 `employees/backend-training-architect/MEMORY.md` 和 `knowledge/catalog.json`；首次入库详情 sha256 为 `b874973d5e68ff42bdbd3676e43650eb4d21b9f61908905d27190c87b8d8fc95`，本次方法论补充后为 `a30cd62bd716144ae414551098c2af1eefe6110a9337486c30646a3604783512`。
- 复用既有跨系统边界原则：先读真实后端与接口，前端字段名不作为会计/系统语义证据；本次通过当前代码重新核验后采用。

## Remaining / next action

- 远端最新代码、业务数据库约束、真实隔离级别、外部幂等契约、税务/会计定义仍为 unknown。
- 下一步由沈砚舟带学员完成主产物中的迁移题：把 BlackSam 月度汇总改画为稳定业务键、短事务、失败状态、原子抢占和分层测试；完成案例不等于生产能力验收。
- 如进入真实改造，应由陆行远主责产品实现，并先读取对应 PRD/Issue 与跨系统契约；本次未获得修改产品仓库的授权。

## Metrics

- 模型：unknown；推理强度：unknown；逐岗位 token：unknown。
- 可观察里程碑：候选清单 1、精读链路 4、顾问交叉复核 1、学习产物 1、知识条目 1、结构/漂移校验 3 次通过。
- 总耗时、人工介入时间、费用、未来三次复用提效：unknown；不得由文件数或报告数反推。

## Follow-up · 学习经验沉淀

- 2026-09-13：用户明确要求总结沉淀。本轮先查重，保留原知识 ID，不新增同义条目。
- 在主产物新增“本次学习方法沉淀”：按链路学习、业务/工程双轨排序、正反例成对、事实/推断/unknown 分层、测试映射风险、以迁移能力作为停止条件。
- 同步补充岗位知识详情；该补充仍保持 `reviewed_case`，没有新增运行证据，故不提升状态。
