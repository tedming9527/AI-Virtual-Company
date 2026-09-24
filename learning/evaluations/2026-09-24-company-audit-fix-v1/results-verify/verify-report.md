# 独立验证报告 · 2026-09-24 公司审计问题全量修复（v1）

- run_id：2026-09-24-company-audit-fix-v1
- 验证者：陈知行（路由官），**独立验证者，全新上下文，未参与本轮修复执行**
- 验证对象：公司根 `/Users/dongdeming/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company`（唯一事实源）
- 验证日期：2026-09-24（Asia/Shanghai）
- 验证模式：只读验证；除本归档目录 `results-verify/` 外，未修改公司根任何文件
- 脚本安全审查：已先通读 `scripts/check-company-bootstrap.sh`（仅存在性/登记表结构检查，只读）与 `scripts/check-knowledge.mjs`（仅读文件+算 sha256+结构校验，只读），确认无写操作后执行。

---

## A. 真实根只读复验

### A.1 两个基线命令

| 命令 | 期望 | 实际 | 判定 |
|---|---|---|---|
| `node scripts/check-knowledge.mjs .` | errors=[]、warnings=[]、entries=58 | `entries:58, errors:[], warnings:[]`，exit=0 | **通过** |
| `AI_VIRTUAL_COMPANY_ROOT=<root> zsh scripts/check-company-bootstrap.sh` | 通过 | `Active Skill ... checked: 4`、`Platform/mode registry checked: 4 rows`、`Company bootstrap check passed`，exit=0 | **通过** |

修复者自报「check-knowledge 58 条 errors=[]、bootstrap 通过」**独立复现一致**。

补充：`node scripts/check-knowledge.mjs . frontend-expert-core` 定向单条检查 exit=0、errors=[]，单 ID 通道可用。

### A.2 8 岗 C2C 收敛（AUD-001）

- 命令：`grep -c '^## .*-c2c-orchestration' employees/<role>/MEMORY.md`（8 岗逐一）。
- 结果：ai-engineer / backend-expert / backend-training-architect / chief-of-staff / design-master / frontend-expert / product-manager / test-expert **各 = 1**，无重复小节。
- 段长：各岗 c2c 小节正文 4–5 行（backend-training-architect 5 行），已从原共享整段收敛为「触发/摘要/限制/状态/详情指针+sha256」短节，摘要内带指针「规则见 codex-with-chatgpt/SKILL.md」。
- KNOWLEDGE.md 共享规则段：8 岗 `## C2C 编排学习（2026-09-24）` 中，原跨岗逐字重复的「缺节点回退/短时缓存/确认阈值/healthy 恢复」运行段已收敛为一行指针——「缺节点提醒（2026-09-24 并入…）：…节点缺失回退、短时缓存、确认阈值与 healthy 恢复规则见 skills/codex-with-chatgpt/SKILL.md」，并指向 platforms/REGISTRY.md 共享状态。
- **判定：通过**。

### A.3 指针所指权威规则确实存在（信息无损）

- `skills/codex-with-chatgpt/SKILL.md`：
  - `## 节点缺失回退与短时缓存（2026-09-24）`（line 57）；
  - 退避序列 `1s→5s→30s→2min→5min`（line 69）；
  - 确认阈值「连续失败 ≥3 次（或滚动 30 分钟窗口内集中 ≥3 次）才翻 missing」（line 70）；
  - 回恢优先「中途任一成功→计数清零、状态回 healthy」（line 71）；
  - 共享状态写入 platforms/REGISTRY.md 的 node_status/last_checked，不写入个人 MEMORY（line 75）。
- `platforms/REGISTRY.md`：表头含 `node_status`、`last_checked` 两列（line 14）；取值说明（line 11–12）与使用规则（line 24）重申滞后式确认（≥3 次）与任何成功回 healthy；4 行 (platform,mode) 登记，doubao work 行 node_status=healthy、last_checked=2026-09-24。
- **判定：通过**。指针未悬空，权威规则在单一事实源完整保留。

### A.4 catalog.json 合法性、58 条、9 条新条目 + 独立 sha256

- `JSON.parse(knowledge/catalog.json)` 成功；`entries.length = 58`。
- 8 条 `*-c2c-orchestration`（chief-of-staff/product-manager/frontend-expert/backend-expert/design-master/test-expert/ai-engineer/backend-training-architect）+ `backend-training-architect-macro-first-induction` = **9 条新条目齐全**；状态均 reviewed_case、updated=2026-09-24。
- 独立实算（node crypto，非复用 check-knowledge 结果）对 10 条（9 新 + audit-findings）detail 文件 sha256 逐条比对 catalog.sha256：**10/10 一致，0 mismatch**。
  - 注：backend-training-architect 的 c2c 与 macro-first-induction 两条 detail 同为 `employees/backend-training-architect/KNOWLEDGE.md`，故 sha256 相同（703029dc…），属正常（同一 detail 文件多索引）。
