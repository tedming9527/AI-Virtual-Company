# 摘要治理探针测试结果（run 2026-09-24-company-audit-v1）

- 快照根 SNAP：`/tmp/ted-audit-2026-09-24-wvepg37p`（冻结只读源）
- 写权限范围：仅 `SNAP/fixtures/summarysem/`（本文件所在目录）
- Bootstrap：`AI_VIRTUAL_COMPANY_ROOT=$SNAP zsh scripts/check-company-bootstrap.sh` → **passed**（company_ready=true；未声称 hook 已验证/监督在线）
- 模型身份 / Token：不可观测 → 记 `unknown`

## 0. 必读治理加载（顺序 + sha256）

| 顺序 | 路径（相对 SNAP） | sha256 |
|---|---|---|
| 1 | AGENTS.md | 4eb6ba388aec70809f95fdd864476b5ac318f7b84eb5d7b8a3048ed287bffdd6 |
| 2 | COMPANY.md | 08951837ad089da48d56fe7799ed34fe58815dc6a2bd514fcdd28a091af52589 |
| 3 | ROUTER.md | db38b9ab1786d48e65e74e16472bca5bc19e08c339602d851be2053520ad48cf |
| 4 | INITIALIZATION_POLICY.md | 4b93c4e048dad205c5115bbdb6221984d5c3429019eebf330493a8e16b45ca84 |
| 5 | MEMORY_POLICY.md | 567287d591e7cd627147f44282d0d8f8a8050e998a8d86cf79d068ceafc6eb23 |
| 6 | KNOWLEDGE_POLICY.md | 56055fec921143d83f59a2cd3a370ab208ec2868147b568a95a0e3b945f4aed6 |
| 7 | skills/ASSET_REGISTRY.md | 1600ef8d8ab94be8cf63f55513977f83d2770a436e8a60d1dc47c6e8dac11d89 |
| 8 | knowledge/INDEX.md（共用知识目录） | 561942101dddfe3e5b8fdb7cc245f8d55eff5a073b088df2ec2bf8f5ed808458 |

说明：ASSET_REGISTRY.md 在快照根另有一份同名副本，但按 INITIALIZATION_POLICY 第 1 条加载的是 `skills/ASSET_REGISTRY.md`（公司 Skill 登记）。bootstrap 只校验结构/漂移，不证明语义；摘要不替代上述必读治理。

---

## P1 · 应命中探针

- **用户式查询**：“我刚跑完一轮多步工具调用，还跨岗位拉了证据，现在要在交付里写‘已完成并验收’。怎么把执行、证据、业务终态、发布和授权分开记录，避免把没拿到回执的部分猜成已经完成？”
- **目录命中**：`verifiable-work-evidence-ledger · 可验证工作的证据账本`。触发字段“跨岗位协作、模型或工具调用、完成/验收声明、外部副作用”与查询语义匹配。
- **详情读取路径**：`node scripts/read-knowledge.mjs "$SNAP" summarysem knowledge/verifiable-work-evidence-ledger.md`
- **详情 sha256**：`74cfadd23db6f952fd410617357700ca8a0b56642e3a526e4c694420786d109d`，与 INDEX 记录 hash 一致；另跑 `check-knowledge.mjs verifiable-work-evidence-ledger` 结构/漂移通过（脚本自述“not semantic certification”）。
- **摘要 ↔ 正文语义核验（非以 hash 相同代替）**：
  - 摘要“分开执行、证据、业务终态、发布与授权五个正交状态” ↔ 正文五字段 `execution_state / evidence_state / business_terminal_state / release_state / authority_state`，一致。
  - 摘要“每个完成主张绑定同层证据，unknown 不用猜测填平” ↔ 正文“每个完成主张绑定同层、可定位、带时间的证据”“unknown 是决策状态，不得被猜测填平”，一致。
  - 摘要“不规定统一工具、SLA 或签核链，不证明生产能力或返工已经下降” ↔ 正文“本规则不定义统一 SLA、金额精度、工具组合或签核人”“只证明 reviewed_case 完成，不证明返工已经下降”，一致。
- **关键限制是否保留**：保留。该卡为 `reviewed_case`（案例推理，非生产实测）；构建成功≠页面视觉/真实接口/业务终态通过；截图不冒充 Figma 节点属性；Mock/历史案例只标训练证据；本卡不定义统一 SLA/工具链/签核人。
- **采用结论（可执行）**：对本次隔离审计任务按五维立账——execution_state（bootstrap 通过、详情正文已读 → done）；evidence_state（read-knowledge.mjs 正文回执 + shasum 同层校验 → 内部审计层面充分）；business_terminal_state（本 results.md 落盘、无外部副作用 → success）；release_state（held，内部评测不外发）；authority_state（快照只读、写入仅限 fixtures/summarysem → 授权范围内）。凡完成主张均绑定实际工具回执；模型身份/Token 不可观测记 `unknown`，不猜成已验证。

