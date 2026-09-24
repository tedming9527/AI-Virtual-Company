---
audit_verdict: FAIL
snapshot_sha256: sha256:ae4738e1cf5a66c9087cbcd758396bdf85324d102130138ab6839d269b980355
reviewer: independent-a
audited_at: 2026-09-19
---

# AI 能力扩展雷达最终复审 A2

## 结论

本轮结论为 **FAIL**。整改已修复上一轮全部已知缺陷，合法 PASS 推荐正例成功，第二轮六项绕过也都在其余条件合法时由目标规则拒绝；但三个新增保留题仍能把不满足归属或证据语义的记录发布为当前推荐。其中项目归属冒充直接影响用户是否会安装可信项目，判为关键风险；主张与风险证据的“范围外”措辞绕过判为高风险。因此不满足“无关键/高风险发布绕过才可 PASS”的门槛。

本复审未修改六个受审文件。独立夹具位于系统临时目录 `/private/tmp/ai-radar-final-a2.myS9sg/`，仅复制受审目录并追加测试；正式目录只新增本报告。

## 快照核对

按规定顺序独立执行逐文件 `shasum -a 256`，得到：

```text
552ee92d489f19dc18988e58d068276da9d82bba523fbf018bf6cfed6961467d  README.md
1d1f1e2bbd7e49a7b8c00cb8a1b1966fb7ac6f4935354f3f2338337fc0bc518e  source-registry.json
aab89dcf64bad4c509925731c1a771778a53a593c1fb8a9c8c7802b35916c8d5  schema.json
c5d45bd1c19e20ada8eb95bcf587bfc005bff064fc71ff18d42b3c5506ce0263  collection-template.json
eae07ce817e935820a9c5eb53ca1ad14b3590ce98e672565cfccb2021c7f404b  scripts/validate-radar.mjs
ec1c92640172a2e472e6e8371ac045a1879344cd6a5b80472505f910a7dc6d56  tests/validate-radar.test.mjs
```

六行清单的总哈希为 `sha256:ae4738e1cf5a66c9087cbcd758396bdf85324d102130138ab6839d269b980355`，与预期一致。`node scripts/validate-radar.mjs collection-template.json` 返回 `valid=true`，并报告相同系统快照。

## 命令与正负例

```text
node --check scripts/validate-radar.mjs
node --check tests/validate-radar.test.mjs
  PASS

node -e '<解析 schema、registry、template 并核对版本和 source ID>'
  PASS：registry/template 均为 2.0；6 个来源 ID 全部唯一。

node --test tests/validate-radar.test.mjs
  PASS：正式套件 18/18。

TZ=America/Los_Angeles node --test tests/validate-radar.test.mjs
  PASS：18/18；宿主进程时区变化不影响结果。

TZ=UTC node --test /private/tmp/ai-radar-final-a2.myS9sg/radar/tests/validate-radar.test.mjs
  PASS：去遮蔽矩阵 31/31。

TZ=UTC node --test --test-name-pattern='A2 previous finding' <临时测试文件>
  PASS：缺少必需审计字段和额外字段均被目标性拒绝，2/2。

TZ=UTC node --test --test-name-pattern='A2 holdout' <临时测试文件>
  FAIL：三个保留题均预期拒绝但实际返回 valid=true；3/3 绕过被复现。
```

时区边界证据：同一时刻 `TZ=UTC date` 为 `2026-09-18 17:23:27 UTC`，校验器使用的 `Asia/Shanghai` 日历值为 `2026-09-19`。说明当前日期不是从宿主 UTC/本地日期误取。

## 上轮发现复核

| 上轮发现 | 正例或负例 | 实际结果 | 复审判定 |
|---|---|---|---|
| 合法 PASS 推荐路径不可达 | 单一前置元数据、当前快照、同一 reviewer、当日审计 | `valid=true`，当前推荐数为 1 | **已修复** |
| 快照键含数字无法解析 | 同上正例，同时核对 schema 哈希 pattern | 正例成功；格式错误即使没有推荐也被 schema 拒绝 | **已修复** |
| 多个结论块/最终 FAIL 未拒绝 | 首块合法 PASS，正文追加第二结构化 FAIL；其他条件全合法 | 仅命中 second structured verdict 规则，无快照或通用审计错误 | **已修复** |
| reviewer 未绑定 | 单一合法块，仅报告 reviewer 与采集记录不同 | 仅命中 reviewer mismatch | **已修复** |
| 审计字段不完整或额外字段 | 分别缺少审计日期、增加额外字段 | 分别命中 missing 与 unexpected 字段错误 | **已修复** |
| 整包未来时间线 | run、工具、发现和生命周期全部置于 2099 年 | 命中 run collection date future；在 UTC 宿主进程下同样拒绝 | **已修复，Asia/Shanghai 生效** |
| 采集快照哈希缺少 schema pattern | 非推荐空集合携带非法哈希字符串 | schema 层命中 invalid format | **已修复** |

