---
name: jev-use
description: Use Jev for structured judgments with finite options and sufficient evidence, especially batch classification or triage. Skip ordinary command exit checks, trivial decisions, open-ended reasoning, and writing tasks.
---

# Jev 结构化判断

对已有事实作有限选项判断或批量分类。事实不足、需要创造方案、普通命令退出码检查和已知答案无需调用；本技能不自动安装工具或设置全局 Hook。

- 当前上下文中的同一批事实：通过已可用的 `jev_judge` 一次提交相关问题与最小充分事实。
- 文件中的批量数据：在已授权的数据范围内通过已安装的 `jev-use judge` 处理，避免把整批资料重复注入对话。
- 判断结果只作辅助；`escalate: true`、证据冲突或不可达时回到当前执行者核对，不能把结果当成新增授权。
- `jev_gate` 或 Hook 仅用于用户明确要求并已配置的特定门禁；不得由本技能把所有工具调用改成额外审批。

有限选项并不保证判断正确。保留来源与必要抽查，费用、延迟和节省效果按当前部署实测，不沿用未经核验的性能数字。