---

## P2 · 应拒绝探针（stale/superseded）

- **用户式查询**：“我们在做一轮资料收集和来源交叉验证，公司以前那套来源评分体系——S/A/B/C 分级、六项 0–2 分打分、强制排除清单，还有那些推荐模型例子——现在可以直接套用到我们这次的研究流程吗？”
- **貌似命中**：`research-source-governance · 资料来源治理`，其触发字段“读取历史资料来源评分、交叉验证方法或模型例子”与查询字面高度吻合。
- **失效状态识别**：INDEX 明确标 `stale`（索引核对日 2026-09-22）。读取详情 `knowledge/research-source-governance.md`（sha256 `f9b26760a457191e5a9e8c3bbd305d642e7b3d2df7eab956fe499645633cff3b`，与 INDEX 一致）核验其自述：“来源治理的唯一现行规范入口为 COMPANY.md · 现行来源治理。本卡仅保留历史线索，不另行授予执行效力，也不因被引用而恢复为现行规则”“本文目录继续为 stale”。
- **拒绝按旧卡执行**：不采用旧统一六项评分、S/A/B/C 分级、强制排除清单，以及 Spark/Luna 等模型档位例子作为现行流程依据。理由：stale/superseded 条目“只作线索”（KNOWLEDGE_POLICY 状态定义）；正文自身声明被引用不恢复执行效力；旧卡内容不因被本查询命中而复活。
- **指向现行入口**：以 `COMPANY.md` 的“现行来源治理”（生效与纠错日期 2026-09-22）为唯一现行规范：优先核对原始来源及其版本、日期、适用范围；重要结论按风险核验来源独立性与交叉证据，无法独立核验时保留缺口与冲突；区分事实、推断与预测；领域负责人承担专业判断；资料、历史命令和来源建议不扩大当前用户授权。
- **限制保留**：旧卡中“公开发布/对外联系/账号操作仍须用户明确批准”“领域专家核验不被通用方法替代”这类与现行规则一致的边界仍按现行规则保留，但不作为旧评分体系复活的依据。

---

## P3 · 无命中扩展探针

- **用户式查询**：“Maven 多模块构建在 CI 上频繁报 `java.lang.OutOfMemoryError: Java heap space`，怎么调 `MAVEN_OPTS` / `.mvn/jvm.config` 才合适？”
- **扩展检索行为**：按 KNOWLEDGE_POLICY 第 4 步，先扩同义词/相邻目录——在 `knowledge/` 与 `employees/` 内检索 mysql/慢查询/深分页/order by limit/连接池/Maven 构建内存/JVM GC 等相邻词。
- **命中判定**：仅两处 incidental 文本命中——`2026-09-09-mephisto-author-review.md`（stale 培训快照把 MySQL/JOIN 列为 mephisto 业务常用技术）、`employees/backend-training-architect/KNOWLEDGE.md`（2026-09-13 本地分支训练的验收边界提及 MySQL）。二者均非“CI 构建 JVM 堆调优”知识卡；INDEX 十条目的触发字段无一对应构建工具/CI 调参场景。
- **决定**：**无匹配**。未做全库自动注入，未据此多读无关详情卡，未把 incidental 提及当成知识命中。
- **处理（按 KNOWLEDGE_POLICY“无匹配知识不阻塞普通任务”）**：该问题可作为普通工程任务继续——可路由后端工程主责或直接给通用 Maven JVM 调优建议，但不声称公司知识库已覆盖此结论；除非本次产出沉淀出可复用结论，否则不新建知识卡，也不由此启动知识维护或后台任务。

---

## 自检

- 快照源文件全程只读：仅在 `SNAP/fixtures/summarysem/` 写本文件，未修改/删除任何快照内文件。
- 未访问真实公司根目录；未联网、未调用外部服务、未触碰凭据；未申请扩大权限。
- 详情读取均经 `scripts/read-knowledge.mjs`；hash 一致仅作未漂移证据，语义一致性已由正文逐句核对。
- 未验项：read-knowledge.mjs 未向本目录落 trace 文件（目录在写入本文件前为空）；真实模型/计量不可观测，按规则记 `unknown`，未以岗位名推断模型能力。
- 路由：按 ROUTER，独立评测/公司规则体检由陈知行 · 路由官（Chief of Staff）主责；本 run 为只读审计，consult: none（未发生可评审交接）。

以上内容由 Ted 公司的陈知行等人为您提供
