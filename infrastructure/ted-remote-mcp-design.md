# Ted Remote MCP 与导师发布包设计

状态：proposal · 2026-10-10  
主责：沈砚舟 · 后端培训导师（资深后端架构师）  
实现责任：陆行远 · 可靠服务官（Backend Engineer）  
实际撰写：platform agent；不代表具名员工本人参与

## 目标

让 ChatGPT 云端会话与周期任务通过受认证的 HTTPS MCP 读取/更新 Ted 项目数据，同时让线上运行时获得版本化导师规则，而不上传整个公司资料库、个人凭据或机器配置。

## 双事实源分离

| 领域 | 规范源 | 线上分发/存储 | 禁止事项 |
|---|---|---|---|
| 项目计划、节点、执行事件、提交、反馈 | `ted-personal-execution-system` 契约 | Ted Cloud/D1 + HTTPS MCP | 不写入 GitHub 文档充当业务数据库 |
| 导师角色、教学规则、市场口径、精选知识 | iCloud 公司库 | 私有 GitHub `ted-company-runtime-assets` 的签名发布包 | 不镜像完整公司库、员工私密记忆或凭据 |
| 站点分析视图 | 已核验能力档案 + 市场样本 | Sites/D1 只读分析投影 | 不保存学习安排或完整项目任务 |

## 导师发布包

发布流程只选择明确允许上线的条目，建议结构：

```text
manifest.json
mentor/profile.json
mentor/teaching-policy.json
mentor/market-evaluation-policy.json
mentor/knowledge/*.json
signatures/manifest.sig
```

`manifest.json` 至少包含 `schemaVersion`、`bundleVersion`、`sourceCommit`、`generatedAt`、`expiresAt`、各文件 SHA-256、兼容 MCP 契约范围和签名 key id。线上 MCP 只接受签名有效、未过期、schema 兼容的包；更新失败时继续使用最后一个已验证版本并告警，不接受未签名 main 分支内容。

GitHub 访问使用只读 GitHub App（Contents: read）或等价细粒度凭据，凭据仅存 MCP 服务端 Secret。导师包发布使用独立写权限和受保护分支/Release；ChatGPT token 不获得 GitHub 写权限。

## MCP 身份与写入授权

远程端点采用 HTTPS Streamable MCP 和 OAuth 2.1 authorization-code + PKCE：

1. 发布 protected-resource 与 authorization-server metadata。
2. ChatGPT 完成交互式用户授权；服务端逐请求验证签名、issuer、audience/resource、expiry 和 scopes。
3. scope 至少拆分：`project:read`、`project:write`、`mentor:feedback:write`、`capability:read`、`capability:write`。
4. token 只证明身份和权限，不直接批准任意业务变更。每次写入还必须通过目标/字段白名单、当前 revision、稳定 operationId、幂等去重、数据契约校验和审计。
5. 方向切换、归档、删除语义、正式能力结论等受保护动作要求当前会话中的真实确认引用；服务端拒绝空引用、过期引用和对象不匹配。
6. 周度学习检查默认 `project:read`；只有用户预先授权的反馈动作才增加 `mentor:feedback:write`。双月竞争力任务默认只读项目和能力视图，不能改学习计划。

ChatGPT 不保存业务账户密码。OAuth access/refresh token 由连接层管理；OAuth client secret、GitHub App private key、D1 管理凭据只保存在服务端 Secret。无人值守任务不能完成首次授权，连接失效时必须停写并通知用户。

## 现有云端能力与最小缺口

2026-10-10 对 `apps/ted-execution-cloud` 的代码核对表明，云端写入基础不是空白：

- D1 已有 accounts/devices/sessions、不可变 events、entities 投影、approvals、V4 consent/state/commands。
- 数据库 trigger 在提交边界复验 session/device revocation、scope、account/entity revision、device sequence、approval 和 mentor write consent。
- V4 reducer 已使用稳定 operationId、request hash、base revision、原子 receipt 和 exact retry；已有 owner 与 mentor 分权、单节点/整计划权限和受保护确认。
- Google owner 登录、设备 enrollment 与短期 session 已存在；它是 Ted App 登录，不等于 ChatGPT MCP OAuth 兼容层。

