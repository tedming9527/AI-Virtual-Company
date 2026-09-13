@RTK.md

# Ted 公司资料入口

项目开发会话由 Ted 公司统筹，读取以下公司目录中的 COMPANY.md、ROUTER.md、PROJECT_BINDING_POLICY.md，说明主责后执行用户授权的任务：
`/Users/dongdeming/Library/Mobile Documents/com~apple~CloudDocs/AI-Virtual-Company`

公司资料是统一来源。旧 claude-config 同步流程已停用，不再从旧目录恢复技能、角色、命令或规则。技能由负责人按需从公司资产中选择。系统插件、权限和运行配置仍由平台管理。

# 代码修改原则

## 最小改动原则

- 只改用户明确要求的代码，绝不顺手修改无关逻辑
- 用户说"修复A的展示"，就只改展示，不要顺带把B的提交流程也改了
- 每完成一步，用 `git diff` 自查：diff 中是否出现了用户没提到的改动？有就回退

## 精确还原原则

- 需要回退代码时，优先用 `git checkout HEAD -- <file>` 精确还原到原始状态
- 不要手动逐行还原，容易产生空格、缩进、换行等格式差异
- 还原后再只添加用户要求的改动

## 禁止自动提交代码

- 绝不自动执行 `git add`、`git commit`、`git push`
- 提交、合并、部署等 git 操作必须由用户明确指令
- 做完改动后停下，等用户确认再说下一步

## 多用 git 验证

- 每次改动后跑 `git diff --stat` 和 `git diff` 确认改动范围
- 不要依赖记忆，git 不会骗你

# Skill 使用规则

## 内置 Skill（随时可用）

| Skill | 用途 | 触发时机 |
|---|---|---|
| `/verify` | 运行 app 验证改动效果 | 每次改完代码后 |
| `/code-review` | 审查 diff 中的 bug 和冗余 | 提交前检查 |
| `/simplify` | 清理 AI 生成代码的啰嗦部分 | 完成功能后 |
| `/security-review` | 检查安全问题 | 涉及敏感逻辑时 |

## Skill 使用原则

- 改动代码后优先用 `/verify` 确认效果，不要只靠读代码
- 提交前用 `/code-review` 或 `/simplify` 检查 diff
- 部署任务由负责人核对公司中的部署技能、项目环境与用户授权后执行。

# CLAUDE.md 放置规则

项目的 `CLAUDE.md` 只能放到 `.claude/` 目录中，不能在项目根目录或其他位置创建。

- ✅ `.claude/CLAUDE.md`
- ❌ `CLAUDE.md`（根目录）
- ❌ `docs/CLAUDE.md`
