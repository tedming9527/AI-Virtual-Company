---
audit_verdict: PASS
audit_scope: publish_gate
snapshot_sha256: sha256:23ed5a00d9c49077babfcff31dc2c7d296a012e839c97153dc4380a6c315272f
reviewer: independent-v5
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v5：Publish Gate 独立审计

## 结论

发布门禁通过。正式回归 32/32、空模板和隔离攻击集 33/33 均通过；合法 Jev 非空正例能够绑定两份当前快照审计报告；所列已测负例（关键与高风险标签、来源、时间和审计绕过）按当次报告被拒绝。33/33 隔离攻击集为当次历史报告声称，本次不可回放。（2026-09-24 审计修复）

此 PASS 只证明当前快照的本地发布门禁和标签边界按受测规则工作，不证明 Jev 或任何外部候选可靠、安全、无病毒、身份真实或适合生产。最终采用决定仍属于用户。

## 受审范围与快照

六文件逐项 SHA-256：

```text
8756933a798c110d7014cfda5911c2003624657b7f7ea14d625397f2ca611576  README.md
fc3528c6bb2a76cc14923b7e384b567a348745b54efb97eb76ccbec444171c0b  source-registry.json
a71a1e7b856b32edebaadfb567a28c73b29ae82dfe3e1dd9c3ae905370dbd2b5  schema.json
791fd1353b3f995d80a01c804d687ddef2d33e29679d7b1f0f1c01f93a4e84b3  collection-template.json
07376b2edf196fc81df07d2ff67ed0cff0098e30f5b46be742be615aa01ccde0  scripts/validate-radar.mjs
914b4b3f16110d7e7cbf01473a651015fa02094d8da866c22fd7351008edcbf4  tests/validate-radar.test.mjs
```

组合快照为 `sha256:23ed5a00d9c49077babfcff31dc2c7d296a012e839c97153dc4380a6c315272f`。报告之外的六个快照文件未被修改。

## 执行证据

```text
TZ=UTC node --test tests/validate-radar.test.mjs
  PASS 32/32

TZ=UTC node scripts/validate-radar.mjs collection-template.json
  PASS: 0 candidate(s); 0 source attempt(s)

TZ=UTC node --test /private/tmp/ai-radar-v5-signoff.Ri1zBR/radar/tests/independent-v5.test.mjs
  PASS 33/33
```

隔离正例包含完整双审计、10 个唯一来源与 Jev 多入口候选，validator 返回 PASS。负例均由合法基线单点变异，避免被缺 ledger、旧快照或通用错误遮蔽。

## 已验证的发布门禁

- 所有候选固定为 candidate、candidate visibility、hold、pending；pending 对象只能包含固定三字段，不能夹带 decided date 或 accepted 语义。
- collection、run、tool、source、discovery、signal、attempt、lead 和两个 audit 对象使用严格字段白名单；不能注入 `security_status` 或伪造 malware-free/reliability 标签。
- 三条固定 notice 必须完整且唯一：可靠性未确认、未做安全/病毒扫描、请打开来源自行判断。
- GitHub/npm 地址以 locator 逐字重建，拒绝查询、片段、尾段、默认端口、编码路径归一化和命名空间混淆。
- raw signal ID 必须来自 registry，数值类型受控，并绑定候选声明的同一 GitHub 仓库及精确 API 地址；stars 等整数不能写成安全字符串。
- GitHub 时间信号必须是严格 UTC ISO 往返值，不能使用无效日历日期，也不能晚于 observed date；observed date 必须等于候选 checked date。
- collected、attempted、discovered、checked、review 和审计日期均执行严格日历检查；checked/attempted 不得晚于 run 或当前日，review window 按 Asia/Shanghai 实际当前日判断，不能以未来 checked date 冻结过期。
- hosted model/API 的 release、docs、SDK、skill 四入口均被强制；GitHub/npm 并非唯一可发布实体类型。
- 两份审计必须分别为 discovery 与 publish_gate，collection 与报告 reviewer、scope、当前六文件快照完全一致。
- 审计 front matter 必须恰好五行、逐行严格匹配、键唯一；缺 audited date、视觉空白 reviewer、重复或额外 YAML 键、错误快照均被拒绝。

## 关键负例

已重放并拒绝：GitHub `%2e%2e` 归一化路径、未知 raw signal、安全字符串冒充 stars、未来或无效日期、错误/旧快照、缺审计日期、U+200B reviewer、audit 对象注入认证字段、front matter 夹带空白变体额外键、candidate 安全标签额外字段、pending 已接受语义、跨来源或零命中发现链、X 未连接伪装以及未来 last-push。

## 剩余风险与证据边界

本体系不联网确认外部页面归属，不安装或运行候选，不执行恶意软件扫描，也不评价候选的维护质量、供应链、许可证、隐私或生产稳定性。原始 stars、forks、归档状态和最近 Push 只是在指定时间从绑定地址记录的平台字段；它们不是可靠性、安全性、身份或无病毒认证。

发布方仍需在每次六文件变更后重新签发两份当前快照报告，并在每次 collection 中保留可复核 ledger、来源和用户判断状态。
