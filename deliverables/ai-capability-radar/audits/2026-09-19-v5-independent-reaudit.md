---
audit_verdict: FAIL
audit_scope: discovery_and_publish_gate
snapshot_sha256: sha256:021b3a1b70812d53da09321ac213d850ed41a17db346a25ae4b9b3ff22070408
reviewer: independent-v5
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v5 独立复审

## 结论

本轮分别判定：

- **discovery coverage：FAIL**
- **publish gate：FAIL**

20 个登记入口、来源 family、实体类型和多入口模型已经落入文档与 registry；但运行门禁仍可把重复的 5 个 source 当作 10 次来源覆盖，且没有把扩词、覆盖 family、用户点名实体、候选实体、漏收决定、X 执行状态与漏斗阶段可靠地绑定。上轮 V5-D-01、V5-D-03、V5-D-04 未关闭；V5-D-02 只完成结构表达，未形成由 schema/validator 共同执行的契约。

发布门禁另有独立阻断：当前解析器无法读取合法键名 `snapshot_sha256`，所以任何非空合法 collection 都不能通过双审计；临时只修复这一解析字符类后，又有规范 URL、原始信号定义和值类型、用户决定、审计字段和日历日期等负例被接受。因而不能签发两份 PASS 报告。

## 范围与快照

只审计以下六文件，未修改它们：

```text
README.md
source-registry.json
schema.json
collection-template.json
scripts/validate-radar.mjs
tests/validate-radar.test.mjs
```

独立逐文件 SHA-256 清单：

```text
8756933a798c110d7014cfda5911c2003624657b7f7ea14d625397f2ca611576  README.md
fc3528c6bb2a76cc14923b7e384b567a348745b54efb97eb76ccbec444171c0b  source-registry.json
1933d11fff7c763f4ebbac4ab900a89da6309038dd3bf7cdb79a152686102e03  schema.json
791fd1353b3f995d80a01c804d687ddef2d33e29679d7b1f0f1c01f93a4e84b3  collection-template.json
e637213a76cc726fa6fa136ecb84b3ec54525f64beeb0f7c313327d1764d952b  scripts/validate-radar.mjs
6f0954acbc8f6bea1ea693ab330a95a298565b682207068b2f1caf155de631c9  tests/validate-radar.test.mjs
```

按实现中的 manifest 算法得到：

```text
sha256:021b3a1b70812d53da09321ac213d850ed41a17db346a25ae4b9b3ff22070408
```

## 命令与总结果

```text
TZ=UTC node --test tests/validate-radar.test.mjs
  PASS：15/15。

TZ=UTC node scripts/validate-radar.mjs collection-template.json
  PASS：0 candidate；0 source attempt；快照一致。

TZ=UTC node --test tests/independent-v5.test.mjs
  原始六文件副本：4/17；合法 Jev 非空正例被统一的 audit snapshot mismatch 拒绝。

# 仅在 /private/tmp 副本把 front-matter key 正则由 [a-z_] 改为 [a-z0-9_]，
# 用于去除全局遮蔽，不代表对受审实现的修复。
TZ=UTC node --test tests/independent-v5.test.mjs
  垫片后：3/17；合法 Jev 正例及两个目标负控通过，14 个应拒绝负例被错误接受。
```

独立夹具位于 `/private/tmp/ai-radar-v5-reaudit.4aD62D/radar/tests/independent-v5.test.mjs`。所有 ledger、audit 和 collection 夹具均写在临时副本或系统临时目录；未改受审六文件。

## 已通过项

1. registry 登记 20 个入口，满足 10–20 的静态数量范围，并覆盖至少 5 个 family；X 明确为 `not_connected`。
2. entity type 已包含 `hosted_model_api`、`agent_skill`、`mcp`、`desktop_app`、`protocol`、SDK、repository 与 npm；source role 已包含 release、docs、repo、SDK、skill、package、registry 和 community。
3. 在只去除 front matter 解析遮蔽的临时副本中，一个 Jev 形态的 `hosted_model_api` 正例可关联 official release、docs、SDK、skills，并以 10 个唯一来源、5 个以上 family、candidate/hold/pending 和双审计通过。
4. X attempt 被直接标成 `succeeded` 会由目标错误 `unconnected X cannot succeed` 拒绝；collection 内审计快照被改成错误哈希也会由目标快照错误拒绝。
5. 固定 candidate/hold/pending 与三条 notice 的基本检查仍存在。