## 第二轮六项绕过去遮蔽复测

每个推荐负例都先使用已成功的合法 PASS 报告、正确快照和一致 reviewer，再只改变攻击变量；断言输出不含通用审计缺失或快照错误。

| 绕过 | 单变量攻击 | 目标性结果 | 判定 |
|---|---|---|---|
| 混合 PASS / 最终 FAIL | 追加第二结构化失败结论 | 命中 second structured verdict | **关闭** |
| 快照不绑定 | 分别污染采集记录快照、报告快照 | 分别命中对应 snapshot mismatch | **关闭** |
| X 借 primary ID 洗白 | X URL 借 vendor primary ID 并自填官方域 | 命中 discovery host / host not allowed | **关闭** |
| 厂商主张指标/环境错配 | 生产可靠性主张引用 installation / clean container 证据 | 命中 claim-matched | **关闭** |
| 未来日期 | 证据日期晚于采集日一天 | 命中 future date | **关闭** |
| 无证据 risk verified | permissions 保持 verified 但清空引用 | 命中 requires evidence | **关闭** |

上述结果不是全局错误遮蔽：同一临时套件中的合法推荐正例先返回 `valid=true`；每项负例均断言不存在通用审计缺失、当前快照不匹配或报告不存在错误。

## 新增关键与高风险发现

### A2-01 · 关键 · GitHub 命名空间不能证明所声明厂商归属

保留题把 `canonical_url` 改为 `github.com/unrelated-user/openai-tool`，把 publisher 自填为 `OpenAI`，并让三份证据的 publisher 字符串同步自填为 `OpenAI`。URL、版本、风险、审计与快照均满足当前结构规则。校验器返回 `valid=true`，把该条目计为当前推荐。

当前规则只证明“URL 位于 GitHub、证据 URL 位于同一自填仓库、多个自填字符串相等”，没有证明 GitHub owner 与所声明厂商存在真实归属关系。攻击者可把仿冒仓库包装成知名厂商官方项目，直接影响安装与信任决策。

### A2-02 · 高 · 风险证据的自由文本否定检测可同义绕过

保留题保持 permissions/data 为 verified 且保留风险覆盖标签，只把 limitations 写成“Permissions and data handling remain outside the scope of this document.”。该句明确说明权限和数据处理不在证据范围内，但不命中当前否定词正则；校验器返回 `valid=true`。

这说明“标签声明覆盖”仍能覆盖语义上明确未覆盖的证据。继续扩充否定词表无法可靠封闭自然语言同义表达。

### A2-03 · 高 · 厂商主张支持标签可覆盖同义的范围外声明

保留题为生产可靠性主张提供版本、指标、单位、环境完全匹配的独立证据记录，assessment 自填 supports，但 limitations 明确写成“Production reliability remained outside the scope of this evaluation.”，result 仅描述安装成功。当前否定词正则未命中，校验器返回 `valid=true`。

因此精确字段匹配只能证明自填元数据一致，不能证明证据实际测量了该指标；范围外措辞可把“安装成功”洗成“生产可靠性被支持”。

## 修复与复测要求

1. 项目归属不能由 `publisher.name` 与 evidence publisher 的同源自填字符串证明。应引入不可由候选记录自行声明的归属依据，例如受治理的 GitHub owner 映射、已核验组织身份登记，或独立审计中可定位的官方反向链接；发布门禁必须把仓库 owner 与归属证据绑定。
2. 不要继续用自由文本否定词表承担主张和风险覆盖的安全判定。把“是否实际测量该 claim”“是否实际覆盖某 risk”建模为结构化、可审计的结论，并要求证据方法/结果与该结论有明确关系；自然语言 limitations 仍由独立评审核对，不应让自填 supports/verified 标签单独决定发布。
3. 新快照应加入三个保留题作为回归，并保留本轮合法正例和去遮蔽六项矩阵。修复后重新生成六文件快照并进行独立复审；本报告的 FAIL 不得作为发布 PASS 证据。

## 证据边界与剩余风险

- **结构检查：** 正式 18/18、JSON/JavaScript 解析、schema/registry/template 版本和来源 ID 一致性均通过。
- **语义审查：** 上轮契约缺陷已修复，但归属证明与自然语言证据语义仍有关键/高风险空洞。
- **Fixture 行为：** 去遮蔽 31/31；新增三个保留题均被实际接受，构成可复现发布绕过。
- **真实项目效果：** 未访问网络、GitHub API、账号、网站发布或生产系统；未证明来源在线可用、远端内容哈希真实或实际安装安全。临时副本是工作范围隔离，不是操作系统强沙箱。

