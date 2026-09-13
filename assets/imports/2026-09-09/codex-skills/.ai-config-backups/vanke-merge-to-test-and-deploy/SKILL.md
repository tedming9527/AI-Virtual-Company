---
name: vanke-merge-to-test-and-deploy
description: Merge the current branch to test and trigger the remote GitHub Actions build/deploy. Use when the user asks to merge or deploy to the test environment in a Vanke project.
---

# Merge Current Branch to Test and Deploy

将当前分支（或指定分支）合并到 `test` 分支，并触发 GitHub Actions 构建部署到 test 环境。

> 本 skill 为跨工具中立规程：正文对任何 AI 助手/自动化工具同样有效。
> `<skill-directory>` 指本文件所在目录。实际逻辑全部在 `run.sh` 中。

## 强制执行规则

1. 必须确认项目位于名为 `vanke` 的目录树下；否则拒绝执行。
2. 默认执行前必须向用户展示项目名、源分支和目标分支 `test`，并等待用户明确确认。
3. 当调用中包含 `auto` 关键字（如由 issue-monitor 监控页面的“合并部署”按钮触发）时，跳过第 2 条的人工确认：校验通过后直接执行合并与部署，全程输出操作日志，不在中途向用户询问；其余校验（第 1、4、5、6 条）全部照常执行。
4. 必须使用本 skill 目录中的 `run.sh`，禁止手工拼接 `git`、`gh` 或 `curl` 命令代替。
5. 必须报告合并结果、workflow run URL 和最终构建结论。
6. skill 或脚本不可用时必须停止，不得降级为手工等价流程。

## 执行方式

在满足第 2 或第 3 条的确认条件后，调用与本 `SKILL.md` 同目录的脚本：

```bash
bash "<skill-directory>/run.sh" [source-branch]
```

注意：`auto` 是给 agent 的调用指令关键字，不作为参数传给 `run.sh`；传给脚本的仍然只有可选的 `source-branch`。

当构建可能超过工具的前台等待时间时，应使用当前平台的长时间运行或等待机制，不得因前台超时将任务误判为失败。

## 脚本保证

`run.sh` 会依次：

1. 确认已跟踪的工作区改动为空。
2. 确认源分支已推送；本地仅领先时自动推送，落后或分叉时停止。
3. 通过 GitHub API 合并到 `test` 并复核合并结果。
4. 触发 `workflow_dispatch` 并确认新 workflow run 真实出现。
5. 轮询至构建结束；只有 `success` 视为成功。

## 执行前检查

- 当前项目是否在 `vanke` 目录树下。
- `test` 分支上是否存在 `.github/workflows/cicd.yml`，且 `workflow_dispatch` 定义了 `action_type` 和 `deploy_env` input。
- 非 `auto` 模式：是否已展示项目、源分支和目标分支，并取得用户确认。
- `auto` 模式：跳过人工确认，校验通过后直接执行。

## 参数

- `source-branch`（可选）：要合并的源分支，默认使用当前分支。
- `auto`（可选关键字）：免确认模式。由监控页面的“合并部署”按钮传入；只跳过人工确认，不跳过任何安全校验。
