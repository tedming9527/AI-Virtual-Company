---
audit_verdict: FAIL
snapshot_sha256: sha256:e5572ea49e38e6b8cae2a10a49defbfba45e6d484909b1a3add4d18c1d3a49fb
reviewer: independent-b
audited_at: 2026-09-19
---

# AI 能力扩展雷达最终独立审计 B

## 结论

**FAIL。** 当前六文件快照与目标哈希一致，第二轮六项既有发布绕过均能触发对应拒绝；但规范正例也必然失败，且五类新增高风险负例没有触发其本应命中的语义门禁，只被同一个全局审计解析故障遮住。依据“关键或高风险发布绕过必须全部关闭”的门禁，不能把这种 fail-closed 假象判为 PASS。

本报告只评价当前本地六文件快照的结构与行为门禁，不是第三方认证，也不证明远端来源真实、后台采集已运行或生产发布可靠。

## 审计范围与边界

- 受审文件固定为 `README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`，顺序与 README 规定一致。
- 六个受审文件未被修改。行为夹具与六文件副本仅创建在系统临时目录 `/private/tmp/ai-capability-radar-final-audit-b.QPF0iL`；正式保留物只有本报告。
- 未访问网络、账号、生产系统、外部业务项目或 Git 历史；没有验证真实域名所有权、真实证据内容或持续调度回执。
- 独立性是角色与上下文隔离，不代表不同模型供应商或客观认证。

## 快照复算

执行：

```text
shasum -a 256 README.md source-registry.json schema.json collection-template.json scripts/validate-radar.mjs tests/validate-radar.test.mjs | shasum -a 256
```

结果：

```text
e5572ea49e38e6b8cae2a10a49defbfba45e6d484909b1a3add4d18c1d3a49fb  -
```

复算值与任务目标、校验器模板输出均一致：

`sha256:e5572ea49e38e6b8cae2a10a49defbfba45e6d484909b1a3add4d18c1d3a49fb`

## 基础检查

执行：

```text
node --check scripts/validate-radar.mjs
node --test tests/validate-radar.test.mjs
node scripts/validate-radar.mjs collection-template.json
node /private/tmp/ai-capability-radar-final-audit-b.QPF0iL/audit-b.mjs
```

结果：

- 语法检查退出 0。
- 现有测试 12/12 通过，0 failed。
- 空集合模板退出 0，输出 `valid: true`、`tools: 0`，并返回与本报告一致的系统快照哈希。
- 独立夹具共 14 个场景：1 个规范推荐正例、第二轮六项绕过、6 个新增负例、1 个快照变更负例。
- 规范推荐正例预期退出 0、实际退出 1；唯一错误为 `run.audit.ref snapshot does not match the current audited system snapshot`。

基础脚本全绿只证明现有断言通过，不能替代新增语义负例或可发布正例。

## 第二轮六项绕过重放

| 场景 | 安全预期 | 实际 | 对应拒绝信号 | 判定 |
|---|---:|---:|---|---|
| X 链接借 primary `source_id` 并自报官方域 | 1 | 1 | `uses a discovery host as evidence` | 已阻断 |
| 可靠性厂商主张绑定指标/单位/环境不匹配的安装测试 | 1 | 1 | `vendor claim lacks claim-matched independent/runtime evidence` | 已阻断 |
| 机器结论为 FAIL、正文出现 PASS | 1 | 1 | `final machine verdict is not PASS` | 已阻断 |
| collection 与报告共同填写任意 64 位快照哈希 | 1 | 1 | collection 与报告快照均不匹配当前六文件 | 已阻断 |
| 工具、证据与生命周期日期写到 2099，run 仍为 2026-09-19 | 1 | 1 | `contains future date 2099-01-01` | 已阻断 |
| 三类风险自报 verified、引用数组为空 | 1 | 1 | 三类均 `requires evidence before recommendation` | 已阻断 |

这六项除各自错误外还共同出现下述全局审计解析错误；表中“已阻断”只表示当前夹具能得到目标专属拒绝信号，不等于整体门禁可用。

## 新增负例与发现

### B-01 · 关键 · 合法审计前置元数据永远无法通过

`scripts/validate-radar.mjs` 用 `^([a-z_]+):` 解析前置元数据键名，但规范要求的键为 `snapshot_sha256`，其中包含数字。解析结果永远没有 `snapshot_sha256`，随后与当前快照比较必然失败。

规范正例使用本报告要求的四个字段、正确 PASS、正确当前快照、非空 reviewer 和 2026-09-19 日期，仍只得到：

```text
run.audit.ref snapshot does not match the current audited system snapshot
```

影响：任何包含 `current + recommended` 的合法 collection 都不能通过发布门禁。空模板和现有测试全绿没有覆盖这一正向路径。该问题是 fail-closed 的关键可用性故障，也使其余新增负例被同一错误遮住，无法据此证明相应语义控制有效。

### B-02 · 高风险 · 非发现站点的假官方域仍可自证

新增负例把 publisher 写成 `OpenAI`，把 `openai-security.example` 自填为 official domain，并让 canonical URL、ownership evidence、license 与风险文档都落在该域；全部使用允许 `candidate_official_domain` 的 `vendor-docs-changelog`。

安全预期是拒绝未由独立登记或外部归属证据绑定的域名。实际除 B-01 外没有来源或所有权错误。当前修复只明确封禁登记的 X/HN 发现站点，任意其他仿冒域仍能由同一条目自报为官方。

