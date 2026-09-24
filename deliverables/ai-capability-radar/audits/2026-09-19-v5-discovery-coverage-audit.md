---
audit_verdict: FAIL
snapshot_sha256: sha256:f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8
reviewer: independent-discovery-v5
audited_at: 2026-09-19
---

# AI 能力扩展雷达：发现覆盖体系独立审计

## 结论

本轮结论为 **FAIL**。现有 v4 对其自述的窄范围职责——规范化 GitHub/npm 来源、同仓库 GitHub 原始信号、固定 candidate/hold/pending、时效和审计绑定——仍然有效：正式回归 46/46，首轮 collection 校验通过，网站也正确显示“可靠性未确认”和“未做安全/病毒扫描”。

但用户新增的发现覆盖验收没有建立：登记源只有 4 个，真正启用且可执行的 discovery-tier 源只有 Hacker News 1 个；首轮实际发现渠道只有 GitHub 1 种，3/3 候选均为 GitHub repository。schema 只允许 `github_repository` 与 `npm_package`，且每个候选只有单一 `source`，无法表达 hosted model/API、Agent Skill、MCP、desktop app、protocol，也无法让 Jev 以官方发布页、docs、SDK、skills 多入口形成一个候选实体。体系中没有用户点名优先、热点扩词、漏收原因、发现量→候选→发布漏斗或覆盖率数据。

因此现有 46/46 与旧 PASS 只能证明窄范围发布门禁，没有证据支持“先覆盖约 10–20 个多样源头、宽进严出、再收敛”，也不能证明发现完整性或 Jev 不会被漏收。

## 审计范围与证据

只读检查：

- 六个体系快照文件：`README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`；
- 首轮 collection：`collections/2026-09-19.json`；
- 当前网站发布数据：`/private/tmp/ted-ai-signal-radar/app/page.tsx`；
- 旧 v4 PASS 报告：`audits/2026-09-19-v4-independent-audit.md`。

本次未修改上述文件；仅新增本报告，并在 `/private/tmp/ai-radar-v5-discovery-schema-audit.mjs` 创建隔离的结构性拒绝夹具。

六文件快照为：

```text
sha256:f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8
```

范围外但受审的数据文件哈希：

```text
2b024bda3c44ef8d16a98f026911b806071e1a707728f03e7642f1e843bd6e7f  collections/2026-09-19.json
c49d008323f612e8e76aa3523cbe6df66871da622cb4733ffb9a9c184426578d  /private/tmp/ted-ai-signal-radar/app/page.tsx
```

## 命令与结果

```text
TZ=UTC node --test tests/validate-radar.test.mjs
  PASS：46/46。

TZ=UTC node scripts/validate-radar.mjs collections/2026-09-19.json
  PASS：3 source-link candidates；快照一致。

TZ=UTC node --test /private/tmp/ai-radar-v5-discovery-schema-audit.mjs
  PASS：9/9 结构性拒绝夹具均证实当前 schema 无法表达新验收对象和覆盖元数据。

rg -n -i '\bjev\b' <六文件> collections/2026-09-19.json /private/tmp/ted-ai-signal-radar/app/page.tsx
  0 个命中。

rg -n -i '<priority / expansion / omission / funnel / coverage 关键词>' <同上>
  未发现对应数据字段或流程定义；仅命中普通文本中的 expansion/snapshot 等非覆盖语义。
```

## 一、发现源数量与多样性：阻断

`source-registry.json` 第 12–17 行只有 4 个 source：

| 类别 | 登记数 | enabled | 可执行状态 | 实际首轮使用 |
|---|---:|---:|---|---|
| source address：GitHub、npm | 2 | 2 | `manual_available` | 仅 GitHub |
| discovery：X、Hacker News | 2 | 1 | X 为 `not_connected`；HN 为 `manual_available` | 均未出现在首轮 `discovered_via` |

关键计数：

```text
registered_sources = 4
enabled_sources = 3
registered_discovery_sources = 2
enabled_executable_discovery_sources = 1  # hacker-news
collection_candidates = 3
actual_source_kinds = [github_repository]
actual_discovery_source_ids = [github-repository]
```

