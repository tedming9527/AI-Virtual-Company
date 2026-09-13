#!/bin/bash
# Figma Design Reader — run.sh
# Usage: bash run.sh <figma-url> [--screenshot-only]
# Reads Figma design from local Figma desktop app via MCP

set -e

FIGMA_URL="$1"
SCREENSHOT_ONLY="$2"

if [ -z "$FIGMA_URL" ]; then
  echo "❌ 请提供 Figma URL 作为参数"
  echo "用法: bash run.sh <figma-url> [--screenshot-only]"
  exit 1
fi

# Check Figma MCP server availability
if ! curl -s -o /dev/null --connect-timeout 3 "http://127.0.0.1:3845/sse" 2>/dev/null; then
  echo "❌ 错误: 无法连接到本地 Figma MCP 服务 (http://127.0.0.1:3845)"
  echo "请确认:"
  echo "  1. Figma 桌面版是否已启动"
  echo "  2. .vscode/mcp.json 中是否包含 Figma MCP 配置"
  echo "     {\"servers\": {\"Figma\": {\"url\": \"http://127.0.0.1:3845/sse\"}}}"
  echo "  3. Figma MCP 插件是否已授权连接"
  exit 1
fi

# Extract node ID from URL
NODE_ID=""
if [[ "$FIGMA_URL" =~ node-id=([0-9]+)[-_]([0-9]+) ]]; then
  NODE_ID="${BASH_REMATCH[1]}:${BASH_REMATCH[2]}"
elif [[ "$FIGMA_URL" =~ node-id=([0-9]+:[0-9]+) ]]; then
  NODE_ID="${BASH_REMATCH[1]}"
else
  echo "❌ 无法从 URL 中提取 node-id"
  echo "URL 格式要求: https://figma.com/design/...?node-id=xxx-yyy"
  exit 1
fi

echo "🔍 读取设计节点: $NODE_ID"
echo ""

# Start SSE listener
TMP_FILE="/tmp/figma_run_$$.txt"
curl -s -N 'http://127.0.0.1:3845/sse' > "$TMP_FILE" 2>&1 &
SSE_PID=$!
sleep 2

# Get session ID
SESSION_ID=$(grep -oP 'sessionId=\K[^"]+' "$TMP_FILE" | head -1)
if [ -z "$SESSION_ID" ]; then
  echo "❌ 无法获取 MCP session ID"
  kill $SSE_PID 2>/dev/null
  rm -f "$TMP_FILE"
  exit 1
fi

echo "📡 MCP Session: $SESSION_ID"
echo ""

# Request 1: get_design_context
echo "📐 获取设计上下文..."
if [ "$SCREENSHOT_ONLY" != "--screenshot-only" ]; then
  curl -s -X POST "http://127.0.0.1:3845/messages?sessionId=$SESSION_ID" \
    -H "Content-Type: application/json" \
    -d "{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_design_context\",\"arguments\":{\"nodeId\":\"$NODE_ID\",\"clientLanguages\":\"typescript\",\"clientFrameworks\":\"react\",\"artifactType\":\"COMPONENT_WITHIN_A_WEB_PAGE_OR_APP_SCREEN\",\"taskType\":\"CREATE_ARTIFACT\"}}}" > /dev/null 2>&1
  sleep 6
fi

# Request 2: get_screenshot
echo "📸 获取截图..."
curl -s -X POST "http://127.0.0.1:3845/messages?sessionId=$SESSION_ID" \
  -H "Content-Type: application/json" \
  -d "{\"jsonrpc\":\"2.0\",\"id\":2,\"method\":\"tools/call\",\"params\":{\"name\":\"get_screenshot\",\"arguments\":{\"nodeId\":\"$NODE_ID\"}}}" > /dev/null 2>&1
sleep 5

# Parse results
echo "📋 解析结果..."
python3 -c "
import json, base64, sys

with open('$TMP_FILE') as f:
    content = f.read()

# Find JSON-RPC responses in SSE messages
lines = content.split('\n')
i = 0
while i < len(lines):
    line = lines[i]
    if line.startswith('data: '):
        try:
            j = json.loads(line[6:])
            if 'result' in j:
                req_id = j.get('id', 0)
                items = j['result']['content']
                for item in items:
                    if item['type'] == 'text':
                        text = item['text']
                        # Print code if it looks like a component
                        if 'export default' in text or 'const img' in text:
                            print(f'[Design Code for node $NODE_ID]')
                            print('```tsx')
                            print(text[:2000])
                            if len(text) > 2000:
                                print('...(truncated)')
                            print('```')
                        elif 'Font(' in text or 'color:' in text:
                            print(f'[Design Tokens]')
                            print(text)
                        elif 'SUPER CRITICAL' in text or 'IMPORTANT' in text:
                            pass  # Skip system messages
                        else:
                            print(text)
                    elif item['type'] == 'image':
                        img_data = item['data']
                        fname = f'/tmp/figma_shot_{$NODE_ID//:/_}.png'
                        with open(fname, 'wb') as f:
                            f.write(base64.b64decode(img_data))
                        print(f'[Screenshot saved: {fname} ({len(img_data)} bytes)]')
            if 'error' in j:
                print(f'[Error: {j[\"error\"]}]')
        except Exception as e:
            print(f'[Parse error: {e}]')
    i += 1
"

# Cleanup
kill $SSE_PID 2>/dev/null
rm -f "$TMP_FILE"

echo ""
echo "✅ 设计读取完成"
