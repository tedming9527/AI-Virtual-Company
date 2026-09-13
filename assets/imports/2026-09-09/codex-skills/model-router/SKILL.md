---
name: model-router
description: Recommend an AI model for a task by matching task complexity and type to portable fast, balanced, or deep capability tiers, then map that tier to the current platform. Use when the user asks which model to use or asks to switch models.
---

# Model Router

## Required workflow

1. Read the shared routing rules and the current platform's model mapping before recommending a model.
2. Match the task to a capability tier: `fast`, `balanced`, or `deep`.
3. Explain which rule matched and why.
4. Ask for confirmation before changing the active model. Never switch models without explicit confirmation.
5. If the platform cannot switch models programmatically, explain how the user can select it; do not claim it was switched.

## Tier rules

- `fast`: typo, formatting, rename, short explanation, comments, or small documentation edits.
- `balanced`: feature implementation, ordinary debugging, refactoring, tests, and frontend work.
- `deep`: architecture, security or comprehensive review, cross-service migration, database design, concurrency, or difficult performance analysis.

Choose the highest-complexity matching tier. When uncertain between two tiers, recommend the higher tier and say why.

## Platform mapping

Read the mapping referenced by `ai-config.yaml` under `adapted_skills.model-router.platform_mapping`. Model identifiers are platform-owned and must not be copied from another platform.

Use this response shape:

```text
推荐模型：<platform model>
能力层级：<fast|balanced|deep>
命中规则：<rule and reason>
是否切换？
```
