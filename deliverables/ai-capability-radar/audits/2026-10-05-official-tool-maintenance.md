---
audit_type: monthly_official_tool_maintenance
audited_at: 2026-10-05
scope: existing company tool assets and maintained official sources only
primary_owner: 辛澈 · AI工程师
actual_executor: platform agent
employee_participation_verified: false
consult: none
disposition: targeted_watch_item
---

# 2026-10-05 官方工具月度维护

## 范围与边界

本轮增量复核以现有公司 Skill 资产、`ted-mac-assistant` v1.6.3 本地插件与 MCP 兼容性为边界；未安装或卸载任何工具，未连接帐号、授予权限、写入凭据或修改业务项目。仅查阅 OpenAI 与 Model Context Protocol 维护者的官方资料。

## 有价值变化

| 资产 | 官方变化 | 本地影响 | 权限、数据与副作用 | 建议与替代方案 |
|---|---|---|---|---|
| Codex / Agent Plugins | OpenAI 现将根目录 `plugin.json` 与 `mcp.json` 作为可移植包结构，`extensions.com.openai` 承载 OpenAI 专用设置；`.codex-plugin/plugin.json` 仍是兼容回退。 | `ted-mac-assistant` 已同时具备根清单和 Codex 兼容清单，当前不需变更。 | 清单本身不建立连接；若安装 OpenAI Developers 插件并接入 Platform，可能进入 API key 设置流程，须由用户逐次明确授权。 | 维持双清单；新插件优先可移植结构。若不需要跨平台分发，继续使用现有本地清单即可。复核人：辛澈 · AI工程师。 |
| Model Context Protocol | 2026-07-28 稳定规范已发布，包含无会话 HTTP、能力发现等重要变化。 | 当前 `ted-mac-assistant` 仅登记 stdio 传输，未发现远程 HTTP 服务；本轮未执行运行时协商测试，因此不能宣称已兼容新规范。 | 无即时读写或数据范围变化；未来 SDK/传输升级可能改变请求元数据、握手和会话语义。 | 在下一次 MCP SDK、HTTP 传输或服务端升级前，先做隔离兼容性测试并复核旧客户端降级路径；当前保持不升级。替代方案：继续固定现有已验证运行时。复核人：陈知行 · 路由官（Chief of Staff）。 |

## 来源

- OpenAI Developers: [Package your plugin](https://developers.openai.com/plugins/build/plugins)（2026-10-05 访问）。
- OpenAI Developers: [OpenAI Developers plugin](https://developers.openai.com/learn/developers-codex-plugin)（2026-10-05 访问）。
- Model Context Protocol: [2026-07-28 stable release](https://github.com/modelcontextprotocol/modelcontextprotocol/releases)（2026-10-05 访问）。
- Model Context Protocol: [2026 roadmap](https://github.com/modelcontextprotocol/modelcontextprotocol/blob/main/blog/content/posts/2026-08-22-mcp-roadmap.md)（2026-10-05 访问）。

## 未采取的动作

- 未安装 OpenAI Developers 插件；它是候选能力而非当前可用或被授权的能力。
- 未变更 `ted-mac-assistant` 代码、MCP 配置或插件清单；本轮证据不足以证明需要迁移。
- JEV 判断器调用因将内部插件细节发送到外部服务的风险被安全门禁拒绝；未重试或绕过，结论仅依上述可审计事实与既有授权边界。
