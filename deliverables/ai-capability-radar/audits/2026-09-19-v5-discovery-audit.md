---
audit_verdict: PASS
audit_scope: discovery
snapshot_sha256: sha256:23ed5a00d9c49077babfcff31dc2c7d296a012e839c97153dc4380a6c315272f
reviewer: independent-v5
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v5：Discovery Coverage 独立审计

## 结论

发现覆盖门禁通过。本轮对当前六文件快照执行正式回归、空模板校验和完整隔离攻击集；合法 Jev 非空正例成功，发现覆盖相关负例均由对应门禁拒绝，未发现关键或高风险绕过。

此结论证明本地体系能够约束一次 discovery run 的覆盖证据与候选映射，不证明某次未来运行真的查询了外部来源，不证明所有互联网实体均已发现，也不证明任何候选可靠、安全或适合生产。

## 受审范围与快照

受审文件仅为：

```text
README.md
source-registry.json
schema.json
collection-template.json
scripts/validate-radar.mjs
tests/validate-radar.test.mjs
```

独立逐文件哈希：

```text
8756933a798c110d7014cfda5911c2003624657b7f7ea14d625397f2ca611576  README.md
fc3528c6bb2a76cc14923b7e384b567a348745b54efb97eb76ccbec444171c0b  source-registry.json
a71a1e7b856b32edebaadfb567a28c73b29ae82dfe3e1dd9c3ae905370dbd2b5  schema.json
791fd1353b3f995d80a01c804d687ddef2d33e29679d7b1f0f1c01f93a4e84b3  collection-template.json
07376b2edf196fc81df07d2ff67ed0cff0098e30f5b46be742be615aa01ccde0  scripts/validate-radar.mjs
914b4b3f16110d7e7cbf01473a651015fa02094d8da866c22fd7351008edcbf4  tests/validate-radar.test.mjs
```

组合快照为 `sha256:23ed5a00d9c49077babfcff31dc2c7d296a012e839c97153dc4380a6c315272f`。

六个受审文件未被本审计修改。隔离夹具与 discovery ledger 均位于 `/private/tmp/ai-radar-v5-signoff.Ri1zBR/radar` 或系统临时目录。

## 执行证据

```text
TZ=UTC node --test tests/validate-radar.test.mjs
  PASS 32/32

TZ=UTC node scripts/validate-radar.mjs collection-template.json
  PASS: 0 candidate(s); 0 source attempt(s)

TZ=UTC node --test /private/tmp/ai-radar-v5-signoff.Ri1zBR/radar/tests/independent-v5.test.mjs
  PASS 33/33
```

合法正例是一个 `hosted_model_api` 类型的 Jev 形态实体，具备 official release、docs、SDK、skill 四类入口，绑定用户点名线索、10 个唯一来源、至少 5 个 family、非空扩词、可复算漏斗、candidate/hold/pending 状态和双审计当前快照；该正例真实通过 validator，而非仅做静态 schema 检查。

## 已验证的发现门禁

- registry 固定为 20 个入口，覆盖多样 family；实际 coverage 按唯一 `source_id` 计数，重复来源不能凑足 10 个来源。
- `coverage.families` 必须与实际来源 family 精确一致；非空 run 必须有非空扩词。
- attempt 状态只允许 succeeded、unavailable、failed；X 未连接时只能 unavailable 或 failed，不能伪装成功或连接。
- attempt 日期不得晚于 run 或 Asia/Shanghai 当前日；未知字段被拒绝。
- 每个 lead 必须有唯一、规范的 `entity_key`、受控 priority 和受控 decision；omitted 必须给出非空原因，同一实体不能同时 eligible 与 omitted。
- 用户点名 lead 不能静默消失；eligible lead 与 candidate 通过 `entity_key` 双向精确映射。
- 漏斗必须从账本精确复算并满足 raw hits、deduped、eligible、candidate、published 单调关系；0 hit 不能生长出候选。
- candidate 必须至少有一个 discovery 入口；入口必须为 HTTPS、priority 受控，并绑定本轮 succeeded 且 `raw_hit_count > 0` 的 source attempt。
- X 记录为 unavailable 时，候选不能反向声称由 X 发现。
- hosted model/API 强制关联 release、docs、SDK、skill；因此 Jev 形态实体不会再因只支持 GitHub/npm 而结构性漏收。

## 负例与目标拒绝

隔离集逐项确认以下输入被目标门禁拒绝：5 个来源重复成 10 行、family 数虚报、缺扩词、未知 decision、无 omission reason、Jev eligible 被无关候选替换、缺 entity key、空 discovered list、未来 attempt、0-hit discovery source、非法 discovery URL/priority、X succeeded/connected、同实体冲突决定、Jev 缺 SDK/skill、0-hit 漏斗增长以及错误审计快照。

所有负例都在合法非空基线可通过的前提下单点变异，因此拒绝不是由通用快照错误、缺 ledger 或另一个无关错误遮蔽。

## 剩余边界

本门禁验证的是 collection 与 ledger 的结构、关系和声明一致性。它不执行外部搜索、不验证来源返回内容是否真实、不评价漏斗分母是否覆盖整个互联网，也不把用户点名、社区热度或 GitHub/npm 信号升级为可靠性结论。真实 discovery 运行仍需保留可检查的查询记录和人工判断。
