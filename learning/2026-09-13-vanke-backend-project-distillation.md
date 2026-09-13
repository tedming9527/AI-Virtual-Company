# `/vanke` 后端项目批判性蒸馏 · 2026-09-13

- Owner：沈砚舟 · 后端培训导师（资深后端架构师）
- Consult：陆行远 · 可靠服务官
- 实际执行：Codex 多智能体协作；具体模型、推理强度与逐岗位 token 消耗不可观测，记为 `unknown`
- 范围：只读审查 `/Users/dongdeming/Documents/vanke` 下本地仓库；未修改产品仓库，未连接业务数据库、注册中心、Redis、外部接口或生产环境
- 目标：为“前端转 Java/Spring 后端”筛选高价值代码链路；不按仓库体量、提交数、作者或目录命名默认代码正确
- 判断轴：业务建模、架构边界、事务与失败语义、可测试性、可维护性、可靠性

## 结论先行

首轮最值得精读的是两条链路，而不是两个完整仓库：

1. **P0：`yanxuan-blacksam` 维修提成月汇总**——最适合学习“前端字段背后的真实口径与跨系统数据来源”，但其长事务、逐人吞错和测试缺口只能作为批判性样本。
2. **P1：`mephisto` 产品包快照、金额分摊与权益创建**——最适合学习“历史事实快照、金额守恒、数据库唯一约束和重复回调”，但并发首次创建、事务内远程调用和巨型 Service 不应照抄。

第二轮再学 **P2 `camille` 的提交后推送与补偿重试**，把它当可靠消息改造题；**P3 `azeroth/pandaria`** 更适合承接上述规则做小型实现与测试，不作为成熟遗留系统经验来源。`sisyphus` 只作为 BlackSam 的工人类型边界系统定向查契约。

## 候选清单与优先级

评分只是本轮教学排序，不是项目质量或人员绩效评价。规模用于识别维护风险，不用于自动排名。

| 优先级 | 仓库 / 本地基线 | 只读规模快照 | 最有价值的样本 | 结论 |
|---|---|---:|---|---|
| P0 | `daojia/yanxuan-blacksam` · `main@ec40b0ffe1` | 5,017 main Java；122 test 文件 | 维修工费月汇总、跨系统金额口径 | **有条件借鉴**：业务价值最高，工程实现需改造 |
| P1 | `daojia/mephisto` · `codex/main-author-study-20260909@bdb5dc31f` | 3,409 main Java；99 test 文件 | 产品包配置快照、尾差、权益幂等 | **有条件借鉴**：局部模式值得学，类与事务边界不值得学 |
| P2 | `meiju/camille` · `main@aeaaa3c7` | 1,183 main Java；11 test 文件 | 结算提交后推算薪、失败补偿 | **不建议原样学习**：意图正确，可靠性闭环不足 |
| P3 | `daojia/azeroth/pandaria` · `main@8d7e304` | 256 main Java；95 test 资源（其中 Java 测试约 86） | 工单状态机、幂等日志、事务回滚测试 | **值得学习实现技法**，但不作为成熟存量系统经验 |
| P4 | `meiju/sisyphus` · `master@2514879` | 115 main Java；1 test 文件 | 工人服务与发放配置边界 | **本轮不建议优先学**：证据密度和测试支撑不足 |

这五个本地工作区在审查时 `git status --porcelain` 均为空。该事实只表示未发现工作区改动，不表示分支等同远端最新版本。

## P0 · BlackSam 维修提成月汇总

### 一条业务链

月任务 `RepairCommissionCalculateJobHandler` 先算提成明细和罚款，再调用 `calculateByMonth` 计算上月/本月汇总，最后向 XXL-JOB 回报结果（`task/repair/RepairCommissionCalculateJobHandler.java:120-170`）。管理端查询只读取汇总结果（`controller/admin/repair/AdminRepairCommissionController.java:26-42`）。

