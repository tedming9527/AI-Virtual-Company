---
audit_verdict: PASS
snapshot_sha256: sha256:f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8
reviewer: independent-v4
audited_at: 2026-09-19
---

# AI 能力扩展雷达 v4 最终独立复审

## 结论

本轮结论为 **PASS**。正式回归 46/46 通过；在隔离副本中加入 reviewer Unicode 控制/格式字符、纯组合符、emoji-only、URL IDNA/百分号编码、非规范 UTC、快照错配与 provenance 提升等保留题后，扩展套件 72/72 通过。首审和上轮复审发现的发布阻断项均已目标性关闭，未发现新的关键或高风险 fail-open 路径。

PASS 只证明当前六文件对“规范化 GitHub/npm 来源直达、GitHub 原始平台信号、固定 candidate/hold/pending、用户自行判断、时效和审计绑定”边界执行正确；不证明任何候选项目、仓库或 npm 包可靠、安全、无漏洞、无病毒、属于某现实品牌或适合生产。

## 范围、快照与不变性

范围仅为六个快照文件，复审期间保持只读：`README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。独立夹具只写入 `/private/tmp/ai-radar-v4-final-review.ODR3m2/`；正式目录仅覆盖本报告。

逐文件 SHA-256：

```text
06a34cc508d09b9307128e05cf2d471844068ccab47314db496fa57ae33abe16  README.md
8ed55f954e101dda06ce00e5cade0cdb8d85e4d68f6d35bbbd5aa3a820b3a75d  source-registry.json
22c8368a9fd1f4b97d7206e4f59f663969a07b9cc0d92a9396f49c6ffaaacb59  schema.json
cdab239ddbaf018d2c05e1f8c88da4933c52e73246e6c73446e8906d6cbd9ba1  collection-template.json
7f372ff63c27b8ed625260324cf090fcba8a576e99f60b92f84fe1f12ae2b603  scripts/validate-radar.mjs
ff205c5a1ffd4b4058b60d8e835159f04e18e8683501a2e6cf140aadc101d9dd  tests/validate-radar.test.mjs
```

六行清单总哈希为 `sha256:f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8`，与校验器输出一致。source registry 的四个 raw signal definition 与 schema enum 一一对应；三条固定 notice 与 schema enum 一一对应，均无缺失或未知项。

## 命令与结果

```text
for f in README.md source-registry.json schema.json collection-template.json scripts/validate-radar.mjs tests/validate-radar.test.mjs; do
  shasum -a 256 "$f"
done | awk '{print $1 "  " $2}' | shasum -a 256
  f411b5b61626d951beaf181bf26a68828f0efa1dcc16346102dc7df07620d3d8

TZ=UTC node --test tests/validate-radar.test.mjs
  PASS：46/46。

TZ=UTC node scripts/validate-radar.mjs collection-template.json
  PASS：0 candidates；输出当前快照。

TZ=UTC node --test tests/independent-final.test.mjs
  PASS：72/72；其中 26 项为独立补充或加强的保留题。