GitHub/npm 是回溯后的来源地址，不等于多样发现入口。即使把二者也计入，启用源总数仍只有 3，远低于约 10–20；按 discovery tier 计只有 1。README 第 11 行虽然写“X、Hacker News、官方 Registry 等”，但第 25、87 行承认 X 未连接、无后台调度；首轮 collection 又只记录直接 GitHub 来源，所以没有一次“宽进”执行证据。

**阻断项 V5-D-01：** 在首轮 discovery run 中实际查询并留痕约 10–20 个多样源头；仅把名称写进 registry 不算覆盖，必须记录执行状态、查询时间、查询主题与返回量。

## 二、实体与来源 schema：阻断

`schema.json` 第 27–35 行的 tool 只有单一 `source`；第 29 行把 `source.kind` 固定为：

```text
github_repository | npm_package
```

没有独立 `entity_type`，也没有 `sources[]`/entrypoint role。隔离夹具逐个尝试下列 kind，全部命中 schema enum 拒绝：

```text
hosted_model_api
agent_skill
mcp
desktop_app
protocol
```

向候选添加多入口 `official_sources`（release/docs/SDK/skills）同样因 `additionalProperties: false` 被拒绝；把 `vendor-docs` 用作 `discovered_via.source_id` 也被第 24–25 行的四值 enum 拒绝。

文本 `capability_hypothesis` 可以写“Agent Skill”或“SDK”，但这不是可查询、可去重、可统计的实体建模。当前体系只能把某个 SDK 的 GitHub/npm 片段当候选，不能保存其与 hosted service、docs、skills 或桌面产品的同一实体关系。

**阻断项 V5-D-02：** 将“实体类型”与“来源入口角色”分开。实体至少覆盖 hosted model/API、agent skill、MCP、desktop app、protocol 及现有 repo/package；一个实体允许多个规范来源，并标注 official release、docs、SDK、skills、repo、package 等 role。

## 三、优先级、扩词、漏收与漏斗：阻断

六文件、首轮 collection 与网站均没有以下机器可读字段或等价记录：

- 用户点名候选与优先级；
- 从热点/已发现实体扩出的关键词、同义词与相关类别；
- 线索去重、资格筛选、漏收/排除原因；
- 每个源的发现量；
- `发现 → 去重 → 可核验 → candidate → published` 各阶段计数；
- 源覆盖率、实体类型覆盖率或用户点名命中率。

隔离夹具添加 `priority_reason`、`expansion_terms`、`omission_reason`、`discovered_count`、`candidate_count`、`published_count`、`source_coverage` 时，全部因 `additionalProperties: false` 被拒绝。换言之，当前不仅没有数据，契约还禁止保存验收所需数据。

首轮 collection 直接从 3 个 GitHub 项目开始，没有 lead pool 或 exclusion log，无法回答“发现了多少、为什么只留下这三个、漏掉了谁”。

**阻断项 V5-D-03：** 建立独立 discovery run/lead ledger，保留用户点名、扩词、每源查询、原始命中、去重、筛选结论和原因；由它生成可复算漏斗与覆盖率，而不是从已发布的 3 张卡反推。

## 四、Jev 可收录性：阻断

在六文件、首轮 collection 与网站发布数据中，`Jev` 精确匹配为 0。更重要的是，即使下一轮人工发现 Jev，当前 schema 仍无法把用户描述的 hosted model/API + official release/docs/SDK/skills 作为一个候选实体：

1. hosted model/API 不是允许的 `source.kind`；
2. tool 只有单一 source，不能同时保存发布页、docs、SDK 和 skills；
3. `discovered_via` 没有 vendor docs、model catalog、skill registry 等来源 ID；
4. 没有 entity identity/alias/parent-child 字段把 SDK、skills 与 hosted service 关联；
5. 网站卡片只接受 `repo`、stars、forks、pushedAt 的硬编码形态。

Jev 若碰巧存在 GitHub repo 或 npm package，当前系统最多收录一个孤立技术入口，仍不能证明它已经覆盖用户点名的 Jev 实体与多入口。没有 GitHub/npm 的 hosted service 会在 README 第 25 行“找不到规范化仓库/包地址不进入发布数据”的规则下必然漏收。

