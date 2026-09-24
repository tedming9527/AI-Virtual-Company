---
audit_verdict: FAIL
snapshot_sha256: sha256:cafcca9ccd22f5b63d129ee57dfc5ef883bdce763bcf11b32ff9d26e60c7f7b1
reviewer: independent-v3
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v3 第一轮整改独立复审

## 结论

本轮结论为 **FAIL**。第一轮整改已目标性关闭上一报告的 V3-A-01/02/03：无关 npm provenance 不能再把 X 线索提升 current；OpenSSF 只能使用受控来源、状态和数值；npm audit 必须使用 npm 来源、声明 package/version，且值为非负整数或空。合法 pending/current、非空审计绑定、上海当前日过期和 malware scan 证明正负例也都按预期工作，没有被通用错误遮蔽。

但是四个全新保留题仍被校验器接受并进入 `current_hold`：GitHub 信号可用无关仓库 URL 的查询串包含目标 owner/repo 来伪造绑定；npm 信号的 source URL 可指向另一个包；provenance 为 `unavailable/null` 仍能解锁 npm current；malware scan 的 subject locator 可指向无关工件。它们均属于高风险展示绕过，所以不满足 PASS 门槛。

本报告只评价结构契约和本地校验行为，不证明任何项目、包、工件或扫描报告可靠、安全、无漏洞或无恶意代码。最终采用判断仍由用户作出。

## 范围、快照与不变性

受审六文件保持只读：`README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。独立夹具只写入系统临时目录 `/private/tmp/ai-radar-v3-reaudit.DsW7Vc/`；正式目录只新增本报告。

逐文件独立哈希：

```text
4b2d897f8d77c3adf502758918e1614e5301fa3131026fb4a45ab9b464bdf4d7  README.md
5e918fa7ffd0386cd24068d5fa9252e18591252bf26c38b332394aa9e2453a07  source-registry.json
b6a7b9b0b98acf9eb8768bef106766287ed2e16d974a4db567d38ba28950c138  schema.json
7e126f2f7d6f7213a7971faff5e55f24e93f4f316d9e72b4500194b2615c03b5  collection-template.json
a82a722f9245d1a6bd799696716cff35c6313e31653bf82feda0b79f7cae3939  scripts/validate-radar.mjs
7d757c23419773bb871283438520b8c53f19c2f414017405c0fe473b666c58e6  tests/validate-radar.test.mjs
```

六行清单总哈希为 `sha256:cafcca9ccd22f5b63d129ee57dfc5ef883bdce763bcf11b32ff9d26e60c7f7b1`，与预期一致；空模板校验器输出同一快照。

## 命令与证据

```text
node --check scripts/validate-radar.mjs
node --check tests/validate-radar.test.mjs
node -e '<解析 schema、registry、template>'
  PASS

node -e '<核对 definition 与 signal_contract 一一对应>'
  PASS：18 个定义、18 个 contract；无缺失、无未知 contract。

node scripts/validate-radar.mjs collection-template.json
  PASS：空模板 valid=true；快照一致。

node --test tests/validate-radar.test.mjs
  PASS：正式套件 16/16。

TZ=UTC node --test /private/tmp/ai-radar-v3-reaudit.DsW7Vc/radar/tests/validate-radar.test.mjs
  FAIL：独立套件 29 项中 25 项通过、4 个新增保留题失败；失败原因均为校验器返回 valid=true，而非夹具或通用审计错误。
