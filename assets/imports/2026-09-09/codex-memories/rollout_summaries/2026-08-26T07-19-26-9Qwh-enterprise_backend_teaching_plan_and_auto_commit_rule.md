thread_id: 01a03cf0-2612-7442-b689-de1fe7c627c9
updated_at: 2026-08-26T08:24:41+00:00
rollout_path: /Users/dongdeming/.codex/archived_sessions/rollout-2026-08-26T15-19-26-01a03cf0-2612-7442-b689-de1fe7c627c9.jsonl
cwd: /Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web
git_branch: master

# 将教学从 Redis 专项调整为企业后端交付主线，并固化自动提交规则

Rollout context: 工作目录为 `/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web`。用户希望围绕参考企业项目提升真实 Java 后端开发能力，并关注跨电脑恢复学习上下文。

## Task 1: 重新设计企业后端教学路线

Outcome: success

Preference signals:
- 用户指出“还是要以完成企业真实开发作为背景”，说明课程应围绕可交付业务闭环，而不是孤立讲组件或长期停留在 Redis 细节。
- 用户质疑“卡在 redis 很久了”，说明希望采用螺旋式学习：组件先达到可用门槛，再在后续场景中回访一致性、幂等、容量和治理问题，而不是单个组件达到生产级后才允许切换。
- 用户要求“xxx-job等也要”，说明目标范围包括 XXL-JOB、RabbitMQ、`@Async`、Nacos、Sentinel 和可观测性，而非仅 RabbitMQ。

Key steps:
- 复核 `PROGRESS.md`、当前代码、Git 状态和 `mephisto` 参考项目；确认当前仓库 `master` 工作区干净，代码 HEAD 为 `2c1ea48`。
- 识别教学误区：把 Redis 生产级完整闭环误当作进入其他组件的前置条件；基础设施机制重复验收过多；缺少跨组件企业业务交付物。
- 将 `docs/learning/PROGRESS.md` 改为企业后端实战主线，设计“商品分类变更及下游同步”贯穿链路：分类更新 → MySQL 事务 → Redis 失效 → 事件记录 → RabbitMQ → 幂等消费 → XXL-JOB 补偿 → Nacos 配置 → Sentinel 保护 → 日志指标。
- 制定四周计划：第1周整理事务测试/实验配置并开始 XXL-JOB；第2周完成任务幂等、失败重试和并发抢占；第3周完成 RabbitMQ 基础发送消费；第4周完成 ACK/NACK、重复消费、死信、Outbox 与 XXL-JOB 补偿。
- 保留 Redis 高级课题（锁租约、Fencing Token、删除失败补偿、热点治理）作为后续螺旋回访，不再阻塞新组件学习。
- 参考项目 `/Users/dongdeming/Documents/vanke/daojia/mephisto/` 只用于识别企业代码形态和风险；所有实现与验收仍在 `spring-test-web` 完成。

Reusable knowledge:
- `mephisto` 中检索到约 `153` 个 `@XxlJob`、`72` 个 `@Async`、`276` 个 `@Transactional`，说明 XXL-JOB 和异步/事务是重要企业能力，不应作为附属内容。
- `mephisto` 的 `GoodsSupplierCategoryConsumeConfig.java:30-35` 在 `@PostConstruct` 中无条件初始化并启动 RabbitMQ 消费者，异常仅记录日志；这是学习消费者启停、失败可观测性和环境隔离的风险样本。
- `mephisto` 的 `MilkExportJob.java:20-24` 展示了 `@XxlJob` 入口调用业务 Service 的分层方式；其 `catch` 只记录异常、不向调度框架反馈失败，是任务失败状态可能被误报为成功的风险样本。
- `MilkDataExportRecordServiceImpl.java:94-164` 方法名含 Rabbit，但实际调用企业微信机器人，不应误当作 RabbitMQ 生产者样本。
- 当前 `CategoryServiceImpl.updateName()` 位于非事务协调层，获得 Redis 锁后调用独立 `CategoryTransactionalService.updateName()`；事务 Bean 使用 `@Transactional` 和 `afterCommit()` 删除缓存。该路径已有用户确认的运行验收，但原始日志未入库，后续应通过跨组件自动化测试补证据。

Failures and how to do differently:
- 初始方向试图重复验收“Redis 锁等待期间事务未开启”，用户明确表示该课已验收；以后应先读取进度和用户验收结论，避免重复已完成实验。
- 现有 `CategoryTransactionalServiceTest` 使用错误缓存 Key：`"category:children" + CATEGORY_ID`，而生产契约是 `category:children:{parentId}`；测试还清理了未创建的锁、未清理测试缓存。进入自动化测试阶段应先修正契约和现场恢复。
- `TX_ROLLBACK_TEST`、`TX_POOL_TEST`、2 秒暂停及 Hikari 极小配置仍属于实验代码债务，应放入测试夹具/profile 或隔离配置，不能长期污染默认业务路径。

References:
- `/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web/docs/learning/PROGRESS.md`
- 提交：`e436c1a docs: 调整企业后端实战教学路线`
- 提交后状态：`master` 比 `origin/master` 领先 1 个提交，未推送。

## Task 2: 固化学习进度自动提交规则

Outcome: success

Preference signals:
- 用户明确要求：“教学任务修改后应当自动提交，但是不要推送” -> 今后教学任务或学习进度发生修改时，应检查完整差异并自动创建本地 commit，不再询问是否提交；push、merge、部署仍需用户明确要求。
- 用户关心切换电脑后恢复上下文，说明进度文档、代码、测试和 Git 提交应持续保持可恢复状态；仅终端临时观察到的日志不能视为跨电脑持久证据。

Key steps:
- 在 `PROGRESS.md` 中写入自动提交规则，明确只提交本轮教学任务、学习进度和对应改动。
- 使用 `git diff --check` 和完整差异复核后提交。
- 沙箱内首次提交因无法创建 `.git/index.lock` 失败；申请提升权限后成功提交。

Reusable knowledge:
- 进度文件是后续教学的唯一事实源；每课应记录“已学习/已实现/已验收”、关键证据边界、代码关联和下一步。
- 自动提交不等于自动推送；当前仓库允许本地提交保持领先远端，只有用户明确要求时才 push。

Failures and how to do differently:
- 普通沙箱权限无法写入 `.git/index.lock`，Git 提交需要在获得提升权限后重试；错误信息为 `fatal: Unable to create .../.git/index.lock: Operation not permitted`。

References:
- 提交：`31e7461 docs: 明确教学进度自动提交规则`
- 规则落点：`docs/learning/PROGRESS.md` 使用规则第 14-15 行附近。
- 当前状态：`master` 比 `origin/master` 领先 1 个提交；未推送、未合并、未部署。