这些通过项只说明静态模型与少量门禁已存在，不足以抵消下列可复现缺口。

## Discovery coverage 发现

### V5-D-01 未关闭：10 个来源可由 5 个来源重复伪装

validator 第 40–42 行按 attempt 行数计算 `attempted.length`，不按唯一 `source_id` 计数。夹具把 5 个不同来源各复制一次，形成 10 行并保持 5 个 family；结果为：

```text
PASS: 1 candidate(s); 10 source attempt(s)
```

同一逻辑没有拒绝重复 source attempt。第 51 行也不核对 `coverage.families`，把该值改为 0 后仍 PASS。registry 的 20 个入口是计划分母，不能替代实际执行的唯一来源覆盖。

### V5-D-02 部分完成但未闭环：schema 没有进入验证路径

实体类型和多入口 source role 已能表达 Jev 正例，这是本轮真实进展。但 validator 没有读取或执行 `schema.json`；其手写检查也不等价于 schema。因此契约定义与发布行为可以分叉。独立负例证实，schema 枚举禁止的 raw signal 定义和值类型仍能通过 validator。

### V5-D-03 未关闭：扩词、漏收决定和漏斗可伪造

- 从非空 run 删除 `expansion_terms`，仍 PASS。
- 增加 `decision: "rejected"` 且不写 omission reason，仍 PASS；实现只对字符串恰为 `omitted` 的 lead 要求理由，也未限制 decision 枚举。
- 把全部成功来源的 `raw_hit_count` 改为 0，同时保留一个 deduped/eligible/candidate/published 实体，漏斗仍被视为“可复算”并 PASS。实现只做等值重算，不校验阶段单调性或“实体必须来自命中”的关系。
- `coverage.families` 与实际 attempt family 不绑定。

所以“扩词、漏收原因、发现量到发布漏斗及覆盖率”虽有字段或文档说明，尚不能作为可信审计证据。

### V5-D-04 未关闭：用户点名/Jev 没有与候选绑定

ledger 中保留 `entity_key: jev`、`priority: user_nominated`、`decision: eligible`，却把唯一候选的 id/name 改成无关实体；validator 仍 PASS。工具没有强制 `entity_key`，账本 eligible/nominated lead 也不与 candidate 对应，因此 Jev 可在账本中“合格”但从候选静默消失。

### X 未连接仍可伪装为候选发现来源

ledger 正确记录 `x-public-signals` 为 `unavailable`，但候选 `discovered_via` 声称来自 X；validator 只检查 source ID 存在和日期，不核对该 source 的 attempt 状态，结果仍 PASS。当前门禁只阻止 X attempt 自称 succeeded，未阻止候选借用未执行的 X 来源。

## Publish gate 发现

### P5-01：双审计合法正例永久被拒，且字段检查仍不完整

`parseHeader` 在 validator 第 67 行只接受 `[a-z_]+` 键名，无法解析带数字的 `snapshot_sha256`。因此格式完全符合 README 的两份当前快照 PASS 报告仍得到：

```text
FAIL (2)
- discovery audit snapshot mismatch
- publish_gate audit snapshot mismatch
```

这是非空 collection 的确定性发布阻断。仅在临时副本修正该字符类后，以下负例又被接受：

- 两份审计报告都缺少 `audited_at`；
- collection 与报告 reviewer 都是只有 U+200B 的视觉空白值。

也就是说“双审计快照绑定”目前既无法接受真实正例，修正解析后也还缺少日期与 reviewer 的强约束。

### P5-02：规范 GitHub URL 存在解析归一化绕过

加入：

```text
url: https://github.com/evil/%2e%2e/example/tool
locator: example/tool
```

WHATWG URL 解析把路径归一化成 `/example/tool`；validator 没有把解析后规范 URL 与输入逐字重建比较，夹具仍 PASS。攻击者可用看似跨命名空间的原始字符串得到另一个 locator，破坏“来源直达”的展示边界。

