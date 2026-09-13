thread_id: 01a036e6-cd2d-7963-a228-4e7d1a53dca9
updated_at: 2026-08-26T06:54:01+00:00
rollout_path: /Users/dongdeming/.codex/archived_sessions/rollout-2026-08-25T11-11-30-01a036e6-cd2d-7963-a228-4e7d1a53dca9.jsonl
cwd: /Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web
git_branch: master

# Redis/事务一致性培训推进至连接池容量实验

Rollout context: 用户在 `/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web` 进行 Java/Spring Boot/Redis 实战学习，要求结合真实接口、按“复现 → 分析 → 修复 → 验收”推进，并希望连续完成后续 10 节课程。

## Task 1: 事务与 Redis 缓存一致性、事务边界拆分

Outcome: success

Preference signals:

- 用户多次要求“继续教学”“讲慢一点，简单一点”“重新介绍”，说明类似培训应控制节奏、一次聚焦一个机制，避免一次引入过多 API 或理论。
- 用户偏好直接可复制的命令，例如“给我 redis monitor 命令，我需要拷贝”；实验应优先提供单行/可复制 shell 命令，而不是 Postman 脚本。
- 用户要求结合项目现有接口和实际日志，说明教学应绑定真实文件、Redis key、MySQL 状态和可观察证据。
- 用户明确关注“静态验收能发现什么”“项目启动是否有副作用”，后续应明确区分静态证据、运行证据和副作用风险。

Key steps:

- 复现了 `MySQL=新值、Redis=旧值` 的真实竞态：`updateName()` 内先执行 UPDATE、删除缓存、释放 Redis 锁，随后 Spring 事务代理才提交数据库。
- 清理了临时 3 秒暂停和无用导入。
- 通过 `TransactionSynchronizationManager.registerSynchronization()` 学习并实现提交后缓存删除；期间发现 `beforeCompletion()` 会在提交前解锁，纠正为提交完成后处理。
- 发现仅把事务代码拆到独立 Bean 仍不足够：外层 `CategoryServiceImpl` 若保留 `@Transactional`，内层默认加入外层事务，外层 `finally` 仍可能早于真正提交。最终移除外层事务注解。
- 形成两个 Bean 的边界：`CategoryServiceImpl` 负责查询 parentId、等待/持有 Redis 锁；`CategoryTransactionalService` 作为唯一 `@Transactional` Bean 执行 UPDATE 和 `afterCommit()` 删除缓存；事务代理返回后外层 `finally` 解锁。
- `./mvnw -q -DskipTests compile` 通过；源码拆分提交为 `6e04208`，进度记录提交为 `5388a58`，未推送。

Reusable knowledge:

- 练习接口：`GET /api/interfaces/categories/{parentId}/children`；更新接口：`PUT /api/admin/categories/{id}/name?name=...`；典型数据 `id=1101`、`parentId=1100`。
- Redis key：`category:children:1100`、`lock:category:children:1100`；锁使用 5 秒 TTL 和 Lua compare-and-delete。
- 当前正确目标时序：非事务协调层等待并获得 Redis 锁 → 调用独立事务 Bean → UPDATE → Spring 提交/回滚 → `afterCommit()` 删除缓存 → 返回协调层 → 外层 `finally` 释放锁。
- `afterCommit()` 只在提交成功时执行；`afterCompletion()` 在提交或回滚后执行。普通 `finally` 只有在事务代理调用之外才可安全承担解锁职责。
- Java 17 没有 JavaScript 风格通用解构赋值；参数较少且语义清晰时直接传递即可，相关业务上下文参数增多或同类型参数易混淆时可使用 `record`/Context 对象。
- Spring Bean 依赖（如 `CategoryMapper`、`RedisService`）由注入提供，不应作为每次调用的方法参数；本次请求数据（`Category`、`cacheKey`、`name`）才通过参数传递。
- `public` 不是主要为了测试，而是用于跨 Bean 调用和清晰的代理入口；当前事务 Bean 保持 public、暂不机械增加接口。

Failures and how to do differently:

