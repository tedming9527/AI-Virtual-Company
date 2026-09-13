# 周启明·体验工程官（第三分身 C）审计：异步竞态、状态闭环与迁移边界

Primary: 周启明 · 体验工程官  
Consult: 苏映雪 · 信任设计官；陆行远 · 可靠服务官；顾清妍 · 质量测试工程师  
Outcome: 独立质疑前端迁移链路的正确性边界（异步、状态、取消、前后端分工、关键旅程与放行门槛）  
actual_model: gpt-5.3-codex-spark  
run_id: 2026-09-13-spark-frontend-expert-audit-c

输入依据：
- `learning/internalization/runs/2026-09-13-spark/frontend-expert-extract.md`
- `learning/internalization/runs/2026-09-13-spark/frontend-expert-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/design-master-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/backend-expert-transfer.md`
- `learning/internalization/runs/2026-09-13-spark/test-expert-transfer.md`

## claim/evidence/verdict

1. Claim：异步视图污染风险已通过“请求归属快照 + 仅匹配当前归属才回写视图”被控制。  
   - Evidence：`frontend-expert-extract` 要求“请求归属（关键词快照/请求序号）+ 归属匹配后才更新视图”；`frontend-expert-transfer` 在跨场景题和迁移决策中重申同一页面快速重试只保留最新请求终态。  
   - Verdict：`PASS`，但需补充实现证据。当前材料仅是规则，不是对具体接口/页面的验证日志；若缺少“序列号在所有入口（列表、详情、轮询、重试回包）一致打标”，仍可能出现局部漏管辖。  

2. Claim：前端负责“可见状态一致性”，后端负责“副作用去重与补偿”，取消仅是体验层控制。  
   - Evidence：`frontend-expert-extract` 明确“前端只保证可见数据一致性”，“取消请求不独自保证正确”；`frontend-expert-transfer` 用 high_risk_action_gate 限制撤销承诺并将可撤回能力下放到服务端契约；`backend-expert-transfer` 将业务键去重、outbox、RetryWaiting 等定义为后端责任。  
   - Verdict：`PASS`。边界分离是清晰的，不应模糊；该分离对风险最小化是合理方向。  

3. Claim：高风险动作（AI 自动化/提交类）发布门槛应与 `unknown`/`RetryWaiting` 锁定，不允许截图通过后直接放行。  
   - Evidence：`frontend-expert-transfer` 指定“并发/超时 unknown 时默认不灰度”；`test-expert-transfer` 与 `backend-expert-transfer` 也把 `unknown_terminal` 视为阻断并引入人工对账。  
   - Verdict：`PASS`，并与测试/后端观测口径一致，风险控制偏严谨。  

4. Claim：页面状态策略足够，且“状态验收与关键旅程验收可并行”不会引入发布风险。  
   - Evidence：`frontend-expert-extract` 建议三层验收（debug 浮板/逻辑单测/关键端到端）；`frontend-expert-transfer` 的 PASS 条件把状态、文案、并发未知、失败统计都列为验收项。  
   - Verdict：`HELD`。材料没有定义“状态层与关键旅程的最小共识顺序”，且在资源受限时允许 `risk_hold` 后可能产生灰度含糊。需加入：在何种条件下并行是“可发布前状态足量”，何种条件下必须强制串行或同步冻结。  

5. Claim：迁移边界覆盖了关键输入变化（多源输入、重试频率、窗口变短）和风险变化。  
   - Evidence：前端迁移题已加入 `request_stamp` 融合多源模板 + 5 秒轮询 + cancelSupported 空值场景；`backend-expert-transfer` 给出批处理 + 租约重领 + 重试上限；`test-expert-transfer` 强调 `content_state/release_state/evidence_state` 解耦。  
   - Verdict：`PASS`，但尚有 `UNKNOWN`（见下节），原因是迁移题更多是训练结论，缺少“实际页面路径与字段名对应表”。  

6. Claim：当前规则不会导致高风险路径承诺错误。  
   - Evidence：`frontend-expert-transfer` 把 `cancelSupported=false/unknown` 映射为“只能展示任务状态页与人工入口，不许可撤回/补救承诺”；`design-master-transfer` 允许“查看任务状态，不保证可撤回”。  
   - Verdict：`PASS`，这是对“用户心理预期”与“后端能力边界”的关键改进。  

## 反例压力测试（至少一例）

### 压测 T1：双来源 + 连发 + 旧响应污染

场景：会员续费页同时支持“组织模板库”和“个人草稿库”；用户在 4 秒内切换 3 次模板来源并连续点击提交，服务端响应顺序为：第 2 次请求失败回包、 第 4 次请求成功、 第 3 次请求成功迟到返回。  

预期：
- 页面仅展示第 4 次请求对应 `request_stamp` 的终态；
- 第 2/3 次回包不得覆盖第 4 次；
- 若第 4 次返回 `cancelSupported=false`，不得出现“可撤回/自动补救”文案。  

风险点（反例）：
- 若取消仅靠 UI loading 停止而未做归属检查，迟到回包会把状态写成“旧成功”；
- 若状态层只检查请求 id 而未把来源类型（org/personal）计入快照，可能将不同来源互相污染；
- 若只靠 `AbortController` 而未做归属丢弃，重试在服务端仍可能产生多条外部执行，前端会误判为单次成功。  

## 结论

- pass：3 条（1、2、3、5、6 中保留为可执行原则的 4 条、外加边界分离一致性）。  
- held：1 条（4，状态与关键旅程并行的发布顺序约束未闭合）。  
- unknown：1 条（5 的“训练迁移题是否完整对齐到真实字段名和页面路径”待工程级接入验证）。  

最终结论：`PASS overall` 尚不具备，当前运行结论应定为 `HELD`，因为关键路径状态验收顺序仍有发布语义空洞。  

## 可继续探索的问题（需下一轮补充）

- 是否需要给每个高风险页面引入“状态闭环 SLA 仪表盘”，把 `request_stamp` 覆盖率、unknown 数、manual reconciliation 时效放在同一看板？  
- `cancelSupported` 的来源方言（bool/tri-state/string）与字段缺省行为（null、未返回、异常返回）是否已有统一约束 schema？  
- 在“低风险页面”是否允许低成本并行验收，是否需要给出明确阈值（如仅状态快照覆盖率不低于 xx% 才允许），避免 `risk_hold` 被长期滥用。  
