# Jev：Yarn 全局安装与独立 Node 22 启动

Jev 包的首选安装位置由 `yarn global dir` 解析；Yarn Classic 的常见位置为 `~/.config/yarn/global/node_modules/jev-use/`。不再将某个 nvm 版本下的 `npm root -g` 作为主安装位置。

## 依赖与安装

- `jev-use@0.8.0` 声明 Node >=20；本部署选择已验证支持 `--use-env-proxy` 的 Node 22。
- Homebrew 提供 Yarn Classic 1.22.x；此流程需要其 `yarn global` 命令。其他 Yarn 主版本须另核对安装方式。
- nvm 负责选择运行时，Yarn 负责安装 Jev；两者职责独立。
- TypeSafe 凭据与本机代理只保存在权限 600 的 `~/.config/jev-use/env`，目录权限 700。中央仓库只保存变量名称，不保存值。

安装在子 shell 中执行，不修改当前终端的 Node 或 nvm 默认别名：

```sh
(
  export NVM_DIR="$HOME/.nvm"
  . "$NVM_DIR/nvm.sh" --no-use
  nvm use --silent 22
  yarn global add jev-use@0.8.0 --ignore-scripts \
    --registry=https://registry.npmjs.org --non-interactive
  yarn global dir
)
```

目标机器须先有 Node 22。安装时记录 `yarn global dir` 的结果；创建本机 Overlay 时将 `<YARN_GLOBAL_DIR>` 替换为此绝对路径，不要在每次启动时依赖 ambient Node 去运行 Yarn。

## 启动契约

共享 CLI/MCP 入口为 `~/.local/bin/jev-use`，转发至本机 `~/.config/mcp-launch/profiles/jev/launch`。Overlay 只在自身进程内加载 nvm 并执行 `nvm use 22`，随后用解析出的 Node 执行 Yarn 全局目录中的 `jev-use/dist/cli.js`。

以下是 Overlay 的关键片段；实际部署还需代理连通性检查和所选变量隔离，完整要求见 [首次使用规约](FIRST_USE.md)：

```sh
#!/bin/sh
set -e
export NVM_DIR="$HOME/.nvm"
. "$NVM_DIR/nvm.sh" --no-use
nvm use --silent 22 >/dev/null
jev_node_path="$(command -v node)"
set -u
set -a
. "$HOME/.config/jev-use/env"
set +a
: "${TYPESAFE_API_KEY:?Jev API key missing}"
: "${HTTPS_PROXY:?Jev HTTPS proxy missing}"
"$jev_node_path" --help | grep -q -- --use-env-proxy
exec "$jev_node_path" --use-env-proxy \
  '<YARN_GLOBAL_DIR>/node_modules/jev-use/dist/cli.js' "$@"
```

不得执行 `nvm alias default`，不得 `source` 启动器到父终端。使用执行入口启动子进程，父终端可继续使用 Node 18 或 24。删除全部 Node 22 安装会使 Jev 启动失败，须重新安装并验收。

代理要求按 [Jev Profile](../profiles/jev.json) 执行：缺失、不可达或无效时停止，不静默直连。凭据和代理变量只从本机获准 env 获取，不整体复制 shell 环境。可选 `JEV_MODEL` 未设置时保持未设置，或使用包的默认值 `jev-latest`；不能传入空字符串，否则可能收到 `HTTP 400: Unknown model`。

Yarn 创建的全局 binary 通常用当前 PATH 中的 Node。需要裸命令 `jev-use` 也保持隔离时，核对 `$(yarn global bin)/jev-use` 确实属于此 Jev 包，备份其符号链接后将它定向到共享启动器。不要覆盖同名未知程序；后续 `yarn global add/upgrade` 可能重建该链接，须重新核对并恢复指向。Codex 始终使用共享启动器的绝对路径：

```toml
[mcp_servers.jev]
command = "<本机用户目录>/.local/bin/jev-use"
args = ["serve"]
```

只更新既有 Jev 入口，保留其他服务器、审批、Hook 信任和账号设置。安装、客户端注册、连接生效分别验收，不自动扩大授权。

## 验收与升级

1. 检查 Overlay 与启动器语法、权限、包版本、Node 版本及环境代理支持。
2. 记录父 shell 的 `node --version` 和 nvm 默认别名，执行 Jev 后核对均未改变。
3. 在干净环境运行非敏感 CLI 判断，检查真实 backend/model、预期答案和 `escalate=false`。
4. 独立启动 STDIO MCP，依次验证 `initialize`、`tools/list` 和真实 `jev_judge` 调用。
5. 在目标客户端重新加载 Jev MCP，再做不指定模型的真实调用。旧进程持有空模型或旧路径时，磁盘修复不会自动更新它；显式 model 调用成功也不能代替默认调用验收。

```sh
env -i HOME="$HOME" PATH=/usr/bin:/bin "$HOME/.local/bin/jev-use" judge <<'JSON'
{"state":"This is a connectivity smoke test only.","questions":[{"id":"smoke","type":"choice","question":"What is this request?","options":["connectivity_test","production_write"]}]}
JSON
```

CLI、独立 MCP、当前聊天 MCP 的结果分别记录。握手成功、进程存在、mock 答案或配置文件存在均不代替真实判断；`reason=unreachable` 为连接或模型配置失败，正常低置信升级单独记录。

本机路径、env、备份、逐条响应留在部署侧。迁移到另一台 Mac 只同步此方法，重新解析 Yarn/nvm 路径并取得该机器的获准凭据。中央版本发布仍遵循 PR、人审、tag 和 CI；本机管理器按获准 tag 升级，Jev 包不随中央版本自动升级。