- macro-first-induction 登记位置：index=`employees/backend-training-architect/MEMORY.md`（line 75 标题）、detail=`employees/backend-training-architect/KNOWLEDGE.md`（line 72 ID）；INDEX.md 不收岗位本地条目（符合设计）。
- **判定：通过**。

### A.5 audit-findings.md 状态 + 三处 hash 一致

- `learning/audit-findings.md`：
  - AUD-2026-09-24-001：`decision/status` = `deferred → 收敛已验证（待用户授权）→ 已修复/已关闭（2026-09-24，陈知行 · 路由官负责；用户已授权收敛）`，含 fix_record（2026-09-24）与证据指向归档。
  - AUD-2026-09-24-002：同口径「已修复/已关闭（2026-09-24，陈知行）」，含 fix_record。
  - 两条均含日期/负责人/证据；文末 2026-09-24 修复轮注记说明 19 条 STALE 语义复核、macro 登记、P2/P3 33 项修复范围。
- 独立 `shasum -a 256 learning/audit-findings.md` = `898ab26ff75b226771f5170e828eff04a2f3ad6b03b8c06d20d2150a3d28b990`；
  - catalog.json `audit-findings` 条目 sha256 一致；
  - knowledge/INDEX.md line 73 行内 `sha256:898ab26f…` 一致。
- **判定：通过**。

### A.6 抽样 STALE 条目哈希 + 语义

抽样 4 条（独立实算 detail sha256）：

| 条目 | status | detail | catalog vs 实算 | 语义抽查 |
|---|---|---|---|---|
| chief-of-staff-core | reviewed_case | employees/chief-of-staff/KNOWLEDGE.md | 一致 (af8ac78f…) | 摘要「按风险/依赖判级、领域主责复核、卡片须有实际证据」对应正文「按影响/依赖/可逆性分 S/M/L、只有真实参与智能体计顾问、文件数量不推断完成率」——相符 |
| frontend-expert-experience-transfer | reviewed_case | employees/frontend-expert/KNOWLEDGE.md | 一致 (9ddafa56…) | hash 一致 |
| ai-capability-source-link-radar | verified_context | employees/ai-engineer/KNOWLEDGE.md | 一致 (c3ef51b0…) | 摘要「20 入口宽进、逐源留痕、双门禁、candidate/hold/pending」对应正文 20 入口/发现+发布双门禁/固定 candidate+hold+pending；limit 中 verified_context 仅 2026-09-19 本地门禁范围与正文「历史环境说明 2026-09-22 复核」一致——相符 |
| backend-training-four-step-engineering-loop | reviewed_case | employees/backend-training-architect/KNOWLEDGE.md | 一致 (703029dc…) | hash 一致 |

- **判定：通过**。哈希同步且抽查摘要与正文语义未漂移。

### A.7 抽样 P2/P3 修复点（带日期标注）

- `PROJECT_BINDING_POLICY.md`（git diff）：ChatGPT Work / Claude 两条绑定措辞改为「inbox event records observed binding evidence; writing an event alone does not create or prove platform binding」，加注「（2026-09-24 审计修复：事件记录不等于绑定成立）」「（2026-09-24 审计修复）」。
- `templates/TASK_CLOSEOUT.md`（git diff）：status 枚举由 `planned/running/partial/blocked/verified` 扩为 `queued/planned/running/partial/blocked/cancelled/failed/completed/verified`，并注明「cancelled/failed 是合法终态，不得挤入 verified（2026-09-24 审计修复，与 DELIVERY_POLICY.md 终态对齐）」。
- `learning/jev-mcp-training-2026-09-22/README.md`（git diff）：状态改为「completed（合成训练记录）…actual_model 仍 unknown。（2026-09-24 审计修复）」。
- **判定：通过**。三处改动到位且均带 2026-09-24 日期标注。

### A.8 未误删 / 治理源正文未被改写

