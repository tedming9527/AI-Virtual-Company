# 模型资源学习关键词强触发修复

- id / created_at / source / request：2026-09-13-spark-keyword-trigger / 2026-09-13T21:20:00+08:00 / codex / 检查并修改规则，使“每个员工10%的spark资源，异步并行”等关键词直接触发真实 Spark 执行门禁。
- project：AI-Virtual-Company；公司学习与路由规则。
- scope / out_of_scope：修改公司事实源、项目入口、解析脚本、bootstrap 和内化运行验收；不在本任务重新运行八岗学习，不消耗 Spark，不创建外部任务。
- sensitivity / authority：internal；用户明确要求修改。
- requested_outcome：关键词确定性解析、一个监督者协调多员工 Spark 任务异步并行、显式模型门禁、共享额度前后快照、聚合归属边界和失败即阻塞。
- level / reason / classifier / owner_confirmed：M；涉及多个公司规则与验收契约，全部为可逆内部文件；陈知行初分并确认。
- owner / executor / consult：陈知行 · 路由官 / root / 辛澈 · AI工程师（领域视角，未启动额外智能体）。
- acceptance：目标短语解析为 1 个不计员工额度的监督者、8 岗、每岗10%、聚合80%、显式 `gpt-5.3-codex-spark`、受监督异步批次；缺任一关键词不触发；bootstrap通过；旧内化记录不再冒充Spark执行成功。逐岗串行不作为默认或并行监督前提。
- artifacts：`AGENTS.md`、`ROUTER.md`、`LEARNING_POLICY.md`、`INITIALIZATION_POLICY.md`、`scripts/resolve-model-learning-request.mjs`、`scripts/check-company-bootstrap.sh`、`learning/internalization/ARCHITECTURE.md`、`learning/internalization/schemas/run-v1.schema.json`、`scripts/check-internalization-run.mjs`；并纠正旧运行 JSON、会议记录和原事件状态。
- evidence：`每个员工8%的luna资源` 在未写并行时解析为 1 个监督者、8 岗、每岗8%、聚合64%、`gpt-5.6-luna`、普通 Codex 共享窗口与默认 `supervised_asynchronous_parallel_batches`；Spark 显式并行仍解析为专用窗口和80%聚合目标；Terra 明确“逐个执行”才切换为 `supervised_serial`；缺百分比的 Sol 请求不触发。旧非Spark运行因 `failed_model_gate` 被验收器拒绝；bootstrap与脚本语法通过。
- status：verified（仅规则、解析和门禁实现）；未重新执行八岗 Spark 学习。
- outcome：关键词已升级为通用模型资源强触发契约。默认拓扑为一个不计员工额度的监督者持续补位多个异步员工任务；用户无需写“并行”。只有明确说串行、依次、逐个执行或不并行才切换调度。模型不可显式选择、无适用额度窗口前后快照或用量增量为0时，不得标记学习完成。
- remaining：平台共享窗口仍不能精确归属个人；并行模式以独立岗位产物和80%聚合目标监督。真实 Spark 调度需在下一次命中请求时验证执行通道回执。
- knowledge：本次为授权的公司规则修复，不新建员工经验条目；后续真实触发结果再评估是否形成可复用知识。
- metrics：delivery_minutes unknown；waiting_minutes unknown；human_minutes unknown；rework_rounds 1（用户纠正“串行”推断后改为监督者异步补位）；escaped_defects 1（上一轮非Spark运行曾被结构检查误报绿色，现已拒绝）；observation_window 2026-09-13；cost / tokens unknown。
