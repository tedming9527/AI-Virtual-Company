# 职业转型站点交接

状态：首轮已交付，后续按月复核。  
Owner：沈砚舟 · 后端培训导师（资深后端架构师）

## 项目位置

- 本地源代码：`/Users/dongdeming/Documents/Codex/2026-09-17/realtime-voice-chat/outputs/learning-progress-docker`
- Sites 项目：`appgprj_6aaaca4b63ac8191ac4746507d5624a1`
- 私有生产地址：`https://learning-progress-hub.tedming9527.chatgpt.site`
- 当前版本：1
- 源码提交：`81c7626f1ccb831d4d9dc910166a36ecc495854d`
- 受众：owner-only；禁止未经用户明确要求改为共享或公开。

## 当前功能

- 展示个人档案、可迁移优势、短板、职业路线、市场来源审计、招聘要求频次和官方工资基准。
- D1 持久化四周任务、阶段勾选、任务完成和验收/阻塞备注。
- 任务超过计划日期且未完成时显示延期警报和追回动作；不自动改原日期。
- 明示 0/100 正式有效岗位与 80/100 平台内去重候选，禁止把候选升级为正式样本。

## 数据事实源

- 能力档案：`memory/learner/CAPABILITY_PROFILE.md`
- 市场来源：`memory/learner/MARKET_SOURCE_REGISTRY.md`
- 本轮完整报告：`output/2026-09-19-career-market-and-learning-plan.md`
- 学习事实源：`/Users/dongdeming/Documents/ted-projects/ai-branch/spring-test-web/docs/learning/PROGRESS.md`

## 后续更新流程

1. 先读取站点 D1 进度与学习项目真实代码、测试、运行证据。
2. 按相同筛选口径补正式岗位样本；记录来源不可用、验证码、重复、时效未知，不绕过限制。
3. 更新能力档案时区分用户本人、混合和 AI/员工归属；打勾不是能力证据。
4. 重新构建、提交、推送到 Sites 托管源码仓库，保存新版本后私有发布。
5. 满足正式 100 样本且具有真实投递反馈后，才生成条件化个人薪资区间。

## 已知限制

- 发布构建在 Node 18 上成功，但 Vite 7 提示建议使用 Node 20.19+ 或 22.12+；下次维护应升级本地 Node。
- Sites 发布后无公开匿名访问；未登录 HTTP 检查返回 401，符合私有站点预期。
- 浏览器自动化打开私有站点本轮超时；已验证构建成功、Sites 部署成功和 owner-only 访问配置，但未取得发布后截图。