**阻断项 V5-D-04：** 添加 Jev 作为用户点名优先的验收夹具，要求其以一个 entity 关联官方发布页/docs/SDK/skills 多入口，保持 candidate/hold/pending，并明确每个入口的事实边界；具体官方 URL 和身份仍需另行核验，本审计不替代该外部核验。

## 五、首轮发布与网站：窄门禁通过，发现覆盖失败

首轮 collection 有 3 个候选：Jianying Headless、Browser Use、Stagehand；三者 source kind 均为 GitHub，`discovered_via` 也都写 `github-repository`。能力场景虽有视频、浏览器、SDK 文本差异，但来源类型与发现路径没有多样性。

网站 `page.tsx` 第 10–14 行硬编码同 3 项；第 32 行显示“03 候选项目”和“独立体系审计已通过”，第 35–37 行正确显示待判断、可靠性未确认、安全扫描未做和 GitHub/npm 采集边界。collection 与网站的名称、stars、forks、Push（UTC 转上海时间）一致，这是已通过项。

但网站没有展示“本轮查询了哪些发现源、发现/去重/排除/发布数量、覆盖率、用户点名是否命中或漏收原因”，也没有 Jev。其“审计已通过”只对应 v4 窄门禁；在新验收语境下不能解释为发现覆盖审计通过。

## 六、46/46 与旧 PASS 的证据边界

正式 46 项测试覆盖 canonical URL、同仓库 API、状态常量、provenance 禁用、notice、过期、reviewer 与 UTC 时间。没有一项测试断言：

- discovery source 数量达到 10–20；
- 多样源实际执行；
- 非 GitHub/npm 实体可表示；
- 用户点名、扩词、漏收原因或漏斗存在；
- Jev 可被收录。

旧 v4 报告第 12–14 行明确把 PASS 限定为 GitHub/npm 来源直达和本地门禁；README 第 76 行也明确体系审计不证明候选可靠或安全。该旧 PASS 本身没有越界，但不能被复用为“发现完整性 PASS”。当前 validator 对只有 3 个 GitHub 候选的首轮 collection 返回 PASS，正说明 coverage 不是其验收对象。

## 已通过项

- 六文件快照可复算，正式测试 46/46；
- 首轮 collection 的 3 个条目均为 candidate/candidate/hold/pending，当前日期和审计绑定有效；
- GitHub source 与 API signal 绑定、原始数值类型和三条用户提示通过；
- 网站没有把 stars/forks/最近 push 写成可靠或安全认证；
- X 明确标为 disabled + not_connected，没有把未连接渠道伪装成已执行；
- collection 与网站当前 3 项数据一致。

这些通过项应保留，但它们属于“严出”和安全标签边界，不补足“宽进”的发现覆盖。

## 最低再验收条件

1. registry 中建立约 10–20 个多样发现源，并至少完成一轮可追溯执行；按 discovery、official source、registry/catalog 等角色区分，不能用 GitHub/npm 两个落地点充当全部发现覆盖。
2. schema 支持 entity type 与多入口 sources，至少覆盖 hosted_model_api、agent_skill、mcp、desktop_app、protocol，并保留现有 GitHub/npm 入口。
3. 建立用户点名优先、热点扩词、漏收/排除原因和逐阶段漏斗；覆盖率的分母、分子和去重规则必须明确。
4. 用 Jev 做非 GitHub/npm 主实体的正例验收；用无 repo/package 的 hosted service 做保留题，确保不会因来源类型被静默丢弃。
5. 将 discovery coverage 审计与现有 publish-gate 审计分开报告。两者都通过前，网站不得用未限定的“体系审计已通过”暗示发现完整性。

## 证据边界

本审计是本地结构、数据与流程证据审计；未联网核验 Jev 的官方身份或具体 URL，也未评价候选可靠性、安全性或生产适用性。结论只说明当前体系尚不能证明发现覆盖完整，并存在结构性漏收非 GitHub/npm 实体的风险。