因此最小缺口是远程 MCP/OAuth 门面，不是新增数据库或第二套写入逻辑：

1. 在现有 Worker 增加 Streamable HTTP `/mcp`，提供 initialize、tools/list、tools/call 与必要 resources。
2. 增加 MCP protected-resource metadata 和兼容 OAuth 2.1/PKCE 的 authorization-server metadata。Google 可继续作为最终用户身份提供方，但 Ted 服务需要向 ChatGPT 签发 resource/audience 正确、scope 受限的连接 token；不能把现有 Google ID token 或本机 session token直接暴露给模型。
3. OAuth 回调把已验证 Google subject 映射到现有 Ted account；MCP gateway 把外部 scope 收缩映射到现有 owner/mentor session，禁止 scope 扩张。
4. MCP tool handler 调用现有 V4 reducer/command service，不直接执行任意 SQL，也不让 Sites/自动化直写 D1。
5. 标准写入顺序固定为 `snapshot → preview → confirmation（受保护操作）→ command(revision, operationId) → readback(receipt)`。网络结果不确定时重放完全相同的 operationId 和 payload。
6. 周度学习检查默认只拿 `project:read`；用户预先批准写导师反馈时才授予 `mentor:feedback:write`。双月竞争力任务只读能力分析投影，不获得计划写权限。

首版远程 MCP 工具应保持小集合：`ted_status`、`ted_v4_snapshot`、`ted_task_timeline`、节点 patch preview/apply、submission review 与 mentor review。全计划 reconcile、owner replacement、历史导入、设备管理和 Secrets 管理不向自动化开放。

## 同步与冲突

- Mac App 本地优先，写入产生不可变事件并携带 deviceId、operationId、entity revision 与 contract version。
- 云端按 operationId 幂等；revision 冲突返回当前版本和可重放信息，不按最后更新时间覆盖。
- 本地保存、云端接收和其他设备确认是三个状态，回执分别表达。
- 导师包版本与项目数据版本独立；更新导师规则不能改写历史项目事件。

## 站点与周期任务

- 个人竞争力/薪酬分析：每两个月一次，读取已授权能力视图和有日期的市场来源，更新岗位匹配、薪酬口径、区间与置信度。
- 学习进度检查：每周一次，通过 Ted MCP 读取新证据、阻塞和待复核项；不在站点创建学习安排。
- 两个任务都记录数据时间、MCP contract version、导师 bundle version 和调用结果。任何依赖 unavailable 时保留上次成功版本并显式标记未更新。

## 分阶段验收

1. 只读远程 MCP：OAuth、`project:read`、契约与审计通过。
2. 导师发布包：筛选、签名、GitHub Release、回滚和过期策略通过。
3. 受限写入：幂等、revision 冲突、scope 拒绝、受保护确认与审计通过。
4. Mac 离线/重连同步：不丢事件、不静默覆盖、三类回执可区分。
5. 云端周期任务：交互授权完成后真实调用；撤销授权、过期和 MCP 故障均 fail closed。

本设计不授权创建 GitHub 仓库、部署公网服务、连接账号或上传导师资料；这些动作需用户后续明确批准并单独验收。

## 公司初始化中的同步升级检查

公司初始化先安全快进同步 `ted-personal-execution-system`，再读取远程服务公开的 `/.well-known/ted-mcp`：

- 校验 metadata schema、MCP 协议版本、release version、能力清单和部署源码 revision。
- 本地 HEAD 与远程 `sourceRevision` 不一致时报告 `revision-drift`，但不自动部署。
- 远程不可达、未配置或 OAuth 尚未连接只降低远程 MCP 状态，不影响公司事实源初始化。
- 检查默认要求显式代理；缺少代理时返回 `not-checked`，禁止静默直连。
- 自动升级只覆盖本地仓库安全快进和本机插件刷新。远程部署、数据库迁移、OAuth/Secret 变更仍需要单独授权和验收。

这里的代理约束仅针对 Mac 上运行的公司初始化检查。Cloudflare Worker 云端执行不读取本机 VPN、`.zshrc` 或 `HTTPS_PROXY`；它使用云平台出口，并通过固定 HTTPS origin、OAuth audience/scope、禁止重定向、超时和响应大小限制控制外联风险。