`RepairCommissionDetailMapper.xml:49-99` 先在 SQL 中按 `worker_mobile + summary_month` 聚合工单金额和罚款，并用 `UNION ALL + NOT EXISTS` 保留“只有罚款、没有提成明细”的工人。代码再完成跨系统计算：

- `totalPerformance = totalOrderAmount + yanxuanFee + backfillAmount`；
- `totalCommissionableAmount = totalPerformance / (1 + taxRate) - materialFee`；
- `baseCommission = max(totalCommissionableAmount × commissionRate, 0)`；
- `actualIncome = baseCommission - totalPunishAmount`；
- `adjustAmount` 被单独查询和保存，并未在这段代码里加进 `actualIncome`。

以上是 `RepairCommissionServiceImpl.java:182-236` 的**代码事实**。字段在前端、导出或其他系统如何最终展示，必须继续核对各自契约；不能把 `orderAmount`、`yanxuanFee`、`baseCommission`、`adjustAmount`、`actualIncome` 当成可任意相加的同类账目。

### 值得学

- **先把数据归属和公式写清，再谈 Controller。** SQL 负责集合聚合，Java 负责需要配置与外部数据的业务规则，前端字段可以沿来源反查，而不是从名字猜含义。
- **金额显式使用 `BigDecimal`、舍入位数和负值下限。** 这使口径可审查；`RepairCommissionServiceImpl.java:188-224` 明确了每一步的精度和边界。
- **批量查询工人类型，而不是循环逐个查 Sisyphus。** `calculateByMonth` 在循环前调用批量接口（`135-140`），这是减少 N+1 远程调用的正确方向。

### 有条件借鉴 / 不建议学

- `calculateByMonth` 整体标了事务（`118-120`），事务内又调用 Sisyphus 批量接口（`135-140`）和逐工人调用 Camille 查询研选工费（`182-183`；具体调用在 `1298-1367`）。**工程推断：**数据库连接和锁可能被远程延迟拉长；实际锁范围、超时和连接池影响未做运行验证。
- 每个工人的异常在循环内被记录后吞掉（`144-169`），方法仍返回部分结果；上层任务按 `result.size()` 调用 `handleSuccess`（`RepairCommissionCalculateJobHandler.java:150-165`）。**代码事实：**任务可以在部分工人失败时仍报告成功。业务是否接受“部分成功”是**待验证**，当前代码没有明确失败清单或可重试状态。
- `queryYanxuanFee` 把任何异常降级成 `0`（`1364-1367`）。这会把“真实为零”和“外部系统不可用”折叠为同一数值。**不建议学**这种失败语义。
- `RepairCommissionServiceImpl` 为 2,147 行；本轮没有搜到覆盖上述公式、外部失败和并发分支的测试，测试流水线配置还使用 `maven.test.skip=true`（`.cicd-config-test.yml:36`）。不能把“能编译/能跑任务”当金额口径已验收。

### 更好的实现方向

远程输入先在事务外拉取并冻结版本；按“月份 + 工人 + 口径版本”建立稳定业务键；每个工人使用短事务 upsert；结果明确为 `Pending / Success / Failed` 并保存失败原因；金额公式提取成纯函数做参数化测试，再补真实 Mapper 集成测试。外部失败不得默认为零，除非产品明确授权该降级且保存来源状态。

## P1 · Mephisto 产品包快照、金额分摊与权益

### 一条业务链

`BundleOrderServiceImpl.createOrderSnapshots` 在订单创建时冻结产品包有效期、配置版本、来源商品快照、费率、优惠与结算金额（`goods/bundle/service/impl/BundleOrderServiceImpl.java:164-253`）。按组件售价权重分摊时，前 N-1 项按两位小数舍入，最后一项吸收总额尾差；组件数量除不尽的余数再单列保存（`206-226`）。支付后 `createEntitlements` 使用 `insertIgnore` 创建权益，重复回调时返回 0 并记录日志（`377-405`）。

### 值得学

