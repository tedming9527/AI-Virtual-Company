# migrations/ —— 版本迁移脚本约定（FR-4）

中央仓库发布新版本时，若存在破坏性变更，必须在此目录提供迁移脚本。

## 命名约定

```
migrations/<from-version>-<to-version>.js
```

例如 `1.0.0-2.0.0.js`。

## 执行规则

- `upgrade` 流程在更新 lockfile 前检查对应迁移脚本，存在则执行；
- 无破坏性变更（minor/patch 或 major 带兼容层）可跳过迁移脚本，直接更新 lockfile；
- 本地旧资产标 `legacy`，由 Agent 逐步重推导，不硬迁移。
