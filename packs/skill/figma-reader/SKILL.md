---
name: figma-reader
description: Read Figma designs through the available official Figma MCP, preferring the local desktop connection. Use for Figma URLs, nodes, and design comparisons.
---

# Figma Design Reader

先发现当前平台实际可用的 Figma MCP；优先本地桌面连接，确认设计文件与节点。URL 的 `node-id=123-456` 对应节点 `123:456`（`-` 与 `:` 等价）。工具命名以当前平台为准，不写死 MCP namespace。

读取目标节点时同时取得设计上下文与截图：上下文确定布局、颜色、尺寸、资源；截图核对视觉。若工具另有必读操作规范，调用前加载。只读取相关节点，避免全文件树。

本地连接失败时说明缺口；已有授权内可使用当前已连接的官方远程 Figma 能力。不得把网页预览或截图推断冒充节点属性，也不自行安装 MCP、连接账号或扩大权限。

输出以当前任务需要为准，保留节点引用、相关结构/视觉/交互结论及截图。实施时区分 Figma 目标态与真实页面；资源使用稳定项目路径，按设计导出，禁止引用临时 MCP asset URL 作为上线资源。

MCP 配置维护遵循 `mcp-first-use` 规范：按注册表核对来源、首用校验与配置漂移处理，不自行安装 MCP 或扩大权限。
