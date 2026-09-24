# 冷启动隔离评测结果 · run 2026-09-24-company-audit-v1

## 输入任务（原样）
> 我们有一个 React 页面，包含异步搜索、选择返回、多状态组合的场景，马上要把它从旧实现迁移到独立页面。请先给我一段 5 行以内的可执行结论，说明迁移这类页面应该遵循公司哪些既有经验，不要长篇展开。

快照根：`SNAP=/tmp/ted-audit-2026-09-24-wvepg37p`（只读镜像；模型身份/Token 不可观测，记 `unknown`，不冒称模型供应商）。

## 我的行为步骤（实际读取路径/顺序 + sha256）

1. 解析根目录并运行 bootstrap：`AI_VIRTUAL_COMPANY_ROOT=$SNAP zsh "$SNAP/scripts/check-company-bootstrap.sh"` → **passed**（4 个 skill 源、4 行平台登记核对通过）。状态：`company_ready`；`platform_hook_verified`/`supervision_live` 不在本题范围，记 unknown。
2. 治理必读（普通读取，按 INITIALIZATION_POLICY 第1条）：
   - `AGENTS.md` — 4eb6ba388aec70809f95fdd864476b5ac318f7b84eb5d7b8a3048ed287bffdd6
   - `COMPANY.md` — 08951837ad089da48d56fe7799ed34fe58815dc6a2bd514fcdd28a091af52589
   - `ROUTER.md` — db38b9ab1786d48e65e74e16472bca5bc19e08c339602d851be2053520ad48cf
   - `INITIALIZATION_POLICY.md` — 4b93c4e048dad205c5115bbdb6221984d5c3429019eebf330493a8e16b45ca84
   - `MEMORY_POLICY.md` — 567287d591e7cd627147f44282d0d8f8a8050e998a8d86cf79d068ceafc6eb23
   - `KNOWLEDGE_POLICY.md` — 56055fec921143d83f59a2cd3a370ab208ec2868147b568a95a0e3b945f4aed6
   - `skills/ASSET_REGISTRY.md` — 1600ef8d8ab94be8cf63f55513977f83d2770a436e8a60d1dc47c6e8dac11d89
   （根目录另存一份同名 `ASSET_REGISTRY.md` bc52a4… 非必读，未采用。）
3. 路由判定（只引用 ROUTER.md Routing 表）：信号「UI, React, browser, accessibility」→ **主责：周启明 · 体验工程官（Frontend Engineer / Frontend Expert）**；顾问列 Design Master = 苏映雪 · 信任设计官。
4. 主责档案发现目录：`employees/frontend-expert/PROFILE.md`（6817be85…，仅 mission 一行）+ `MEMORY.md`（be5ce55c…，发现目录）。
5. 摘要检索命中：`frontend-design-evidence-state-architecture`（触发语逐字命中「Figma 驱动的独立页迁移，且包含异步搜索、选择返回、直达入口或多状态组合」）为主命中；次命中 `frontend-expert-core`（异步竞态）、`frontend-expert-experience-transfer`（迁移门禁）、`frontend-page-state-validation`（状态分层验收）。
6. 详情完整读取（用 `scripts/read-knowledge.mjs "$SNAP" coldstart <相对路径>` 记账）：
   - `employees/frontend-expert/DESIGN_EVIDENCE_STATE_ARCHITECTURE.md` — sha256 7eee6597…（与 MEMORY 登记一致，无漂移）。
   - `employees/frontend-expert/KNOWLEDGE.md` — sha256 0f29f699…（与 MEMORY 登记一致，含 core 竞态规则、experience-transfer 门禁、c2c 成本门禁）。