- 曾把解锁写到 `beforeCompletion()`，会重新打开事务提交前解锁窗口；事务完成后解锁应使用外层非事务 `finally` 或真正的 `afterCompletion()`。
- `read_thread` 的 `turnLimit=30` 超出接口上限，接口最大为 10；后续读取引用线程应使用 `turnLimit<=10` 分页。
- 代码和进度曾出现临时实验开关、无用导入和进度基线滞后；每次实验后应清理故障注入、运行 `git diff --check`、核对完整 diff 并更新实际 commit 基线。

## Task 2: 第 10 课连接池容量实验设计与首次执行

Outcome: partial

Preference signals:

- 用户要求“完善第10课的完整教学步骤”“我要一口气完成”，说明可提供连续课程清单，但每节仍需明确目标、命令、预期、证据和清理步骤，不能把计划当作验收结果。
- 用户提交 Redis `MONITOR` 输出并要求分析，说明验收应逐条解释命令时间线，并明确哪些结论尚未被证据支持。

Key steps:

- 设计了容量实验：Hikari `maximum-pool-size=2`、`connection-timeout=1000ms`、事务内暂停 2 秒、5 个不同 parentId 的并发写请求。
- 强调必须使用不同 parentId，否则所有请求竞争同一 Redis 锁，无法观察数据库连接池竞争。
- 预期是约 2 个请求占用连接并成功，约 3 个请求等待连接后超时；同时最多约 2 个活跃 InnoDB 事务。
- 用户提供的 Redis MONITOR 显示五把锁都获得并在约 1 秒后释放，但没有证明连接池限制生效；随后发现应用实际不可达，五个请求全部失败，因此不能据此验收 Hikari 容量。
- 最终诊断：`innodb_trx` 始终为空且请求全部超时，更可能是请求没有进入应用，而不是连接池耗尽。工具侧检查显示 `127.0.0.1:8080` 请求返回 `502`，当前任务没有附着应用终端，无法获得有效业务执行证据。

Reusable knowledge:

- 配置文件当前包含：`spring.datasource.hikari.maximum-pool-size: 2`、`connection-timeout: 1000`；应用端口为 8080；本地 Redis 默认映射 6379。
- 事务故障注入目前在 `CategoryTransactionalService.java` 的 `TX_POOL_TEST` 分支，UPDATE 后暂停 2 秒，仅用于实验，验收后必须删除。
- MySQL监听命令：`while true; do mysql -N -uroot -e "SELECT NOW(3), COUNT(*) FROM information_schema.innodb_trx;"; sleep 0.1; done`。
- Redis监听命令：`docker exec -it spring-test-web-redis redis-cli MONITOR`。
- 容量实验必须先做单请求基线：应用可达、单请求返回 204、总耗时约 2 秒、监听期间 `innodb_trx` 能看到事务；单请求不成立时，5 并发结果没有诊断价值。

Failures and how to do differently:

- 首次五并发实验的 Redis 时间线不能证明 Hikari=2；五个请求在约 1 秒集中完成，且后续发现应用返回 502/不可达。不要把 HTTP 502、连接失败或端口代理错误误判为 Hikari connection timeout。
- 下一步必须按顺序：完整停止旧进程 → 确认 8080 无监听 → `./mvnw -q -DskipTests compile` → 启动应用并确认 `Started SpringTestWebApplication` → 用单请求验证 200/204 → 再做 5 并发。
- `innodb_trx` 为空并不单独证明没有事务：事务可能太短或请求根本未进入应用；需要故障注入延长事务，并同时结合 HTTP、应用日志、Hikari 日志和数据库监听。
- 当前第 10 课尚未完成运行验收，临时 `TX_POOL_TEST` 代码和 `application.yml` 的容量配置仍属于实验修改，不能直接视为生产实现。

References:

- `/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web/docs/learning/PROGRESS.md`
- `src/main/java/org/example/springtestweb/category/service/CategoryServiceImpl.java`
- `src/main/java/org/example/springtestweb/category/service/CategoryTransactionalService.java`
- `src/main/resources/application.yml`
- `./mvnw -q -DskipTests compile`
- `docker exec -it spring-test-web-redis redis-cli MONITOR`
- `curl --max-time 2 -sS -o /dev/null -w 'status=%{http_code} connect=%{time_connect}s total=%{time_total}s\n' http://127.0.0.1:8080/`
- 关键失败信号：`status=502`、`curl: (7) Failed to connect`、`No app terminal session is attached to this thread yet.`
