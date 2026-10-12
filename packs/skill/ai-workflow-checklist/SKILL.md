---
name: ai-workflow-checklist
description: Review an AI workflow when its asset discovery, context loading, tool execution or delivery evidence needs acceptance criteria.
---

# AI 工作流验收清单

按真实工作流建立证据链，而不是以工具安装、目录存在或署名推定已经生效。

- 明确用户目标、当前授权、项目范围和交付判据。
- 列出所用技能/知识的来源与版本，区分中央通用、本地自定义、外部发现和待复核候选。
- 分开“已发现、已登记、正文已交付、模型自报、实际调用已观察”；使用前加载所选正文，未知自动加载保持 unknown。
- 对执行前检查验证允许与拒绝两个方向，并核对拒绝后实际 handler 的副作用未发生。
- 记录真实返回、失败、补正与产物证据；缺退出码不能从工具未报错推定成功。
- 检查公开页面不会含个人目录、私人评分或自定义正文；候选 PR 单列，不能计入已发布包。
- 将问题转成可审查的改进候选；依据真实回归与当前授权发布，保留未覆盖的平台边界。

新增插件技能需区分“版本化缓存文件已发现”和“原生 skills/list 已列出”；禁用、未连接或未交付正文不能记为已使用。
