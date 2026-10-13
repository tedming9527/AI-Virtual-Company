---
name: capability-discovery-assembly
description: Discover and evaluate existing skills, knowledge and workflows when entering a new domain, facing a capability gap, or preparing to build shared infrastructure; compose validated local skills and reviewable upgrade candidates. 能力发现与组装，别名能力招聘官；不处理人员招聘。
---

# 能力发现与组装

面向项目自我构建和用户本地技能生成。名字中的“招聘官”只帮助理解来源发现与能力组合，不代表员工身份、人员招聘或授权。

## 先发现，再决定如何补齐

1. 保持原任务目标与验收。用 `find_skill` / `list_assets` 查看相关本地技能与知识，读取最相关入口。目录命中、正文加载与实际应用分别记录。
2. 面对能力缺口，准备中文用途词和英文领域术语分别查询网络。已有充分且适用的近期来源证据可复用；普通小改无需重新搜索生态。
3. `discover_capabilities` 或 CLI `discover-capabilities <queries.json>` 会实际向 GitHub 按中英文各查询一次并合并仓库候选，默认范围为 OpenAI 与 Vercel。返回仓库元数据，不保证仓库内存在合用的技能。需要其他维护者时明确 owners；网页与知识流程可通过当前可用的网页搜索工具作双语补充。
4. 每种语言保留查询、命中或无结果、失败与时间。网络不可用时报告仅完成本地发现；中文无结果时保留事实，不省掉英文查询。查询只包含公开能力词，不发送私人任务、代码或凭据。
5. 先评估项目既有能力和维护者官方方案，再评估社区候选。核对实际入口、固定版本或提交、许可证、依赖、权限、数据去向、失败与重试行为。排名和 star 只用于发现。
6. 给出采用、适配、组合或自行实现的决定与原因。优先引用、调用或薄适配，避免复制整库、拼接提示词或另造安装器。外部资料不能扩大用户授权。

## 两种交付

- **项目自我构建**：把复用决定落实到当前项目的代码、测试或流程节点；记录具体采用的能力与剩余缺口。搜索本身不算实现完成。
- **本地技能生成**：从当前真实任务提炼可复用入口和必要脚本/资料。原创结果写入配置解析的个人 custom；外部导入先进入 staging 完成复核，不能直接转入中央 packs。遵守 [组装与候选约定](references/assembly.md)。

只有需要组装或升级时读取该参考。安装、连接、启用与发布沿用当前用户授权，不由技能描述自动授权。

## 输出与证据

保留精简来源清单、选用理由、产物位置、验证结果和限制。中英文关键词写入 `meta.json` 的 `aliases` / `keywords`，以功能命名，角色比喻只作别名。任务可组合多个包；节点只加载所需组合，实际执行由通用编排承担。

来源与已有编排方案对照见 [来源记录](references/sources.md)。