影响：一旦 B-01 被最小修复，仿冒站点可同时充当“官方归属”“官方文档”“许可证”和风险证据，恢复高风险发布绕过。

### B-03 · 高风险 · 证据字段精确匹配仍可与证据语义相反

新增负例为 `99.99% reliability in production` 填写完全相同的 metric、unit、environment、tool version 和 `outcome: supports`，但 `result` 明确写“未测可靠性，只完成安装”，`limitations` 也明确写“不测可靠性”。

安全预期是拒绝自相矛盾的支持证据。实际除 B-01 外没有 claim/evidence 语义错误。现有检查只比较结构化标签，不检查结果、限制与支持结论的冲突。

影响：采集者可以用正确标签包裹明确不支持的内容，洗白厂商性能或可靠性主张。

### B-04 · 高风险 · 审计结论和归属元数据不具唯一性/完整性

新增两个负例：

1. 第一份前置元数据为 PASS，正文后再放第二份结构化前置元数据并写 FAIL；
2. 前置元数据只含 PASS 与快照，缺少 `reviewer` 和 `audited_at`，collection 自行填写 reviewer。

两者除 B-01 外均无对应错误。校验器只读取开头第一块，不拒绝第二块结构化结论，也不要求报告内 reviewer/audited_at，更不核对 collection reviewer 与报告 reviewer。

影响：修复 B-01 后，冲突的最终审计结论、缺失审计人或日期仍可能被首块 PASS 解锁，未满足 README 的“唯一机器可读前置元数据”和可归属要求。

### B-05 · 高风险 · 未来 run 日期可把所有未来证据正常化

第二轮用当前 run 日期检查未来工具日期已经被阻断；新增负例把 `run.collected_at`、工具、证据和生命周期日期一起写为 2099-01-01，并保持 7 天复核窗口。

安全预期是拒绝明显晚于实际审计日的 run。实际除 B-01 外没有日期错误。校验器只比较各日期是否晚于 run，不把 run 或审计日期绑定到当前运行日，也不读取报告 `audited_at`。

影响：修复 B-01 后，采集者仍可整体前移时间基准，获得长期虚假新鲜度。

### B-06 · 高风险 · 风险证据覆盖仍可由记录自证且与限制冲突

新增负例保留 permissions/data 的 `covers_risks` 标签，但将同一证据的 `limitations` 改为“本文档不评估权限或数据处理”。

安全预期是拒绝明确否定覆盖范围的证据。实际除 B-01 外没有风险门禁错误。当前门禁验证引用存在、kind 合法和自填标签覆盖，却不处理证据结果或限制的语义冲突。

影响：修复 B-01 后，一份明确不覆盖风险的文档仍可把 permissions/data 标成 verified。

## 快照一致性专项结果

快照绑定本身表现为 fail-closed：

- 任意 64 位哈希同时写入 collection 和报告仍被拒绝；
- 在临时六文件副本中创建正确报告后再改动 `README.md`，旧 collection 与旧报告同时失效；
- 恢复 `README.md` 后重新计算，临时副本回到目标快照。

这说明六文件哈希重算和三方比对方向正确；B-01 是报告字段解析错误，不是哈希算法错误。

## 分层判定

| 层级 | 结论 | 边界 |
|---|---|---|
| 六文件快照 | PASS | 独立复算与目标一致 |
| JSON/脚本语法 | PASS | 本地可解析、脚本语法退出 0 |
| 现有自动测试 | PASS | 12/12，但缺合法推荐正例 |
| 空集合模板 | PASS | 仅证明无推荐项时可通过 |
| 第二轮六项绕过 | PASS（逐项拒绝） | 每项均出现目标专属拒绝信号 |
| 合法推荐正例 | FAIL | 规范 `snapshot_sha256` 无法被解析 |
| 假官方域与证据语义 | FAIL | 新负例只被 B-01 遮挡，目标门禁未拒绝 |
| 审计结论唯一性/归属 | FAIL | 多前置元数据、缺 reviewer/date 未被拒绝 |
| 日期与风险语义 | FAIL | 未来 run 与语义否定风险证据未被拒绝 |
| 快照变更失效 | PASS | 任一受审文件变化会使旧审计失效 |
| 网络与生产效果 | NOT TESTED | 按授权边界未访问 |

## 通过前最低条件

1. 修复前置元数据键名解析，并新增一个真实 PASS 报告 + 当前推荐条目的正向回归；正例必须退出 0。
2. 官方域不能由同一条目自证；把候选域绑定到独立、可审计的归属登记或专门签核，新增非 X/HN 仿冒域负例。
3. 对 claim assessment 的 result/limitations 与 supports/outcome 冲突进行 fail-closed 处理；自动无法判断时要求独立人工语义签核，不能只信标签相等。
4. 强制审计报告只有一块前置元数据，字段集合完整且唯一；核对报告 reviewer、audited_at、collection reviewer 与 run 日期的一致性。
5. `run.collected_at` 和报告 `audited_at` 不得晚于实际运行日；保留极小、明确的时钟偏差规则，并加入整体未来日期负例。
6. 风险证据的结构化覆盖与 result/limitations 不得冲突；冲突时状态必须降为 unknown/conflict，不能发布。
7. 修复后创建新六文件快照，由未参与修复者重新运行规范正例、第二轮六项、本文新增负例和快照变更测试。

本审计没有修改实现，也没有授权发布。当前安全操作是保持所有推荐发布关闭，直到新快照完成独立复测。
