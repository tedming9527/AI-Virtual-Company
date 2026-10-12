# 临时任务生命周期模板

chief-of-staff 负责治理，ai-engineer 负责工具。中央本机缓存、日志、锁和临时执行数据应位于仓库 runtime；不写系统 tmp、不保存秘密和原始聊天。正式交付、知识、政策、项目源与必要证据不按临时缓存清理。

现存 [task-lifecycle](../../../../scripts/task-lifecycle.mjs) 提供 create/start/status/block/close/cleanup，临时任务位于 `<execution-root>/runtime/tmp/tasks/`，隔离区位于 `runtime/tmp/quarantine/`，监督状态位于 `runtime/supervision/`，默认回执仅写 `runtime/receipts/`。`AI_VIRTUAL_COMPANY_RECEIPTS_DIR` 可显式注入个人项目 inbox；运行器不解析 bootstrap.storage，部署按 [README](../README.md) 的优先级解析存储后传入。目录映射、身份或模型适配未部署时不能声称具备。

## 状态与命令

从已配置执行根调用已解析脚本路径；仓库根可使用 `node scripts/task-lifecycle.mjs <command>`。任务 ID 用安全字母数字/下划线/连字符；create ID --ttl-days N 为 queued，保留期由部署显式给定。start ID --receipt supervision:RUN_ID/TASK_ID 仅关联现存本地监督器已观察的真实运行，不接受任意字符串或把原生 agent ID 伪装成该回执。status ID 显示记录与实际状态，旧回执/失联为 needs_attention；工具不启动模型。

close ID --status completed|cancelled|failed --reason <原因> 在关联执行仍活动时拒绝；completed 需要监督器成功退出。它只证命令和任务收口，业务 verified、模型计量和知识发布另外验收。元数据不是加密证明，运行目录须防未受信任写入者。

用户取消或任务无价值时可 cancelled，保留原因与未完成边界，不要求继续学习。真实运行先向对应通道取消并确认，再 close，状态修改不能替代进程停止。block ID --reason <原因> 表示依赖缺失；恢复须取得新活跃证据，禁止重放旧 run ID。短任务已退出时直接用真实终态回执，不能倒填 running；不为每个监督子任务重复建卡。时长是可观测墙钟区间，不是模型计算时间。

## 收口、清理与恢复

只有值得复用的结论、正式交付或必要证据按记忆政策转入正确持久目录，其他临时内容不因过程完整而进入中央包。命中持久任务记录条件时，在部署个人 inbox 留一份精简回执；未执行临时卡不强造持久记录。

cleanup 默认 dry-run；cleanup --apply 仅处理登记、到期、终态且无必要活跃引用的任务，移入可恢复隔离区。queued/running/blocked 仅提示关注，不自动取消或删除；未知引用、符号链接、非法路径、未知格式、缺终态证据必须拒绝。监督状态不属于普通任务扫描，不清活跃心跳或证据。

现存工具默认 TTL 为 7 天，可显式 --ttl-days；隔离区最少保留 7 天。部署保留期与调度须遵守这些实际约束；期满只列永久删除候选，不自动永久删除。精确删除需另核授权、目标、必要证据和活跃引用。无真实调度回执不声称后台启用；机会性清理也须在当前授权内，未获授权不自动 apply。无有意义变化不通知。
