---
name: figma-reader
description: Read Figma design content from local Figma desktop app via MCP. Triggered when user provides a Figma URL or mentions a Figma design node. Priority method — always try local Figma MCP before other approaches.
---

# Figma Design Reader

读取本地 Figma 桌面版 App 的设计稿内容。利用 MCP 协议通过 SSE 连接到本地运行的 Figma MCP Server（默认地址 `http://127.0.0.1:3845`）。

## ⚠️ 强制执行规则（命中此 skill 时必须遵守，不得跳过）

1. **MCP 优先，禁止跳过** — 任何 Figma 链接读取请求，必须首先尝试通过本地 Figma MCP（`mcp__Figma__*` 工具）读取。不得跳过 MCP 直接使用 WebFetch、截图猜测或其他替代方案。
2. **MCP 不可用时必须告知用户** — 如果 MCP 工具不可用，必须明确告知用户原因，并询问是否改用备用方案。不得静默降级。
3. **必须同时获取设计上下文和截图** — 每次读取 Figma 设计时，必须同时调用 `get_design_context` 和 `get_screenshot`。不得只拿其中一个。
4. **设计输出必须结构化** — 输出必须包含：节点名称、布局结构、视觉样式、交互元素、截图。不得只给一个截图或一段代码就结束。

## 触发条件

当用户提供 Figma 链接或提到 Figma 设计节点时，**必须**优先使用此 skill 读取。

## Figma URL 格式

```
https://www.figma.com/design/<fileKey>/<fileName>?node-id=<pageNum>-<nodeNum>
```

提取 node-id 规则：
- URL 中 `?node-id=871-3385` → nodeId = `871:3385`（横杠转冒号）
- URL 中 `?node-id=871:3385` → nodeId = `871:3385`（直接使用）

## 执行步骤

### 方案 A：MCP 工具（优先，必须首选）

直接使用 `mcp__Figma__*` 系列工具：
- `mcp__Figma__get_design_context` — 获取设计上下文
- `mcp__Figma__get_screenshot` — 获取截图
- `mcp__Figma__get_variable_defs` — 获取设计变量
- `mcp__Figma__get_metadata` — 获取元数据

### 方案 B：手动 SSE 连接（备选，MCP 不可用时）

#### 1. 连接到 Figma MCP 并获取 session

```bash
# 启动 SSE 监听（后台运行）
curl -s -N 'http://127.0.0.1:3845/sse' > /tmp/figma_sse.txt 2>&1 &
sleep 2

# 提取 sessionId
SESSION_ID=$(grep -oP 'sessionId=\K[^"]+' /tmp/figma_sse.txt | head -1)
```

#### 2. 获取设计上下文（get_design_context）

```bash
curl -s -X POST "http://127.0.0.1:3845/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_design_context","arguments":{"nodeId":"<NODE_ID>","clientLanguages":"typescript","clientFrameworks":"react","artifactType":"COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN","taskType":"CREATE_ARTIFACT"}}}'
# 等待 5-8 秒让响应通过 SSE 返回
sleep 6
```

#### 3. 获取截图（get_screenshot）

```bash
curl -s -X POST "http://127.0.0.1:3845/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_screenshot","arguments":{"nodeId":"<NODE_ID>"}}}'
sleep 5
```

#### 4. 解析结果

SSE 输出包含 `event: message` 事件，其 `data` 字段为 JSON-RPC 响应。`get_design_context` 返回：
- `text` 类型：React 组件代码、设计说明、字体/颜色变量
- `image` 类型：可截图

`get_screenshot` 返回：
- `image` 类型（base64 PNG）：设计截图

#### 5. 保存截图并阅读

```python
# Extract base64 image from SSE response, save as PNG
# Then use Read tool or image-reader Agent to view
```

## 可用 MCP 工具

| 工具 | 用途 |
|------|------|
| `get_design_context` | 获取设计节点上下文（代码、截图、元数据） |
| `get_screenshot` | 生成设计节点截图 |
| `get_variable_defs` | 获取设计变量（颜色、字体等） |
| `get_metadata` | 获取 XML 格式的设计元数据 |

## 错误处理（必须遵守）

如果 MCP 连接失败（`http://127.0.0.1:3845` 无法访问或 MCP 工具不可用），**必须立即提示用户**：
> "本地 Figma MCP 服务无法连接，请确认 Figma 桌面版是否已启动，以及 MCP 插件是否已配置。"
>
> 检查 `.vscode/mcp.json` 中是否包含 Figma 配置：
> ```json
> {"servers": {"Figma": {"url": "http://127.0.0.1:3845/sse"}}}
> ```

**禁止**在 MCP 不可用时静默改用 WebFetch 或其他方式。必须告知用户并等待确认。

## 设计输出格式（必须包含全部五项）

向用户展示设计内容时，**必须**包括以下全部：
1. 节点名称/用途
2. 布局结构描述
3. 视觉样式（颜色、边框、圆角、字体）
4. 交互元素（按钮、输入框、选择器等）
5. 截图引用

注意：该 tool 读取到的响应中会包含 `data-node-id` 属性，这些是 Figma 节点的标识，用于精确定位设计元素。

## 🚫 禁止行为

- ❌ 跳过 MCP 直接用 WebFetch 读 Figma URL
- ❌ 只获取截图不获取设计上下文
- ❌ MCP 不可用时静默降级不告知用户
- ❌ 输出设计内容时缺少五项中的任何一项