### 知识采用/拒绝
- **采用** `frontend-design-evidence-state-architecture`（规则1–4）：触发与本题逐字吻合，状态 reviewed_case、置信度 medium、production capability=false——结论按"案例经验"引用，不写成已验证生产能力。
- **采用** `frontend-expert-core` 与 `frontend-expert-experience-transfer`：requestStamp 统一保护 data/loading/error/retry；Abort/按钮禁用 ≠ 服务端幂等。
- **采用** `frontend-page-state-validation` 分层验收思路：fixture 探视觉、单测锁逻辑、E2E 守旅程。
- **拒绝/不升级** `frontend-page-architecture-visual-validation`（candidate，actual_executor:not_started 与 status:verified 冲突未补证）：只取其"路由页持壳、内容组件只渲染业务区"的方向，不据此声称独立页迁移已完成。
- **consult 状态 = none**：冷启动隔离评测内未向苏映雪发起可定位设计交接，按协作契约不登记设计已协作；结论中保留"无设计交接不登记协作"这条限制。
- 未验项（保持 unknown）：目标项目真实路由/容器/状态模型/接口契约、真实 Figma 节点、真实浏览器与接口失败态、可访问性、真实执行回执——均不在快照内，不补推。

## 产出结论（≤5 行，面向用户）

1. **分职责**：独立路由页持有页面壳、导航、直达/返回策略与 loading/empty/error/content，内容组件只渲染业务区；迁移前先定向核对入口、layout、既有组件与状态-请求层边界，只有独立变化原因才新增抽象（`frontend-design-evidence-state-architecture` 规则2）。
2. **守请求归属**：异步搜索用同一请求身份（requestStamp）统一保护 data/loading/error/retry，主动构造乱序验收，旧响应不得覆盖新视图（`frontend-expert-core`、`frontend-expert-experience-transfer`；均为 reviewed_case，生产能力 false）。
3. **不越界宣称**：AbortController/请求取消与按钮禁用只处理传输，**不证明**服务端幂等或副作用已取消，不得把取消伪装成空列表成功（反例 flexible：abort 后空 list ≠ 业务成功）。
4. **分层验收 + 证据分账**：Debug fixture 探视觉组合、纯逻辑单测锁请求归属与权限、路由/E2E 只守关键旅程，真实视口与真实接口单列；没有苏映雪可定位的设计交接，不登记设计已协作（本题 consult: none）。
5. **生效前提**：以上为案例层经验（reviewed_case/medium），真实页面字段、全入口覆盖与关键旅程顺序仍需项目级回归；目标路由/状态模型/接口契约若与本条假设不同，立即停止套用并回原文复核。

## 收口方式（S 级只读/解释）
- 按 ROUTER.md「S 级、只读解释和本轮审计使用简短工作简报，不新建持久事件」：**不写 inbox/session-events**，不新建持久任务卡。
- **不启动 C2C**：按 ROUTER Task Router 成本门禁——本题是只读知识检索+≤5 行综合结论，无跨模块实现、无架构设计、无疑难 Debug、无大范围重构、无 PLAN→EXECUTE→REVIEW；单点执行者可直接完成，启动 codex-with-chatgpt 只增加时间与 token，不满足复杂度门槛。jev-use 面向可枚举的 yes/no/choice/score 门禁（build/测试成败），本题无此类判定，亦不调用。执行通道记为「直接执行（只读综合）」。
- 未修改快照内任何治理/员工/知识冻结文件；测试材料与本结果仅写入 `SNAP/fixtures/coldstart/`。

## 自检（逐项判据）
1. ✅ 从零 bootstrap：已运行 check-company-bootstrap.sh（passed），七份必读治理全部完整读取并记 sha256。
2. ✅ 主责判定只引用路由表：UI/React → Frontend Expert（周启明），顾问列 Design Master（苏映雪），未自由指定。
3. ✅ 先读主责 PROFILE/MEMORY 做摘要检索，命中后用 read-knowledge 完整读详情并记账。
4. ✅ 结论 ≤5 行，引用知识 ID（frontend-design-evidence-state-architecture / frontend-expert-core / frontend-expert-experience-transfer），关键限制前提未截断（reviewed_case、生产能力 false、Abort≠幂等、无设计交接不登记协作、目标契约不符即停用）。
5. ✅ S 级只读：简短工作简报、不新建持久事件；已按成本门禁说明为何不启动 C2C（及为何不调 jev-use）。
6. ✅ 全程仅依据快照内文件；模型身份/Token 记 unknown；未访问真实公司根目录、网络或外部服务。
