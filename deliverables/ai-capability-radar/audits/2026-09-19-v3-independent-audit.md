---
audit_verdict: FAIL
snapshot_sha256: sha256:8e432b6cb15f399981c88d6e39e7001ce8c73541e3e9dd38f12d1ad8c8f44c2c
reviewer: independent-v3
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v3 独立质量与供应链审计

## 结论

本轮结论为 **FAIL**。v3 已正确把最终采用决定交还用户，合法的 pending/hold 卡片和 dated user decision 正例都可工作；审计绑定、上海时区过期、固定标签定义和恶意代码扫描证明字段也有实质改善。但三个携带当前 PASS 审计的保留题仍返回 `valid=true`：无关 npm provenance 可把 X 线索提升为 current，OpenSSF 记录可自填“无恶意代码认证”，npm audit 可借 GitHub 来源并自填“无漏洞/无恶意代码”。这些是记录层信号与工具、来源及允许值未绑定造成的高风险展示绕过，因此不能判 PASS。

本结论只评价 v3 数据契约和本地校验器是否守住陈述边界，不证明任何项目可靠、安全、无漏洞或无恶意代码。用户仍保留最终判断权。

## 范围、快照与不变性

受审范围仅为 `README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。六文件保持只读；系统临时目录 `/private/tmp/ai-radar-v3-audit.RQWdmM/` 仅保存复制件和独立夹具。正式目录只新增本报告。

逐文件独立执行 `shasum -a 256`：

```text
4b2d897f8d77c3adf502758918e1614e5301fa3131026fb4a45ab9b464bdf4d7  README.md
cd25a4cbe1d17b94630d4a6521f7ca9308e20218d32c3d05c3c80abba953f342  source-registry.json
5049e0362d07e639e8d986aa94aa70cc62c035a82a292a81dd84ba31353cbeb6  schema.json
7e126f2f7d6f7213a7971faff5e55f24e93f4f316d9e72b4500194b2615c03b5  collection-template.json
d0477693834b862cf88ac40b320882d380c8abda5fd2672ecde5781041f8a89b  scripts/validate-radar.mjs
dca75540deddcc444e22edb212cf679266fb011267afea41d4d520c0ddd21ec0  tests/validate-radar.test.mjs
```

六行清单总哈希为 `sha256:8e432b6cb15f399981c88d6e39e7001ce8c73541e3e9dd38f12d1ad8c8f44c2c`，与预期一致。校验空模板时返回相同快照。

## 命令与证据

```text
node --check scripts/validate-radar.mjs
node --check tests/validate-radar.test.mjs
  PASS

node -e '<解析 schema、registry、template>'
  PASS：JSON 可解析；registry 版本 3.0；18 个信号定义全部唯一且必需字段非空。

node scripts/validate-radar.mjs collection-template.json
  PASS：空模板 valid=true；系统快照与独立值一致。

node --test tests/validate-radar.test.mjs
  PASS：正式套件 13/13。

TZ=UTC node --test /private/tmp/ai-radar-v3-audit.RQWdmM/radar/tests/validate-radar.test.mjs
  FAIL：独立套件 22 项中 19 项通过、3 项保留题失败；三项失败均因校验器实际接受了预期应拒绝的记录。