- **快照保存历史事实。** 后续商品、费率或配置变化，不应重写已成交订单的结算语义。
- **金额必须守恒，尾差必须有归属。** “最后一项吸收分摊尾差 + 单价余数单列”比每项独立四舍五入更可审计。
- **幂等落到数据库约束。** 权益创建不是只做一次 `select`；`OrderBundleEntitlementMapperIntegrationTest.java:20-87` 明确用真实 Spring/数据库配置验证自增 ID 与重复唯一键 `INSERT IGNORE` 行为。
- `BundleSettlementSnapshotTest.java:78-161` 用具体金额覆盖标准费率、自定义费率、差价费率和多组件分配，适合作为金额测试样例。

### 有条件借鉴 / 不建议学

- 快照方法先查 `orderId` 再插入（`170-186`）。两个并发首次请求仍可能同时通过前置查询，随后一个撞唯一键。现有检索未见这一并发场景测试；**不能把前置查询称为完整幂等**。
- 方法带事务，同时 `resolveBundleRate` 会查询外部商户/类目能力（`326-363`）。与 BlackSam 相同，这可能形成长事务，运行影响待验证。
- 这个 Service 有 1,073 行、16 个字段注入依赖（`74-92`）。**不建议学**“把完整生命周期堆进一个实现类”的组织方式；应按选品校验、快照、金额分配、权益状态拆成可组合服务。
- 多数金额测试使用 Mockito；真实 Mapper 测试覆盖了权益插入，但不等于完整下单、支付、取消、退款并发链已验证。

### 更好的实现方向

用唯一业务键的 `insert ignore/upsert` 作为首次创建裁决，再读取并校验已有快照是否与请求一致；远程配置在事务外拉取后以版本化输入进入短事务；为“两线程同 orderId 首次创建”“支付回调与取消并发”“尾差取消后重订”补真实数据库测试。

## P2 · Camille 提交后算薪推送与补偿

### 一条业务链

结算确认先锁定记录（`LaborCostSettleRecordServiceImpl.java:503-507,813-818`），本地状态更新后注册 `afterCommit`；只有本地事务成功提交才调用算薪接口（`1093-1112`）。调用成功更新推送状态并结束重试，失败则记录错误并写 `t_schedule_retry`（`1115-1151`）。XXL-JOB 在全局锁下分页扫描待重试记录并逐条重试（`scheduled/laborfee/LaborFeeTask.java:217-248`）。

### 值得学

- **外部副作用不应早于本地事务提交。** `afterCommit` 比“事务中先调用外部系统、随后本地回滚”更安全。
- **失败需要可查询的业务状态和补偿入口。** 推送状态、错误、次数上限、重试任务和人工可定位的业务码，比只打日志更接近可靠闭环。
- **循环内逐条隔离。** 一条重试异常不会直接中断整批，是批处理应具备的基本边界。

### 不建议原样学习

- **提交与消息记录之间仍有丢失窗口。** 本地事务提交后、`afterCommit` 执行或失败记录落库前宕机，代码中没有同事务 outbox，推送可能永久缺失。
- `ScheduleRetryServiceImpl.saveFailure` 是 `select → insert/update`（`35-65`），DDL 只有 `(business_code, business_type, deleted)` 普通索引而非唯一键（`db/125_labor_ehr/ddl.sql:11-25`）。并发失败可能生成重复任务或丢失次数更新；这是由代码和 DDL 支持的**工程推断**，尚未用并发数据库测试复现。
- 批处理依赖一把全局锁，没有逐条 claim、租约或 fencing token；锁失效/超时时的重复执行语义待验证。
- 现有 `LaborEhrCommissionRetryFactoryTest` 只检查对象字段；本轮未发现 after-commit 崩溃窗口、重复失败、并发领取或真实数据库状态迁移测试。

### 更好的实现方向

在本地事务中写 outbox；为 `(business_type, business_code, deleted)` 建唯一约束并原子 upsert；执行器用 `Pending → Processing(owner, leaseUntil) → Success/RetryWaiting/Dead` 的条件更新抢占；下游以 `sourceId` 幂等；增加指数退避、死信和告警，并用真实数据库双连接验证并发与宕机恢复。

