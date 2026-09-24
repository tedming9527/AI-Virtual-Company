# 机械评测结果 · run 2026-09-24-company-audit-v1

执行者：审计主责（陈知行 · 路由官）自行承担机械评测矩阵（受测者并发上限 5，本项改由集成方执行并如实标注）。
快照：/tmp/ted-audit-2026-09-24-wvepg37p · 源版本：working tree @ d9c672db27d068c425b9c293846a9f1b85e1b72b（含未提交改动）

## A. 文档一致性核对（对照快照内文件）

| 项 | 核对对象 | 结果 | 备注 |
|---|---|---|---|
| 岗位清单 | employees/ROSTER.txt ↔ COMPANY.md Team ↔ ROUTER.md 路由表主责 ↔ knowledge/catalog.json owners | 一致（8 岗） | 四源均为 8 岗：ai-engineer、backend-expert、backend-training-architect、chief-of-staff、design-master、frontend-expert、product-manager、test-expert |
| 顾问数量 | ROUTER 每行 consult、INITIALIZATION_POLICY"至多一名顾问"、DELIVERY_POLICY"M 必要时一个顾问 / L 一个顾问" | 一致（≤1） | 无任一行超 1 名顾问 |
| 末行签名规则 | AGENTS.md 精确末行要求 ↔ scripts/codex-company-takeover-hook.mjs `hasCompanySignature` 正则 `/以上内容由 Ted 公司的[^等\n]{1,30}等人为您提供$/` | 一致（含一处宽松化备注） | 合法样本（"陈知行"）匹配；空主责"公司的等人"、缺"为您提供"、公司名不符均拒绝；hook 测试 11/11 通过（含动态签名守卫用例）。备注：正则在主责名段允许空白字符，比"精确末行"略宽松，非实质冲突 |
| REGISTRY 12 列 | platforms/REGISTRY.md 表头/数据行（12 列）↔ check-company-bootstrap.sh `cells.length !== 12` 校验 | 一致 | bootstrap 实测 4 行通过 |
| 分级口径 | DELIVERY_POLICY S/M/L（按风险/依赖/可逆，不按文件数）↔ ROUTER 成本门禁（直接执行 vs C2C）↔ METRICS_POLICY | 一致 | S 执行任务按"低复杂度直接执行、不启动 C2C"判定与两政策吻合 |
| 状态枚举 | catalog 状态（candidate/reviewed_case/verified_context/stale/superseded）↔ check-knowledge.mjs 校验 | 一致 | 实测 catalog 49 条：reviewed_case 39 / candidate 5 / stale 3 / verified_context 2 |

结论：文档一致性检查通过（无矛盾；签名正则宽松化属轻微提示，不影响正确性）。

## B. 结构负例（一次性副本，均预期明确失败）

| 负例 | 制造缺陷 | 预期失败消息 | 实测 | 通过 |
|---|---|---|---|---|
| N1 | 删除 employees/backend-expert/PROFILE.md | INCOMPLETE EMPLOYEE: backend-expert/PROFILE.md | 相同，exit=1 | 是 |
| N2 | 删除 employees/design-master/ 整目录 | INCOMPLETE EMPLOYEE: design-master/* (3 项) | 相同，exit=1 | 是 |
| N3 | 新增 employees/ghost-role/{PROFILE,MEMORY,KNOWLEDGE}.md | UNREGISTERED EMPLOYEE: ghost-role | 相同，exit=1 | 是 |
| N4 | check-knowledge 未知 ID no-such-id | unknown or duplicate requested id | 相同，exit=1 | 是 |
| N5 | catalog.json 删除 product-measurable-ai-pilot 条目 | 该 ID missing or duplicate catalog entry | 相同（grep 命中 1 次），exit=1 | 是 |

负例副本目录：SNAP/negatives/N1..N5（各含 run.log）。真实快照未受影响。

## C. 定向条目（快照本体，只读）

| 条目 | 预期 | 实测 | 通过 |
|---|---|---|---|
| frontend-expert-c2c-orchestration | 失败（AUD-002 现状证据） | unknown or duplicate requested id，exit=1 | 是 |
| verifiable-work-evidence-ledger | 通过（健康条目） | entries=1, errors=[], exit=0 | 是 |
| design-master-core | 失败（既有 STALE 基线告警） | STALE summary/source hash mismatch，exit=1 | 是 |

## D. 基线对照（本评测输入状态，非结论）

- 快照 bootstrap：通过（4 个 active 技能、4 行平台登记）。
- check-knowledge 全量（快照 = 真实根目录，error 集完全一致）：27 条 error、0 warning。
- hook 测试 11/11、knowledge-bootstrap-audit 测试 7/7（快照上运行）。

自检：A/B/C 均以实际命令输出为准，无自填卡代替。