```

时区证据：同一时刻宿主 `TZ=UTC` 日期为 `2026-09-18`，校验器显式 `Asia/Shanghai` 日期为 `2026-09-19`。旧 run 夹具在该 UTC 进程下仍被当前上海日期判定过期。

## 七项重点验证

| 门禁 | 正例/负例 | 实际结果 | 判定 |
|---|---|---|---|
| 1. 任意非空集合绑定当前 PASS 审计 | 非空 candidate 使用 pending audit；合法 pending/current 使用当前 PASS 审计 | 前者命中 non-empty audit gate；后者成功 | **通过** |
| 2. 固定信号定义及不可覆盖 | registry 18 个定义均含 `proves` 与 `does_not_prove`；记录追加同名字段 | 定义唯一且非空；记录额外字段被 schema 拒绝 | **结构通过、语义绑定失败**：见 V3-A-01/02/03 |
| 3. pending/hold 默认，recommended 仅限 dated user decision | audited pending/hold 正例；完整风险和证据后设置 accepted + 真实日期；移除日期负例 | pending/hold 成功；dated accepted 推荐成功；缺日期推荐被拒绝 | **通过** |
| 4. 过期按 Asia/Shanghai 实际当前日 | run、证据和观察均固定在 2026-09-10，next review 为 2026-09-17，宿主进程 TZ=UTC | 仅命中 current Asia/Shanghai expiry；没有审计日或内部未来时间遮蔽 | **通过** |
| 5. malware passed/failed 绑定证明 | 完整 scanner/version/artifact SHA/report 正例；仅缺 artifact hash 负例；not_run 携带证明负例 | 完整记录成功；缺任一必需证明和 not_run 假证明均拒绝；passed/failed 共用同一门禁分支 | **结构通过**；报告真实性与工件内容未联网验证 |
| 6. X 仅线索不能提升 current | 无 identity/provenance 的 X 直接提升；另加无关 npm provenance 的保留题 | 直接提升被拒绝；无关 provenance 使其 `valid=true` 且进入 current_hold | **失败，高风险** |
| 7. 独立保留题 | 旧 run 过期；OpenSSF 假安全标签；npm audit 错源及无恶意代码主张；无关 provenance | 旧 run 被拒绝；其余三项被接受 | **失败，高风险** |

## 已正确固定的陈述边界

registry 中关键固定定义明确写出：

- stars 不证明代码质量、可靠性、安全性、身份或适用性；
- npm provenance 不保证没有恶意代码；
- OpenSSF Scorecard 可能误报或漏报，不等于无漏洞、无恶意代码或生产安全；
- npm audit 不覆盖全部漏洞、项目自身缺陷、未知漏洞或通用恶意代码检测；
- malware scan 不覆盖其他版本、运行时下载、供应链后续变化、漏报或未知行为。

schema 也禁止采集记录新增或覆盖这些定义字段。这些是有效改进，但下述漏洞允许记录通过 `definition_id + source_id + state + value` 组合写出与固定边界冲突的内容；“页面同时显示免责声明”不能把冲突的结构化值变成正确事实。

## 高风险发现

### V3-A-01 · 无关 provenance 可提升 X 线索

夹具保留 X 帖子为 canonical URL 和 discovery 来源，将状态改为 verified/current/hold，再附加一个来自 `registry.npmjs.org/unrelated-package` 的 npm provenance 信号。该信号与 X 线索、项目名称、版本和任何证据都无关联，但校验器只检查“信号 ID 存在、source host 在该 source 允许列表中”，随后把它当作身份/来源充分条件。结果为 `valid=true`、`current_hold=1`。

影响：X 仍可借任意无关包的 provenance 从 candidate 越级到 current。虽然 recommendation 仍为 hold，用户看到的生命周期和当前分区已被错误提升，违反“X 仅线索”的边界。

### V3-A-02 · OpenSSF 信号可自填假安全认证

夹具使用正确 OpenSSF source 和 API host，但把 state 写为 passed、value 写为 `MALWARE-FREE CERTIFIED`。validator 未限制 OpenSSF 的允许 state/value 结构，返回 `valid=true`。

影响：记录本身把 Scorecard 误写为无恶意代码认证，正是固定定义明确禁止的含义。最终判断权归用户不能抵消输入数据已被错误标注。

### V3-A-03 · npm audit 可错用 GitHub 来源并声称无恶意代码

夹具把 npm audit 的 source 指向 `github-official-repos`、URL 指向 GitHub API，并把 value 写为 `No vulnerabilities and certified malware-free`。当前实现没有“定义 ID → 允许 source ID/host → 允许 state/value schema”的绑定，因此返回 `valid=true`。

影响：既没有 npm audit 报告，也把漏洞公告检查扩大成无恶意代码证明；来源与语义均被洗白。

## 根因与修复门槛

根因不是固定定义文本缺失，而是定义没有声明并强制以下契约：

1. 每个 signal definition 的允许 source ID、适用 artifact/tool identity、允许 state 与 value schema；
2. provenance、namespace、npm audit、OpenSSF、malware scan 与当前工具 canonical URL、包名、版本或 artifact hash 的对应关系；
3. 禁止自由文本 value 承载“可靠、生产安全、无漏洞、无恶意代码、认证”等超出固定定义的结论。

下一版至少应把允许来源和 value 类型/结构移入 registry 定义并由 validator 执行；身份/provenance 信号必须绑定同一项目和版本；安全类信号使用受控字段而不是自由文本结论；加入本报告三个失败保留题和旧 run 正例。不能仅依赖页面免责声明或再加关键词黑名单。

## 证据边界与剩余风险

- **结构检查：** 正式 13/13、JSON/JavaScript 解析、registry 定义完整性和快照一致性通过。
- **语义审查：** 用户判断边界文本正确，但信号与来源、工具及允许值未绑定。
- **Fixture 行为：** 19 个正负例通过；3 个高风险保留题被实际接受并返回 current/valid 结果。
- **真实项目效果：** 未联网核验 GitHub/npm/OpenSSF/扫描报告，未安装软件、未运行真实扫描、未发布网站。本报告不证明任何远端项目或扫描结果真实、安全或适用。

