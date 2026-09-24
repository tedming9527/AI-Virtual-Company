# AI 能力扩展雷达 · 宽进严出版

版本：5.0 · 2026-09-19  
Owner：辛澈 · AI工程师；质量顾问：顾清妍 · 质量测试工程师

## 两套互不替代的门禁

本体系先做“发现覆盖”，再做“发布门禁”。发现审计回答是否真正查询了足够多样的入口、有没有静默漏掉用户点名对象；发布审计只回答候选数据、来源地址、状态和提示是否满足约束。两项都 PASS，非空 collection 才能发布。任何 PASS 都不证明候选可靠、安全或适合生产。

## 宽进：20 个初始入口

`source-registry.json` 登记 20 个入口，覆盖用户点名、社交信号、代码平台、官方厂商、Release feed、包注册表、MCP registry、模型与 Space、论文、社区、发布平台、生态目录和精选清单。初期有意扩大分母，后续依据连续运行的有效线索率、重复率和失效率收敛。

每轮 discovery 必须生成 `discoveries/*.json`，逐源记录：`source_id`、查询时间、查询词/主题、执行状态、实际审阅命中数。`not_connected`（目前包括 X）只能记录 unavailable，不能伪装为成功。至少尝试 10 个来源、覆盖至少 5 个来源 family。

历史 2026-09-19 v5 账本：attempts 仅留 query/raw_hit_count，命中清单、观察通道与 lead→hit 映射为 evidence-gap，不补造；下一版再补受控证据字段。（2026-09-24 审计修复）

线索账本还必须记录统一 `entity_key`、优先级、筛选结论和漏收/排除原因。用户点名对象为 `user_nominated`，必须进入 eligible，或给出明确 omission reason；不能静默消失。`run.discovery.funnel` 必须能从账本复算：成功源原始命中 → 去重实体 → eligible → candidate → published。

## 实体与多入口证据

实体类型包括 hosted model/API、Agent Skill、MCP、桌面应用、协议、SDK、仓库工具和 npm 包。一个实体可关联多个入口，角色包括官方发布、官方文档、官方仓库、SDK、Skill、package、registry 与社区信号。

Jev 是回归正例：它应作为一个 `hosted_model_api` 实体，同时关联官方发布页、docs、SDK 与 skills，而不是被拆成几个孤立 GitHub 仓库。hosted API 即使没有仓库或包，也不能因实体类型被丢弃。

## 严出：只提供来源和原始标签

- 所有条目固定为 `candidate + hold + pending`，最终由用户判断。
- GitHub 仓库和 npm 包 URL 必须是无尾段、查询参数或片段的规范地址。
- GitHub stars、forks、archived、pushed_at 只能绑定同一候选的同一仓库 API；它们不等于可靠、安全或身份认证。
- 不采集 npm provenance 作为可信标签；不安装候选、不执行候选代码、不把“未扫描”写成“安全”。
- 每张卡固定显示：可靠性未确认、未做安全/病毒扫描、请打开来源自行判断。
- 时效窗口：high 7 天、medium 30 天、low 90 天；按 Asia/Shanghai 实际当前日校验，旧采集日不能冻结过期判断。

## 审计与运行顺序

1. 修改六个体系文件；运行 `node --test tests/validate-radar.test.mjs`。
2. 独立评审者分别签发 `audit_scope: discovery` 与 `audit_scope: publish_gate` 的 PASS 报告，并绑定六文件快照。
3. 审计通过后才执行 discovery、写账本与 collection；执行阶段不得反向修改体系文件，否则旧审计立即失效。
4. 用 `node scripts/validate-radar.mjs collections/<run>.json` 验证；通过后方可更新私有站点。

快照固定包含：`README.md`、`source-registry.json`、`schema.json`、`collection-template.json`、`scripts/validate-radar.mjs`、`tests/validate-radar.test.mjs`。每个审计报告须有唯一 front matter：

```yaml
---
audit_verdict: PASS
audit_scope: discovery
snapshot_sha256: sha256:<64 hex>
reviewer: <独立评审者>
audited_at: YYYY-MM-DD
---
```

发布门禁报告把 `audit_scope` 改为 `publish_gate`。体系目前不包含后台调度或 X 登录；不可访问的源必须如实进入运行账本。
