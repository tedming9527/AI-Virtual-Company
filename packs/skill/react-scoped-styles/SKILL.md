---
name: react-scoped-styles
description: Enforce compiler-safe scoped React styles with CSS Modules and narrowly scoped third-party overrides. Use whenever writing or modifying CSS, Less, SCSS, or className usage in a React project.
---

# React Scoped Styles — 禁止全局污染

适用于所有 React 项目的样式书写规范。**核心原则：样式不能污染全局作用域。**

---

## ⚠️ 强制执行规则（命中此 skill 时必须遵守，不得跳过）

1. **必须使用 CSS Modules** — 文件后缀使用 `.module.css`、`.module.less` 或 `.module.scss`，导入模块对象并通过 `styles.xxx` 引用项目自有类。
2. **必须通过自检清单** — 生成样式后必须逐条检查清单，任何一项不通过必须修正。
3. **根类必须由 CSS Modules 生成** — 页面或组件根节点使用有意义的模块类，第三方覆盖必须位于该根类之下。
4. **禁止空根类** — CSS Modules 根类必须承载容器样式，不能为空壳。
5. **一个页面或组件只维护一个 CSS Modules 样式文件** — 后续样式继续写入该文件，不按功能块增建 `xxx.module.less`。

## 强制方案：CSS Modules + 函数式 :global

默认只使用 CSS Modules。函数式 `:global(.class)` 是第三方组件或外部不可控类名的受限逃生口，不是项目自有元素的默认写法。

### 为什么不用 namespace wrapper

**namespace wrapper（如 `.pf-root { .xxx {} }`）不是真正的样式隔离：**

1. **前缀太短，极易冲突** — `.pf-root`、`.wrap`、`.root` 这类短名称，同一页面内多个组件很容易撞名
2. **没有构建工具保障** — namespace wrapper 依赖人工命名规范，没有编译器/打包器帮你检查唯一性
3. **嵌套子组件泄露** — `.pf-root .ant-btn {}` 会穿透到所有嵌套的子组件，影响子组件的 antd 样式
4. **CSS Modules 的 hash 机制从编译层面保证唯一性**，不会出现"两个组件恰巧用了同一个 namespace"的问题

**结论：禁止 namespace wrapper。必须用 CSS Modules。**

---

> Utoopack 1.5.14 会把块状 `:global { .child {} }` 中的类错误编译为模块哈希类。禁止块状 `:global {}`；只有第三方组件或外部不可控的字面量类名可以使用函数式 `:global(.class)`。

## 强制规则

### 1. 文件命名

样式文件必须以 `.module.less`（或 `.module.css`、`.module.scss`）结尾：

- 以页面或组件为维护单元，每个单元只保留一个 CSS Modules 样式文件。目录式页面/组件优先使用 `index.module.less`；同一页面新增头像、弹窗等局部样式时，继续写入它，不另建按功能命名的模块文件。
- 若该单元已有旧 `index.less`，且本次不适合迁移旧样式，可暂时保留旧文件，同时只新增一个 `index.module.less` 承载所有新增样式；以后继续复用这一个模块文件。旧文件不因此被视为第二个 CSS Modules 文件。
- 独立的子组件有自己的 React 文件和维护边界时，才按该组件自身计算一个样式文件；不要把同一页面的内部区块伪装成独立组件来规避此规则。

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

- 页面和组件自有元素全部使用模块类，TSX 中通过 `styles.xxx` 引用。
- 不要为了少写 `styles.xxx` 把自有类放入 `:global`。

```less
// ✅ 正确：CSS Modules 根类直接承载容器样式
.formRoot {
  background: #f2f2f7;
  min-height: 100vh;
}

.formTitle { ... }
.formContent { ... }
```

```tsx
// ✅ TSX 引用
import styles from './index.module.less';

<div className={styles.formRoot}>
  <h1 className={styles.formTitle}>...</h1>
  <p className={styles.formContent}>...</p>
</div>
```

### 5. 全局选择器只能使用函数式写法

```less
/* ✅ 第三方类受模块根类约束 */
.formRoot :global(.adm-button) { ... }

/* ❌ Utoopack 1.5.14 会错误散列块内的类 */
.formRoot :global {
  .adm-button { ... }
}
```

### 6. 项目自有类命名

项目自有类由 CSS Modules 隔离，不要求人工短前缀。类名应表达职责，避免 `.root`、`.box` 等无语义名称。

### 7. 嵌套深度 ≤ 3 层

选择器嵌套不超过 3 层。宁可用短横线拼接的平级类名，也不要写深层嵌套：

```less
// ❌ 过深
.formRoot .card .body .row .label { ... }

// ✅ 平级化并使用模块类
.formRoot .cardLabel { ... }
```

### 8. 第三方组件覆写规则

- 同一个第三方类名（如 `.adm-button`）在同一文件中只允许出现一次覆写声明
- 覆写第三方组件时使用函数式 `:global(.class)`，并由 CSS Modules 根类限制作用域。

```less
// ✅ 正确：CSS Modules 包裹第三方覆写
.formRoot :global(.adm-button) { ... }
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

// ❌ 块状 :global 在 Utoopack 下会错误散列内部类
.formRoot :global { .adm-button { ... } }

// ❌ 不加 scoping 的第三方覆写（同一份 .adm-button 影响全站）
.adm-button { ... }

// ❌ 全局 .less 导入（非 CSS Modules）
import './index.less';

// ❌ 空的 CSS Modules 根类配合全局子类
.formRoot {}
.formRoot :global(.wrapper) { ... }
```

---

## 🔍 生成后自检清单（必须逐条检查）

生成或修改任何样式文件后，必须逐条检查以下项目：

- [ ] 文件扩展名是 `.module.less`（或 `.module.css`）？
- [ ] 当前页面/组件是否只有一个 CSS Modules 样式文件，新增样式已复用它？若旧 `index.less` 暂留，是否仅有一个 `index.module.less`？
- [ ] TSX 中是 `import styles from './xxx.module.less'`，**不是** `import './xxx.less'`？
- [ ] 根类名有意义（不是 `.root`、`.wrap`、`.pf-root`）？
- [ ] 根类样式是否直接写在 CSS Modules 根类下？
- [ ] 项目自有元素是否通过 `styles.xxx` 引用，而不是字面量类名？
- [ ] 是否完全不存在块状 `:global {}`？
- [ ] 函数式 `:global(.class)` 是否只用于第三方或外部不可控类，并由模块根类约束？
- [ ] 嵌套深度 ≤ 3 层？
- [ ] 没有裸的第三方组件覆写（应写成 `.moduleRoot :global(.adm-button)`）？

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

从全局样式迁移时，可短期在模块根类下使用函数式 `:global(.old-class)` 维持旧子组件样式，并应在当前重构范围允许时改为模块类：

```tsx
// ✅ 迁移阶段：根同时使用 CSS Modules 和全局 class
<div className={`${styles.formRoot} old-wrapper`}>
```

但 CSS Modules 根类 `.formRoot` 必须承载自身的容器样式，不能为空。
