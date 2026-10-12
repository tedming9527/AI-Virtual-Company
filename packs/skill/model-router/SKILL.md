---
name: model-router
description: Match a task to fast, balanced, or deep capability tiers and the models actually available in the current runtime. Use when the user asks which model to use or asks to switch models.
---

# Model Router

1. 按任务最高复杂度选择能力层级：fast（机械编辑、简单解释）；balanced（常规开发、排错、测试）；deep（架构、安全、跨系统及复杂综合审查）。
2. 从当前平台提供的模型清单、用户配置或维护者官方资料核对可用模型与限制。模型身份未知时明确 unknown，不凭平台品牌或历史映射猜测。
3. 保留用户指定的模型下限、推理强度和成本要求；给出推荐及一句原因。已有明确切换授权可执行可用切换工具；无切换工具则说明操作入口，不宣称已切换。
4. 不读取外部模型映射配置，不跨平台复制模型名。用户只要推荐时不改配置。
