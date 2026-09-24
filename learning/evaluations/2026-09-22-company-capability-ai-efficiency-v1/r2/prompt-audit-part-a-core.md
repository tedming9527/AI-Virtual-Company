# Part A · 现行治理、岗位与提示词架构审计

- 审计日期：2026-09-22。
- 审计角色：唐闻简 · 提示词架构审计专家（独立 AI 审计角色，非现实人类、非监管者）。
- 实际运行模型：`unknown`；不宣称满足某一型号下限。任务性质：高保真、只读语义审计；仅拥有本报告写入权。
- 唯一覆盖总体：`/private/tmp/ted-company-audit-r2.TMxBjh/MANIFEST.tsv`。
- Manifest SHA256：`4563e7d4b950a6bac927f9c61b9b17c020a0a0d8ae35824c6cb5181614186521`。
- 本报告只判 Part A。父任务已将历史学习/评测分为 Part B，事件/交付/雷达分为 Part C；未把机械读取、链接检查或摘要检查冒充这些资料的语义审读。

## 结论先行

**Part A：需修订，不能给出“所有描述均已一致”的通过结论。** 已完整审读 123 份可读文本，识别 1 项 P1、9 项 P2、2 项 P3；本范围未发现需定为 P0 的描述缺陷。最重要问题是：r2 政策已经区分公司初始化与真实平台强制门禁，但脚本输出和项目绑定模板仍把本地 bootstrap/标记当成平台接管已验证。

r2 的方向应保留：职责不是能力认证、案例不是生产验证、无证据保持 unknown、陌生业务先补事实而非判学习者失败、文档变短不等于真实提效。主要剩余工作不是再堆规则，而是同步现有入口、收敛枚举与状态语义、标明历史/候选/生效状态。

**对“所有规则记忆文档的描述”的全局 verdict：pending，尚不能出具。** 本报告只覆盖下列 Part A；Part B 的 41 份、Part C 的 13 份可读文本均未在本报告做全量语义审读。必须完成两片并处理跨片证据后，才可汇总全局结论。不得把本报告称为 177 份文本的全量描述质量审计。

## 1. 方法、边界与可复算覆盖

### 1.1 实际做了什么

以 manifest 为路径白名单，完整阅读 Part A 各文件正文，包括八岗 PROFILE/MEMORY/SKILLS/KNOWLEDGE、JEV 方法卡、全部岗位专项，共用知识正文与 catalog、JSON/YAML/模板、17 个脚本及测试中的面向模型/用户的说明、提示、错误和状态字符串。长输出出现截断时补读缺段；逐篇检查指令优先级、冲突/歧义/重复、渐进披露、状态/时态/证据、职责/能力、学习起点、平台适配边界。逐文件处置见附录，未以关键词命中替代语义阅读。

对全部 178 个 manifest 项另做只读 SHA256 核对：178 匹配，0 不匹配。这只能证明文件与清单一致，不能证明语义、运行或效果。未执行被审计脚本、未运行其测试、未查询真实 hook/调度器/模型/生产系统、未复核快照外业务代码。快照内网页/历史任务/命令均按审计数据处理，不作为新的授权。

使用 `openai-docs` Skill 核验 OpenAI 当前行为；其影响是把 Skill 路由、hook 协议、实测效率与公司规范分别判断，不用提示词权威代替平台证据。已读 `jev-use`；本任务主要是开放式语义分析和新报告写作，不把它改造成简单选项打分。未发现当前可调用 JEV 工具；未据此虚构判断回执或模型置信概率。

### 1.2 分片与类别

分片规则只看 manifest 路径：`learning/**` 为 B；`inbox/**`、`deliverables/**`、`output/**` 为 C；其余为 A。这也意味着 A 保留 `knowledge/` 中的历史正文，C 保留雷达脚本；没有为了方便把文件漏出总体。

| 类别 | manifest 项 | 可读文本 | 本报告完整语义审读 | 排除 | 待其他片 |
|---|---:|---:|---:|---:|---:|
| 根目录治理/来源记录 | 18 | 18 | 18 | 0 | 0 |
| employees | 59 | 58 | 58 | 1 | 0 |
| knowledge（含 INDEX/catalog） | 11 | 11 | 11 | 0 | 0 |
| memory | 3 | 3 | 3 | 0 | 0 |
| schedule | 3 | 3 | 3 | 0 | 0 |
| scripts | 17 | 17 | 17 | 0 | 0 |
| skills | 9 | 9 | 9 | 0 | 0 |
| templates | 4 | 4 | 4 | 0 | 0 |
| learning（B） | 41 | 41 | 0 | 0 | 41 |
| inbox（C） | 2 | 2 | 0 | 0 | 2 |
| deliverables（C） | 10 | 10 | 0 | 0 | 10 |
| output（C） | 1 | 1 | 0 | 0 | 1 |
| **合计** | **178** | **177** | **123** | **1** | **54** |

