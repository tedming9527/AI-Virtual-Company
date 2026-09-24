# Memory

## 2026-09-11 · 风险反馈与设计冲突交接
- Owner：苏映雪 · 信任设计官（Design Master）；review：顾清妍交叉复核、陈知行整合；confidence：medium（案例推理），真实任务待验证。
- 触发：高风险交互、AI执行反馈、像素还原与可用性冲突。
- 行动：逐状态说明操作何时生效、是否可取消、结果如何确认；将原稿还原、风险清单和备选修改分开交接，冲突由用户或已授权决策者确认。 已识别缺陷和未验证项分别列出，不能把已知缺陷淡化为未知。
- 证据：[初始题、未见迁移题与审查修订](../../learning/2026-09-11-remaining-roles-retraining.md)。由root作答，独立质量顾问出题复核，不代表六名独立agent或模型参数训练。
- 适用边界：不承诺系统不支持的撤销；视觉一致不代表可用性或无障碍通过。本轮未操作Figma、未进行真实用户测试。
- 复用与复核：相关任务开始时检索并记录采用/拒绝及效果；季度或遇反例复核，不因知识入库自动宣称生产提效。

## 历史记忆（保留原记录）
- 2026-09-09 · Design assets include Figma and visual-asset workflows; invoke only when design source or output is in scope.

- 2026-09-10 · 会后强化：固定使用“名字 + 职务（岗位）”对外表达，DESIGN 角色对齐为「苏映雪 · 信任设计官（Design Master）」并同步到 PROFILE。
## 2026-09-10 · UI 验收能力补课

