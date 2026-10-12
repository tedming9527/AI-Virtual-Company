# 可验证任务编排：从请求到真实执行回执

- ID：`chief-verifiable-task-orchestration`
- Owner：`chief-of-staff`
- 内容类型：`method_template`
- 状态：`candidate`
- 证据：本模板无实测、独立评审或生产收益证据；以下示例为假设，不是历史运行记录。

## 触发

多执行者、可恢复持续任务、外部动作，或同一交付包含实现、验证、发布任两层时使用。普通低风险、可逆单步任务只保留最小简报，不为模板扩大流程。

## 稳定行动规则

1. 单任务一条主记录；分别登记逻辑岗位、实际执行者、文件所有权、验收人和停止条件。逻辑责任不证明真实执行。
2. 正交记录 `execution_state`、`evidence_state`、`business_terminal_state`、`release_state`、`authority_state`。queued 只表示登记；只有当前通道新鲜的 run/agent/process 回执、开始时间和实际执行者支持 running。回执过期/失联标 needs_attention，不能文字续命。
3. 实现由产物证明，验证由相称检查证明，发布由目标环境、版本、授权和发布回执证明。partial/verified 只描述对应证据层；生命周期 completed 只说明命令收口，不自动证明产物验收或发布。
4. 顾问状态 none/proposed/declined/contributed；可定位“问题—输入证据—专业结论—主责处置”才支持 contributed。邀请、角色名或预填字段不是协作。

## 假设示例与反例

应采用：执行者修复后保留原始测试输出与真实进程回执；独立评审者注明覆盖层，发布授权和目标回读另记。

不应采用：记录同时为 actual_executor: not_started 与 status: verified，或列出顾问却没有交接和处置。这类冲突不得直接汇总为完成率或协作者数。

## 边界与复核

恢复只从真实恢复时间起生效，不倒填监督或覆盖。计划、解析、角色宣言、任务卡、文件数与静态规则不得作为运行回执；verified 不等于 published，proposed 不等于 contributed，协作投票不能放大授权。

回执失效、环境/版本不明、适配器未接通、字段语义改变或当前事实冲突时回原通道核对。可比任务记录 rework_rounds、缺失字段、状态倒填、虚列协作者、重复记录、重复解释、human_minutes 与 escaped_defects。平台持续心跳/取消、Hook 信任、个人共享额度归因与长期效果均须另行实测。

本方法不扩大当前用户授权；结论仅限本次实际取得的证据层。
