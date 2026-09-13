---
name: react-scoped-styles
description: Enforce scoped React styles with CSS Modules and nested :global blocks so component styles never pollute global scope. Use whenever writing or modifying CSS, Less, SCSS, or className usage in a React project.
---

# React Scoped Styles — 禁止全局污染

适用于所有 React 项目的样式书写规范。**核心原则：样式不能污染全局作用域。**

---

## ⚠️ 强制执行规则（命中此 skill 时必须遵守，不得跳过）

1. **必须使用 CSS Modules** — 文件后缀必须是 `.module.less`，导入必须是 `import styles from './xxx.module.less'`。禁止全局导入和 namespace wrapper。
2. **必须通过自检清单** — 生成样式后必须逐条检查清单，任何一项不通过必须修正。
3. **禁止 namespace wrapper** — `.pf-root{}`、`.wrap{}` 等短前缀包裹不是真正的样式隔离，禁止使用。
4. **禁止空根类** — CSS Modules 根类必须承载容器样式，不能为空壳。

## 强制方案：CSS Modules + :global（唯一允许方案）

本项目 **只允许** CSS Modules + `:global{}` 方案。CSS-in-JS、Tailwind 等其他方案 **不在此项目使用**。

### 为什么不用 namespace wrapper

**namespace wrapper（如 `.pf-root { .xxx {} }`）不是真正的样式隔离：**

1. **前缀太短，极易冲突** — `.pf-root`、`.wrap`、`.root` 这类短名称，同一页面内多个组件很容易撞名
2. **没有构建工具保障** — namespace wrapper 依赖人工命名规范，没有编译器/打包器帮你检查唯一性
3. **嵌套子组件泄露** — `.pf-root .ant-btn {}` 会穿透到所有嵌套的子组件，影响子组件的 antd 样式
4. **CSS Modules 的 hash 机制从编译层面保证唯一性**，不会出现"两个组件恰巧用了同一个 namespace"的问题

**结论：禁止 namespace wrapper。必须用 CSS Modules。**

---

## 强制规则

### 1. 文件命名

样式文件必须以 `.module.less`（或 `.module.css`、`.module.scss`）结尾：

```
✅ index.module.less
✅ styles.module.css
❌ index.less
❌ styles.css
```

### 2. 导入方式

```tsx
// ✅ 强制：CSS Modules 导入
import styles from './index.module.less';

// ❌ 禁止：全局导入
import './index.less';
```

### 3. 根类命名

根类名必须**有意义**，不能是简短泛用词：

```
✅ .formRoot、.goodsPackageForm、.approvalDetail
❌ .root、.wrap、.box、.pf-root、.container
```

### 4. 基本模式

- 根选择器使用 CSS Modules（TSX 中用 `styles['xxx']` 或 `styles.xxx` 引用）
- 内部子元素写在 `:global {}` 块中，TSX 中直接用 `className="xxx"`

```less
// ✅ 正确：CSS Modules 根类直接承载容器样式
.formRoot {
  // 容器样式直接在根类下，不在 :global 中
  background: #f2f2f7;
  min-height: 100vh;

  :global {
    .cp-title { ... }
    .cp-content { ... }
  }
}
```

```tsx
// ✅ TSX 引用
import styles from './index.module.less';

<div className={styles.formRoot}>
  <h1 className="cp-title">...</h1>
  <p className="cp-content">...</p>
</div>
```

### 5. 父容器样式不能放在 `:global` 中

`:global` 只应包含子元素样式，不能包含与 CSS Modules 根类同级的类：

```less
// ❌ 错误：:global 中声明了与父容器同级的类
.formRoot {
  :global {
    .formRoot {             // 与父容器同级 — 禁止
      background: #f2f2f7;
    }
    .cp-title { ... }
  }
}

// ❌ 错误：父容器为空，样式全在 :global 中
.formRoot {                 // 空壳，无实际样式
  :global {
    .wrapper {              // 实际的父容器样式在 :global 中 — 禁止
      background: #f2f2f7;
    }
  }
}

// ✅ 正确：父容器样式在 CSS Modules 根类下
.formRoot {
  background: #f2f2f7;      // 父容器样式直接在根类
  min-height: 100vh;

  :global {
    .cp-title { ... }       // 只有子元素样式
    .cp-content { ... }
  }
}
```

### 6. 组件前缀命名

`:global` 内的类名必须加 2~3 字符的组件级前缀，避免与嵌套组件或同页面其他组件冲突：

