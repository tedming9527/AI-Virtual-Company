# AI 能力扩展雷达第二轮独立复审报告

- 审计日期：2026-09-19
- 审计角色：未参与本版实现或整改的独立 AI 工程与信息治理审计者
- 审计对象：当前工作区中用户指定的六个文件
- 整体判定：FAIL
- 发布建议：停止把当前校验器的成功退出码单独作为“当前推荐”发布依据；先关闭下述高风险绕过，再由未参与修复者创建新快照复测。

## 1. 独立性与边界声明

本评审者未参与本版实现或整改，没有继承实现者讨论，也没有读取 Git 历史。第一轮独立报告只作为应修复问题清单使用，不把其结论当作本轮证据。本轮重新读取当前六个受测文件、独立运行现有测试并自拟负例。

除公司初始化和独立评测所必需的治理文件外，本轮额外读取的项目材料仅为用户指定的六个受测文件与第一轮审计报告。没有访问网站、账号、网络来源、生产系统或外部业务项目；没有修改六个实现文件。行为夹具写入系统临时目录；审计正文夹具只在 `audits/` 中短暂创建并在同一次测试进程的 `finally` 中删除。唯一保留的新文件是本报告。

本报告证明的是当前本地快照的静态与行为门禁结果，不是第三方认证，也不证明远端来源真实性、后台调度或生产可靠性。

## 2. 固定快照与 SHA-256

受测文件 SHA-256：

| 文件 | SHA-256 |
|---|---|
| `README.md` | `c6eedcccb08410c66c712341c4e81229de6533552abc1ec47fe1c358742ac110` |
| `source-registry.json` | `d18cf7bd409c6243dc2e0cdd51ec5dd7f39ea331431e792f0bd9f3b27dc12e5a` |
| `schema.json` | `7539c86a207909a35a4cdafe1119557e1e10e3b51a16d28893f739286d0135fe` |
| `collection-template.json` | `c5d45bd1c19e20ada8eb95bcf587bfc005bff064fc71ff18d42b3c5506ce0263` |
| `scripts/validate-radar.mjs` | `4021bccc050df162a47b8bd99bdfceaab7b690cc5fe8caf8ed9e18eba5a76ffe` |
| `tests/validate-radar.test.mjs` | `4016903b78dbedc5b4c4602be02f4685949bd1960f395f4f6cec654c57321c21` |

`snapshot_sha256` 的计算口径：按上表顺序，为每个文件生成精确的 UTF-8 行 `<文件 SHA-256><两个空格><相对路径>\n`，连接六行后再取 SHA-256。

`snapshot_sha256: 9bd7fcf5e96035874f213e41f8f8c79280639ba6e90234a93c49807f6d7fa613`

## 3. 测试证据

### 3.1 现有入口

执行：

```text
node --check deliverables/ai-capability-radar/scripts/validate-radar.mjs
node --test deliverables/ai-capability-radar/tests/validate-radar.test.mjs
node deliverables/ai-capability-radar/scripts/validate-radar.mjs deliverables/ai-capability-radar/collection-template.json
```

结果：

- 脚本语法检查退出 0；
- 现有测试 7/7 通过，0 failed；
- 空集合模板退出 0，输出 `valid: true`、`tools: 0`；
- 三个 JSON 文件均可解析。

现有回归已覆盖并正确阻断：直接把 `x-public-signals` 当证据、明确失败审计、已过期当前推荐、许可证/权限/数据三类 `unknown` 风险、非法日期、错误类型、额外字段和自替代。独立新增的两节点替代循环也被拒绝。X-only 的合法 `discovered + candidate + hold` 可保存，提升为当前推荐会被拒绝。

### 3.2 独立负例复测

独立夹具以 `run.collected_at = 2026-09-19` 运行，共 17 个场景。安全预期是应拒绝的用例退出 1、合法用例退出 0。实际有 6 个应拒绝用例退出 0，并输出 `valid: true`、`current_recommended: 1`。

| 场景 | 安全预期 | 实际 | 判定 |
|---|---:|---:|---|
| 合法当前推荐基线 | 0 | 0 | 符合 |
| X 帖子使用 `vendor-docs-changelog` 的 primary 身份并自报 `x.com` 为官方域名 | 1 | **0** | **绕过** |
| 99.99% 可靠性厂商主张绑定“只测安装、未测可靠性”的独立证据 | 1 | **0** | **绕过** |
| `run.audit.status = failed` | 1 | 1 | 符合 |
| 已过期当前推荐 | 1 | 1 | 符合 |
| 核验、证据和生命周期日期整体写到 2099 年，复核间隔仍为 7 天 | 1 | **0** | **绕过** |
| license 为 `unknown` | 1 | 1 | 符合 |
| permissions 为 `unknown` | 1 | 1 | 符合 |
| data 为 `unknown` | 1 | 1 | 符合 |
| 三类风险自报 `verified`，但 `evidence_refs` 全为空 | 1 | **0** | **绕过** |
| 非法日期 + 错误类型 + 额外字段 | 1 | 1 | 符合 |
| 合法 X-only discovered hold | 0 | 0 | 符合 |
| X-only discovered 强提为推荐 | 1 | 1 | 符合 |
| 自替代 | 1 | 1 | 符合 |
| 两节点替代循环 | 1 | 1 | 符合 |
| 审计正文前段出现带结论标签的 PASS 文本、最后结论为 FAIL | 1 | **0** | **绕过** |
| 任意 64 位十六进制审计快照哈希，未绑定本轮六文件快照 | 1 | **0** | **绕过** |

