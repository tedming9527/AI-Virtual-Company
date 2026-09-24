---
audit_verdict: FAIL
snapshot_sha256: sha256:ae4738e1cf5a66c9087cbcd758396bdf85324d102130138ab6839d269b980355
reviewer: independent-b
audited_at: 2026-09-19
---

# AI 能力扩展雷达最终红队复审 B2

## 结论

**FAIL。** 新快照与预期哈希一致，合法 PASS 推荐正例已成功；上轮 B-01 至 B-06 与第二轮六项绕过也都由目标门禁拒绝，不再被全局解析错误遮蔽。但独立保留题发现四条仍可直接得到 `valid: true` 和 `current_recommended: 1` 的高风险发布绕过：GitHub 仓库归属可冒充任意发布者、主张证据可用 “unknown/only” 绕过语义冲突、风险证据可用相同方式自证覆盖、已按 Asia/Shanghai 当前日期过期的推荐可借旧 run 日期继续发布。关键/高风险绕过尚未全部关闭，不能判 PASS。

本报告只评价当前本地六文件快照的结构与行为门禁，不是第三方认证，也不证明远端仓库归属、证据内容、后台采集或生产发布真实有效。

## 范围与边界

- 固定受审文件为 `README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`，顺序与 README 规定一致。
- 六个受审文件未被修改。行为夹具与六文件副本仅位于系统临时目录 `/private/tmp/ai-capability-radar-final-audit-b2.IuozsL`。
- 未访问网络、账号、生产系统、外部业务项目或 Git 历史；未验证真实 GitHub 组织归属、真实证据内容或持续调度回执。
- 独立性是角色与上下文隔离，不代表不同模型供应商或客观认证。

## 快照复算

执行：

```text
shasum -a 256 README.md source-registry.json schema.json collection-template.json scripts/validate-radar.mjs tests/validate-radar.test.mjs | shasum -a 256
```

结果：

```text
ae4738e1cf5a66c9087cbcd758396bdf85324d102130138ab6839d269b980355  -
```

复算值与任务指定快照一致：

`sha256:ae4738e1cf5a66c9087cbcd758396bdf85324d102130138ab6839d269b980355`

## 基础与正向验证

执行：

```text
node --check scripts/validate-radar.mjs
node --test tests/validate-radar.test.mjs
node scripts/validate-radar.mjs collection-template.json
TZ=UTC node /private/tmp/ai-capability-radar-final-audit-b2.IuozsL/audit-b.mjs
TZ=Asia/Shanghai date +%F
TZ=UTC date +%F
```

结果：

- 脚本语法检查退出 0。
- 当前自动测试 18/18 通过，0 failed。
- 空集合模板通过，系统快照与本报告一致。
- 独立夹具共 18 个场景：1 个合法推荐正例、第二轮六项绕过、上轮 B 系列六类负例、4 个新保留题、1 个快照变更负例。
- 合法推荐正例退出 0，输出 `valid: true`、`tools: 1`、`current_recommended: 1` 和当前快照；上轮 B-01 的全局解析故障已关闭。
- 即使宿主进程设为 `TZ=UTC`，校验器仍显式使用 `Asia/Shanghai`。审计时上海日期为 2026-09-19，UTC 日期为 2026-09-18。

现有测试全绿与合法正例通过是真实改进，但不能覆盖下述独立保留题。

## 第二轮六项绕过复测

| 场景 | 预期/实际退出码 | 目标拒绝信号 | 判定 |
|---|---|---|---|
| X 链接借 primary 来源并自报官方域 | 1 / 1 | discovery host、GitHub 推荐域、GitHub 归属三项错误 | 已关闭 |
| 可靠性厂商主张绑定指标/环境不匹配的安装测试 | 1 / 1 | 语义冲突及缺少 claim-matched 证据 | 已关闭 |
| 机器结论为 FAIL、正文出现 PASS | 1 / 1 | machine verdict 不是 PASS | 已关闭 |
| collection 与报告共同填写任意 64 位快照 | 1 / 1 | 两处快照均不匹配当前六文件 | 已关闭 |
| 工具、证据和生命周期日期写到 2099，run 仍为 2026-09-19 | 1 / 1 | future date | 已关闭 |
| 三类风险自报 verified、证据引用为空 | 1 / 1 | license、permissions、data 均要求证据 | 已关闭 |

上述每个场景都出现与目标风险直接对应的错误；输出中没有合法正例曾遇到的全局审计快照错误。

## 上轮 B-01 至 B-06 复测

| 上轮发现 | 本轮证据 | 判定 |
|---|---|---|
| B-01 合法审计元数据无法解析 | 合法单一 PASS 报告与当前推荐退出 0 | 已关闭 |
| B-02 非发现站点假官方域自证 | `openai-security.example` 被 GitHub 推荐域与 GitHub 归属门禁拒绝 | 原夹具已关闭 |
| B-03 明确写“不测可靠性”却标 supports | supporting assessment 与 result/limitations 冲突 | 原夹具已关闭 |
| B-04 第二份结构化结论、缺 reviewer/date | 分别命中 second structured verdict、missing reviewer/date、reviewer mismatch | 已关闭 |
| B-05 run 与全时间线写到 2099 | 命中 run collection date future | 已关闭 |
| B-06 明确写“不评估权限/数据”却标 verified | permissions/data evidence conflicts with limitations | 原夹具已关闭 |

这些结果证明针对上轮精确负例的整改生效；以下保留题检验同一安全目标是否只靠有限字面匹配。

## 新保留题与剩余高风险绕过

### C-01 · 高风险 · GitHub 主机被误当作发布者归属证明