## P3 · Azeroth/Pandaria 作为落地练习场

`WorkOrderWorkflowService` 把接单、到达、开始、完工统一为状态转换：事务内 `SELECT ... FOR UPDATE`，按租户/工人/旧状态校验，再用状态 + version 条件更新，同时写带 `requestId` 的不可重复日志（`modules/workorder/service/WorkOrderWorkflowService.java:150-223`；`ServiceWorkOrderMapper.java:247-353,372-384`）。DDL 对 `request_id` 建唯一键（`../docs/04-data-model/work-order.sql:74-93`）。H2 MySQL 模式测试覆盖完整状态流、重复请求不重复写日志和审计插入失败时状态回滚（`WorkOrderWorkflowServiceTest.java:52-158,227-248`）。这些实现技法**值得学**。

支付回调也有值得学习的局部：短事务内锁定支付单和订单，核对来源、业务类型、业务单号与金额，重复成功直接重放，状态更新失败则回滚，事务提交后才确认/释放权益（`OrderPaymentCallbackService.java:59-117,138-170`）。但它同时暴露了 Saga 的恢复边界：下单先预占券和积分，本地落单失败后只做同步补偿；补偿再失败只记日志（`OrderCreationService.java:100-128,252-264`）。支付计划已在外部创建、本地支付记录重试仍失败时也只抛错（`190-226`），后续回调会因本地支付记录不存在而返回 `ORDER_PAYMENT_NOT_FOUND`（`OrderPaymentCallbackService.java:90-91`）。这是**代码事实支持的恢复缺口**，是否依赖下游 TTL 或人工处理仍待验证。

但需要保留三个边界：

- SQL 文件明确要求发布前人工执行，应用不会迁移（`work-order.sql:1`）；**不建议学习**这种发布一致性做法，应纳入 Flyway/Liquibase 和发布检查。
- `NoFlywayRuntimeTest.java:8-13` 还主动断言运行时不存在 Flyway；因此 H2 测试只能称为同进程数据库集成验证，不能写成 MySQL 迁移或生产验收。
- `ModulePackageStructureTest` 只检查类是否在目标包、旧类是否消失（`architecture/ModulePackageStructureTest.java:8-34`），并没有验证模块依赖方向。目录整洁不等于架构边界已建立。
- `LeadOrderConversionService.convertPending` 对列表 `forEach`，单条运行异常会重新抛出（`67-68,120-125`），可能中止本批后续线索；重复键被吞掉但缺少领取/租约。可把它作为“可靠任务”的反例练习。
- 权益补偿扫描只筛 `cloud_point_status = 'FROZEN'`（`ServiceOrderMapper.java:366-376`），优惠券确认失败只更新时间（`OrderBenefitService.java:48-67`）。如果积分已确认而券失败，现有扫描条件能否再次找回该券没有代码证据；应将每类权益的状态、稳定标识和 outbox 分别持久化。

顾问指出仓库 README 把后端标为占位/重建工程，且近期提交含 AI 协作痕迹。因此本轮把它降为 **P3：规则落地练习场**，不把其较新的技术栈、较高测试密度误写成已在线上证明的成熟经验。

## 跨仓库可复用的七条规则

1. **先画事实归属，再写接口：** BlackSam 算维修提成；Sisyphus 提供工人类型；Camille 提供/接收结算与算薪数据；Flexible 是展示消费者之一。字段同名不等于同一账目。
2. **状态机同时落三层：** Java 允许的转换、SQL 条件更新、审计日志/业务幂等键；只写枚举不够。
3. **本地事务只保护本地事实：** 远程调用放进 `@Transactional` 不会让两个系统原子提交，反而可能拉长锁和连接占用。
4. **`afterCommit` 只是时机，不是可靠投递：** 要补 outbox、可恢复状态、原子抢占、有限重试和死锁恢复。
5. **金额要保存来源、公式、精度与尾差归属：** 不能只保留最终数；异常降级为 0 必须有产品授权与来源状态。
6. **幂等要靠稳定业务键和数据库裁决：** `先查再写`、全局锁、固定租约、catch 异常都不是完整幂等。
7. **测试按风险升级：** 纯函数公式 → Mapper 真实 SQL → 事务回滚 → 双连接并发 → 外部超时/宕机恢复；Mockito 不能证明数据库和跨系统语义。