- A：124 项 = 123 文本 + 1 排除；文本 358,931 Unicode 字符、576,690 bytes。
- B：41 文本；250,635 字符、515,166 bytes。
- C：13 文本；69,914 字符、99,782 bytes。
- 可读文本总计：679,480 字符、1,191,638 bytes。这些不是 token，也不是时延/成本计量。
- `employees/.DS_Store`：8,196 bytes；实际为 Apple Desktop Services Store 二进制。即使 manifest MIME 写 text/plain，也不按自然语言资料审读；保留在总体并登记排除理由。
- A 处置计数：pass 89、improve 19、obsolete 4、conflict 7、evidence-gap 4，共 123。文件级计数不是问题数；一个问题可以影响多个文件。

复算路径数可用下面只读命令；完整逐文件名单在附录，无须目录递归推断：

```sh
awk -F '\t' '
  { all++;
    if ($1 == "employees/.DS_Store") { excluded++; next }
    text++;
    if ($1 ~ /^learning\//) b++;
    else if ($1 ~ /^(inbox|deliverables|output)\//) c++;
    else a++;
  }
  END { print "manifest",all,"text",text,"A-reviewed",a,"B-pending",b,"C-pending",c,"excluded",excluded }
' /private/tmp/ted-company-audit-r2.TMxBjh/MANIFEST.tsv
```

预期：`manifest 178 text 177 A-reviewed 123 B-pending 41 C-pending 13 excluded 1`。这里 A-reviewed 对应本报告声明的实际阅读记录，不是 awk 自动证明语义审读。

## 2. 分级问题

以下路径均相对上述固定快照根目录。级别表示描述误导的潜在后果，不是已发生事故或真实能力评级。r2 覆盖情况只以快照中现有正文判断，不预判其他片结论。

### F01 · P1：bootstrap/标记仍被描述为平台接管已验证

**定位。** `scripts/codex-company-takeover-hook.mjs:42` 输出“TED_CODEX_PLATFORM_TAKEOVER_V1: 公司平台接管门禁已通过。”；:66 输出“公司初始化失败，平台已阻止继续”；:98 输出“已按 fail-closed 阻止”。`skills/project-company-binding.template.md:7` 明确把该标记当作“the current entry hook is verified”的证据。`skills/ted-takeover/SKILL.md:15` 以标记存在作为宣称 active 的必要条件，但没有同时写出独立验证条件；`scripts/codex-company-takeover-hook.test.mjs` 的 startup/prompt 上下文断言也不能证明宿主实际安装、信任或强制执行。

**冲突与影响。** `INITIALIZATION_POLICY.md` 的“四个独立状态”及平台边界已明确：bootstrap 只证明公司文件与当前初始化条件；平台 hook 需平台证据；初始化失败不应无条件阻塞普通已授权任务。当前脚本的先验成功/失败文案仍把“请求宿主阻止/输出上下文”说成“宿主已经强制执行”。用户或后续模型只见该标记时容易误报接管、覆盖范围或持续监督。

**建议。** 标记文案改为“公司 bootstrap 通过；已生成当前入口上下文；平台安装/信任/拦截效果另验”。模板要求核对受信平台配置、当前事件回执及平台验收证据，普通文本标记不得单独充分。失败文案区分“本 hook 返回阻止请求”与“宿主确认已阻止”；是否阻塞整个任务遵守初始化政策和用户目标，不直接删掉高风险门禁。补的应是状态契约测试及真实平台验证计划，不把函数测试升级为真实宿主证据。

**r2：政策侧已覆盖，脚本和模板未同步。** 本审计没有证明该 hook 当前已安装、实际造成阻塞或存在可利用绕过。

### F02 · P2：项目绑定与事件登记的证明边界前后不一

**定位。** `PROJECT_BINDING_POLICY.md` 的“Binding and intake are separate signals”区分事件简报与项目绑定；同文件 :32 的 ChatGPT Work 边界却允许“binding context or an inbox event records it”，:33 的 Claude 段又写“Bind a project ... or write an inbox event”。

**影响。** 普通事件登记可能被读成绑定成立的替代证据，与前文“事件不证明平台关联/拦截”冲突。不能由公司内部政策证明另一个产品的实际指令发现或关联状态。

**建议。** 改为“事件可记录已观察到的绑定证据；仅写事件不创建/证明平台绑定”。将平台事实（按当前官方文档核验）、本地配置期望、公司运行规范分栏；对未验证平台写 unknown，不因文档命令式语气升级能力。