夹具使用 `https://github.com/attacker/not-openai`，publisher 自填为 `OpenAI`，official domain 填 `github.com`；仓库、许可证和安全文档都来自攻击者仓库，但字段、来源层级、版本、风险和审计其余部分完整。

安全预期是拒绝未证明 GitHub owner 与声明发布者关系的仓库。实际退出 0，并输出 `current_recommended: 1`。

原因：当前门禁确认 host 为 `github.com`、证据 kind 为 official repository、URL 位于 canonical URL 下，却没有把仓库 owner/组织与 publisher 绑定到独立、不可自填的归属登记。GitHub 是托管平台，不等于每个仓库都由所声明厂商拥有。

影响：任意 GitHub 账号可把自己的仓库包装成知名厂商官方项目，连同许可证与风险文档一起进入当前推荐。

### C-02 · 高风险 · 主张证据用 “unknown/only” 可绕过语义冲突

夹具保留 `99.99% reliability in production` 及完全匹配的 metric、unit、environment、version 和 `supports` 标签；证据 result 写为 “Reliability remains unknown; only installation completed.”，limitations 写为 “Only installation was exercised.”。

安全预期是拒绝未知且只测安装的证据支持可靠性主张。实际退出 0，并输出 `current_recommended: 1`。

原因：语义冲突门禁是有限否定词正则，只覆盖 “not/never/does not/未测/不评估”等字面，不覆盖 “unknown/unverified/inconclusive/only”等同义边界。字段精确匹配仍由填表者自报。

影响：明确未知或只覆盖旁支场景的证据仍可洗白厂商性能与可靠性主张。

### C-03 · 高风险 · 风险证据用 “unknown/only” 可自证 verified

夹具保留 permissions/data 的 `covers_risks` 标签，但 limitations 写为 “Permissions and data handling remain unknown; this document only lists configuration.”。

安全预期是把两类风险降为 unknown/conflict 并阻止发布。实际退出 0，并输出 `current_recommended: 1`。

原因与 C-02 相同：风险门禁信任自填覆盖标签，只对有限否定词触发冲突。

影响：权限边界和数据处理实际未知时，仍可通过一份只列配置的文档自证 verified。

### C-04 · 高风险 · 到期判断使用旧 run 日期而非上海当前日期

上海当前日期为 2026-09-19。夹具把 run、审计、核验和 `next_review_at` 都写为 2026-09-18；因此推荐已按上海日期过期。校验器在宿主 `TZ=UTC` 下运行，仍应依据其显式 Asia/Shanghai 当前日拒绝。

安全预期是到期立即 fail-closed。实际退出 0，并输出 `current_recommended: 1`。

原因：未来 run 已与 Asia/Shanghai 当前日期比较，但推荐过期仅检查 `next_review_at < run.collected_at`，没有与同一个上海当前日期比较。旧 collection 可以冻结旧鲜度判断。

影响：过期 collection 可在以后继续通过并发布，违反 README 的“过期立即 fail-closed”。

## 快照、审计结论与时区专项结论

- 合法单一 PASS 报告成功；缺字段、reviewer 不一致、第二份结构化结论和机器 FAIL 均由目标错误拒绝。
- collection、报告和六文件快照三方一致时正例成功；任意哈希或临时修改 `README.md` 后，旧审计立即失效。
- 校验器当前日显式使用 Asia/Shanghai，且不受宿主 `TZ=UTC` 影响。
- 仍有 C-04：过期判断没有使用已正确取得的上海当前日。

## 分层判定

| 层级 | 结论 | 边界 |
|---|---|---|
| 六文件快照 | PASS | 独立复算与目标一致 |
| 脚本与 JSON 基础 | PASS | 语法、模板和 18 项现有测试通过 |
| 合法当前推荐正例 | PASS | 真实输出 `current_recommended: 1` |
| 第二轮六项绕过 | PASS | 六项均由目标门禁拒绝 |
| 上轮 B-01 至 B-06 | PASS（原夹具） | 精确负例均由目标门禁拒绝 |
| 审计唯一性与快照一致性 | PASS（受测范围） | 缺字段、冲突结论、任意哈希和文件变化均失败 |
| 发布者归属 | FAIL | 攻击者 GitHub 仓库可冒充任意 publisher |
| 主张与风险证据语义 | FAIL | “unknown/only” 可绕过有限否定词门禁 |
| Asia/Shanghai 日期门禁 | FAIL | 取日正确，但过期比较仍只看旧 run 日期 |
| 网络与生产效果 | NOT TESTED | 按授权边界未访问 |

## 通过前最低条件

1. 把 GitHub owner/组织与 publisher 绑定到独立、可审计、不可由同一条记录自填的归属登记；用攻击者仓库冒充知名厂商的负例复测。
2. 不以有限否定词表承担证据充分性。至少把 unknown、unverified、inconclusive、only、not applicable 及中文同义边界纳入 fail-closed；更稳妥的是增加结构化测量值、样本/环境和独立语义签核，无法确认时保持 hold。
3. 风险覆盖同样采用结构化结论与冲突状态，证据写未知、仅配置或未给范围时不能标 verified。
4. 当前推荐的 `next_review_at` 必须与 Asia/Shanghai 当前日期比较；旧 run 不能冻结鲜度。补充“昨天到期、今天运行”的回归，并在宿主 UTC 环境复测。
5. 修复后生成新六文件快照，由未参与修复者重跑合法正例、第二轮六项、上轮 B 系列、本文四个保留题和快照变更负例。

本审计没有修改六个受审文件，也不授权发布。当前应保持推荐发布关闭，直到新快照完成独立复测。
