@RTK.md

# iCloud 多设备同步

全局规则文件（CLAUDE.md、RTK.md）的主副本存放在 iCloud 云盘，实现多台电脑共享：
- **iCloud 路径**: `~/Library/Mobile Documents/com~apple~CloudDocs/claude-config/`
- **本地路径**: `~/.claude/`

每次对话开始时，如果本地文件比 iCloud 文件旧（或本地不存在），自动从 iCloud 同步最新版本后再开始工作。本地修改规则后也要同步更新到 iCloud，保证多设备一致。

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

## 项目 Skill（`~/.claude/skills/`）

| Skill | 用途 |
|---|---|
| `vanke-merge-to-test-and-deploy` | 合并当前分支到 test 并触发 CI/CD 部署 |
| `java-code-explainer` | 解释 Java 代码 |

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
- 部署用 `vanke-merge-to-test-and-deploy` skill，不要手动拼命令

# iCloud 同步内容

所有全局配置统一存放在 iCloud，多设备共享（`~/Library/Mobile Documents/com~apple~CloudDocs/claude-config/`）：

| 文件/目录 | 用途 |
|---|---|
| `CLAUDE.md` | 全局规则 |
| `RTK.md` | RTK 规则 |
| `settings.json` | hooks、permissions、MCP servers 等 |
| `settings.local.json` | 本地覆盖配置 |
| `commands/` | 自定义 slash commands |
| `skills/` | 自定义 skills |
| `agents/` | 自定义 agents |

每次对话开始检查 iCloud 是否有更新的版本，本地修改后回写 iCloud。

# CLAUDE.md 放置规则

项目的 `CLAUDE.md` 只能放到 `.claude/` 目录中，不能在项目根目录或其他位置创建。

- ✅ `.claude/CLAUDE.md`
- ❌ `CLAUDE.md`（根目录）
- ❌ `docs/CLAUDE.md`