临时审计夹具已清理；复核后确认两个临时文件均不存在。

## 4. 已修复或表现符合要求的项目

对照第一轮问题清单，当前版本已经形成以下可执行控制：

1. 校验器会读取并执行当前 Schema 的 required、type、enum、pattern、真实日历日期、数组项目、最小项目数和 `additionalProperties: false`；非法日期、错误类型与额外字段能被拒绝。
2. `discovered` 可以在没有原始证据时合法保留，但不能直接成为当前推荐。
3. 明确引用 discovery-only 来源作 evidence 会失败；明确失败审计、过期推荐和三类 unknown 风险会失败。
4. 7/30/90 天波动窗口已编码；自替代和两节点替代循环会失败。
5. 生命周期历史、最后状态、退役上下文与替代目标的基本结构已进入契约。
6. 当前来源登记诚实区分运行状态：GitHub、MCP Registry 与 Hacker News 是 `manual_available`，厂商文档与研究是 `manual_per_candidate`，X 为 disabled + `not_connected`；所有 `last_success_at` 仍为 null。README 也明确未建立账号订阅、后台调度或持续推送，没有把人工入口冒充已连接自动化。

这些修复是真实改进，但不能抵消下列仍可发布的高风险绕过。

## 5. 剩余发现

### R-01 · 关键 · 审计最终 FAIL 可被正文较早位置的 PASS 文本绕过

`scripts/validate-radar.mjs:193-201` 只在整个 Markdown 中搜索任意一处匹配的 PASS 结论文本，不解析唯一、最终或规范位置的结论。本轮夹具在正文前段放置历史 PASS 文本、末尾明确 FAIL，仍得到 `valid: true/current_recommended: 1`。

影响：失败报告、对照示例、引用文字或修复前结论都可能把审计门禁洗成通过。这是直接的关键发布绕过。

最低修复条件：审计结论使用机器可读且唯一的结构化元数据，或严格解析末个非空规范结论并拒绝多结论/冲突；用本轮混合结论夹具做回归。

### R-02 · 高风险 · 审计快照哈希只校验格式，没有绑定受测文件

`scripts/validate-radar.mjs:193-201` 仅验证 `snapshot_sha256` 形状为 64 位十六进制，不重算当前六文件快照，也不核对报告中声明的快照。任意全 `f` 哈希仍可发布；Schema 在 `schema.json:16-25` 也没有定义哈希对应的 manifest 或算法口径。

影响：旧报告、别的版本报告或任意自填哈希都可以给当前数据解锁，审计无法证明“评了正在发布的版本”。

最低修复条件：生成确定性 manifest，校验器重算受测文件整体哈希，并要求 collection、审计报告与重算结果三方一致；缺文件、顺序变化或哈希不一致一律失败。

### R-03 · 高风险 · X 仍可借 primary `source_id` 和自报官方域名冒充官方来源

`scripts/validate-radar.mjs:102-125` 会拒绝直接使用 discovery-only 的 `x-public-signals`，但“来源层级”和“官方域名”仍由记录填写者组合：

- `source_id` 只需指向一个登记为 primary 的通用来源；
- evidence URL 不必属于该来源登记的入口或候选的已核对归属；
- `publisher.official_domains` 是条目自填，脚本只检查 URL host 是否出现在这个自填数组；
- `evidence.publisher` 不必等于 `tool.publisher.name`。

因此，本轮把 X URL 标为 `official_docs`、把 `source_id` 写成 `vendor-docs-changelog` 并自报 `x.com` 为官方域名，即通过所有当前门禁。

影响：第一轮最重要的“X 只作线索”边界仍可绕过，项目归属证据不可信。

最低修复条件：把 source registry 与允许 URL 范围/核验方式绑定；官方域名或仓库归属不能由同一条目自证；保存可复核的归属判定，并为“primary source_id + 非匹配 URL”加入负例。

### R-04 · 高风险 · 厂商主张只做 ID/版本匹配，不做指标与环境的相称性门禁

`schema.json:34-69` 的 claim/evidence 结构只有自由文本、kind、版本与双向 ID；`scripts/validate-radar.mjs:127-137` 只要求同 claim、允许的证据 kind 和同工具版本。它不检查被测指标、口径、结果、数据集、环境相称性或 limitations 中的明确否定。

