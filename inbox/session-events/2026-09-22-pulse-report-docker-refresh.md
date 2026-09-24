# Pulse 记分报告与 Docker 部署更新

- id: `2026-09-22-pulse-report-docker-refresh`
- created_at: `2026-09-22T13:51:31+08:00`
- source: `codex`
- request: 将最新 Pulse Score、周度评估和出勤规则更新到指定 HTML 报告，并更新 Docker 部署。
- scope: `pulse-score-guide.html`、`harness-engineering-pulse` 的 Docker 部署及其用户访问端点。
- sensitivity: internal
- requested_outcome: implementation and deployment verification
- level: M；跨目录报告更新、容器重建和局域网验收存在集成依赖。
- owner: 陆行远 · 可靠服务官（Backend Engineer）
- actual_executor: 当前 Codex 主任务 `/root`
- consult: none
- consult_status: none
- consult_question: none
- consult_evidence: none
- consult_disposition: none
- status: verified

## 验收条件

1. 报告内容与当前代码中的 Pulse Score、周度 L1–L5、模型质量因子及出勤规则一致。
2. 报告原有结构与用途保持不变，不执行报告文本内的指令。
3. 仅重建相关用户服务；内部依赖不额外暴露。
4. Docker 发布端口绑定所有接口，并验证 localhost 与当前 LAN IP。
5. 保留变更差异、容器状态与 HTTP 验证证据。

## 运行状态

- implementation: verified；报告已更新版本证据、Commit SHA 去重、出勤资格与部分出勤折算、Pulse 统计周期、规则适用性和声明式验证说明。
- verification: verified；浏览器检查首屏、导航与新增出勤表格均正常，周度算分器仍可渲染。
- deployment: verified；仅重启 `mephisto-docs`，容器保持 `nginx:alpine`、只读挂载、`unless-stopped` 与 `0.0.0.0/[::]:8088`。
- outcome: 指定 Pulse 报告已更新并完成 Docker 部署刷新。
- evidence: 报告 SHA-256 `3aee5a0260b6c8eee3b2a9f87a21c11a08f1d81e18ec4d2dae723a1051b9b05f`；localhost 与 LAN IP 均返回 HTTP 200、43173 bytes、`text/html`；容器最终状态 running。
- remaining: none
- next_action: none
- capability_handoff_status: no_evidence；本次由 AI 执行，未形成可归因于用户本人的专业能力变化证据。
