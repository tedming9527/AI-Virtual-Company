# 监督执行契约模板

chief-of-staff 统筹，ai-engineer 维护适配，test-expert 复核行为。用户明确要求监督、预算或多执行者时加载；普通单步任务不自动增加监督代理。登记角色、实际执行者、目标、模型/推理（未知 unknown）、文件所有权和验收。

规则加载、计划生成、真实启动分别记录。未接通所需通道仅阻断对应要求，“启用监督者”文字、任务卡和 JSON 不是执行证据。

## 现存本地运行器

[supervisor-runtime](../../../../scripts/supervisor-runtime.mjs) 支持显式命令数组的 run/status/cancel，默认无 shell，不扫描 inbox 自动执行历史命令。阅读当前源码并配置后，从仓库根使用：

```sh
node scripts/supervisor-runtime.mjs run --plan <verified-plan-file>
node scripts/supervisor-runtime.mjs status <run-id>
node scripts/supervisor-runtime.mjs cancel <run-id>
```

计划自行核对当前授权、command/args、cwd、依赖、并发、poll_ms 与超时，运行使用新 ID。参数和命令允许范围不构成 OS 沙箱，不能约束命令全部副作用。模型与额度字段无可信适配器时拒绝，不能降格为普通进程成功。

现存工具将状态、心跳、事件和日志写入 `<execution-root>/runtime/supervision/<run-id>/`，默认终态回执位于 `runtime/receipts/`。`AI_VIRTUAL_COMPANY_RECEIPTS_DIR` 可显式注入已解析个人项目 inbox；运行器本身不解析 bootstrap.storage。部署按 [README](../README.md) 的存储优先级解析后传入，不猜个人目录。cwd 受实际执行根约束；路径检查不是强沙箱，不自动改变任务授权。

## 真实监督与停止

进程启动事件后才 running，持续刷新心跳与进度；依赖失败阻断下游，独立任务按槽补位。超时/取消先请求停止，确认退出才记终态。只处理当前运行创建的进程组，不以历史 PID 杀进程；退出后核对剩余后代。主动 setsid/detached 逃离的守护进程不在停止保证内，更强要求需要获准且验证过的 OS 隔离。

run ID 不重用；崩溃/心跳过期为 needs_attention，先确认旧运行停止、可重试再新 ID 关联，不自动重放副作用。监督进程须存活；会话外长期运行需要宿主保障，不能用临时会话承诺永久服务。无通知通道不声称告警已主动送达，主会话读取状态并报告有意义变化。

## 声明门禁与原生通道

supervision_live 只由任务绑定的实际回执、新鲜心跳、目标真实运行与可信状态产生，登记、绑定、Hook、清理、名字或署名不能代替。独立人员身份由部署身份适配器另验；二者互不推出。公司的任务绑定监督门禁、Hook 出口门禁与原生平台状态适配器由部署提供，未部署不能声称具备，更不能称不可绕过。

本地工具不能枚举平台侧栏、读取全局会话、验证人员本人、原生模型或额度。原生协作由实际工具派发，保存 run/thread ID、等待、补位、异常取消和收口；文件工具不能伪造回执。用户明确指定模型或预算而无可信通道时阻断该范围。中断后从原 ID 核状态恢复，不盲派副本；终态前不以最终回复代替等待。

验收分别覆盖成功、依赖失败、补位、超时退出、取消确认、重复启动、心跳失效和模型/计量不支持拒绝。退出码 0 只证命令成功，业务成果另按交付政策。记录层、真实进程、原生模型和计量结算分别报告。
