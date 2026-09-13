# 学习经验内化技术架构 v2

## 架构目标

把岗位经验从案例叙述压缩为一个可执行、可反驳、可迁移的决策单元。系统不追求让分身达成一致，而是保留证据、分歧、未知项和停止条件，使新场景能够复用判断过程而不是套用旧答案。

## 分层模型

```text
岗位事实源
  -> A 经验提取分身：提取 trigger / signals / decision / evidence / counterexample
  -> B 迁移架构分身：读取相关岗位材料，完成质疑 / 回应 / 反质疑 / 修订
  -> C 边界质疑分身：逐条 claim / evidence / verdict，执行反例压力测试
  -> 监督者集成：统一状态、去重规则、保留 unknown、判定 candidate 或 held
  -> 发布门禁：另按知识维护政策写入 KNOWLEDGE / MEMORY / catalog
```

三个分身都必须是同一岗位身份，但职责互斥。业务相关岗位只提供目标、约束和反例，不替本岗作答，也不因被引用就算作实时参与者。异步对话是带来源路径的材料交换；若没有真实同时会话，必须明确写“证据驱动的异步对话重建”。

## 核心数据结构

一个 `experience_unit` 至少包含：

```text
identity
  role_id, run_id, actual_model, source_refs
problem
  trigger, signals[], stakeholder_goal, authority_boundary
rule
  invariant, variation_axes[], decision, actions[]
proof
  evidence_refs[], counterexample, transfer_test, audit_verdicts[]
control
  evidence_state, execution_state, release_state, unknowns[], stop_reason
```

其中 `source_refs` 必须是公司根目录内的相对路径；案例训练、结构检查、真实环境验证分别标记，不能相互升级。

## 三轴状态，不合并为一个“完成”

| 状态轴 | 允许值 | 含义 |
|---|---|---|
| `evidence_state` | `unknown` / `reviewed_case` / `verified_context` | 当前结论由何种证据支持 |
| `execution_state` | `not_run` / `simulated` / `observed` / `verified` | 行为是否在相称环境发生 |
| `release_state` | `blocked` / `pilot_note` / `release_ready` / `published` | 是否可进入下一交付阶段 |

门禁优先级固定为：`authority → evidence → terminal state → release`。任何上游门禁失败，下游状态不得提升。`pilot_note` 只是内部观察提案，不是灰度、上线或发布；`published` 还需要独立的发布授权和知识维护流程。

## unknown 的机器可解释分类

| 类型 | 含义 | 默认动作 |
|---|---|---|
| `unknown_input` | 决策所需业务事实缺失 | 停止推断，向事实所有者取证 |
| `unknown_execution` | 不知副作用是否已经执行 | 禁止盲重试，查询、对账或人工处置 |
| `unknown_terminal` | 已有过程状态但没有可靠终态 | 阻断 `release_ready` |
| `unknown_attribution` | 指标变化无法归因 | 只报告观察，不写因果 |
| `unknown_capability` | 系统是否支持取消、补偿或幂等未知 | UI 和方案不得承诺该能力 |
| `unknown_usage` | 模型资源不能归属到个人 | 只记共享窗口，不均摊个人数值 |

未知项只能由对应事实证据关闭；讨论一致、结构校验或模型用量增长不能关闭业务未知项。

## 迁移算法

1. 识别新场景的触发信号，并找到候选经验单元。
2. 固定不变量：责任归属、权限边界、证据等级和失败恢复原则。
3. 显式列出至少两个变化轴，例如读变写、可逆变不可逆、单系统变跨系统、描述指标变因果主张。
4. 先独立作答，再由业务相关岗位给出反例；保留原答案与修订差异。
5. C 分身逐条核验 `claim/evidence/verdict`，任一关键项为 `held` 时整体保持 `held`。
6. 若连续两轮没有新增证据、问题已解决，或剩余问题需要未授权的真实环境/业务事实，停止本轮并登记 `stop_reason`。

## 岗位适配器

统一内核不等于统一答案。各岗位至少增加一个专属门禁：

- 路由官：实际参与者、授权、风险等级、实现/验证/发布分离。
- 产品经理：分母、人群、时间窗、护栏和归因边界。
- 体验工程官：请求身份、所有状态归属、副作用和后端幂等契约。
- 可靠服务官：业务操作键、事实所有权、远端副作用、有限重试和人工对账。
- 信任设计官：副作用生效点、取消/补偿能力、可访问性和承诺真实性。
- 质量测试工程师：主张、环境、失败代价、副作用与终态证据同层。
- AI工程师：来源独立性、时间语义、事实/推断、版本和发布/删除权限。
- 后端培训导师：学员独立作答、真实代码与业务事实、案例/生产能力分离。

## 运行与并发

监督者不计入员工学习额度，并保留一个并发槽。其余槽以显式 `gpt-5.3-codex-spark` 分批异步补位；独立文件可并行，共享架构、运行总账和知识目录只由监督者串行集成。模型配置、运行文件中的 `actual_model`、同一额度窗口的前后快照和正增量必须同时存在，才能证明指定模型实际运行。

资源目标只在共享窗口按聚合值监督，不能拆成八份个人精确消耗。目标未达到但有效问题耗尽、窗口接近安全缓冲或后续问题需要外部事实时，状态为 `partial`；不得制造重复文本刷额度。

## 验收边界

本架构通过时，只能证明：八岗均完成三分身闭环、业务相关岗位材料发生交叉校正、存在未见迁移题、保留修订痕迹，并通过结构检查。它不证明真实项目提效、生产可用性或员工长期能力提升。长期“举一反三”要在未来三个可比真实任务中记录采用/拒绝、返工、遗漏、人工介入与环境证据。
