---
name: java-code-explainer
description: When explaining Java project code, directory structure, or architecture to Java learners—especially those from frontend backgrounds. Provides a structured methodology: identify the layer → name the standard → trace the code → point out deviations. Triggers on requests about understanding Java code, explaining directories, interpreting project structure, or code reading guidance.
argument-hint: "[code-or-module-to-explain]"
---

# Java 代码解读方法论

当用户要求解释 Java 项目代码、目录结构、或架构设计时，遵循此方法论。

## 核心原则

**每段代码解释必须包含四个层次**：
1. **是什么**（概念定义，一句话说清）
2. **遵循什么标准**（Maven 规范 / 阿里规约 / Spring 约定 / 设计模式，说明来源）
3. **本项目怎么做**（贴实际代码路径 + 行号解释）
4. **好不好**（符合标准就肯定，不符合就指出并给出最佳做法）

## 解释目录结构时的固定套路

### 套路 1：先画全景图，再逐层深入

```
顶层（Maven 标准目录）→ 中间层（DDD 业务模块）→ 底层（三层架构分包）
```

说明时按这条线：最大范围的标准 → 具体到当前目录 → 和同级目录对比。

### 套路 2：必须列出子目录含义

每解释一个模块的目录结构，必须用表格列出：
- 子目录名
- 固定含义（所有人都这样用）还是本项目习惯（只有这个项目这样叫）
- 类比前端的概念（如用户有前端背景）

### 套路 3：标准叠加图

涉及多标准时，用嵌套缩进图展示标准间的层级关系：
```
Maven 标准目录
├── DDD 业务模块
│   ├── 三层架构
│   │   ├── Spring @Controller/@Service
│   │   └── MyBatis-Plus @TableName/BaseMapper
│   ├── 阿里规约 POJO（vo/bo/dto）
│   └── 项目自有约定（app/、job/）
```

## 解释代码文件时的固定套路

### 套路 1：先定位文件的层

```markdown
**这个文件属于 [Controller/Service/Mapper/Model/VO/BO] 层，职责是 [xxx]。**
```

### 套路 2：逐行或逐段解释

- 注解 → 解释作用 + 来源框架
- 关键方法 → 解释输入输出 + 调了谁
- 关键模式 → 解释设计模式名称 + why this pattern

### 套路 3：必须画调用链路

```markdown
前端 fetch('/api/xxx') → Controller.xxx() → Service.xxx() → Mapper.xxx() → DB
```

### 套路 4：POJO 对象必须用对比表格

```markdown
| 后缀 | 全称 | 职责 | 判断标准 |
|------|------|------|---------|
| DO   | Data Object | 数据库表1:1映射 | 有没有 @TableName？ |
| VO   | View Object | 前端展示专用 | 有没有 children 这种 DB 不存在的字段？ |
| DTO  | Data Transfer Object | 跨边界传输 | 是不是发给/来自另一个服务？ |
| BO   | Business Object | 业务操作临时容器 | 是不是为了一次特定计算而存在？ |
```

## 发现不规范之处时的固定话术

当代码不符合标准时，必须用固定结构指出：

```markdown
| 项 | 内容 |
|---|------|
| **违反规范** | [具体规范名称和条款] |
| **本项目实际** | [代码路径:行号 + 具体写法] |
| **最佳做法** | [正确的写法] |
| **偷懒写法** | [业内常见的简化做法] |
| **错误用法** | [更糟的情况，警醒作用] |
```

## 跨生态命名快查表

Java 生态碎片化严重，同一个概念在不同框架下叫法不同。解释时必须统一到「本质」这一列：

| 本项目实际叫法 | 阿里规约标准 | JPA/Hibernate 生态 | Spring 官方 | 本质 |
|-------------|------------|-------------------|------------|------|
| `model/` | `do/` | `entity/`或`domain/` | `domain/` | 数据库表 1:1 映射 |
| `vo/` | `vo/` | 无区分 | 无强制 | 前端展示专用结构 |
| `bo/` | `bo/` | 无区分 | 无强制 | 不映射 DB，用于组装计算 |
| 混在 `bo/` 或单独 `dto/` | `dto/` | `dto/` | `dto/` | 跨越边界的载体 |

## 技术栈速查（本项目的技术映射）

解释代码时遇到这些技术，统一用此对照关系：

| 技术/注解 | 作用 | 所属层 | 前端类比 |
|----------|------|--------|---------|
| `@SpringBootApplication` | 启动类 | 根 | `main.ts` / `index.js` |
| `@RestController` | REST 控制器 | Controller | API route handler |
| `@RequestMapping` | URL 映射 | Controller | 路由定义 |
| `@Service` | 业务 Bean | Service | 业务函数 |
| `@Autowired` | 依赖注入 | 全部 | `import` 但自动化 |
| `@Transactional` | 事务 | Service | 无直接类比 |
| `@Cacheable` | Redis 缓存 | Service | 缓存层 |
| `@Async` | 异步 | Service | `async/await` |
| `@Data` | Lombok | Model/VO | 自动生成类型 |
| `@TableName` | 表映射 | Model | schema 定义 |
| `BaseMapper<T>` | 自动 CRUD | Mapper | ORM |
| `@XxlJob` | 定时任务 | Job | cron job |

## 解释流程决策树

```
用户问的是什么？
├── 一个具体文件 → 套路：定位层 → 逐段解释 → 画调用链
├── 一个模块的目录 → 套路：全景图 → 子目录表格 → 标准叠加图
├── 一个概念（如 BO/VO 区别）→ 套路：对比表格 + 实际代码例子
├── 一个请求怎么处理 → 套路：从 Controller 画到 DB 的完整链路
└── 是不是不规范 → 套路：不规范五列表格
```

## 语言风格

- 中文为主，技术术语中英对照
- 多用「→」箭头表示数据流向
- 表格优于段落，代码优于描述
- 每个观点配一个实际文件路径
- 不确定的标准来源标注「推断」，确定的不标注
