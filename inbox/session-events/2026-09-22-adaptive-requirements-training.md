---
id: 2026-09-22-adaptive-requirements-training
created_at: 2026-09-22T16:00:00+08:00
source: codex
request: 将陌生需求理解训练穿插进一主两辅学习计划，并让产品、前端、后端沉淀适配用户能力水平的需求说明规范
scope: 公司学习计划、培训导师与产品/前端/后端岗位知识
sensitivity: internal
requested_outcome: plan_and_knowledge_update
level: M
owner: 沈砚舟 · 后端培训导师（资深后端架构师）
consult: cross_functional_by_user_request
status: verified
---
> 2026-09-24 审计修复：front matter status: verified 仅指当次计划/知识交付（delivery_verified）；知识仍为 candidate，用户能力 no_evidence，真实效果与 actual_model 为 unknown；文中模型名为 requested_model，实际运行模型未独立鉴证。


## 执行与所有权

- 集成负责人：沈砚舟 · 后端培训导师（资深后端架构师）。
- 实际执行通道：当前 Codex 原生协作智能体；模型、推理强度和交接回执记录在本会话。
- 共享文件由主会话串行修改；各岗位子任务只读并提供可定位结论。
- 产品：林知夏 · 目标规划官（Product Manager）。
- 前端：周启明 · 体验工程官（Frontend Engineer）。
- 后端：陆行远 · 可靠服务官（Backend Engineer）。

## 验收条件

1. 不改变每周 14 小时及主线 10 小时、当周唯一辅线 3 小时、复盘 1 小时的资源配比。
2. 需求理解训练嵌入真实主线和辅线任务，不新增第三条并行学习负担。
3. 产品、前端、后端分别形成面向用户当前能力结构的需求说明行动规则。
4. 规则区分事实、推断、未知和废止，区分理解、实现、部署与真实验收。
5. 新规则以案例复盘状态发布，试行 3 个可比任务后再复核效果。
6. AI/员工产出不得记为用户能力；只有用户独立复述、判断、改写和未见迁移才进入能力证据。

## 当前证据

- 现有学习计划：每周 14 小时，一主线、当周唯一辅线与复盘。
- 用户能力边界：资深前端经验；陌生采购/对账/付款业务域与后端独立交付能力仍待验证。
- 本次复盘：H5/PC 需求前期过早进入字段、接口、路由、权限和发布细节，代码实现完成后用户仍未建立业务主线；后续补充目标、主流程、实体、数据权威、状态和失败路径后可读性改善。

## 岗位交接回执

| 岗位 | 实际通道 | consult_status | 可定位交接 | 处置 |
|---|---|---|---|---|
| 沈砚舟 · 后端培训导师（资深后端架构师） | `/root/training_integration` · gpt-6-astra/high | contributed | 形成 10+3+1 内部时间分配、一页任务卡、D0/D+2/D+7 与四周嵌入点 | 已写入学习计划、带教约定与能力评估协议 |
| 林知夏 · 目标规划官（Product Manager） | `/root/product_requirement_standard` · gpt-5.6-sol/high | contributed | 形成六层需求结构、数据权威矩阵、理解门槛与三个任务指标 | 已写入共用知识与产品知识发现目录 |
| 周启明 · 体验工程官（Frontend Engineer） | `/root/frontend_requirement_standard` · gpt-5.6-sol/high | contributed | 形成业务—页面—请求一页图、暂停编码信号、实现映射与证据分层 | 已写入共用知识与前端知识发现目录 |
| 陆行远 · 可靠服务官（Backend Engineer） | `/root/backend_requirement_standard` · gpt-5.6-sol/high | contributed | 形成九段后端说明、字段禁止用途、空/错/未知及幂等恢复门槛 | 已写入共用知识与后端知识发现目录 |

以上交接来自实际只读协作通道，不等于平台监管回执；本任务未声明受监管。

## 知识变更/修复单

- issue_id / task_id / created_at：`2026-09-22-adaptive-requirements-training` / 同名 / 2026-09-22。
- owner / actual_executor / reviewer：沈砚舟 · 后端培训导师（资深后端架构师）/ 当前 Codex 主会话与上表四个协作通道 / 四岗位交叉审查，无独立质量测试岗位审查。
- trigger：反例；代码已实现但用户仍未形成业务主线，原说明以字段、接口和系统名为先。
- affected_ids / inbound_references / policy_dependencies：新增 `learner-adaptive-requirement-communication`；更新产品、前端、后端、培训导师知识发现目录、学习计划、能力评估协议与 development-experience E10。
- source_version / source_hash / observed_evidence：2026-09-22 candidate；`d94727bcd270d54c7d7a8dfbb4e4e0de69021a50050a493b6462ae8b954a6867`；用户原句、WO 维修领料 H5/PC 复盘及各岗位只读审查。
- authority：用户明确要求培训导师安排穿插学习，并要求产品、前端、后端吸取经验；未授权发布、提交、推送或修改业务代码。
- validity_action：以 `candidate` 进入三个可比真实任务试行，不升级为 reviewed_case 或 verified_context。
- proposed_change / why_not_other_alternatives：采用分层需求说明、暂停编码信号和闭卷/未见变体门槛；不采用新增第三课程线，也不把用户当初级程序员重讲基础前端。
- preserved_before / proposed_after / concurrent_change_check：保留 10+3+1 总时长、原主题与验证闸门；只在原时段内部穿插训练。公司仓库存在其他并发改动，本任务未修改 AI 工程师、Chief of Staff、设计、测试等无关内容。
- adoption_example / rejection_example：采用“业务目的 → 字段落点”；拒绝只写“先调 Meteorite 获取上下文”或把缓存 `companyOrgCode` 当最终采购公司。
- structural_checks / semantic_review / runtime_scope：新知识条目专项 `check-knowledge` 通过；四岗位语义交叉审查完成；无业务运行或生产验证。
- decision / updated_index_and_hash / published_status：采用 candidate；公司共用目录和 catalog 已更新；仅内部知识，不对外发布。
- rollback_scope / residual_risks / next_review_trigger：可回退本任务新增条目与索引；真实业务权威、接口终态和方法提效仍 unknown；连续三个可比任务或出现高风险反例时复核。
- repair_round / stop_reason：第 1 轮完成；验收项已覆盖，不继续扩大范围。
- reuse_result：当前仅完成知识与计划复用准备，真实任务复用效果 unknown。

## 收口结果

- 已将陌生需求训练嵌入四周 10+3+1 计划，没有新增第三学习线或额外时长。
- 已更新培训导师带教约定、能力评估协议和用户能力档案的下一验证；本次用户专业能力证据为 `no_evidence`，只记录偏好与授权。
- 已形成公司共用 candidate，并分别写入产品、前端、后端和培训导师知识发现目录。
- 已更新 development-experience E10：“按领域熟悉度分层，不按技术年限粗暴降级”。
- 新条目专项结构与哈希校验通过；全量知识检查仍有 AI 工程师条目的并发哈希漂移，与本任务无关，未擅自修复。
- 未执行 Git 暂存、提交、推送、部署或外部发布。