本轮将“99.99% 可靠性”与一份明确写明“只测安装、未测可靠性、环境不同”的 independent_test 双向绑定，校验器仍判当前推荐有效。

影响：无关独立证据可以继续洗白厂商性能主张，主张级映射只有句法一致性，没有语义充分性。

最低修复条件：为性能/可靠性主张增加结构化指标、口径、目标版本/环境与结果字段；独立证据必须给出同指标和相称环境的观测，明确“未测”不能支持该 claim。无法自动判定的语义必须保留独立人工签核且不能仅靠自填 ID。

### R-05 · 高风险 · 异常未来日期可伪造“新鲜核验”

`scripts/validate-radar.mjs:149-154` 只检查 `next_review_at - checked_at` 不超过波动窗口，并检查当前推荐是否已经过期；没有要求 `tool.checked_at`、evidence.checked_at、discovered_at、lifecycle changed_at 或 retired_at 不晚于 `run.collected_at`，也没有检查历史日期单调性。

本轮把核验、证据与生命周期日期都写成 2099-01-01，下一复核写为 2099-01-08，在 2026-09-19 的 run 中仍成为当前推荐。

影响：条目可获得几十年的虚假新鲜度，到期 fail-closed 被未来日期绕开。

最低修复条件：所有事实发生/核验日期不得晚于 run 日期；生命周期日期单调且不晚于 run；必要时为可接受时钟偏差定义极小、明确的窗口。

### R-06 · 高风险 · 风险状态可无证据自报 verified

`schema.json:72-80` 允许 `risk.evidence_refs` 为空；`scripts/validate-radar.mjs:140-145` 对推荐条目只检查状态字符串是否为 `verified`，没有要求每一类至少一份相称证据。本轮将 license、permissions、data 全部自报 verified 且证据引用为空，仍成为当前推荐。

影响：虽然 unknown 已 fail-closed，但填写者可用无证据的 verified 一步绕过，许可证、权限和数据处理门禁仍不是可审计控制。

最低修复条件：推荐条目的三类风险各自至少一份相称、存在、版本匹配的证据；许可证证据使用 license/official 类型，权限与数据处理需要明确范围与环境，不能用一份泛化仓库页面同时默认覆盖三类风险。

### R-07 · 低风险 · Schema 的 `format: uri` 与运行时“仅 HTTPS”语义不完全一致

`schema.json` 使用标准 `format: uri`，而 `scripts/validate-radar.mjs:25-27, 50-55` 把该格式重定义为仅接受 `https:`。当前 README 的 URL 语境支持 HTTPS 优先，因此这是 fail-closed 的偏差，不是发布绕过；但若 `schema.json` 被称为单一数据契约，独立 JSON Schema 消费者会接受运行时拒绝的其他合法 URI。

最低修复条件：在 Schema 中显式编码 HTTPS 模式/格式约束，或把脚本恢复为标准 URI 语义并在业务字段上另加 HTTPS 规则，使两个入口给出同一结果。

## 6. Schema、脚本与来源登记综合结论

| 层级 | 结论 | 证据边界 |
|---|---|---|
| JSON 与脚本语法 | PASS | 当前文件可解析，脚本语法退出 0。 |
| 现有自动测试 | PASS | 7/7，但未覆盖本轮 6 条绕过。 |
| Schema 基础结构执行 | PASS | required/type/date/additionalProperties 等已实际执行。 |
| Schema 与脚本完整一致性 | PARTIAL | 基础关键词一致；URI 语义存在偏差，关键跨字段语义主要依赖脚本。 |
| 发现态与替代图 | PASS（受测范围） | discovered 可保留且不可推荐，自替代和两节点循环被拒绝。 |
| 当前 source registry 诚实性 | PASS | manual/manual_per_candidate/not_connected 与 null 运行回执如实披露；未声称自动采集成功。 |
| 来源身份与 claim 证据语义 | FAIL | X 可借 primary ID 冒充官方；错配独立证据可洗白厂商主张。 |
| 日期与风险门禁 | FAIL | 未来日期与无证据 verified 可发布。 |
| 审计发布门禁 | FAIL | 最终 FAIL 可被前文 PASS 文本绕过，快照哈希未绑定。 |
| 网络与生产效果 | NOT TESTED | 按授权边界未访问。 |

## 7. 总结

第二轮整改已经修复第一轮的多项结构问题，现有测试也全绿；但测试之外仍存在 6 条可复现的发布绕过。其中审计最终结论绕过、任意快照哈希、来源身份自证、厂商主张错配、未来日期和无证据风险 verified 都会让未满足 README 发布条件的条目成为 `current_recommended`。依据“任何关键/高风险发布绕过仍存在则 FAIL”的门禁，本快照不能通过独立复审。

审计结论：**FAIL**
