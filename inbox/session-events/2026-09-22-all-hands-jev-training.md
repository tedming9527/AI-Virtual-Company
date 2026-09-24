# 全员 JEV MCP 使用训练

- id: `2026-09-22-all-hands-jev-training`
- created_at: `2026-09-22T14:00:00+08:00`
- source: `codex`
- request: 全员进行 JEV MCP 使用训练；每位同事使用周额度上限 6%；模型为 Sol，推理强度 high；尽可能形成 JEV 使用习惯。
- request_addendum: 每位同事必须评估有 JEV 与没有 JEV 的区别；若 JEV 模式高效，还须形成脱离 JEV 依赖后模拟其高效输入输出的方法。
- intent_clarification: 用户进一步明确，训练重点是形成 JEV-like 的问题处理思维，使各岗脱离 JEV MCP 后仍能高效判断；MCP 调用只是训练与校准手段。
- knowledge_deposit_addendum: 用户要求八岗分别学习并沉淀本岗位的 JEV-like 判断习惯；每岗建立独立主题知识卡和发现摘要，避免只依赖综合报告。
- scope: Ted 公司八个已登记岗位；仅使用去身份化合成案例，不向 JEV 发送公司内部人员、额度、项目或客户资料。
- sensitivity: internal
- requested_outcome: training execution, evidence, review, durable learning summary
- level: M；多执行者、显式模型与共享额度约束，需要实操证据、监督和持久交付。
- owner: 陈知行 · 路由官（Chief of Staff）
- actual_supervisor: 当前 Codex 主任务 `/root`
- actual_executors: `/root/jev_ai_engineer`、`/root/jev_backend`、`/root/jev_trainer`、`/root/jev_chief`、`/root/jev_design`、`/root/jev_frontend`、`/root/jev_product`、`/root/jev_test`；顾清妍的独立复核由 `/root/jev_test` 后续独立 turn 完成。
- consult: 辛澈 · AI工程师
- consult_status: contributed
- consult_question: JEV 的适用边界、批处理、隐私和习惯化方法是否形成可复用实践。
- consult_evidence: `learning/jev-mcp-training-2026-09-22/ai-engineer.md`；提供 JEV 路由、失败恢复、有效 verdict、人工对照与无 JEV 替代协议。
- consult_disposition: 主责采纳其“判断结构化、生成留主模型、失败不可冒充通过、来源严格分栏”的结论，并纳入综合报告。
- status: verified

## 任务登记

- 能力层级：deep（多执行者、显式预算与工具治理）；每个岗位训练本身为 balanced。
- 模型 / 推理强度：`gpt-5.6-sol / high`；每个原生任务均须显式指定并保留回执。
- 速度或质量取向：质量优先；采用最多三名执行者并发的 `3 + 3 + 2` 批次，不为耗尽预算制造输出。
- 最低模型限制：用户指定 Sol-high，不得降级代跑。
- 上下文与所有权：每岗只写自己的训练文件；主责串行集成报告和任务卡；训练输入仅限合成、去身份化场景。
- 证据与停止条件：每岗完成路由判断、一次批量 `jev_judge` 实操、`escalate` 处理说明、迁移题和自检；模型或额度通道失效、共享周窗口 `usedPercent >= 73`（初始 25% + 聚合上限 48%）、连续两次无新增证据或用户取消时停止新派发。
- 复核人：顾清妍 · 质量测试工程师（Test Expert）负责最终行为证据复核；其个人训练文件与最终复核分开记录。

## 模型与额度门禁

- 解析结果：8 人；每人上限 6%；聚合共享窗口上限 48%；`allocation_mode=cap`；`usage_limit_id=codex`；共享窗口只报告总增量，不伪造个人用量。
- 执行前快照：`usedPercent=25`；窗口 `10080` 分钟；`ordinaryUsageAllowed=true`；硬停止线 `usedPercent >= 73`。
- 模型配置：本地 `codex doctor --json` 显示 `gpt-5.6-sol`；原生任务仍需逐项显式指定 `gpt-5.6-sol / high`。

## 验收条件

1. 八个岗位各有可定位训练交付和真实原生任务 ID；不能用少数执行者模拟八岗后声称全员已训。
2. 每岗至少一次真实 JEV MCP 调用；敏感数据门禁拒绝也须记录，但不能作为唯一练习。
3. 能说明何时用 `jev_judge`、文件/工具输出为何优先 CLI、何时用 `jev_gate`、哪些生成任务不应交给 JEV。
4. 最终报告区分案例训练、真实生产效果和额度结算；案例通过不外推生产提效。
5. 执行后取得同一共享窗口新鲜快照，确认未越过聚合上限。
6. 每岗对同一类判断完成“JEV / 无 JEV”对照，至少评估可测耗时、主对话上下文占用、输出一致性、升级处理与适用边界；不可测项标为 unknown。
7. 每岗给出无 JEV 时的替代协议，至少覆盖状态压缩、`noul/choice/score` 类型化、枚举选项、批量处理、置信阈值与升级回主模型。

## 运行状态

- resume_evidence: 冷启动后最小 `mcp__jev__jev_judge` 批量题由 `typesafe / jev-1.13.0` 返回有效 verdict，`latencyMs=767`，不再是 `unconfigured`；恢复前共享周窗口 `usedPercent=27`，仍低于原硬停止线 73%。
- implementation: verified；八岗训练、岗位知识卡、各岗 `MEMORY.md` 发现摘要与统一知识目录登记均已完成。
- verification: verified；八个定向结构/漂移校验均为 `errors=[] / warnings=[]`，顾清妍独立新 turn 只读语义复核为 `pass=8 / fail=0`。
- publication: not requested
- outcome: 全员训练和知识沉淀完成；八岗已形成并分别保存“任务分流—状态压缩—问题类型化—冻结选项—批量判断—显式不确定性—升级例外—收缩输出”的无 JEV 判断循环；共享额度结算完成；生产效果保持 unknown。
- evidence: 首次阶段静态配置和 `jev-use doctor` 正常，但旧桌面宿主派生的 JEV MCP 子进程未继承凭据并返回 `unconfigured/unreachable`；完全冷启动后，最小 MCP 题及八岗训练均由 `typesafe / jev-1.13.0` 返回有效 verdict。该故障恢复同时验证了：工具不可达时必须保留无 JEV 判断循环，不能把人工回退冒充 JEV 输出。
- final_usage: 同一共享周窗口训练结束时 `usedPercent=29`，知识沉淀与独立复核结束时为 33%，相对最初 25% 增加 8 个百分点；低于聚合上限 48% 与硬停止线 73%；不能精确归因个人。
- evidence_artifacts: `learning/jev-mcp-training-2026-09-22/REPORT.md`、八岗训练文件、八岗 `JEV_LIKE_JUDGMENT_HABIT.md`、`quality-review.md`、`knowledge-deposit-review.md`、`knowledge/catalog.json`。
- remaining: 真实生产准确率、长期效率、本地 CLI 稳定性和个人精确额度归因仍为 unknown。
- next_action: 各岗在未来自然发生的判断任务中按本岗位知识卡优先复用无 JEV 判断循环；只有满足数据边界且调用确有价值时才接入 MCP。用可比真实任务校准门槛，不为消耗额度制造额外训练。
- capability_handoff_status: no_evidence；沈砚舟 · 后端培训导师已通过原生任务回执确认，本次没有可归属于用户本人的专业能力证据，未更新能力评分或个人档案。