- Owner：苏映雪（Design Master）；协作：陈知行。
- 结论：后续 UI 验收必须同时检查视觉层级、空间节奏、排版可读性、色彩角色、组件状态、响应式适配与可访问性；“整体看起来差不多”不构成通过依据。
- 可复用规则：先看页面主次关系和扫描路径，再看间距/网格/对齐，再看字体/颜色/圆角/阴影等细节，最后覆盖加载、空、错、禁用、聚焦、长文本和窄屏状态。
- 证据：Apple HIG Typography 强调层级、可读性、动态字号和避免截断；Material 3 强调颜色角色、type scale、shape scale 与 token 化；W3C WCAG 2.2 覆盖对比度、焦点与最小目标尺寸；NN/g 将视觉层级定义为按重要性引导视线。[Apple](https://developer.apple.com/design/human-interface-guidelines/typography) · [Material 3](https://m3.material.io/) · [WCAG 2.2](https://www.w3.org/TR/wcag/) · [NN/g](https://www.nngroup.com/articles/visual-hierarchy-ux-definition/)
- Confidence：high（官方规范与权威 UX 资料交叉验证）。

## 2026-09-10 · UI 能力复盘与后续要求

- Owner：苏映雪（Design Master）；协作：陈知行、辛澈。
- 复盘：此前 UI 验收容易停留在“功能完成、整体看起来差不多”，对视觉细节、组件状态、响应式和证据留存不够稳定。
- 已补齐的方法：按视觉层级、网格与间距、排版、色彩与对比、组件状态、响应式、键盘与可访问性、截图复核的顺序检查；读取 Figma Dev Mode 时按节点定位、组件语义、布局结构、视觉基础、变量模式、资源、交互状态、变更与不确定性组织信息。
- 未完成的验证：方法论本身不能证明验收质量，必须在后续真实 UI 任务中逐项对照设计稿，保留页面证据，并明确待确认项。
- 固定要求：今后 UI 任务的交付不能只有“完成版”，还必须包含验收证据与未确认项；不得以“看起来差不多”作为通过标准。
- 来源与依据：Apple HIG、Material 3、W3C WCAG 2.2、MDN Accessibility、Figma Dev Mode 官方文档。
- Confidence：medium-high（框架已由权威资料交叉验证，实战稳定性待后续任务验证）。

## 2026-09-13 · 高风险交互经验的迁移门禁

- ID：`design-master-experience-transfer`；状态：`reviewed_case`；生产能力：`false`。
- Owner：苏映雪 · 信任设计官；review：顾清妍独立语义复核；confidence：medium（案例训练）。
- 触发与行动：高风险交互采用预览、确认、执行与终态链路；文案和控件不能承诺未验证的取消、补偿或恢复能力，状态不能只靠颜色表达。
- 证据：[本岗三分身审计](../../learning/internalization/runs/2026-09-13-spark/design-master-audit.md)与[公司共用架构](../../knowledge/experience-internalization-v2.md)。
- 采用例：取消能力未知时提供状态详情与人工入口，同时显式说明不可确认的能力。
- 拒绝例：任务终态未知却显示绿色成功和“可随时撤回”。
- 边界：取消字段、空值文案、焦点、读屏和对比度尚未在真实页面实测。

## C2C 编排学习（2026-09-24）
- ID：`design-master-c2c-orchestration`；状态：`reviewed_case`（来自已登记 active 技能规范源，岗位化解读，生产能力待真实任务验证）。
- Owner：苏映雪 · 信任设计官（Design Master）；consult：none（自学习条目，无跨岗位交接）。
- 来源：`skills/codex-with-chatgpt/SKILL.md`、`skills/jev-use/SKILL.md`、`ROUTER.md` Task Router、`knowledge/c2c-orchestration-route.md`、`platforms/REGISTRY.md`（2026-09-24）。
- 何时调用 codex-with-chatgpt（满足其一且单个执行者无法直接完成）：复杂设计系统搭建或跨页面演进（多 token/组件/状态联动）；设计→前端实现的大规模 Review（跨多页面，需 PLAN→EXECUTE→REVIEW）；全站/大规模页面一致性检查；首次高风险的设计交付评审。
- 何时不调用（成本门禁）：单页面视觉微调、单个组件样式、局部 flow 调整、简单 UX 研究、Figma 标注——能直接完成就绝不启动 C2C（增加时间与 token，复杂度不足不值得）。
- 与 jev-use 组合：一致性检查结果判定（noul/score）、设计验收门禁、候选方案选择等可枚举有限判断用 jev 批量判定（同状态一次调用、`escalate:true` 项升级本岗裁决）；视觉/交互/文案生成归设计师，不交给 jev/C2C 替代设计判断。C2C 承担跨范围规划—执行—评审循环。分工总则：jev 判断，C2C 协作，执行者执行，员工提供专业能力。
- 治理边界（2026-09-24 刷新，依据 `ROUTER.md` Task Router 与 `skills/codex-with-chatgpt/SKILL.md`）：C2C 只是执行通道，不豁免任务治理——任务分级（S/M/L，按 `DELIVERY_POLICY.md`）、inbox 事件、consult 状态（none/proposed/declined/contributed，只认实际交接）、TASK_CLOSEOUT、用户能力交接照常适用；C2C 内多角色参与不等于"已协作/已评审"，设计判断与证据保留照常适用，C2C 内角色参与不替代设计签核。触发：任何经 C2C 执行的任务收口与登记时。
- 平台×模式登记（2026-09-24 刷新，依据 `knowledge/c2c-orchestration-route.md`）：某平台/模式能否用 C2C，按 (平台, 模式) 查 `platforms/REGISTRY.md`；未登记或未验证一律 `unknown`，不猜测；新增平台/模式在登记表加行，不改规则正文。架构维持"规则 + 技能映射 + 登记表加行"，MCP server 升级暂缓，本岗不自行实现 C2C 的 MCP server 集成。触发：新任务选择执行通道、新增平台/模式或评估 C2C 升级时。
- 缺节点提醒（2026-09-24 并入，依据 `skills/codex-with-chatgpt/SKILL.md`"节点缺失回退与短时缓存"与 `platforms/REGISTRY.md` 的 node_status/last_checked）：全站一致性检查/设计验收门禁依赖 C2C 规划/执行角色或 jev-use 节点时，先查 `platforms/REGISTRY.md` 共享状态、不各自重试；节点可用性只写确认后的状态——连续失败 ≥3 次或滚动 30 分钟窗口内集中 ≥3 次才标 missing，成功即回 healthy，本地存在性检查一次判定（不把"可能"写"必然"）。
- 限制：C2C 循环默认最多 2 个 Review Cycle，仍不通过即 BLOCKED 升级 Chief of Staff；本条目为规范源的岗位化解读，生产收益待真实任务验证，不把"可能"写"必然"、不把 mock 当实测。
