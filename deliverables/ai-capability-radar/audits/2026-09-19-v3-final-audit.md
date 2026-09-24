---
audit_verdict: FAIL
snapshot_sha256: sha256:807eae037c2cea2942ab0eec1fe705fe95d32a2bb0e33c980915be74ec668bee
reviewer: independent-v3
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v3 最终独立复审

## 结论

本轮结论为 **FAIL**。正式套件 21/21 通过；V3-R1/R2/R3/R4 的既有回归、V3-A-01/02/03、合法 pending/current、非空审计、上海当前日过期和完整 malware scan 正例都按目标门禁工作，且单因素复测确认不是被通用审计错误遮蔽。

但独立保留题仍发现两类高风险展示绕过：GitHub 与 npm source endpoint 只按路径前缀匹配，任意后缀仍可被当作规范来源；npm canonical 工具的 `current` 可由同名包旧版本的 provenance 解锁。隔离套件 40 项中 37 项通过、3 项失败，三个失败均是校验器错误地返回 `valid=true`，因此不满足“无关键/高风险展示绕过才 PASS”的门槛。

本报告只评价标签边界、结构契约和当前本地门禁，不证明任何外部项目、仓库、npm 包、工件或扫描报告真实、可靠、安全、无漏洞或无恶意代码；最终采用判断仍由用户作出。

## 范围、快照与不变性

受审六文件保持只读：`README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。独立夹具只写入 `/private/tmp/ai-radar-v3-final.JpPiCZ/`；正式目录只新增本报告。

逐文件 SHA-256：

```text
4b2d897f8d77c3adf502758918e1614e5301fa3131026fb4a45ab9b464bdf4d7  README.md
5e918fa7ffd0386cd24068d5fa9252e18591252bf26c38b332394aa9e2453a07  source-registry.json
12c377a94c672411bde2692460d717e0272f1834ea7c28b52fadd1374201b0d7  schema.json
7e126f2f7d6f7213a7971faff5e55f24e93f4f316d9e72b4500194b2615c03b5  collection-template.json
99833f35fd1bb495f7361b66ebec866b3321bd3bf8162ea50a150d35e8fd0388  scripts/validate-radar.mjs
c2735919bb20e32c6f2226bed2773ee95713e2a18c2f8a947ac748054935634b  tests/validate-radar.test.mjs
```

六行清单总哈希为 `sha256:807eae037c2cea2942ab0eec1fe705fe95d32a2bb0e33c980915be74ec668bee`，与预期一致；空模板校验输出同一快照。`source-registry.json` 有 18 个 signal definition 与 18 个 contract，一一对应、无缺失或未知项；registry 与 template 版本均为 `3.0`。

## 命令与结果

```text
for f in README.md source-registry.json schema.json collection-template.json scripts/validate-radar.mjs tests/validate-radar.test.mjs; do
  shasum -a 256 "$f"
done | awk '{print $1 "  " $2}' | shasum -a 256
  807eae037c2cea2942ab0eec1fe705fe95d32a2bb0e33c980915be74ec668bee

TZ=UTC node scripts/validate-radar.mjs collection-template.json
  PASS：valid=true；system_snapshot_sha256 与上值一致。

node --test tests/validate-radar.test.mjs
  PASS：21/21。

TZ=UTC node --test tests/independent-final.test.mjs
  FAIL：40 项中 37 项通过、3 项失败；失败夹具均收到 valid=true，快照仍为预期值。