```

`TZ=UTC` 用于排除宿主时区偶然性；实际过期判断仍明确命中 Asia/Shanghai 当前日规则。

## 关键发布边界复测

所有负例除专门的审计测试外，都使用存在、PASS、reviewer 匹配、日期合法且快照正确的报告，因此目标拒绝不是通用审计错误遮蔽。

| 边界 | 正例或攻击 | 结果 |
|---|---|---|
| 固定用户判断状态 | 合法 candidate/candidate/hold/pending；尝试 current/recommended | 正例通过；提升被 schema 常量拒绝 |
| npm provenance 禁用 | 添加 provenance 属性、raw signal、旧版本提升 | additional-properties、enum 与状态常量共同拒绝 |
| GitHub 来源 URL | 规范 owner/repo；尾段、尾随 `/`、空/非空 query/hash、443、反斜杠、点段 | 正例通过；所有非逐字规范原串拒绝 |
| npm 来源 URL | unscoped/scoped 正例；尾段、query/hash、443、点段 | 正例通过；所有非逐字规范原串拒绝 |
| GitHub API 绑定 | 同仓库精确 endpoint；跨仓库、尾段、query/hash、443、点段 | 正例通过；负例命中 exact endpoint gate |
| 原始信号日 | 所有 signal 等于 `tool.checked_at`；单项改为前一日 | 正例通过；错日拒绝 |
| GitHub UTC 时间 | 合法 `YYYY-MM-DDTHH:mm:ssZ`；宽松日期、无时区、无效日历、24:00、offset、超长小数 | 正例通过；非规范值拒绝 |
| reviewer | 可见 ASCII/CJK 字母与数字；普通空白、U+200B/U+2060、Cc/Zl/Zp、纯组合符、emoji-only、零宽夹带 | 可见正例通过；所有不可归属或控制字符负例拒绝 |
| 过期 | 旧 collection 搭配已过 `next_review_at`，进程 TZ=UTC | 命中 Asia/Shanghai 实际当前日过期门禁 |
| 审计快照 | 当前快照；另一合法 SHA-256 | 当前值通过；错配 fail-closed |
| 固定提示 | 三条精确 notice；缺项或重复 | 正例通过；缺项/重复拒绝 |

## 新增独立保留题

### reviewer 编码与空白

以下 reviewer 被拒绝：

- ASCII Cc 控制字符夹带可见字母；
- U+2028 LINE SEPARATOR 与 U+2029 PARAGRAPH SEPARATOR；
- 仅 U+0301 组合符、仅 emoji；
- U+200B 与 U+2060 包裹可见中文姓名。

`Independent-审计者 4` 正例通过，证明规则不是靠全局拒绝 reviewer 取得绿灯。semantic validator 要求至少一个 Unicode letter/number，并拒绝 Cc/Cf/Zl/Zp；collection 与报告仍需精确相等。

### URL 原串与编码

GitHub、npm 与 API 分别复测了：

```text
HTTPS://GITHUB.COM/example/tool
https://github。com/example/tool
https://github.com/%65xample/tool
https://github.com/example/%74ool
https://github.com/example/tool%3Ftab=readme

https://www。npmjs.com/package/pkg
https://www.npmjs.com/package/%70kg
https://www.npmjs.com/package/%40scope/pkg
https://www.npmjs.com/package/@scope/%70kg

HTTPS://API.GITHUB.COM/repos/example/tool
https://api.github。com/repos/example/tool
https://api.github.com/repos/%65xample/tool
https://api.github.com/repos/example/%74ool
```

全部命中各自 exact canonical gate。重建后的允许字符串与输入逐字比较，避免 WHATWG URL 解析器先规范化造成别名放行。

### 时间、provenance 与审计

- 小写 `z`、`+00:00`、`24:00:00Z`、四位小数秒均被 UTC 格式门禁拒绝；
- provenance raw signal 与 automatic promotion 同时出现时，分别命中 enum 与 candidate/hold 门禁；
- collection 使用错误快照时，即使格式、报告和 reviewer 其余字段合法，仍命中当前快照门禁。

## 证据边界与剩余风险

- **结构与本地语义：** 六文件快照一致；正式 46/46、独立扩展 72/72；registry/schema 固定集合一致。
- **真实来源：** 未联网确认 GitHub/npm 地址实际存在，未请求真实 GitHub API，未验证数值真实性。
- **运行与安全：** 未安装或运行候选代码，未做恶意代码、漏洞、权限或数据处理评估。
- **展示层：** 未审计网站是否始终完整显示三条 notice，也未验证点击跳转、缓存或前端转义行为。
- stars、forks、archived、last push 与包页面存在均不是可靠性、安全性、发布者身份或生产适用性证明；最终判断始终属于用户。
