---
name: mephisto:save-summary
description: 将当前对话中的知识总结、代码解析、架构分析等内容保存到 mephisto 解析目录（iCloud 同步）。自动扫描已有文件编号，生成下一个序号，并根据内容生成合适的中文文件名。触发词："保存到解析"、"存到解析目录"、"记下来"、"保存总结"。
argument-hint: "[可选：自定义文件名，不填则自动生成]"
---

# 保存总结到 mephisto 解析目录

将对话中产生的知识总结、代码解析、概念详解等内容，保存为 Markdown 文件到 iCloud 同步的 mephisto 解析目录。

## 保存目录

```
/Users/dongdeming/Library/Mobile Documents/com~apple~CloudDocs/mephisto解析/
```

## 执行步骤

### 1. 扫描已有编号，确定下一个序号

```bash
ls "/Users/dongdeming/Library/Mobile Documents/com~apple~CloudDocs/mephisto解析/" | grep -oE '^[0-9]+' | sort -n | tail -1
```

取最大编号 +1，补零为两位数（如 `08` → `09`）。若目录为空则从 `00` 开始。

### 2. 生成文件名

**如果用户指定了文件名（$ARGUMENTS）：** 直接使用，仅补编号前缀。

**如果用户未指定：** 根据总结内容的核心主题，生成简洁的中文文件名。格式：

```
{编号}-{主题}.md
```

示例：
- `09-MyBatis-Plus自动填充机制.md`
- `10-订单状态机流转规则.md`
- `11-Spring事务传播行为.md`

### 3. 整理总结内容

从当前对话中提取需要保存的内容，整理为结构化的 Markdown 文档：

- 标题清晰，层级分明
- 保留对话中的代码示例、表格、图示
- 如有生活化比喻，一并保留（这是精华）
- 开头加一行 `> 来源：mephisto 项目代码阅读` 的引用说明

### 4. 写入文件

使用 Write 工具将内容写入目标路径。

### 5. 确认结果

输出保存路径和文件编号，让用户知道已保存。格式：

```
✅ 已保存到 mephisto 解析目录：
   📄 {编号}-{文件名}.md
   📁 ~/Library/Mobile Documents/com~apple~CloudDocs/mephisto解析/
```

## 注意事项

- 该目录通过 iCloud 多设备同步，保存后自动在其他设备上可用
- 文件名使用中文，与目录内已有文件风格保持一致
- 如果内容是对某个具体 Java 类的解析，文件名中应包含类名
- 不要在项目 docs/ 目录下留副本，统一存放在 iCloud 解析目录