**r2：前段已修正，平台分支仍有旧入口。** 本结论针对内部证据语义，不对 Work/Claude 当前实现作未经核验的断言。

### F03 · P2：咨询状态与是否可宣称协作混在一起

**定位。** `ROUTER.md:46` 允许 `proposed`（待回应），但“Collaboration contract”说 unresponded invitation 无回应则“its status is none”。`templates/TASK_CLOSEOUT.md:10` 在 consult 为 none 时要求咨询字段都填 none；`employees/design-master/FIGMA_TRUST_EVIDENCE.md:19` 与 `employees/design-master/MEMORY.md:41` 又使用 `consult: none/unknown`，unknown 不在正式状态枚举中。

**影响。** “尚未邀请”“已邀待回”“明确拒绝”“已实质贡献”可能丢失，待回问题被清空；也容易把拟议角色当实际参与者。`COMPANY.md` 和 `DELIVERY_POLICY.md` 要求没有实质交接不得宣称协作是正确的，不应删除。

**建议。** 明确分开 `consult_candidate`、`consult_status` 与实际贡献者名单。待回保留 proposed 与已发问题/回执；实际贡献者仍为空。只有 contributed 可宣称已评审/协作。unknown 若只表示证据缺口，写在 evidence_state，不混入咨询状态。

**r2：真实性边界已覆盖，字段和合同措辞尚未完全对齐。**

### F04 · P2：高频流程仍有过宽触发与重复方法；优化只能作为受控候选

**定位。** 八岗 `JEV_LIKE_JUDGMENT_HABIT.md` 多处重复分流、类型化、冻结尺度、批处理、升级和长模板。除 AI 工程岗新增“轻量入口与退出”外，其余岗位的“触发/岗位判断循环”仍可将普通单项质量判断带入全套流程。`knowledge/INDEX.md:27` 摘要“用三分身提取、质疑和迁移”，但 `knowledge/experience-internalization-v2.md` 的通用方法并不要求每次三个分身；`knowledge/catalog.json` 同类摘要继承这种执行暗示。`INITIALIZATION_POLICY.md` 与 `ROUTER.md` 的固定必读入口另有稳定治理重复成本，但这是现行明确政策，不是本审计可自行取消的规则。

**影响。** 简单任务可能因宽触发反复加载同一方法、填模板或误以为必须派生角色。输入字符数只能支持“存在重复”，不能证明真实 token/时延浪费量，也不能证明删去后质量不降。

**建议。** 将共同方法作为单一详情；岗位卡保留特有风险、采用/拒绝例、链接。将“三分身”标为历史训练方法，不当作常规执行要求。以 AI 岗现有轻量入口作为受控试验对象：确定性事实由程序核对，单项低风险直接判断，多项有实质成本才进入完整循环。保留敏感/高风险/冲突升级与用户强制要求。按已有 `EVALUATION_RUNBOOK.md` 做同口径比较，未经批准不扩大至所有岗位、不启动额外整改轮。

**r2：AI 工程岗试点及评测护栏已覆盖；其他岗位、摘要未覆盖。** 常驻入口精简、版本复用已登记为候选，不能把“尚未实施候选”写成偷偷放宽必读规则的理由。

### F05 · P2：已复核案例、待复核文本与当前发布状态没有完全分栏

**定位。** `employees/backend-training-architect/JEV_LIKE_JUDGMENT_HABIT.md:4,7–8` 同时有 reviewed_case、“复核人（待父任务安排）”“最终整合（待父任务）”。`employees/ai-engineer/KNOWLEDGE.md` 首段和 `MEMORY.md:5` 写 catalog 同步及独立复核前不得发布，但其摘要与 `knowledge/catalog.json` 又使用 reviewed_case/verified_context 等证据标签。

**影响。** reviewed_case 可以描述历史案例证据，不必然表示当前修订已批准；当前读者却难判断“尚未发布的是哪个版本/哪些条目”。这不证明真实复核没有发生，尤其相关 learning 证据待 Part B 审读；问题是入口自身无法给出清楚的生效状态。

**建议。** 分开 `source_evidence_status`、`document_review_status`、`publication_status`，附适用版本/hash、review receipt、effective_at 或 pending reason。历史“待父任务”原话可以保留在审计历史，现行入口应写明当前状态，不能靠读完整评审链猜测。禁止将 reviewed_case 全局改成 verified。

**r2：已增加谨慎边界和失败记录；当前发布状态仍需澄清。** 本项处置为 evidence-gap，待 B 片证据交叉后再决定是否只是过期措辞。

