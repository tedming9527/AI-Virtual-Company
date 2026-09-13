---
name: vanke:merge-to-test-and-deploy
description: Merge current branch to test and trigger remote build/deploy via GitHub Actions. Use when user says "/merge-to-test", "合并到test", "merge to test", "部署到test", "deploy to test", or wants to merge current feature branch to test branch and trigger CI/CD deployment. Only effective for projects under /vanke directory.
argument-hint: "[source-branch]"
allowed-tools: [Bash(git:*), Bash(gh:*), Bash(curl:*)]
---

# Merge Current Branch to Test and Deploy

将当前分支（或指定分支）通过 GitHub API 远程合并到 `test` 分支，并触发 GitHub Actions workflow 构建部署到 test 环境。

## 执行方式

直接调用 `run.sh` 脚本，传入用户指定的源分支（如有）。脚本会自动从 git remote 检测仓库 owner/name，无需手动指定。

```bash
bash "$HOME/.claude/skills/vanke-merge-to-test-and-deploy/run.sh" $ARGUMENTS
```

`run.sh` 自动完成：
1. 从 `git remote get-url origin` 解析 GitHub owner/repo
2. 确定源分支（参数 > 当前分支）
3. 验证 `.github/workflows/cicd.yml` 存在且源分支在远程存在
4. 获取 GitHub token（`gh auth token` > `GITHUB_TOKEN` > git credential）
5. 通过 GitHub API 远程合并源分支到 `test`
6. 触发 workflow dispatch（`action_type=build-and-deploy`, `deploy_env=test`）
7. 输出触发的 workflow run URL

## 参数

- `source-branch`（可选）：要合并的源分支，默认使用当前分支

## 示例

```
/merge-to-test                    # 合并当前分支到 test 并部署
/merge-to-test feat/my-feature    # 合并指定分支到 test 并部署
```
