# 冷启动记录（EVALUATION_RUNBOOK §3.7）

- run_id：2026-09-24-company-audit-fix-v1
- 验证者：陈知行（路由官），独立验证者，全新上下文
- 受测根：快照 `/tmp/company-snap-n6dQg0`（AI_VIRTUAL_COMPANY_ROOT 指向），不继承整改讨论
- 时间：2026-09-24（Asia/Shanghai）

## 1. 初始化
- 命令：`AI_VIRTUAL_COMPANY_ROOT=$SNAP zsh $SNAP/scripts/check-company-bootstrap.sh`
- 结果：exit=0，`Company bootstrap check passed`；Active Skill 4 个、platform/mode registry 4 行。
- 按 INITIALIZATION_POLICY 加载基础治理：AGENTS.md、COMPANY.md、ROUTER.md、MEMORY_POLICY.md、KNOWLEDGE_POLICY.md、skills/ASSET_REGISTRY.md、platforms/REGISTRY.md。
- 状态判定：`company_ready`=true（bootstrap 通过）；`binding_active`=true（本会话已加载公司绑定指令）；`platform_hook_verified`=unknown/unverified（REGISTRY.md doubao work 行 hook_verifiable=unverified，不冒称已验证）；`supervision_live`=false（本次为只读验证，未启动持续监督）。

## 2. 路由
- 样例任务：「前端页面性能疑难定位」（S 级只读演练，无真实生产改动）。
- 依据 ROUTER.md Routing 表：`UI, React, browser, accessibility → Frontend Expert（consult Design Master）`。
- Task Router（执行层判断）：
  1. decision/triage/gate？否（是诊断排查，非结构化判定门禁）。
  2. 需专业角色？是 → 主责 frontend-expert。
  3. 仅明确低复杂度执行？否（疑难 Debug）。
  4. 命中 C2C 触发？「疑难 Debug」字面上命中，但本样例为 S 级只读、无跨模块真实改动、无 PLAN→EXECUTE→REVIEW 必要；按成本门禁（硬约束：能直接完成不启动 C2C）→ **不启动 C2C**，由 frontend-expert 直接执行只读诊断。
- 路由结果：主责 = frontend-expert；consult = Design Master（表默认），但纯性能排查无设计判断需求，记 consult:none；不启动 C2C、不写持久事件。

## 3. 摘要检索
- 按 KNOWLEDGE_POLICY 用 knowledge/INDEX.md 检索，命中共享条目 `verifiable-work-evidence-ledger`（触发：跨岗位协作、模型/工具调用、完成/验收声明、外部副作用）。
- 实际读取：`knowledge/verifiable-work-evidence-ledger.md`。
- 独立 hash 核对：快照 `shasum -a 256` = `74cfadd23db6f952fd410617357700ca8a0b56642e3a526e4c694420786d109d`，与 catalog.json 条目 sha256 一致；INDEX.md 行内 sha256 一致。
- 摘要 vs 正文语义核对：INDEX 摘要「分开执行、证据、业务终态、发布与授权五个正交状态；每个完成主张绑定同层证据，unknown 不用猜测填平」与正文五状态（execution_state / evidence_state / business_terminal_state / release_state / authority_state）及「构建成功不能证明页面视觉、真实接口或业务终态通过」一致。
- 采用/拒绝理由：
  - **采用**：性能疑难定位会产出 build/Profiler/指标等多层证据，正文「构建成功≠页面视觉/真实接口/业务终态通过」「截图不冒充 Figma 节点属性」直接约束诊断结论不得跨层外推。
  - **拒绝（适用裁剪）**：本样例为单一、低风险、可逆只读排查，按正文「若任务只有单一、低风险、可逆动作，可使用精简账本」裁剪，不强制建完整五状态账本、不写 inbox 持久事件。
- 结论：条目可用、hash 一致、语义相符；按任务风险裁剪使用。

## 4. 收口
- S 级简短简报收口；不建持久事件（未写 inbox/session-events/）、不启动 C2C、不写 tmp 任务卡。
- 收口结论：快照可在全新上下文完成「bootstrap 初始化 → ROUTER 路由 → INDEX 摘要命中+detail 阅读+hash 核对 → S 级收口」闭环，未出现因规则变更导致的断链或空指针。
