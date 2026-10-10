# jev-use：macOS 全局 CLI 与 Codex MCP 配置

日期：2026-10-09。任务主责：辛澈 · AI工程师；实际执行者：platform agent。
用途：记录用户授权的可复用配置方式，下次 Mac Pro 配置时按此方法重新部署与验收。
公司目录同步此说明；本机路径、代理和凭据不属于公司同步资料。

## 已验证的结果与边界

- 2026-10-10 当前落地入口实测为 jev-use 0.7.1、Node 24.15.0；该 Node 的帮助信息包含 `--use-env-proxy`。
- 只有 HTTP_PROXY / HTTPS_PROXY 而未启用环境代理时，原有 Node fetch 请求返回 HTTP 451（区域不可用）。启用 `--use-env-proxy` 后，真实 TypeSafe 判断请求成功。
- 从不加载 shell 启动文件的干净环境启动 CLI，真实判断成功，`escalate=false`。
- 从干净环境启动新的 STDIO MCP：initialize 成功，发现 `jev_judge` / `jev_gate`，tools/call 返回 TypeSafe / jev-1.13.0 的真实判断；本轮 latencyMs=855、escalate=false。
- 2026-10-10 已恢复 `~/.local/bin/jev-use` 共享启动脚本与受限权限 env，并把 Codex MCP 定向到该脚本。干净环境 CLI 和独立新启动 MCP 均返回 TypeSafe / jev-1.13.0 的真实判断、`escalate=false`；修改前已打开的当前聊天仍由旧 MCP 子进程返回 HTTP 451，须完全退出并重开客户端后再做聊天内验收。磁盘配置成功和独立 MCP 成功，不等于既有聊天连接已经热更新。
- 以上是本机历史实测。Mac Pro 尚未执行，不证明所有区域、所有代理出口或所有客户端都可用；不证明公司 Hook 或实时监督。

## 使用方式

全局 CLI 和 Codex MCP 共用 `~/.local/bin/jev-use` 启动脚本。脚本主动读取 `~/.config/jev-use/env`，然后执行支持环境代理的 Node：

```sh
#!/bin/sh
set -eu
set -a
. "$HOME/.config/jev-use/env"
set +a
exec "<本机验证过的 Node 可执行文件>" --use-env-proxy \
  "<该 Node 安装目录中的 jev-use/dist/cli.js>" "$@"
```

此段是模板，两个路径占位符须在目标机器解析后替换，不可直接照搬其他机器的用户名、Node 安装路径或版本目录。当前机器已使用解析后的实际路径。

本地 env 文件保存 `TYPESAFE_API_KEY`、`JEV_BACKEND=typesafe`、`HTTP_PROXY`、`HTTPS_PROXY` 与 `NO_PROXY`。本机已采用 HTTP 代理环回端口 7890；目标机器须确认自己的代理协议、监听端口与出口。Node 的此开关读取 HTTP_PROXY / HTTPS_PROXY / NO_PROXY，不以 ALL_PROXY 的 SOCKS 设置替代实测。

权限：`~/.config/jev-use/` 为 700；env 文件为 600；启动脚本为 755。通过本机安全输入或经授权的既有凭据配置文件提供密钥；不得打印密钥、写进 shell 历史、公司目录、Git、同步文档或普通日志。

在用户级 `~/.codex/config.toml` 的既有 jev 表中定向更新，并保留其他设置：

```toml
[mcp_servers.jev]
command = "<目标机器实际用户目录>/.local/bin/jev-use"
args = ["serve"]
```

Codex 的 command 使用解析后的实际绝对路径，不能假定 TOML 会展开 `$HOME` 或 `~`。凭据由启动脚本主动读取，不把密钥明文放到 config.toml。

## Mac Pro 同步步骤

1. 同步公司目录中的此说明；读取当前公司规则和这份实测边界。
2. 检查目标机 Node 与 jev-use 的真实安装位置。激活合适 Node 后，用 `command -v node`、`node --version`、`node --help`、`npm root -g` 定位与核对；确认 `--use-env-proxy` 可用，不能只凭 Node 主版本推断支持。
3. 在目标机建立上述本地 env 和启动脚本。使用目标机已有授权凭据或由用户安全提供凭据；公司同步不会带来密钥。确认本机代理运行且目标域名确实经过代理。
4. 确认终端 PATH 可发现 `~/.local/bin/jev-use`；Codex MCP 使用绝对路径，不依赖终端 PATH。
5. 备份目标机现有启动脚本与 config.toml，再定向更新 jev 表；不要覆盖其他服务器、模型或审批配置。备份存于本机受限权限目录。
6. 在用户可以退出客户端时完全退出并重新打开，使后台进程加载新启动配置；当前测试仍失败时检查实际进程启动命令、项目级覆盖和客户端是否重载，不将“已写配置”当作连接生效。
7. 分别验收：全局 CLI、独立新启动 MCP、目标 Codex 聊天内实际 MCP。三者的结果分别记录。

CLI 可用以下非敏感 smoke 请求验收，退出码之外还要检查 verdict：

```sh
env -i PATH=/usr/bin:/bin "$HOME/.local/bin/jev-use" judge <<'JSON'
{"state":"This is a connectivity smoke test only.","questions":[{"id":"smoke","type":"choice","question":"What is this request?","options":["connectivity_test","production_write"]}]}
JSON
```

MCP 验收必须实际 initialize、listTools 和 tools/call `jev_judge`，不以 `serve` 进程存在或 mock 成功替代。成功应包含真实 backend/model、预期答案与 escalate=false；reason=unreachable 或 backend=unconfigured 仍是失败。低置信的正常判断升级须与连接失败区分。

## .zshrc 与排查

`.zshrc` 中 export 的 TYPESAFE_API_KEY 和代理适用于读取了该文件的 shell；桌面应用直接启动的 MCP 通常没有这一步。配置在 shell 中存在，不证明 MCP 子进程继承了它。主动读取本地 env 的共享启动脚本消除这个依赖。

`jev-use doctor` 还检查 Claude 的工具允许规则；其退出码可能受 Claude 权限提示影响。应单独记录 TypeSafe live round trip、Codex MCP 和 Claude 权限结果，不因 Codex 成功而宣称 Claude 同时可用。

参考：[Codex 官方 MCP 配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)。
