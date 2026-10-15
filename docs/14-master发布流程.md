# 特性分支合并到 master 后发布

当前采用 `codex/<feature> → PR → 人审 → master → 验证 → tag / Release → Pages`。`master` 是正式发布分支，特性分支承载开发和修复。

## GitHub 身份与仓库权限预检

多账号环境执行 PR、推送或发布前，先从实际 Git remote 确定仓库，再核验本次请求使用的 GitHub 身份及该仓库权限。全局 active 登录账号不等于当前仓库的正确账号；企业托管账号不能访问个人仓库时，不反复用同一身份重试，也不把身份不匹配误判为仓库不存在。

沿用用户已明确指定或仓库范围配置的身份；通过该身份执行 API 与 Git 凭据查询，并核对 `api user` 和仓库权限。凭据只在获准的本地密钥存储/子进程环境使用，不打印、写入文档或提交。仓库范围选择不切换全局默认登录；个人仓库 owner 可作为身份线索，组织仓库不按 owner 名猜测登录账号。身份和权限正确仍不能替代本次发布授权。

## 每个发布 PR

1. 从最新 `master` 建立特性分支并完成代码、说明和相称验证。
2. 同步增加 `bootstrap.json` 与 `mcp/ted-avc-manager/package.json` 的稳定 semver，并在 `CHANGELOG.md` 填写该版本日期与说明。
3. 推送 PR 到 `master`。`validate` 检查布局、包、知识、来源快照、回归，以及版本高于 PR base；检查通过后由人审合并。
4. 合并触发 `master-release`，再次验证精确合并提交，确认它关联已合并到 `master` 的 PR，然后打不可变 tag 并创建 Release。
5. 同一流程直接复用 `panorama` 发布已验证的 Release。Pages 作业始终使用 `master` 的运行上下文，与环境现有分支保护一致。

tag 是版本标记，不是 Pages 的独立部署入口。不需逐个添加新 tag 的环境放行规则。Actions 的 `GITHUB_TOKEN` 创建 tag 通常不会再触发普通 push 工作流，因此发布流程直接调用可复用验证和 Pages 作业，不依赖二次 tag 事件。

## 失败、重试与保护

- 验证失败时不打 tag、不创建 Release；直接推送到 `master` 而没有关联已合并 PR 时，发布脚本拒绝执行。
- tag 已存在但属于其他提交时拒绝发布，须通过新的特性 PR 增加版本；不移动、不覆盖历史 tag。
- 同一提交、同一 tag 的重跑复用现有 tag 和正式 Release。API 的权限或网络失败不能当作“Release 不存在”。
- tag 创建成功但 Release 创建失败时，重跑 `master-release` 完成剩余步骤；Release 成功但 Pages 失败时，重跑 Pages 作业或从 `master` 手动触发 `panorama`。
- Pages 部署前复查最新 Release；已被更新版本取代的旧构建不会重新覆盖最新页面。
- PR 候选刷新仍只执行已发布目录的代码，读取公开 PR 元数据；不运行候选分支代码或复制本机资料。

脚本验证 PR 的已合并状态和提交关联，不能单独证明真实人审；人工审查仍由仓库规则和实际审阅记录保证。

`contents: write` 只给创建 tag/Release 的作业；Pages 与 OIDC 权限只给 Pages 作业。保持现有环境保护、Hook 信任和客户端审批。

## 本机升级

Release 和 Pages 发布后，本机仍按明确获准的精确 tag 执行：

```sh
python3 scripts/update-local-client.py vX.Y.Z --node '<本机 Node 22 绝对路径>'
```

中央合并发布不自动操作私人设备。安装包、CLI、独立 MCP、当前聊天与原生 Hook 分别验收；客户端安装版本以 CODEX_HOME 下 `ted-avc-manager/manifest.json` 为准，并核对程序版本与项目绑定；`runtime/lockfile.json` 仅描述仓库账本，工作树中的候选版本不等于已安装版本。

## 实现边界

工作流改动须先经 PR 的远程验证和人审。PR 检查不能证明合并后具有写 tag/Release 权限，也不能替代 `master-release` 与 Pages 的真实运行验收；首次合并后按运行记录验收。

参考：[复用工作流](https://docs.github.com/en/actions/how-tos/reuse-automations/reuse-workflows)、[GITHUB_TOKEN 触发限制](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow)、[提交关联 PR 接口](https://docs.github.com/en/rest/commits/commits#list-pull-requests-associated-with-a-commit)。
