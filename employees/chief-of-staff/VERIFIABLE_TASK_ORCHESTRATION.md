# 可验证任务编排：从请求到真实执行回执

- 日期：2026-09-18
- ID：`chief-verifiable-task-orchestration`
- 状态：`reviewed_case`
- 负责人：陈知行 · 路由官（Chief of Staff）
- 复核人：顾清妍 · 质量测试工程师（Test Expert）
- 置信度：medium（本地监督器测试与案例推理经复核；非本地通道和真实效果仍未验证）
- 结论等级：本地工作证据与案例推理通过复核；不证明生产能力，不证明返工已经下降。

## 触发

多执行者、可恢复持续任务、外部动作，或同一交付包含实现、验证、发布任两层时使用。普通低风险、可逆的 S 级单步任务只保留最小简报，不为套模板扩大流程。

## 稳定行动规则

1. **单事件线、责任分离。** 同一任务只维护一条主记录；分别登记逻辑岗位、实际执行者、文件所有权、验收人和停止条件。逻辑岗位负责专业判断，不等于真实执行者。
2. **状态正交、回执先行。** 分开记录 `execution_state`、`evidence_state`、`business_terminal_state`、`release_state`、`authority_state`。`queued` 只表示已登记；只有当前通道的新鲜 run/agent/process 回执、开始时间和实际执行者可将执行态升为 `running`。回执过期或失联时标记 `needs_attention`，不得以文字续命。
3. **分层验收。** 实现由产物证明，验证由与风险相称的检查证明，发布由目标环境、版本、授权和发布回执证明。`partial/verified` 只描述对应证据层；生命周期工具的 `completed` 只表示命令收口，不自动获得产物验收或发布资格。
4. **协作必须有交接。** 顾问状态使用 `none/proposed/declined/contributed`；只有可定位的“问题—输入证据—专业结论—主责处置”才可记 `contributed`。邀请、角色名或预填字段不算协作。

## 案例

**成功案例：** 2026-09-14 监督与生命周期修复区分 root 集成、辛澈实现和顾清妍独立复核；四个复现缺陷修复后，以三套 62 项测试、真实子进程和 bootstrap 核对。收口同时写明没有新增模型/额度适配器，发布仍待回执，因而声明未超过证据范围。[任务收口](../../inbox/session-events/2026-09-14-company-efficiency-tmp.md)

**反例：** 项目选择页记录同时存在 `actual_executor: not_started` 与 `status: verified`，并列出顾问却没有咨询状态、交接证据和处置。产物即使存在，这类结构冲突仍会虚增完成率和协作人数，不能直接用于自动汇总。[反例记录](../../inbox/session-events/2026-09-16-project-picker-page.md)

## 适用、禁止与失效边界

- 适用：需要跨回合恢复、多人交接、外部副作用或多层验收的任务；初始化恢复仅从真实恢复时间起生效。[恢复边界](../../inbox/session-events/2026-09-16-codex-company-initialization-recovery.md)
- 禁止：不得把计划、解析结果、角色宣言、任务卡、文件数量或静态规则写成运行回执；不得把 `verified` 写成已发布；不得把 `proposed` 顾问写成已协作；不得用流程投票扩大用户授权。
- 失效：回执已过期、目标环境或版本不明、适配器未接通、状态语义发生变更，或当前事实与记录冲突时，停止采用自动结论并回到原始执行通道与产物复核。

## 指标与 Unknown

后续三个同风险、同规模真实任务记录：`rework_rounds`、首次验收缺失字段数、状态倒填次数、虚列协作者数、重复任务卡数、用户重复解释次数、`human_minutes` 与 `escaped_defects`。当前生产改善、长期返工变化、平台统一心跳/取消能力、Hook 冷启动可信度及共享额度的个人归因均为 `unknown`；案例通过不能填补这些未知。

## 证据

- [专业研究报告](../../learning/professional-capability-research-2026-09-18/chief-of-staff.md)
- [顾清妍独立复核](../../learning/professional-capability-research-2026-09-18/quality-review.md)：陈知行报告判定 `pass`；复核确认事实、推断与 unknown 分层清楚，并要求跨岗状态采用正交维度。
- [监督与生命周期实测收口](../../inbox/session-events/2026-09-14-company-efficiency-tmp.md)
- [审计修复的 partial 边界](../../inbox/session-events/2026-09-18-company-audit-remediation.md)

本条只改变后续任务的记录与验收判断，不新增执行器、平台门禁、发布权限或强制 Skill。
