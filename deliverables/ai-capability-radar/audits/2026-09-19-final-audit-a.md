---
audit_verdict: FAIL
snapshot_sha256: sha256:e5572ea49e38e6b8cae2a10a49defbfba45e6d484909b1a3add4d18c1d3a49fb
reviewer: independent-a
audited_at: 2026-09-19
---

# AI 能力扩展雷达最终审计 A

## 结论

本轮结论为 **FAIL**。六文件快照与目标值一致，但发布门禁仍有两项高风险问题：合法的单一 PASS 报告无法通过正例；混合“首段 PASS、后续最终 FAIL”报告没有被唯一前置元数据规则真正识别，只是被前述全局误拒缺陷意外拦截。该状态既不能证明混合结论绕过已按设计关闭，也使任何当前推荐无法完成合法发布。

本审计只评估当前六文件体系；未修改 `README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。定向攻击夹具位于系统临时目录 `/private/tmp/ai-radar-final-a.dwMu4J/`，不属于正式实现。

## 固定快照与命令证据

受审文件顺序严格采用 README 规定的六文件顺序。独立使用系统 `shasum` 逐文件计算，再对六行清单计算 SHA-256：

```text
d5203429d520fe8026a86c0aaabaf9dade5259ce040875a4d22641156147aadd  README.md
1d1f1e2bbd7e49a7b8c00cb8a1b1966fb7ac6f4935354f3f2338337fc0bc518e  source-registry.json
53ef9dd422a3f8ef538d61fbd9ccf2dd0a2bf823866cbcbd73983998c7224cb4  schema.json
c5d45bd1c19e20ada8eb95bcf587bfc005bff064fc71ff18d42b3c5506ce0263  collection-template.json
9a82558a3bdcf331fbed7705379b595c05a15fc2a61c194d0d0e282f6e5bf1a3  scripts/validate-radar.mjs
6cc878f0c7824ace4a117dc588940897319ea30251fc6256f79d8f405ca05f76  tests/validate-radar.test.mjs
```

最终值为 `sha256:e5572ea49e38e6b8cae2a10a49defbfba45e6d484909b1a3add4d18c1d3a49fb`，与题定目标相同。

实际执行命令与结果：

```text
zsh scripts/check-company-bootstrap.sh
  PASS：公司基础完整性检查通过。

node --check scripts/validate-radar.mjs
node --check tests/validate-radar.test.mjs
  PASS：两份 JavaScript 可解析。

node -e '<解析 schema.json、source-registry.json、collection-template.json>'
  PASS：三份 JSON 可解析。

node scripts/validate-radar.mjs collection-template.json
  PASS：valid=true，tools=0，校验器报告的快照与独立计算一致。

node --test tests/validate-radar.test.mjs
  PASS：原有 12/12 测试通过。

node --test /private/tmp/ai-radar-final-a.dwMu4J/radar/tests/validate-radar.test.mjs
  FAIL：19 项中 18 项通过，唯一失败项是合法 PASS 报告正例；错误为
  “run.audit.ref snapshot does not match the current audited system snapshot”。

node /private/tmp/ai-radar-final-a.dwMu4J/probe-frontmatter.mjs
  结果：首个块被解析为 PASS；snapshot_sha256 未进入键映射；全文有 4 个 YAML
  分隔符，且首块之后确实存在 audit_verdict: FAIL。
