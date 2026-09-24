# 公司 Skill 资产登记

本表只登记公司代码库中的规范源。平台 Skills 目录中的安装项是可再生成的适配副本，不是事实源。

| 资产 ID | 规范源 | 用途 | 调用策略 | 维护人 | 状态 |
|---|---|---|---|---|---|
| `company-skill-governance` | `skills/company-skill-governance/` | 选择、记录和治理公司 Skill 资产 | 显式 | 辛澈 · AI工程师 | active |
| `ted-takeover` | `skills/ted-takeover/` | 将未接入或状态不明的当前 Codex 会话从调用时刻手动接回公司 | 显式 | 辛澈 · AI工程师 | active |
| `codex-with-chatgpt` | `skills/codex-with-chatgpt/` | 编排层 C2C 协作契约：复杂任务 PLAN→EXECUTE→REVIEW，含成本门禁、2 轮 Review 上限、BLOCKED 升级 | 显式（Chief of Staff 路由触发） | 陈知行 · 路由官 | active |
| `jev-use` | `skills/jev-use/` | 判断型 CLI（yes/no/choice/score）：风险 Gate、build/测试成败、多方案结构化判定；按事实所在位置路由、批量合并调用 | 显式（决策而非写作时） | 辛澈 · AI工程师 | active |

## 登记与发布边界

- 公司初始化完整性检查验证本表和每个 active Skill 的规范源。
- 初始化成功后，平台适配器才可把 active Skill 登记到 AI 可发现目录。
- 平台副本必须能追溯到本表中的规范源；不得在副本中产生公司规则分叉。
- `ted-takeover` 是人工恢复入口，不替代 Codex hooks，不追认调用前的接管或监管状态。