## 本次学习方法沉淀

这次最重要的收获不是记住几个类，而是形成一套以后可重复使用的代码学习方法：

1. **按业务链路学，不按仓库学。** 先选一个有输入、状态、数据变化和失败出口的真实路径，再向 Controller、Service、Mapper、DDL、任务和测试两端追踪；大仓库只提供样本，不天然代表更高水平。
2. **业务价值与工程范式分开排序。** BlackSam 更能训练真实金额与跨系统判断，Pandaria 更适合练习状态机和测试；两者不能用一个“最佳项目”标签互相替代。
3. **正例和反例必须成对。** 看见 `afterCommit`、事务、锁或重试时，同时追问它解决了哪个窗口、还遗漏哪个窗口；最终写成“值得学 / 有条件借鉴 / 不建议学 + 更好方案”。
4. **三层证据不混写。** 源码直接表达的是代码事实；对并发、锁等待、宕机窗口的判断是工程推断；数据库配置、下游契约和业务容忍度没有证据时保持 unknown。
5. **测试数量不等于质量。** 先把测试映射到风险：金额公式看参数化断言，SQL 看真实 Mapper，事务看最终状态，并发看独立连接，跨系统看超时与恢复。缺少对应层级就不宣称已经验证。
6. **以迁移能力作为停止条件。** 当结论已能转化为一个新场景的设计、SQL 条件和测试骨架，且继续浏览连续两轮没有新增有效证据时停止；不为“读完整仓”制造低价值工作。

以后复用本方法时，输出至少回答五件事：选了哪条链、为什么优先、哪些做法可学、哪些不能学、用什么新场景验证已经真正理解。

## 给学员的一道迁移题

把 BlackSam 的“某月某工人提成汇总”改造成可靠任务，先只写设计和测试骨架：

1. 定义稳定键 `summaryMonth + workerId + formulaVersion`，并解释为什么手机号不能作为永久身份键。
2. 画出 `Pending / Processing / Success / RetryWaiting / Dead`，为每个迁移写 SQL 条件和预期影响行数。
3. 区分“研选工费真实为 0”和“Camille 超时未知”，说明最终汇总能否提交。
4. 写一个金额纯函数测试、一个真实 Mapper upsert 测试、一个双执行器抢同一任务的并发测试。
5. 关闭参考后解释：事实归谁、事务包哪几步、并发谁裁决、失败谁补偿、最后看什么证据。

通过这道题只能记为迁移案例完成；未在真实项目/数据库运行前，不升级为独立生产交付能力。

## 证据边界与待验证

- 本轮只读静态审查，未运行 Maven；避免生成 `target/` 或依赖下载而改变产品工作区。测试类存在不等于本轮已执行通过。
- 未拉取远端；“本地 HEAD”不等于远端最新。Mephisto 当前还在既有分析分支而非 `main`。
- 未验证 MySQL 隔离级别、连接池、Redis TTL、XXL-JOB 调度配置、下游幂等契约和真实超时行为。
- 财务/税务业务名词仅按代码字段与公式描述；税种、会计科目、权责口径及 `actualIncome` 的最终产品定义仍需产品/财务事实源确认。
- 交叉复核分歧已处置：主责原先把 Pandaria 排第一；顾问以“存量业务相关性、README 占位性质和真实跨系统链路”为证据提出降级。最终采纳 BlackSam P0、Mephisto P1；Pandaria 保留为高可测试练习场，而不是成熟经验标杆。
