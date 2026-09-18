# 可验证的 AI 工作证据账本

- ID：`verifiable-ai-workflow-evidence-ledger`
- 日期：2026-09-18
- 负责人：辛澈 · AI工程师
- 复核人：顾清妍 · 质量测试工程师
- 状态：`reviewed_case`
- 置信度：medium（真实研究记录与案例推理；真实账号写入、异常恢复和业务终态仍未验证）
- 证据等级：真实任务记录与案例推理；不证明生产能力或返工已经下降

## 触发

用于 AI 研究、模型或工具比较、Skill 调用、带预算执行，以及可能读取外部状态或写入外部系统的工作流。简单且无争议的纯文本整理无需机械套用完整账本。

## 稳定行动规则

1. 先为关键主张记录裁决人、所需一手来源、时间/版本、交叉证据、允许结论与 unknown；同源转载合并，找不到相称证据就收窄结论。
2. 下列字段正交记录，不设统一先后状态机，也不互相代替：
   - `model_selection`：模型选择及理由；
   - `runtime_receipt`：实际运行标识、参数和可用计量证据；
   - `skill_state`：considered / installed / loaded / used 及其动作证据；
   - `readonly_discovery`：只读检索、状态读取及其范围；
   - `authority_state`：授权对象、动作、范围和时效；
   - `write_tool_receipt`：写工具的调用与返回；
   - `outcome_evidence`：目标状态复查和业务结果证据。
3. 任何外部写入必须先达到 `authority_confirmed`，之后才允许调用写工具并产生 `write_tool_receipt`；回执仍不能替代目标状态复查。只读发现单列，不得冒充写入授权。
4. 同一工具连续两次失败且错误、参数、权限与环境均无新增证据时，停止原样重试；保存回执，改走官方替代、继续无依赖工作或保留 blocked/unknown。高风险 unknown 不发布、不自动重试。

## 成功案例

2026-09-13 AI 内容发布业务线研究使用监管机构、行业统计机构与厂商页面构成来源地图，分开已核验事实和研究推断，并把账号资格、收益、接口稳定性和法律适用性保留为 unknown；交付只支持“报告可追溯、决策边界清楚”，不支持“SaaS 已可行或收益已实现”。[研究正文](../../research/2026-09-13-ai-content-publishing-business-line.md)｜[任务回执](../../inbox/session-events/2026-09-13-ai-content-publishing-business-line-research.md)

## 反例

- 2026-09-14 的记录只解析出指定模型、预算和监督计划，没有实际执行通道回执或结算，因此不能声称模型已运行或学习完成。[模型预算记录](../../inbox/session-events/2026-09-14-spark-supervisor-10percent-resume.md)
- Hook 与恢复 Skill 的代码和测试通过，只能证明实现层完成；平台信任、冷启动注入和主动通知没有运行时证据时，不能宣称平台已加载或产生生产效果。[监管门禁记录](../../inbox/session-events/2026-09-16-supervision-claim-gate.md)

## 适用、禁止与失效边界

- 适用：需要来源核验、模型/Skill/工具能力声明、额度监督、外部读写或发布判断的任务。
- 禁止：把模型选择写成实际运行；把 Skill 描述或 installed 写成 loaded/used；把工具存在或返回写成目标已达成；把只读发现、授权、写入回执和结果证据合成一个万能状态；用案例、Mock、文档检查或多人一致代替生产效果。
- 授权边界：联网、安装、账号、发布、删除和其他外部副作用各自核对授权；知识条目本身不授予任何权限。
- 失效条件：来源或目标环境版本变化、详情哈希漂移、出现相反任务证据、权限模型变化、复核结论被撤回，或字段设计诱导先写后授权。命中时停止采用并重新核验。

## 指标与 unknown

在至少三个可比真实任务中记录：首次交付后因来源/版本/权限漏项产生的返工轮次；关键主张首次即有一手来源的比例；无新增证据的重复工具调用次数；把 planned/installed/mock 误报为 executed/loaded/production 的次数。当前基线、个人精确 token/额度、长期生产效果和返工下降幅度均为 `unknown`；本条不证明辛澈已具备生产能力，也不证明返工已经下降。

## 证据

- [辛澈成长报告](../../learning/professional-capability-research-2026-09-18/ai-engineer.md)
- [顾清妍独立复核与 held 关闭记录](../../learning/professional-capability-research-2026-09-18/quality-review.md)
- [审计后的效率培训](../../learning/audit-efficient-work-training-2026-09-16/REPORT.md)

下次复核：出现上述失效条件，或完成三个可比真实任务并形成指标后。
