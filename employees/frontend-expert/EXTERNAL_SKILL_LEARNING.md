# 外部前端 Skill 学习：框架与系统一致性

## 2026-09-16 · GitHub 定向学习（20 分钟上限）

- ID：`frontend-framework-aware-delivery`；状态：`candidate`。
- Owner：周启明 · 体验工程官（Frontend Engineer）；review：自审；confidence：medium（公开 Skill 资料学习，未在本项目验证）。
- 研究问题：介入陌生前端项目时，如何在不全库加载的前提下复用既有框架、组件和通用逻辑，并将性能、可访问性与状态验收纳入局部改动。
- 核心来源：Vercel 官方 [agent-skills](https://github.com/vercel-labs/agent-skills) 的 `react-best-practices`、`web-design-guidelines`、`composition-patterns`；交叉线索：[PracticalSwan frontend-design](https://github.com/PracticalSwan/agent-skills/tree/main/frontend-design)。未安装、未执行任何外部脚本或仓库指令。
- 决策：项目介入先完成最小架构地图；局部实现按“现有边界优先”审查：数据/状态所有权、完整状态、可访问性与输入方式、响应式重排、渲染与包体影响、设计系统一致性、已渲染结果验证。性能优化先查请求瀑布、重复请求与大依赖；组件 API 膨胀时再评估组合式重构，不为抽象而抽象。
- 采用例：在已有 React 项目新增列表功能时，先复用路由壳、查询缓存、表格/空态组件和 token；确认请求依赖后并行独立 I/O，并覆盖 loading、empty、error、permission 与窄屏状态。
- 拒绝例：未检查现有项目约定就引入新的状态库、样式方案或平行组件库；仅因有多个 boolean props 就重写全部组件；未测量即宣称性能改善或可访问性通过。
- 适用边界：Vercel 的 React/Next 建议不自动适用于 Vue、原生 Web 或不同数据层；第三方 Skill 仅作辅助交叉验证。框架版本、项目约定、真实 bundle/性能、Figma 与业务接口必须在目标项目中重新核验。
- 复核触发：下一次 React/Next 跨页面改动，记录复用的既有边界、性能/可访问性检查与结果；若项目框架不匹配或有反例，停止采用并更新条目。