### F06 · P2：陌生业务的先补事实原则未同步到所有教学入口

**定位。** `TEACHING_PLAYBOOK.md:11` 已要求“短诊断（不计失败）→补足必要领域事实/完整最小例→自己的话解释→延迟独立检索”；`USER_CAPABILITY_ASSESSMENT.md:44` 与 `knowledge/learner-adaptive-requirement-communication.md` 同向。可是 `employees/backend-training-architect/REAL_PROJECT_FIVE_STAGE_TEACHING.md:16` 仍无条件“依次执行预测→解释→实现→测试→迁移；学员先作答”；`NEXT_LESSON.md` 的首课分支/SQL 预期先答，也未在该入口提醒事实不足时只作诊断。

**影响。** 用户是资深前端，不是初学编程者，但可能缺陌生业务/后端领域事实。独立预测若在事实提供之前就作为理解验收，可能把需求缺口误判为能力不足，增加启动负担。NEXT_LESSON 的“待执行、不是已完成”时态是正确的，应保留。

**建议。** 在五阶段和首课入口补一句前置条件：已提供必要领域事实、或用户已熟悉场景时才进入独立预测；首次未知只作短诊断，不记失败。随后仍保留独立实现、真实运行、迁移与延迟检索，不把所有任务变成导师代做。引用统一教学主规则，不复制整套量表。

**r2：主教学/评估规则已覆盖，两个旧执行入口未同步。** 未据此声称学习者已受损或已测得教学收益。

### F07 · P2：任务终态、产物验收和持久回执条件仍有异口径

**定位。** `templates/TASK_CLOSEOUT.md:20` 只有 planned/running/partial/blocked/verified；`DELIVERY_POLICY.md:16` 已规定 queued（兼容 planned）、cancelled/failed，并区分 completed 与 verified。`TASK_LIFECYCLE.md:17` 说仅命中持久任务条件才在 inbox 留回执，否则不创建；`scripts/task-lifecycle.mjs:137` “Never move a task without its durable closeout.”及 :217 的 saveReceipt 调用则无该条件，相关 `scripts/task-lifecycle.test.mjs` 也按持久回执模式约束。

**影响。** 模板不能表达正常取消/失败，模型可能把执行结束挤入 verified；脚本文案和声明的留存策略不一致，读者可能误以为小任务不留持久事件。后者是静态控制流/文案对应关系，不是本审计执行后的文件写入实测。

**建议。** 模板拆出 execution_status、artifact_acceptance 与留存决定，引用单一枚举；取消是合法终态。政策与脚本必须由授权实现者选定同一回执条件后同步，不能仅改文字掩盖真实副作用，也不应批量删除历史回执。补充对应正反例测试计划。

**r2：政策描述已收敛，模板及脚本持久回执语义未完全同步。**

### F08 · P2：历史知识的失效标记不能只放在目录

**定位。** `knowledge/2026-09-09-ai-delivery-principles.md` 保留高置信/推广式行动描述，而 `knowledge/INDEX.md` 与 `knowledge/catalog.json` 已将其按过时资料治理。直接进入正文时缺少同位的“历史/已被替代/不得直接执行”提示。另三份日期知识文档已能辨认历史范围，不建议抹除原始记录。

**影响。** 精确搜索或外链绕过目录时，旧规则可能被当作当前规范；反过来若为了整齐重写历史，也会污染审计证据。

**建议。** 正文顶部仅加非破坏性的历史状态、替代入口及适用日期，原正文保留。目录/正文状态同步；obsolete 表示不作为当前执行依据，不表示应删除。不要把所有带日期资料一概判过期。

**r2：目录治理已覆盖；该正文的就地提示未覆盖。**

### F09 · P2：学习者归因字段混用了帮助程度枚举

**定位。** `employees/backend-training-architect/USER_CAPABILITY_ASSESSMENT.md:26` 的 attribution 只允许 user/mixed/ai_or_employee；`memory/learner/CAPABILITY_PROFILE.md:182` 却写 attribution: ai_or_employee_done，后者属于 assistance_level 枚举。

**影响。** 人能读懂“AI/员工完成，不计本人能力”，但后续模型/统计可能归类失败。当前文字明确不计入用户能力是正确边界，不能为了规范字段把它改为用户贡献。

**建议。** 将该记录 attribution 规范为 ai_or_employee；确有帮助程度事实时另填 assistance_level: ai_or_employee_done，保留修订痕迹及原证据。不要从用户资深前端履历推导未经观察的后端独立交付能力。

**r2：五维与归因原则已覆盖，旧观测记录字段未同步。**

### F10 · P2：调度说明混合了期望配置、历史安装与当前可用状态