### P5-03：raw signal 定义和值类型可伪造安全标签

对同仓库 API 绑定保持正确时，下列两个负例都 PASS：

```text
definition_id: malware-free-certified
value: safe
```

以及：

```text
definition_id: github-stars
value: MALWARE-FREE
```

实现只校验 source/evidence 同仓库与日期，不校验 `definition_id` 是否在 registry、也不校验对应 `value_type`。这直接允许把未授权安全结论写入 raw signals，属于高风险展示绕过。

### P5-04：pending 用户决定可携带已接受语义

`user_decision.status` 保持 `pending`，同时写入 `decided_at: 2026-09-19` 与 `note: accepted`，validator 仍 PASS。状态常量不足以保证“最终由用户判断”的语义一致性。

### P5-05：无效日历日期可通过

空 run 的 `collected_at` 改为 `2026-02-30` 仍 PASS。日期函数只用 `Date.parse` 检查可解析性，而 JavaScript 会把该日期归一化到三月；没有日历往返验证。该缺口同样影响 ledger、discovered、checked/review 日期函数的可信度。

## 为什么正式 15/15 不能支持本轮 PASS

正式测试包含大量字符串/结构存在性断言，但没有执行一个带真实双审计报告的合法非空正例，因此没有发现 `snapshot_sha256` 解析死锁。其 Jev 测试只证明对象在静态结构上可表达，未证明 ledger 中的 Jev 与发布候选相同；funnel、X、source count 等测试也没有覆盖上述关系型绕过。15/15 是当前测试文件通过，不是两个审计范围都可靠的证据。

## 最小整改与再验收

### Discovery coverage

1. attempt coverage 按唯一 `source_id` 计数，明确同源多 query 的计数规则；拒绝用重复行满足 minimum，并把 `coverage.families` 与实际唯一 family 精确绑定。
2. 非空 run 强制非空 `expansion_terms`；给 lead decision 建立受控枚举，所有非 eligible 结果都必须有非空 omission reason。
3. 给 candidate 建立不可歧义的 `entity_key`，强制每个 eligible/user-nominated lead 映射到 candidate，或记录明确遗漏；加入“Jev eligible 但候选被替换”的回归。
4. `discovered_via.source_id` 必须引用同轮 ledger 中实际 succeeded 的 attempt；`not_connected`/unavailable X 不得出现在候选发现来源中。
5. 除等值重算外，强制 `raw_hits >= deduped >= eligible >= candidates >= published`，并建立 raw hit/lead/candidate 的关系证据。

### Publish gate

1. 修正 front matter key 解析并新增完整非空正例；严格要求唯一 front matter、准确 scope、当前快照、`audited_at`、非空且无控制/格式字符的 reviewer，并让错误报告由目标门禁拒绝。
2. 实际执行 `schema.json`，或把 schema 中全部约束等价地纳入 validator；建立 schema-validator 一致性测试。
3. 对 GitHub/npm 来源按 locator 逐字重建唯一规范 URL，再与原输入完全相等比较，覆盖 `%2e%2e`、反斜杠、默认端口、查询、片段和多余尾段。
4. raw signal 的 definition ID 必须属于 registry，值必须匹配 definition 的受控类型；继续绑定同仓库精确 API 与 checked_at。
5. 对 `user_decision` 建立完整对象契约：pending 时不得带 decided_at 或 accepted/rejected 语义。
6. 所有 YYYY-MM-DD 做严格日历往返，并用 Asia/Shanghai 实际当前日判断过期。

完成以上修复后，应先证明合法 Jev 非空正例真正通过，再逐一证明每个负例由其目标错误拒绝，而不是由另一项通用错误遮蔽。

## 证据边界

本报告只审计本地六文件的发现覆盖和发布门禁行为，不核验外部来源内容，不证明 Jev 或任何候选的身份、可靠性、安全性、无病毒状态或生产适用性。FAIL 表示当前体系尚不能可靠执行其自述边界；不代表任何外部候选本身不安全。
