---
name: state-vs-computed
description: 状态变量必须通过可操作的机械规则判断是否应该存储还是计算 — 通用前端架构原则
metadata:
  type: feedback
---

# 操作规则

写代码时对每个 `useState` / `setXxx` 执行以下检查：

## 规则1（主要）：能从其他状态推算吗？

```
❌ 有 setX(newValue) 的地方，同时也有 setY(something)
   Y 能根据 X 算出来 → Y 不应是状态，改用 useMemo / 渲染时计算

❌ 同一个语义值在多个 setState 中被更新（如同步 details 后又同步 files）
   → 只保留一个 state，另一个派生

✅ 修正方式：
   - 找到"因"（修改它的操作最少）→ 保留为 state
   - 找到"果"（跟着因变的）→ 改为 useMemo(() => 因.map/filter/reduce(...))
```

## 规则2（辅助）：写入点有几个？

```
❌ 同一个状态在 3+ 个不同函数中被 setXxx
   → 很可能是在手动同步，考虑合并/派生

✅ 一个状态只有 1-2 个写入点 → 大概率是真正的原始数据
```

## 规则3（检查）：删除一个状态后，需要补多少代码？

```
❌ 删除 details 需要修改 5 个函数
❌ 删除 files 只需要修改 useEffect(re-sync)
   → files 是派生值（果）

✅ 删除 duplicate 状态 → 只需要 1 个 useMemo 替代
   → duplicate 是派生值（果）
```

## 具体执行流程

```
for each useState:
  1. 注释掉这个 state 和所有 setXxx 调用
  2. 问：能用其他 state/props 计算出来吗？
     能 → 删掉 state，用 useMemo/渲染计算替代
     不能 → 保留
```

## 常见信号（看到就应警觉）

| 信号 | 含义 |
|---|---|
| `setA(...); setB(...)` 连续出现 | B 可能应该从 A 派生 |
| 函数名带 `sync` | 在手动同步两份数据 |
| `useEffect(() => { setY(computeFromX) }, [x])` | Y 应该用 useMemo |
| 状态类型是另一个状态类型的子集（如 `filteredList ⊆ allList`） | filteredList 不应是 state |
| 修改数据后需要调用"复查/修复"函数 | 复查逻辑应该放在派生中 |
