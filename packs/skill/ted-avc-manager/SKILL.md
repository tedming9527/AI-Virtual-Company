---
name: ted-avc-manager
description: 在明确绑定 AI Virtual Company 且已启用 ted-avc-manager 的项目中，发现并按需加载公司技能与知识，关联原生执行回执，登记本地新资产和候选升级。适用于公司管理项目的执行与资产核验；其他项目不激活。
---

# Ted AVC 资产与执行桥接

保持用户当前任务与既有授权。此技能提供资产发现和执行证据连接，不增加写入、安装、推送或发布权限。岗位中文姓名与职业只表示逻辑主责，实际执行者是平台 agent。

## 按需加载与执行

先确认当前项目绑定及原生 Hook 提供的 session、turn、receipt；缺少绑定或回执时，说明只能观察库存，不能声称执行介入已生效。

- 用 `list_assets` 或 `recommend_assets` 获取相关 skill / knowledge / framework / role 的元数据。列表可见不表示正文已加载；名称重复时指定 source 和 type。
- 用 `task_begin` 建立当前回合契约，选择一个允许岗位、实际任务目标、明确工具集合及调用预算。岗位完整 PROFILE 返回后，才报告岗位正文交付；契约不能扩大用户授权。
- 对实际需要的公司通用包或已复核登记的个人 skill，调用 `load_asset`，携带同一原生绑定和明确 source / type / name / entry。按任务需求继续加载知识正文；只读取索引不能声称整个知识包已应用。引用包内后续资料时再次按支持的文件入口加载，避免一次加载无关内容。
- 执行任务并保留真实产物。原生 Pre/Post 回执说明工具尝试或完成；未观测到的调用报告 unknown。可用 `report_asset_use` 补充模型声明，但不得将声明提升为读取或语义执行证据。
- 用 `task_closeout` 关联实际文件产物、观测范围与未知项；保持原生 Hook 要求的本回合署名及版本回执。末尾署名证明对应注入与校验，不能单独证明全程监督。

工具缺失或未启用时，报告可验证的局限并继续用户授权的其他工作；不要通过自写空回执、自报成功或重装来冒充接入。

## 多技能任务与流程节点

按 [任务编排规则](../../framework/company/policies/TASK_ORCHESTRATION.md) 创建明确的任务与节点组合。`workflow_create` 固定合同，`workflow_status` 读取状态，原生节点通过 `task_begin` 的 workflowId/nodeId 关联真实回合；模板只是配置，不代表授权或执行。

## 本地技能与升级

`find_skill` / `list_assets` 发现 `.codex/skills`、`.agents/skills` 和个人 custom 资产。新文件仅进入库存；原生已安装、已被客户端列入技能清单、正文已交付和实际执行分别记录。

- 原创个人技能：保留在 personal/custom；复核后 `register_skill` 建立路径、版本与摘要登记。登记不代表安装到原生技能目录。
- 外来技能或插件建议：用 `propose_asset` 写入 personal/staging/proposals；先来源审查，再决定导入及安装。不得把原生目录里发现的未知内容直接转正进通用 packs。
- 通用技能升级：先形成候选分支和 PR，保留 base/head、包版本与审查状态，通用全景图展示候选而不显示已发布。用户要求并通过门禁后逐步合并、发布和更新。

自动加载技能若宿主没有可观测事件，状态为 unknown；读取了 SKILL.md 也不保证模型采用其语义。对于宿主自身提供的技能目录，保留其原生授权和使用规范。

能力缺口使用 [能力发现与组装](../capability-discovery-assembly/SKILL.md)；`find_skill` 支持中英文描述与声明别名的本地检索，网络双语查询用 `discover_capabilities`。本地候选可用 `validate_local_skill` 获取结构验证 ID，再用 `propose_asset` 关联完整包快照；`list_skill_candidates` 检查验证是否失效。