- `git status --short`：全部为 ` M`（modified）或 `??`（untracked：audit-findings.md、两个 evaluations 目录）；**无任何 `D` 删除项**（worktree 与 staged 均查）。
- `git diff --stat`：51 文件 +289/-104；绝大多数文件 1–4 行小改；最大为 catalog.json（+170，即 9 新条目+hash 同步）、task-lifecycle.test.mjs（+38）、各岗 MEMORY.md（8–17 行，c2c 收敛+sha 同步）。
- 抽查治理源 diff 性质：
  - `EVALUATION_RUNBOOK.md`：仅 §5 增一句「正式审计开始时先读取 learning/audit-findings.md 的 open/deferred 条目…」。
  - `skills/company-skill-governance/SKILL.md`：路径解析措辞澄清 + ASSET_REGISTRY 同步说明，加注「（2026-09-24 审计修复）」。
  - `scripts/task-lifecycle.mjs`：durable closeout receipt 仅对 `external_run_id` 真实外部执行任务写（注释说明），never-started 临时卡不写回执——属精确逻辑修复，非治理正文改写。
- **判定：通过**。diff 只含加注/枚举/指针/精确逻辑修复，无治理政策或 Skills 规范源正文的语义重写，无删除。

---

## B. 快照重建与保真（EVALUATION_RUNBOOK §1）

- 快照目录：mktemp 新建 `/tmp/company-snap-n6dQg0`；按白名单复制治理政策、ROSTER、8 岗 PROFILE/MEMORY/KNOWLEDGE、INDEX+catalog+knowledge/*.md、catalog 引用的全部 detail 文件、audit-findings.md、scripts（check-*/bootstrap/task-lifecycle/resolve-model-learning-request/supervisor-runtime）、ASSET_REGISTRY 登记的 4 个 active skill 整目录、platforms/REGISTRY.md、关键 templates、memory/PROJECT_MEMORY_POLICY.md、audit-efficient-work-training-2026-09-16/。未复制凭据、原始聊天、业务库、平台缓存。
- manifest：`results-verify/snapshot-manifest.tsv`（95 文件，相对路径+sha256+字节数）。
- 保真复测：
  - bootstrap：exit=0，`Company bootstrap check passed`。
  - check-knowledge：`entries:58, errors:[], warnings:[]`，exit=0。
  - 与真实根结果**完全一致**。
- 构建过程注记：首次白名单漏复制 catalog 引用的岗位 detail 文件与 ted-takeover skill 目录，bootstrap 报 `INVALID ACTIVE SKILL: ted-takeover`、check-knowledge 报 29 条 ENOENT；按 catalog.entries[*].detail 与 ASSET_REGISTRY active 行补齐后全绿。**这是快照构建的收敛记录，不代表真实根有缺陷**（真实根两轮基线均绿）。
- **判定：通过**。

---

## C. 一次冷启动（§3.7，详见 coldstart.md）

- 在快照上以全新上下文完成：bootstrap 初始化 → ROUTER 路由样例任务「前端页面性能疑难定位」（主责 frontend-expert，consult:none，按成本门禁不启动 C2C）→ INDEX.md 命中 `verifiable-work-evidence-ledger`、读 detail、独立 hash 核对一致（74cfadd2…）、记录采用（五正交状态约束诊断结论不跨层外推）/拒绝裁剪（单低风险只读任务用精简账本、不写持久事件）→ S 级简报收口（不建持久事件、不启动 C2C）。
- 实际读取路径/hash 已记录；未出现规则变更导致的断链。
- **判定：通过**。

---

## D. 归档

- 目录：`learning/evaluations/2026-09-24-company-audit-fix-v1/results-verify/`
  - `verify-report.md`（本文件）
  - `snapshot-check.json`（快照 bootstrap + check-knowledge 输出与保真比对）
  - `coldstart.md`（C 完整记录）
  - `snapshot-manifest.tsv`（快照 manifest 副本，95 文件）

---

## 总体判定：**通过**

- A 真实根两项基线复现绿、8 岗 C2C 收敛无重复、指针权威规则无损、catalog 58 条且 9 新条目/audit-findings 独立 sha256 全一致、抽样 STALE 哈希与语义相符、3 处 P2/P3 修复带日期到位、git 无删除且治理源仅小改。
- B 快照 95 文件 manifest，bootstrap+check-knowledge 与真实根一致。
- C 快照全新上下文冷启动闭环完成。
- 未发现需要圆场的不一致；唯一过程项（快照首建缺文件）已在 B 记录为构建收敛，非事实源缺陷。
- 已知边界（非缺陷）：check-knowledge 仅做 ID 绑定的结构/覆盖/漂移校验，声明「not semantic certification」；本报告的语义抽查为抽样（4 条 STALE + 1 条冷启动命中），未对全部 58 条做逐条语义认证。
