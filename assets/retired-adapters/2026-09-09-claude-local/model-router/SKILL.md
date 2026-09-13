# Model Router

智能模型路由器 — 根据任务特征自动匹配最优模型，原生 Claude Code，零外部依赖。

## 触发条件

当用户消息包含以下任一意图时自动激活：
- 询问"用哪个模型"、"切换模型"
- 任务描述模糊，不确定该用哪个模型
- 用户显式调用 `/model-router`

## 路由逻辑

### 1. 读取配置

按优先级查找配置文件（找到第一个即停止）：
1. 项目级：`.claude/model-router.conf`
2. 用户级：`~/.claude/model-router.conf`

### 2. 规则匹配

配置文件定义了一组路由规则，每条规则包含：
- `[rule.<name>]` — 规则名
- `match` — 匹配条件（关键词、文件类型、任务类型）
- `model` — 推荐模型
- `priority` — 优先级（数字越大越优先，默认 0）

匹配方式：
- **关键词匹配**：任务描述中包含指定关键词 → 命中
- **文件匹配**：当前操作的文件扩展名匹配 → 命中
- **任务类型**：分析/生成/重构/修复/审查/解释 → 命中

### 3. 模型选择

多条规则命中时，选 priority 最高的；同 priority 选第一条。无命中时使用默认模型（配置中 `[default]` 段）。

### 4. 输出

直接告诉用户推荐哪个模型及原因，然后询问是否切换。如果用户已明确表示要切换，直接执行 `/model`。

## 配置文件格式

```ini
# ~/.claude/model-router.conf 或 .claude/model-router.conf

[default]
model = sonnet

# --- 简单任务 → Haiku ---
[rule.quick-fix]
match = fix typo, fix lint, fix format, rename, add comment, simple refactor, 修注释, 改名字, 加注释, 格式化
model = haiku
priority = 50

[rule.explain]
match = explain, what is, how does, 解释, 这段代码, 这个函数
model = haiku
priority = 40

[rule.docs]
match = write doc, add doc, javadoc, readme, 文档, 注释, 说明
model = haiku
priority = 30

# --- 常规任务 → Sonnet ---
[rule.feature]
match = implement, add feature, create, 实现, 新增, 添加功能
model = sonnet
priority = 60

[rule.bugfix]
match = fix bug, debug, error, crash, 修复, bug, 报错
model = sonnet
priority = 60

[rule.refactor]
match = refactor, restructure, extract, split, 重构, 拆, 提取
model = sonnet
priority = 50

[rule.test]
match = write test, add test, unit test, 测试, 用例
model = sonnet
priority = 40

# --- 复杂任务 → Opus ---
[rule.architecture]
match = architecture, design system, design pattern, 架构, 设计
model = opus
priority = 80

[rule.review]
match = code review, security review, audit, 审查, 审计, 全面检查
model = opus
priority = 70

[rule.complex]
match = multi-module, cross-service, migration, database schema, 多模块, 迁移, 数据库设计
model = opus
priority = 70

# --- 特殊场景 ---
[rule.frontend]
match = react, vue, css, tailwind, component, UI, 前端, 组件, 样式
model = sonnet
priority = 55
```

## 使用示例

```
用户: /model-router 帮我重构这个 UserService
路由: 命中 [rule.refactor] → sonnet
输出: 📋 推荐使用 **Sonnet** — 重构任务需要平衡速度和质量
      是否切换到 Sonnet？(当前: opus)
```

## 注意事项

- 配置文件修改后立即生效，无需重启
- 项目级配置覆盖用户级同名规则
- 如果没有配置文件，使用内置默认规则（即本文件中列出的规则）
