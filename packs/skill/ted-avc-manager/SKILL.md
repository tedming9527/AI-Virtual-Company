---
name: ted-avc-manager
description: 在已启用 ted-avc-manager 适配器的客户端所有会话中，发现并按需加载公司技能与知识，关联原生执行回执，登记本地资产和候选升级；会话可涉及多个项目，项目目录不作为接入条件。
---

# Ted AVC 资产与执行桥接

保持用户当前任务与既有授权。此技能提供资产发现和执行证据连接，不增加写入、安装、推送或发布权限。岗位中文姓名与职业只表示逻辑主责，实际执行者是平台 agent。

## 按需加载与执行

先确认客户端接入状态及原生 Hook 提供的 session、turn、agent（有则使用）与 receipt。会话和任务是主线，项目只关联资料来源；无项目、多项目及目录搬迁不退出接入。缺少回执或正文交付时，如实报告对应阶段未验证，继续已授权任务。

- 用 `list_assets` 或 `recommend_assets` 获取相关 skill / knowledge / framework / role 的元数据。列表可见不表示正文已加载；名称重复时指定 source 和 type。
- 用 `task_begin` 建立当前回合契约，选择一个允许岗位、实际任务目标、明确工具集合及调用预算。岗位完整 PROFILE 返回后，才报告岗位正文交付；契约不能扩大用户授权。
- 在第一次业务工具前固定契约，按实际原生名称列入需要的终端、编辑和问答/协调工具。Codex 终端事件名为 `Bash`；需要异步问答时列入 `request_user_input_async`，不使用 `functions.exec_command` 等界面包装名替代。只列实际需要的工具，不用通配符，也不为消除告警回写或扩大已固定的历史契约。
- 源码修改通常同时需要 `Bash` 和 `apply_patch`；协作工具的原生名是 `collaboration` 与方法名直接相连，例如 `collaborationinterrupt_agent`。可显式传 `toolCapabilities:["shell","edit"]`，需要代理协作时再声明 `delegation`；后端返回展开后的精确集合和已知包装名映射。能力声明不增加权限，历史遗漏仍保留告警。
- 对实际需要的公司通用包或已复核登记的个人 skill，调用 `load_asset`，携带同一原生绑定和明确 source / type / name / entry。按任务需求继续加载知识正文；只读取索引不能声称整个知识包已应用。引用包内后续资料时再次按支持的文件入口加载，避免一次加载无关内容。
- `task_begin.candidateTrials` 返回与当前目标相关的私有候选。先判断适用性；值得试用时说明理由、未验证项、范围、比较方法和成本，提示一次是否试用。使用返回的 taskKey，跨回合沿用 candidateTaskKey；实际提示后记录 `candidate_trial` offer，明确用户选择后 decide/start，结束时 result 记录产物、效果和成本。未回复不试用，不耽误普通任务；拒绝后同任务不重复，采集失败只警告。
- 大模型可在授权任务内自行选择现有类型提炼候选，以 `candidate_register` 保存来源、版本、组成项和拟目标；`candidate_match` 检索、`candidate_trial_status` 查询。候选是所有资料的阶段，包括专业包、流程与高级复合知识；不是经验专属类型。未评分保持 unknown，低分重试说明条件变化；一次试用不自动晋升，复合资料需要整体验证。
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

## 初始化入口

用户通过对话要求安装或初始化时，使用中央源码中的 `yarn setup` 或 `npm run setup` 安装向导；获授权的非交互执行须明确客户端、客户端目录、已有用户资料项目及 `--yes`。仅 Codex 有已实现适配器，其他客户端显示不可用；不按模型名字猜测客户端，不手工逐文件改配置，不自动放宽审批或 Hook 信任。

用 `client_status` 分别核对事件捕获、会话/回合关联、上下文返回和任务合同；安装成功不是原生介入成功。旧会话下一次真实事件走同一入口，未知历史不补造。项目专属经验按实际改动及产物归属，跨项目经验保留多个来源，通用升级另走评审。

## 上下文预算与摘要

发现与 Ted 调用携带当前原生 `sessionId/turnId/agentId`，沿用一个逻辑任务跨回合的 `logicalTaskId`。父子代理共享会话与回合总额，交付去重仍按代理隔离。缺标识显示 unbound，不能宣称累计计量或要求先补记账才能执行普通业务。

`find_skill/list_assets/recommend_assets/list_packs` 默认分页，读取 `nextCursor` 继续；原有 skills/assets/recommendations/packs 集合名保留。实际检索保留原描述，使用来源校验通过的中英短摘要、标题、标签及低权重正文，不在 Hook 中翻译。包内文档、中央 docs/rules 与待审候选可发现，资格仍单独报告；候选不因相关而自动试用。规则卡的 `load.documentId/sourceSha256` 可交给 `load_asset` 分段读取；来源变动重新查询。

只有实际采用时才调用 `report_asset_use`，使用相同 `logicalTaskId` 避免重复热度；该声明仍非已验证应用。自动推荐、读取和重复交付不增加采用先验。近期声明仅在相关结果中衰减且最多加权 2%，不构成质量评分或自动升级证据。

`/ted summary`（`/ted 摘要优化`）或 `ted_summary` 查看预算和收敛方案；CLI 可带 `--session <id> --turn <id>`。仅统计适配器交付的 UTF-8 字节，不代表模型 token，也不能清空宿主已加载上下文。预算不会因查询而重置。

`load_asset` 默认 `mode=summary` 返回有界摘录和章节游标，不代表全文采用。需要正文时显式 `mode=chunk`，按 `nextCursor` 连续读取；游标绑定源 SHA-256，源变更须重新发现。重复片段不再次交付，预算耗尽保留未读游标，继续其他授权业务。

自动升级提取同样先索引后分段；周度使用 `governance-weekly-read <input.json>`，携带当前原生 sessionId/turnId/receipt 与 runId，先读分页索引，再以 path 和 mode=chunk 读取来源。摘要、预算不足和未读来源不能当成完整提取或升级回执；不自动发布，不删除原始资料。
