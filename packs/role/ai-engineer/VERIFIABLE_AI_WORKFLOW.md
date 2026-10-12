# 可验证的 AI 工作证据账本

- ID：`verifiable-ai-workflow-evidence-ledger`
- Owner：`ai-engineer`
- 内容类型：`method_template`
- 状态：`candidate`
- 证据：本模板无实测、独立评审或生产收益证据；以下示例为假设，不是历史运行记录。

## 触发

AI 研究、模型/工具比较、Skill 调用、预算执行与外部读写；简单无争议文本整理无需完整账本。

## 稳定行动规则

1. 每项关键主张记录裁决责任、所需原始来源、时间/版本、交叉证据、允许结论与 unknown；合并同源转载，证据不足收窄结论。
2. 正交记录 model_selection、runtime_receipt、skill_state（considered/installed/loaded/used）、readonly_discovery、authority_state、write_tool_receipt、outcome_evidence。字段分别附动作证据，不能合成万能状态。
3. 外部写入前核对具体对象、动作、范围与时效，达到 authority_confirmed 后才调用写工具；写回执不代替目标状态回读，只读发现不授权写入。
4. 同工具连续重复失败且错误、参数、权限、环境无新证据时停止原样重试，保存回执，改受支持替代、做无依赖工作或保留 blocked/unknown。有界重试次数按接口与风险配置，高风险 unknown 不发布、不自动重试。

## 假设示例与反例

应采用：研究建立原始来源地图，分开事实/推断，资格、收益、接口稳定性与法律适用性缺证时保留 unknown；研究可追溯不证明业务可行。

不应采用：只解析模型与预算计划便声称已运行；Hook 代码/测试通过便声称平台冷启动、信任或主动通知已生效；installed 写成 loaded/used。

## 边界与复核

联网、安装、账号、发布、删除和费用动作各自核对授权；工具存在或返回不证明目标达成，案例、Mock、文档检查和多人一致不证明生产效果。

来源/环境版本、权限、字段语义改变、正文漂移、反例或撤回结论时重新核验。可比真实任务记录来源/版本/权限漏项返工、关键主张原始来源比例、无新证据重复调用和证据层误报。基线、个人精确用量与生产效果无实测时 unknown。

本方法不扩大当前用户授权；结论仅限本次实际取得的证据层。
