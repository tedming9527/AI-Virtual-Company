---
description: Merge current branch to test and trigger remote build/deploy via GitHub Actions. Only for projects under /vanke directory.
argument-hint: "[source-branch]"
allowed-tools: [Bash(git:*), Bash(gh:*), Bash(curl:*)]
---

# Merge Current Branch to Test and Deploy

将当前分支（或指定分支）通过 GitHub API 远程合并到 `test` 分支，并触发 GitHub Actions workflow 构建部署到 test 环境。

## 执行

```bash
bash "$HOME/.claude/skills/vanke-merge-to-test-and-deploy/run.sh" $ARGUMENTS
```

`run.sh` 自动完成：检测 GitHub owner/repo → 验证前置条件 → 获取 token → 远程合并 → 触发 workflow dispatch → 输出 run URL。