```

独立测试在 `TZ=UTC` 下运行，过期负例仍命中 `current Asia/Shanghai date`，证明结果由校验器的 `Asia/Shanghai` 当前日计算，而非进程本地 UTC 日期偶然触发。

## 指定整改复测

以下负例全部使用存在、快照匹配、前置元数据合法的当前 PASS 审计。除专门测试非空审计的夹具外，独立断言输出不得包含 `non-empty collections require` 或 `run.audit`，所以目标拒绝不是由通用审计错误遮蔽。

| 目标 | 单因素夹具 | 目标性结果 | 判定 |
|---|---|---|---|
| V3-R1：GitHub endpoint 规范路径 | unrelated repo + query 中含目标 repo；相似 repo `current-tool-evil` | 均命中 GitHub repository/version binding | **既有绕过已关闭** |
| V3-R2：npm source 精确 package | scoped `@scope/pkg` 使用 `%40scope%2Fpkg` 正例；source 改为 `%40scope%2Fpkg-evil` | 正例 valid；相似包命中 package/version/source binding | **既有绕过已关闭** |
| V3-R3：仅肯定 provenance 解锁 current | `unavailable/null`、`observed/false` | 均命中 canonical GitHub/npm current gate | **既有绕过已关闭** |
| V3-R4：malware 绑定工件 | locator、version、hash 分别单独错配 | 分别命中 tool-version 或 declared-artifact/hash gate | **已关闭** |
| Malware 完整正例 | declared artifact + locator/version/SHA-256 完全一致 + scanner/version/report + passed/`no_detection` | `valid=true` | **通过** |
| V3-A-01 | X canonical + 无关但 observed/true 的 npm provenance | 命中 current gate | **已关闭** |
| V3-A-02 | 正确数值 + 错来源；正确来源 + 自由文本“无病毒”分开测试 | 分别只命中 source contract、value contract | **已关闭** |
| V3-A-03 | 正确 npm package/version/source + 非负整数正例；错来源和自由文本分开测试 | 正例 valid；负例分别命中 source/value contract | **已关闭** |
| 合法 pending/current | GitHub current/hold；scoped npm current/hold | 均 `valid=true`、`current_hold=1` | **通过** |
| 非空审计 | 非空集合改为 pending audit | 命中 non-empty audit gate | **通过** |
| 上海当前日过期 | `next_review_at=2026-09-18`，进程 `TZ=UTC` | 命中 Asia/Shanghai expiry | **通过** |

## 高风险发现

### V3-F-01 · endpoint 绑定使用前缀而非允许路径精确匹配

GitHub 保留题只把 stars 的 source URL 改为：

```text
https://api.github.com/repos/example/current-tool/evil
```

subject locator、subject version、signal value 与审计其余字段全部合法。校验器返回 `valid=true`。根因是 `scripts/validate-radar.mjs` 第 51–52 行只比较路径前三段或前两段，不限制剩余段；因此任意后缀都被当作目标仓库的规范 endpoint。

scoped npm 保留题同样把已声明 `@scope/pkg@1.0.0` 的 provenance source 改为：

```text
https://registry.npmjs.org/%40scope%2Fpkg/evil
```

校验器仍返回 `valid=true`、`current_hold=1`。第 72–73 行的 `startsWith` 只保证包名前缀，既未限定 endpoint 形状，也未把后缀版本与 `subject_version` 对齐。

影响：本地门禁可接受不存在、不同语义或不同版本的 source endpoint，并展示为已绑定的 stars/provenance 等信号。固定的 `does_not_prove` 提示不能修复信号来源本身错误。此项为高风险展示绕过。

### V3-F-02 · 旧版本 provenance 可解锁新版本 npm current

保留题使用 canonical `https://www.npmjs.com/package/@scope/pkg`，工具显示版本 `2.0.0`，但 package ref 与 provenance subject 都是 `@scope/pkg@1.0.0`；provenance 为 `observed/true` 且 source 指向该包。校验器返回 `valid=true`、`current_hold=1`。

根因是第 216–217 行只要求 signal 与任一 package ref 相符，而 package ref 没有绑定当前工具版本；第 237 行解锁 current 时只比较 canonical 包名、state 与 value，不比较 `signal.subject_version === tool.version.value`。

影响：历史版本甚至依赖项式声明可替当前展示版本满足 provenance 门禁。由于 npm provenance 是按发布工件/版本解释的信号，这会把旧版本的肯定状态错误外推到新版本，属于高风险 current 展示绕过。

## 修复与再验收门槛

1. 为每个 signal definition 建立允许的 endpoint 规范，而不是 owner/package 前缀：GitHub repository metadata、releases 等按定义精确列出路径形状；拒绝未声明尾段、query/fragment 参与身份匹配。
2. npm 路径先按 scoped package 规则规范化，再解析 package 与可选版本。若 URL 含版本段，必须等于 `subject_version`；不允许任意尾段。downloads API 也应校验固定 endpoint、period 与包位置。
3. canonical npm 工具用于解锁 current 的 provenance 必须同时满足：subject package 等于 canonical package、subject version 等于当前 `tool.version.value`、对应 package ref 同版本、state 为 `observed`、value 为 `true`。
4. 把本轮三个失败夹具加入正式回归，同时保留 V3-R1/R2/R3/R4、A01/A02/A03、完整 malware、合法 scoped npm、非空审计和上海日期正负例。

## 证据边界与剩余风险

- **结构层：** 六文件快照一致；正式套件 21/21；18 个 definition 与 contract 一一对应。
- **语义层：** 指定旧绕过已关闭，但 endpoint 精确性与 npm 当前版本绑定仍 fail-open。
- **隔离 fixture 层：** 37/40；三个失败均为预期拒绝却实际接受，不是审计、schema 或其他全局错误。
- **真实效果层：** 未联网请求 GitHub/npm/OpenSSF，未验证扫描报告内容，未安装或运行任何外部工件，也未验证前端是否完整呈现 `does_not_prove`。即使未来本地门禁全绿，也只能证明本地结构和标签边界，不能证明外部项目安全、可靠、无病毒或适合生产。