```

时区证据：同一时刻宿主 UTC 日期为 `2026-09-18`，校验器的 `Asia/Shanghai` 日期为 `2026-09-19`。旧 run 夹具在 UTC 进程下仍仅命中上海当前日过期规则。

## 第一轮整改目标复测

所有负例均使用合法当前 PASS 审计；夹具明确断言输出不含非空审计缺失、快照不匹配、报告不存在或前置元数据缺失错误。

| 目标 | 单变量复测 | 目标性结果 | 判定 |
|---|---|---|---|
| V3-A-01：无关 npm provenance 提升 X | X canonical URL + 已声明但无关的 package/provenance，尝试 verified/current/hold | 命中 canonical GitHub/npm current gate | **已关闭** |
| V3-A-02：OpenSSF 假无病毒标签 | 正确 OpenSSF source、subject 和 observed state，仅把 value 改为自由文本认证 | 命中 value contract | **已关闭** |
| V3-A-03：npm audit 错源和越界结论 | GitHub source、未声明 package、自由文本“无漏洞/无恶意代码” | 命中 source、package binding、value contract | **已关闭** |
| 合法 pending/current | GitHub canonical、同仓库/版本 signals、pending + hold、当前审计 | `valid=true`、`current_hold=1` | **通过** |
| 非空审计绑定 | 非空 candidate 使用 pending audit | 命中 non-empty audit gate | **通过** |
| 实际当前日过期 | run/证据/观察固定 2026-09-10，next review 2026-09-17，宿主 TZ=UTC | 仅命中 current Asia/Shanghai expiry | **通过** |
| Malware 完整证明 | passed + `no_detection` + scanner/version + SHA-256 + report URL | `valid=true` | **通过** |
| Malware 缺报告 | 其余字段合法，仅 report URL 为空 | 仅命中 proof requirement | **通过** |
| Malware state/value 错配 | passed + `detections_found`，证明字段完整 | 仅命中 controlled result disagreement | **通过** |

## 新增高风险发现

### V3-R1 · GitHub subject URL 使用子串包含而非规范路径相等

保留题保持 signal 的 subject locator 和版本与当前工具一致，但把 stars 来源改为：

```text
https://api.github.com/repos/unrelated/other?note=example/current-tool
```

该 URL 主体是无关仓库，仅查询串含目标 owner/repo。当前实现对完整 URL 使用字符串 `includes`，因此返回 `valid=true` 并接受该 stars 信号。

影响：攻击者可把无关仓库的 stars、forks、watchers、维护和 OpenSSF 类数据归到目标工具；固定“不证明可靠性”提示仍无法纠正数值主体本身错误。

### V3-R2 · npm source URL 未绑定已声明 package

保留题声明 package `example-tool@1.0.0`，subject locator/version 也写该包，但把 provenance source URL 改为 `registry.npmjs.org/unrelated-package`。host 合法、package ref 形式合法，校验器返回 `valid=true`。

影响：任意 npm 包的 provenance、downloads、audit、latest/deprecated 或签名结果可被归到另一个已声明包。

### V3-R3 · 不可用 provenance 仍解锁 npm current

保留题使用规范 npm canonical URL、正确 package ref 和 subject，但 provenance state 为 `unavailable`、value 为 null。所有字段符合当前 signal contract，current gate 仅检查 signal ID 存在，仍返回 `valid=true`、`current_hold=1`。

影响：没有取得 provenance 的记录会因“存在一条不可用记录”而被视作满足 current 身份/来源门槛。应要求肯定结果，而非仅存在 ID。

### V3-R4 · Malware scan 未绑定已声明工件

保留题提供合法 passed/`no_detection`、scanner/version、SHA-256、report URL 和当前工具版本，但把 subject locator 指向 `https://malicious.example/unrelated.tgz`。artifact contract 只比较版本字符串，不检查 locator 或 hash 是否属于当前工具的已声明工件；校验器返回 `valid=true`。

影响：扫描另一个工件即可给当前工具显示扫描通过。精确 SHA-256 字段存在，但没有“当前工具的哪个已声明工件”的可验证关联。

## 根因与修复门槛

1. GitHub source URL 应解析 URL 后按允许 endpoint 精确匹配 owner/repo 路径；不能对完整 URL（含 query/fragment）做子串检查。
2. npm source URL 必须解析并规范化包名，含 scoped package 编码规则，然后与 package ref 的 name/version 精确对应；registry URL 同样需要与 name 一致。
3. npm current 门禁应要求 provenance 的 subject 与 canonical package 相同，且 state 为 observed、value 为 true；`not_observed`、`unavailable` 或 false 只能作为展示负信号，不能解锁 current。
4. 为工具增加显式 artifact 清单（稳定 ID、locator、version、SHA-256）；malware scan 必须引用同一清单项，且 scan artifact hash 与清单 hash 相等。仅比较工具版本不足以证明工件归属。
5. 将四个保留题加入正式回归，并保留本轮 A01/02/03、合法 pending/current、旧 run 和 malware 正负例。

## 证据边界

- **结构检查：** 正式 16/16、JSON/JavaScript 解析、18 个定义与 18 个 contract 一一对应、快照一致。
- **语义审查：** 已知三项整改真实生效；新缺口集中在 endpoint 规范化、肯定/否定状态和 artifact identity。
- **Fixture 行为：** 25 项通过；4 个高风险保留题实际返回 valid/current_hold。
- **真实项目效果：** 未联网核验 GitHub/npm/OpenSSF/扫描报告，未安装工件、未发布网站。本报告不证明外部信号或扫描结果真实、安全或适用。