```

## 正例与六项绕过复测

| 场景 | 夹具 | 实际结果 | 判定 |
|---|---|---|---|
| 正例：单一 PASS 报告 | 当前推荐记录；采集记录与审计报告均绑定临时副本的真实六文件快照；报告只有一个 PASS 前置块 | 被拒绝，报“报告快照不匹配” | **失败**。`^([a-z_]+)` 不接受键名 `snapshot_sha256` 中的数字，导致合法快照键永远不可读；发布正路径不可达。 |
| 1. 混合 PASS / 最终 FAIL | 报告首块为 PASS，后续另有最终 FAIL 块 | 完整校验器拒绝，但拒绝原因来自上述快照键解析缺陷 | **未按设计关闭，高风险**。解析器只匹配文首第一个块，不检查唯一块，也不读取后续最终 FAIL；若只修数字键解析，混合报告会被当成 PASS。意外全拒绝不是该绕过的有效防护。 |
| 2. 快照不绑定 | 分别令报告快照错误、采集记录快照错误 | 两种负例均退出 1；代码分别比较采集记录/报告与当前快照 | **关闭**。仍需先修正例，才能证明真实 PASS 路径可用。 |
| 3. X 借 primary ID 洗白 | X URL 借用 `vendor-docs-changelog`，并把 `x.com` 自填为官方域名 | 退出 1，命中 `discovery host` / `host is not allowed` | **关闭**。来源 ID、允许主机和 discovery host 三层检查一致。 |
| 4. 厂商主张指标/环境错配 | 生产可靠性主张使用仅验证安装、clean container 环境的独立证据 | 退出 1，命中 `claim-matched` | **关闭**。指标、单位、环境和工具版本要求精确匹配。 |
| 5. 未来日期 | `collected_at=2026-09-19`，证据日期改为 `2026-09-20` | 退出 1，命中 `future date` | **关闭于采集快照内部时序**。见下方边界：没有把采集日期与可信当前日期或审计日期绑定。 |
| 6. 无证据 risk verified | 推荐记录的 permissions 风险保持 `verified`，但清空证据引用 | 退出 1，命中 `requires evidence` | **关闭**。推荐记录要求每类风险有证据，并核对证据种类及 `covers_risks`。 |

## Schema、校验器与来源登记一致性

结构层面通过以下检查：

- `source-registry.json` 为版本 `2.0`，共 6 个来源 ID，全部唯一；当前条目均满足校验器要求的必填字段、非空入口/主机/查询、正整数周期，以及 disabled 来源必须为 `not_connected` 的约束。
- `collection-template.json` 的 `source_registry_version` 为 `2.0`，与来源登记一致；空集合是有效的待审模板，不会产生当前推荐。
- Schema、validator 和 registry 对 X discovery-only、primary/independent tier、官方域名、主张双向链接、风险证据和替代图的当前枚举基本一致；原有 12 个测试全部通过。

发现的不一致与缺口：

1. **高：审计快照键契约不可达。** Schema 和 README 都使用 `snapshot_sha256`，校验器前置元数据键正则却只允许小写字母与下划线，排除了数字。采集记录自己的快照值能通过，但报告中的同名字段永远无法被读出。
2. **高：唯一审计结论未强制。** README 要求唯一 YAML 前置元数据，校验器只读取文首第一个块；它没有拒绝第二个块、后续 `audit_verdict: FAIL` 或正文中的最终失败结论。
3. **高：审计归属没有三方绑定。** 报告内 `reviewer` 和 `audited_at` 未被要求或校验；报告 reviewer 不必等于 `run.audit.reviewer`。修复快照解析后，错误归属或未来审计日期仍可能通过。
4. **中：Schema 对 `run.audit.snapshot_sha256` 仅约束为 string/null，没有哈希 pattern；只有存在当前推荐时，语义校验才检查格式。非推荐集合可以保存 `status=passed` 加任意字符串，降低数据契约一致性。
5. **中：未来日期只相对 `run.collected_at` 检查。** 若采集日期本身被整体前移，当前实现没有可信时钟或审计日期交叉约束。此次要求的“证据晚于采集日”负例已关闭，但“整包未来时间线”仍是剩余风险。

## 证据边界

- **结构校验：** JavaScript/JSON 可解析、registry 当前结构完整、原有 12 项测试通过。
- **语义审查：** 发现前置元数据键正则与 README/Schema 契约矛盾，以及唯一结论、审计归属缺口。
- **Fixture 行为：** 在系统临时副本中完成一个合法推荐正例和六个负例；未修改正式实现。正例失败，五项定向负例命中对应错误，混合结论负例被非目标缺陷拦截。
- **真实项目效果：** 未执行网络采集、账号连接、定时任务、网站发布或生产数据验证；本报告不证明真实来源可用性、生产安全性或持续运行能力。

## 修复与复测要求

在下一版快照中至少需要：严格解析并要求恰好一个文首 YAML 块；显式要求四个前置字段且拒绝额外/重复/后续 verdict；让 `snapshot_sha256` 可解析并与当前快照相等；比较报告 reviewer 与采集记录 reviewer；校验 `audited_at` 为真实、非未来且与采集时序一致；增加一个必须成功的当前推荐正例，以及混合 PASS/最终 FAIL、缺字段、reviewer 不一致、整包未来时间线负例。修复后应生成新六文件快照重新独立审计，不能沿用本报告的 FAIL 结论作为通过证据。