| 组件 | 前缀 | 示例 |
|------|------|------|
| CheckinPopup | `cp-` | `.cp-title`, `.cp-actions` |
| ConfirmSkipPopup | `sp-` | `.sp-title`, `.sp-cards` |
| BtnGroup | `bg-` | `.bg-btns`, `.bg-more` |
| GoodsPackageForm | `pkgf-` | `.pkgf-anchor-tabs`, `.pkgf-section` |

前缀取组件名缩写，保持简短（2~4 字符）。

### 7. 嵌套深度 ≤ 3 层

选择器嵌套不超过 3 层。宁可用短横线拼接的平级类名，也不要写深层嵌套：

```less
// ❌ 过深 — 且无法体现 scoping 意义
.root :global {
  .card .body .row .label { ... }
}

// ✅ 平级化
.root :global {
  .cp-card-label { ... }
}
```

### 8. 第三方组件覆写规则

- 同一个第三方类名（如 `.adm-button`）在同一文件中只允许出现一次覆写声明
- 覆写第三方组件样式同样需要放在 CSS Modules 的 `:global {}` 内，避免污染其他页面

```less
// ✅ 正确：CSS Modules 包裹第三方覆写
.formRoot {
  :global {
    .adm-button { ... } // 仅在 .formRoot 作用域下生效
  }
}
```

---

## 🚫 禁止行为

```less
// ❌ 全局裸类名 — 污染所有组件
.title { ... }
.content { ... }

// ❌ 全局标签选择器 — 影响全局 DOM
div { ... }
p { ... }

// ❌ namespace wrapper（短前缀包裹，无构建工具保障）
.pf-root {                    // 太短，极易冲突
  .xxx { ... }
}
.wrap {                       // 太泛用
  .xxx { ... }
}

// ❌ 不加 CSS Modules 包裹的 :global
:global {
  .title { ... }
}

// ❌ 不加 scoping 的第三方覆写（同一份 .adm-button 影响全站）
.adm-button { ... }

// ❌ 全局 .less 导入（非 CSS Modules）
import './index.less';

// ❌ 空的 CSS Modules 根类（样式全在 :global 中）
.formRoot {                   // 空壳
  :global {
    .wrapper { ... }
  }
}
```

---

## 🔍 生成后自检清单（必须逐条检查）

生成或修改任何样式文件后，必须逐条检查以下项目：

- [ ] 文件扩展名是 `.module.less`（或 `.module.css`）？
- [ ] TSX 中是 `import styles from './xxx.module.less'`，**不是** `import './xxx.less'`？
- [ ] 根类名有意义（不是 `.root`、`.wrap`、`.pf-root`）？
- [ ] 根类样式在 CSS Modules 根类下，**不在** `:global{}` 中？
- [ ] `:global{}` 中的类名加了组件前缀（2~4 字符）？
- [ ] 没有裸的全局 `:global {}`（未被 CSS Modules 根类包裹的）？
- [ ] 嵌套深度 ≤ 3 层？
- [ ] 没有裸的第三方组件覆写（`.adm-button {}` 必须在 CSS Modules `:global{}` 内）？

**如果以上任何一项不满足，必须修正后再提交。**

---

## 特殊情况处理

### 1. 全局基准样式（reset / normalize）

只能在唯一的项目入口文件（如 `app.tsx`、`global.less`）中声明，且必须在文件顶部注释说明用途：

```less
// ✅ 全局基准重置 — 仅限入口文件
* { box-sizing: border-box; }
body { margin: 0; font-family: ...; }
```

### 2. CSS 变量 / 主题变量

CSS 变量（custom properties）定义在 `:root` 中不算污染，因为是设计系统的一部分：

```less
:root {
  --primary-color: #11af8e;
  --text-primary: rgba(0, 0, 0, 0.85);
}
```

### 3. 动画 keyframes

动画 keyframes 是全局命名空间，必须加项目/组件前缀：

```less
@keyframes cp-fadeIn { ... }    // ✅ 加前缀
@keyframes fadeIn { ... }       // ❌ 可能冲突
```

### 4. 兼容已有样式迁移

从全局 LESS 迁移到 CSS Modules 时，允许在根 div 上保留全局 class 以维持旧子组件样式：

```tsx
// ✅ 迁移阶段：根同时使用 CSS Modules 和全局 class
<div className={`${styles.formRoot} old-wrapper`}>
```

但 CSS Modules 根类 `.formRoot` 必须承载自身的容器样式，不能为空。