**定位。** `schedule/README.md:8` “本轮在当前 Mac 安装……”虽附重核要求，:10 仍断言“A Codex thread automation is also created”；`schedule/company-schedule.yaml` enabled/model_policy 未分当前观测状态，并把 luna/sol/astra 直接映射职责（:11–13）。

**影响。** 搬到其他机器/平台后容易把配置中的 enabled 当作真实已运行，把历史安装当作当前状态；硬编码模型名还可能被误读为绕过用户模型下限或当前不可用事实。

**建议。** 分开 desired_state、last_observed_state/at、平台本地回执位置与 unknown。模型先表述 fast/balanced/deep 和复杂度要求；适配层保留带核验日期的当前映射，明确用户下限优先。保留“清理不是监督”“休眠不保证准点”“无变化不发消息”的现有好边界。

**r2：README 已加入部分边界；安装/创建断言与映射仍需时态化。** 本审计未查真实 launchctl 或平台自动化，不能判它们存在或不存在。

### F11 · P3：结构校验器错误语义应明确“声明”，不是实际模型认证

**定位。** `scripts/check-spark-internalization-rerun.mjs:20` 用 body.includes('gpt-5.3-codex-spark') 检查文档，却输出“missing actual model”。`scripts/check-internalization-run.mjs` 的通用文件名/运行提示内含固定历史 Spark 内化流程、10% 与三分身约束。脚本其他 scope/声明边界已有说明，是优点。

**影响。** 脱离说明单看一条错误或 pass 容易把文本出现型号误当运行身份 verified，或将一次历史训练格式误用为通用规范。

**建议。** 错误改成“missing declared model string; runtime model remains unverified”，历史专用校验器在 CLI usage/结果加 fixture/run scope 与适用日期。保留结构校验能力，不能靠文案补出不存在的运行认证。

**r2：部分结果已限定 scope；最短错误与工具入口仍可改进。**

### F12 · P3：公司 Skill 的相对依赖和双 registry 入口需说清

**定位。** `skills/company-skill-governance/SKILL.md:8` 要读 ../SKILL_ASSET_POLICY.md，:12 要 register in ASSET_REGISTRY.md。公司源树内相对政策路径有效，但 standalone 安装/适配包不一定包含父目录；源树又同时有根 ASSET_REGISTRY.md 与 skills/ASSET_REGISTRY.md。

**影响。** 迁移或打包后，模型可能找不到政策，或登记到错误注册表。这是可移植性风险，不是已经验证安装失败。

**建议。** 明确依赖必须通过已解析公司根定位，声明哪个 registry 管公司总资产、哪个管 Skill 子集及同步责任；适配包声明外部依赖或提供受控定位方式。不要把本机绝对路径硬编码进跨平台 Skill。保持现有清晰 description 和显式调用边界。

**r2：未看到该依赖定位问题被覆盖。**

## 3. 已做好的部分与不应修改项

1. 八岗 PROFILE/SKILLS 的职责、专业关注点与真实可用能力基本分开；多数知识卡明确 reviewed_case、simulated、production false/unknown。不能把“岗位应会什么”改写成“当前代理已经验证会什么”，也不能为统一格式删掉真实证据限制。
2. `knowledge/learner-adaptive-requirement-communication.md`、教学主规则和能力评估的 r2 改进应保留：尊重资深前端起点；陌生业务先补事实；初答、提示来源与修订分开；必需因果未覆盖仍待补证；不因未提供事实判失败，也不凭“没有说错”判理解通过。
3. 授权、外部写入、生产操作、真实工具可达性、来源独立性、取消/回滚承诺等边界仍应是硬要求。官方“少写一点”不授权删去这些限制。
4. `INITIALIZATION_POLICY.md` 的 company_ready/platform_hook_verified/execution/supervision 分层与 `SUPERVISION_POLICY.md` 的实际回执要求值得保留；本地登记、函数测试、格式签名、角色名单都不等于平台信任或真实监督。
5. `EVALUATION_RUNBOOK.md`、`METRICS_POLICY.md` 的质量护栏、同口径比较、unknown 与试验停止条件应保留。字符数、结构绿灯、工具次数下降都不是实测成本/用户效果改善。
6. `KNOWLEDGE_POLICY.md`、`KNOWLEDGE_MAINTENANCE.md` 的“摘要用于发现、命中再读详情”、版本/hash 与证据等级值得保留。具体做法宜同步入口而非复制更多规范。
7. 已有的历史环境横幅、首次失败记录、未实测声明、无真实通知则 pending、取消不是强制产出，都不应为了“显得完成”删除。
8. 英文协议名、JSON 字段和技术术语无需一律翻译；面向用户的首次说明应解释业务语义，内部枚举可保留英文。别把资深前端当编程初学者，也别假定其已掌握未给出的业务事实。
9. 署名格式、公司根定位、现行必读范围属于明确公司选择。本报告可以指出维护/上下文成本，但不越权取消这些要求。

