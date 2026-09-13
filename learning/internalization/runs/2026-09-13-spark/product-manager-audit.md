# 林知夏 · 目标规划官 边界质疑分身 C 审计

Primary: 林知夏 · 目标规划官（Product Manager）；Consult: 苏映雪（设计视角交叉核验）、顾清妍（质量视角交叉核验）；Outcome: 对 product-manager 相关迁移复盘的边界做独立审计并给出放行条件。
actual_model: gpt-5.3-codex-spark
target_path: learning/internalization/runs/2026-09-13-spark/product-manager-audit.md
run_id: 2026-09-13-spark-product-manager-audit

## 审计结论总览

- verdict: held
- known: 已形成可复用的边界框架，且“主指标上涨不代表成功”的基本共识较稳定。
- unknown: 多处仍缺少明确定义的分母、样本口径与窗口对齐；现行文本在不同文档中的“观察期”口径存在轻微不一致。
- final_status: held（待补齐“可测量边界与决策执行状态”后可转 pass）

## claim/evidence/verdict

### 1) 指标归因

claim: 三份材料在指标归因层面形成了基本一致的“多指标守门”规则，不会单凭点击率/主指标上升放行。

evidence: `product-manager-extract.md` 与 `product-manager-transfer.md` 明确写明“点击率为描述性指标，需同口径对照”；`test-expert-transfer.md` 以 `unknown_terminal` 与外部副作用作为硬阻断；`design-master-transfer.md` 将高风险场景与体验冲突绑定为冻结条件。

verdict: pass。方向正确，但因缺口径计算式而非“完全可审计归因”。

### 2) 问题定义

claim: 对高风险动作、回归未知项、灰度与观察的边界问题已定义清楚，且都保留了业务-测试-设计三方协同的反驳链。

evidence: 三个迁移文件都采用“质疑→回应→反质疑→修订决定”；`product-manager-transfer.md` 给出“不可发布观察提案”；`design-master-transfer.md` 给出“状态可见性优先、不可承诺可撤回”；`test-expert-transfer.md` 给出 `pilot-note` 与阻断升级条件。

verdict: pass。问题定义完整，争议路径可追溯。

### 3) 分母/样本定义

claim: 对试验分母、样本窗口、流量分层与排除规则未给出可执行定义，导致“同口径复核”仅停留在口头要求。

evidence: 四份输入材料中仅出现“同口径对照”与“同样本”，未给出指标口径字段（如实验组/对照组用户、时间窗、可剔除样本、排除重复提交/历史用户定义）、也未见 `content_state` 与 `release_state` 之间字段映射到统计分母。

verdict: held。此项不足会导致审计可执行性不足，需要补齐。

### 4) 业务决策门

claim: 业务决策门在原则上形成了三层（release_state / evidence_state / unknown阻断），但“观察窗口参数”存在三份文档的轻微分叉。

evidence: `product-manager-transfer.md` 同时出现 24h 与 T+12h；`test-expert-transfer.md` 也用 12h/24h；`design-master-transfer.md` 强调 24h 观察及不放行高风险。不同文档均提出 `risk_hold/pilot-note`，但无统一优先级与是否可覆盖 release 的明确规则。

verdict: held。规则思想一致，但执行参数未统一，存在解读漂移风险。

### 5) 迁移边界

claim: 迁移边界覆盖到高风险动作、并发/超时未知项、连续提交、取消能力不明等关键路径，边界意识良好。

evidence: `product-manager-transfer.md` 迁移题对“活动配置系统自动批量下发”给出了 5% 观察+36h、未知并发阻断；`design-master-transfer.md` 对一键发送场景给出状态跟踪与可见性策略；`test-expert-transfer.md` 将 `batch` 粒度与 `partial/success/failure/unknown` 引入验收矩阵。

verdict: pass。边界覆盖面较全，但需统一字段化落地。

## 反例压力测试

场景: 高风险入口“自动批量下发”，主指标提交成功率 +12%，但:
- 样本基数由新客单独组改为新客+老客混合，未说明剔除规则
- 并发压力下出现 5 秒内重复提交
- `cancel_supported=unknown`
- 12h 与 24h 双窗口交叉触发

期望决策（按材料）：应至少达到 `blocked`，不能进入发布/灰度放行。

实际可读证据是否支持：可以支撑阻断（高风险 + unknown + 并发 + cancel unknown），但不能支撑“是否在 12h 是否自动降级、24h 是否强阻断”这一具体路径。

结论: 该压力测试揭示最短板是“缺失实验分母与时间窗统一规则”，不是原则冲突。

## 可追问/继续探索

unknown: 对所有入口是否采用统一 `analysis_window`（例如 T+12h、T+24h、T+36h）与 `decision precedence`（先执行门还是先状态门）未统一，当前文本可导致团队不同实现。
unknown: 未提供“分母定义模板”（组别、时间窗、剔除条件、重复提交去重规则）导致复核不可全量自动化。
unknown: 多个文件定义 `observational`/`pilot-note`/`risk_hold` 的状态语义，但未给出互斥/覆盖关系矩阵。

## 最终判定

- pass: 规则主线（指标不能单点解读、未知项不能放行、高风险不得承诺可撤回）。
- held: 分母定义、窗口参数与门控状态的执行化定义。
- unknown: 统一决策状态机落地格式（何时 blocked、何时仅观测、何时转 release-ready）。

建议处置:
1. 增加一条“指标口径卡片”模板，固定主指标/次级指标/副作用指标的分母字段。
2. 增加一条“决策状态机”模板，定义 `observational`、`pilot-note`、`risk_hold`、`blocked` 与 `release_ready` 的优先级。
3. 将 `12h/24h/36h` 统一映射到统一字段，避免实现时按文件口径混用。
