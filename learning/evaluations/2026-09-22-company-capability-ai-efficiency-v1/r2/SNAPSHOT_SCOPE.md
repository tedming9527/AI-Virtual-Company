# r2 快照范围与证据上限

- run_id：`2026-09-22-company-capability-ai-efficiency-v1`
- version：`r2`
- 目的：复核第 2 轮最小整改、渐进披露试点和剩余风险；不是全公司资料备份，也不是生产能力认证。
- 版本绑定：以 r2 目录内 `MANIFEST.tsv` 为唯一文件集合与内容身份；本文件不预写尚未生成的 manifest hash。

## 必含决策证据

- r0 三份独立审计、r1 三份外部复审与内部质量报告；用于保留首次失败、整改和未决。
- 当前治理、八岗 PROFILE/MEMORY/SKILLS、catalog/INDEX、共用需求说明、培训/能力评估与本轮脚本/fixture；用于复核发布一致性、用户适配和上下文度量。
- AI 旧案例最小比较输入：`learning/2026-09-11-remaining-roles-retraining.md`、`learning/internalization/runs/2026-09-13-spark/ai-engineer-audit.md`、`learning/professional-capability-research-2026-09-18/REPORT.md`、`ai-engineer.md` 与 `quality-review.md`。这些材料只支持历史语义和证据边界复核，不证明生产能力。
- AI 能力雷达：README、source registry、schema、collection template、validator、正式测试、v5 collection、v5 discovery ledger、发现审计和发布门禁审计。可复算本地记录与六文件绑定；不认证外部候选可靠性、当前线上状态或私有站发布终态。

## 有意省略

- 与本轮决定无直接依赖的其他历史训练、课程、旧 fixture 与中间报告不纳入；原因是控制审计输入与复制成本，而非判定源文件失效。
- 原始聊天、提示全文、账号、凭据、生产数据和无关业务仓库一律排除。
- 目标平台 hook 的安装、信任与真实注入证据未取得；AI-01 只能按脚本/fixture 判断，生产影响保持 `unknown`。
- 实际模型身份及上下文隔离缺少独立运行时鉴证时保持 `unknown`；请求配置、工具接受与岗位名称均不能替代。

## 结论上限

- 结构/fixture 通过不等于语义、真实业务或生产效果通过。
- Unicode 字符和 UTF-8 字节只衡量本轮文件语料，不换算 token、费用、延迟或生产提效。
- 本轮公司整改、员工产物和独立 AI 审计不形成用户本人能力证据；`capability_handoff_status` 应为 `no_evidence`。