## 4. 官方依据及适配判断

本节只引用实际核验的 OpenAI 官方一手页面（2026-09-22 读取）；它们支持设计原则，不证明本地安装、模型身份、延迟或用户收益。

- **Skill 是按需入口，不是全库常驻。** 官方说明先加载名称/描述，命中后才加载主体；清晰触发范围与显式调用控制有助于避免不相关激活。支持 F04/F12 的最小路由与依赖声明，而不是删掉必要政策。[Build skills](https://learn.chatgpt.com/docs/build-skills)
- **提示词应聚焦目标、完成条件和真正的边界；宽泛触发与重复路径可能限制能力。** 官方 Astra 文章支持渐进披露和减少无必要步骤，不构成“所有长文都错”或“无需验收”的证据。本文未假定当前运行模型就是 Astra。[Rethinking skills and prompts for GPT‑6 Astra](https://developers.openai.com/blog/rethinking-skills-and-prompts-for-gpt-6-astra)
- **Hook 有明确事件、输入输出与上下文注入协议。** 支持把公司文本意图与宿主实际安装/执行分开；协议文档不能给本地 marker 背书。[Hooks](https://learn.chatgpt.com/docs/hooks)
- **优化有多种维度。** 输入、输出、请求数量、并行等都可能影响时延；文本缩短并不自动等于端到端收益。此处只据此保留实测要求，没有将 API 文档中的经验幅度移植成本地 Codex 指标。[Latency optimization](https://developers.openai.com/api/docs/guides/latency-optimization)

跨平台原则：公司层描述目的、授权、证据与停止条件；平台适配层描述实际文件发现、工具、hook、模型映射。不能让某个产品的标记、模型昵称或本机路径成为跨平台事实。当前 Part A 具备这种分层基础，但 F01/F02/F10/F12 表明仍未完全贯彻。

## 5. 不在本报告中证明的事项与后续交接

- 不证明业务规则本身正确；只判断描述是否清楚且忠实于自身证据边界。业务正确性仍需当前业务事实、代码/契约与领域验证。
- 不证明八岗、当前模型、JEV MCP、hook、真实通知或调度服务具备生产能力；实际模型身份 unknown。
- 不证明真实 token、时延、成本、质量改善、认知负荷或用户学习效果。需要受控任务和真实用户/运行证据。
- 不证明 Part B/C 的历史评审、训练成绩、事件、雷达产物与引文真实性。A 中指向它们的链接可作为来源入口，但不代替全文核验。
- 本报告未授权新一轮修复、安装、调度、外部访问、生产写入或历史记录删除；整改建议应由父任务整合并按既有授权边界决定。
- Part B 应重点回交 F05 的文档版本/发布复核证据，并检查是否将模拟训练推广为当前能力；Part C 应重点回交 F01/F02/F03/F09/F10 在事件和交付中的实际措辞，不以本报告推断其已发生。
- 最终全量汇总须逐项核对 A/B/C 清单没有重漏，保留每片未验证项；不能把三篇报告简单拼接称为统一结论。

## 附录：逐文件审读与 disposition 清单

语义：pass = 在本描述审计范围未发现需单列的动作项，不等于业务/运行认证；improve = 有明确表达或结构改进；conflict = 当前描述之间有需协调的口径；obsolete = 历史资料保留、不直接当现行依据；evidence-gap = 状态证据待补/本片未审。excluded 仅用于二进制。A 全文 = 完整语义审读；B/C 未审 = 仅纳入 manifest 与 hash 核对。附录路径保持 manifest 原样，可直接复算集合。

| manifest 路径 | 分片/阅读 | disposition | 依据/说明 |
|---|---|---|---|
| `AGENTS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `ASSET_REGISTRY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `COMPANY.md` | A / 全文 | pass | 现行边界/试验护栏应保留；F01/F04不建议扩大整改 |
| `DELIVERY_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `EVALUATION_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `EVALUATION_RUNBOOK.md` | A / 全文 | pass | 现行边界/试验护栏应保留；F01/F04不建议扩大整改 |
| `INITIALIZATION_POLICY.md` | A / 全文 | pass | 现行边界/试验护栏应保留；F01/F04不建议扩大整改 |
| `KNOWLEDGE_MAINTENANCE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `KNOWLEDGE_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `LEARNING_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `MEMORY_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `METRICS_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `PROJECT_BINDING_POLICY.md` | A / 全文 | conflict | F02 |
| `ROUTER.md` | A / 全文 | conflict | F03；F04 |
| `SOURCE_GIT_HEAD.txt` | A / 全文 | pass | 已审；无单列动作项 |
| `SOURCE_GIT_STATUS.txt` | A / 全文 | pass | 已审；无单列动作项 |
| `SUPERVISION_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `TASK_LIFECYCLE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `deliverables/ai-capability-radar/README.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/audits/2026-09-19-v5-discovery-audit.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/audits/2026-09-19-v5-publish-gate-audit.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/collection-template.json` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/collections/2026-09-19-v5.json` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/discoveries/2026-09-19-v5.json` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/schema.json` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/scripts/validate-radar.mjs` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/source-registry.json` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `deliverables/ai-capability-radar/tests/validate-radar.test.mjs` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `employees/.DS_Store` | A / 排除 | excluded | 二进制 .DS_Store，不作语义审读 |
| `employees/ROSTER.txt` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/ai-engineer/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/ai-engineer/KNOWLEDGE.md` | A / 全文 | evidence-gap | F05（发布状态待明确；历史能力边界保留） |
| `employees/ai-engineer/MEMORY.md` | A / 全文 | evidence-gap | F05（发布状态待明确；历史能力边界保留） |
| `employees/ai-engineer/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/ai-engineer/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/ai-engineer/VERIFIABLE_AI_WORKFLOW.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-expert/CROSS_SYSTEM_TERMINAL_EVIDENCE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-expert/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/backend-expert/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-expert/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-expert/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-expert/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | evidence-gap | F04；F05 |
| `employees/backend-training-architect/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/NEXT_LESSON.md` | A / 全文 | improve | F06 |
| `employees/backend-training-architect/ONBOARDING.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/READING_MAP.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/REAL_PROJECT_FIVE_STAGE_TEACHING.md` | A / 全文 | conflict | F06 |
| `employees/backend-training-architect/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/TEACHING_PLAYBOOK.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/backend-training-architect/USER_CAPABILITY_ASSESSMENT.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/chief-of-staff/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/chief-of-staff/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/chief-of-staff/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/chief-of-staff/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/chief-of-staff/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/chief-of-staff/VERIFIABLE_TASK_ORCHESTRATION.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/design-master/FIGMA_TRUST_EVIDENCE.md` | A / 全文 | improve | F03 |
| `employees/design-master/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/design-master/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/design-master/MEMORY.md` | A / 全文 | improve | F03 |
| `employees/design-master/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/design-master/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/DESIGN_EVIDENCE_STATE_ARCHITECTURE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/EXTERNAL_SKILL_LEARNING.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/frontend-expert/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/PAGE_ARCHITECTURE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/PAGE_STATE_VALIDATION.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/PROJECT_DISCOVERY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/frontend-expert/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/product-manager/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/product-manager/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/product-manager/MEASURABLE_AI_PILOT.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/product-manager/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/product-manager/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/product-manager/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/test-expert/CLAIM_EVIDENCE_GATE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/test-expert/JEV_LIKE_JUDGMENT_HABIT.md` | A / 全文 | improve | F04 |
| `employees/test-expert/KNOWLEDGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/test-expert/MEMORY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/test-expert/PROFILE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `employees/test-expert/SKILLS.md` | A / 全文 | pass | 已审；无单列动作项 |
| `inbox/session-events/2026-09-22-adaptive-requirements-training.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `inbox/session-events/2026-09-22-independent-company-capability-audit.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `knowledge/2026-09-09-ai-delivery-principles.md` | A / 全文 | obsolete | F08（已被目录标旧；正文需同位标记） |
| `knowledge/2026-09-09-mephisto-author-review.md` | A / 全文 | obsolete | 历史快照保留；不能作为当前运行事实 |
| `knowledge/2026-09-13-weekly-curation.md` | A / 全文 | obsolete | 历史快照保留；不能作为当前运行事实 |
| `knowledge/2026-09-21-weekly-curation.md` | A / 全文 | obsolete | 历史快照保留；不能作为当前运行事实 |
| `knowledge/INDEX.md` | A / 全文 | improve | F04；F05；F08（摘要与正文入口对齐） |
| `knowledge/catalog.json` | A / 全文 | improve | F04；F05；F08（摘要与正文入口对齐） |
| `knowledge/experience-internalization-v2.md` | A / 全文 | pass | 已审；无单列动作项 |
| `knowledge/learner-adaptive-requirement-communication.md` | A / 全文 | pass | 已审；无单列动作项 |
| `knowledge/project-context-first-delivery.md` | A / 全文 | pass | 已审；无单列动作项 |
| `knowledge/research-source-governance.md` | A / 全文 | pass | 已审；无单列动作项 |
| `knowledge/verifiable-work-evidence-ledger.md` | A / 全文 | pass | 已审；无单列动作项 |
| `learning/2026-09-11-remaining-roles-retraining.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/audit-efficient-work-training-2026-09-16/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-11-workflow-v1/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-ai-context-audit.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-knowledge-governance-audit.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r0/external-learning-audit.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-ai-context-re-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-knowledge-re-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/external-learning-re-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r1/internal-quality-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/evaluations/2026-09-22-company-capability-ai-efficiency-v1/r2/SNAPSHOT_SCOPE.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/internalization/runs/2026-09-13-spark/ai-engineer-audit.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/README.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/ai-engineer.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/backend-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/backend-training-architect.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/chief-of-staff.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/design-master.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/frontend-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/knowledge-deposit-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/product-manager.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/quality-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/jev-mcp-training-2026-09-22/test-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-audit-2026-09-18/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-audit-2026-09-18/quality-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/EXECUTION.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/ai-engineer.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/backend-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/backend-training-architect.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/chief-of-staff.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/design-master.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/frontend-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/product-manager.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/quality-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/test-expert-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-deep-research-2026-09-18/test-expert.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-research-2026-09-18/REPORT.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-research-2026-09-18/ai-engineer.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `learning/professional-capability-research-2026-09-18/quality-review.md` | B / 未审 | evidence-gap | 待 Part B 全文审读；本片只有清单/hash 核对 |
| `memory/PROJECT_MEMORY_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `memory/learner/CAPABILITY_PROFILE.md` | A / 全文 | improve | F09 |
| `memory/learner/MARKET_SOURCE_REGISTRY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `output/2026-09-19-career-market-and-learning-plan.md` | C / 未审 | evidence-gap | 待 Part C 全文审读；本片只有清单/hash 核对 |
| `schedule/README.md` | A / 全文 | evidence-gap | F10 |
| `schedule/com.ai-virtual-company.weekly.plist.template` | A / 全文 | pass | 已审；无单列动作项 |
| `schedule/company-schedule.yaml` | A / 全文 | improve | F10 |
| `scripts/check-company-bootstrap.sh` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/check-internalization-run.mjs` | A / 全文 | improve | F11 |
| `scripts/check-knowledge.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/check-spark-internalization-rerun.mjs` | A / 全文 | improve | F11 |
| `scripts/codex-company-takeover-hook.mjs` | A / 全文 | conflict | F01 |
| `scripts/codex-company-takeover-hook.test.mjs` | A / 全文 | improve | F01 |
| `scripts/knowledge-bootstrap-audit.test.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/read-knowledge.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/resolve-model-learning-request.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/resolve-model-learning-request.test.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/run-weekly-company.sh` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/supervision-gate.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/supervision-gate.test.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/supervisor-runtime.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/supervisor-runtime.test.mjs` | A / 全文 | pass | 已审；无单列动作项 |
| `scripts/task-lifecycle.mjs` | A / 全文 | conflict | F07（持久回执条件） |
| `scripts/task-lifecycle.test.mjs` | A / 全文 | conflict | F07（持久回执条件） |
| `skills/ASSET_REGISTRY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `skills/SKILL_ASSET_POLICY.md` | A / 全文 | pass | 已审；无单列动作项 |
| `skills/ai-workflow-checklist.md` | A / 全文 | pass | 已审；无单列动作项 |
| `skills/company-skill-governance/SKILL.md` | A / 全文 | improve | F12 |
| `skills/company-skill-governance/agents/openai.yaml` | A / 全文 | pass | 已审；无单列动作项 |
| `skills/project-company-binding.template.md` | A / 全文 | conflict | F01 |
| `skills/ted-takeover/SKILL.md` | A / 全文 | improve | F01 |
| `skills/ted-takeover/agents/openai.yaml` | A / 全文 | pass | 已审；无单列动作项 |
| `skills/test-quality-gate.md` | A / 全文 | pass | 已审；无单列动作项 |
| `templates/EVALUATION_BRIEF.md` | A / 全文 | pass | 已审；无单列动作项 |
| `templates/KNOWLEDGE_CHANGE.md` | A / 全文 | pass | 已审；无单列动作项 |
| `templates/TASK_CLOSEOUT.md` | A / 全文 | improve | F03；F07 |
| `templates/supervision-plan.example.json` | A / 全文 | pass | 已审；无单列动作项 |

本报告仅写入指定 Part A 报告文件；没有修改快照或其他公司源文件。文件内容的 SHA256 随交接回执提供，不嵌入自身以避免自引用。

