# 公司初始化与跨设备迁移政策

级别：公司最高规则之一  
责任人：陈知行 · 路由官（Chief of Staff）

## 目标与事实源

iCloud 中的 `AI-Virtual-Company` 是公司规则、岗位档案、知识与公司 Skill 的唯一事实源；平台指令、hook 和安装副本只是适配器。公司根目录优先取 `AI_VIRTUAL_COMPANY_ROOT`，未设置时才使用当前系统的 iCloud 默认位置。事实源、知识和模板不得写入机器用户名、绝对路径、凭据或平台会话。跨设备资料使用 `$AI_VIRTUAL_COMPANY_ROOT`、`$MEPHISTO_ANALYSIS_ROOT`、`$VANKE_WORKSPACE_ROOT`、`$TED_PROJECTS_ROOT`、`$CODEX_ARCHIVE_ROOT` 等逻辑路径；具体映射属于平台本地配置，未解析时保持 unavailable，不猜测路径。

## 四个独立状态

不要把下列状态互相替代，也不要以未满足的状态扩大阻断范围。

| 状态 | 最低证据 | 可以声明 | 不可以声明 |
|---|---|---|---|
| `company_ready` | 根目录已解析，`scripts/check-company-bootstrap.sh` 通过 | 公司事实源可用 | 项目已绑定、平台已拦截、任务受监管 |
| `binding_active` | 当前会话实际加载项目绑定指令 | 当前回合按公司治理路由 | hook 已验证、此前会话已覆盖 |
| `platform_hook_verified` | 当前平台实际注入可验证标记，且该适配器已按平台契约验收 | 当前入口 hook 已验证 | 组织级不可关闭、任务受监管 |
| `supervision_live` | 实际执行回执与新鲜心跳均通过监督门禁 | 当前任务正在受监管 | 后台通知已送达、其他任务受监管 |

缺少 `platform_hook_verified` 时，不得声称“平台强制接管”；但 `company_ready` 与 `binding_active` 已具备时，仍可按用户已授权范围工作。只有用户明确要求平台强制、不可绕过或持续监督时，缺失对应状态才是阻断条件。

## 基础加载与条件加载

1. 声称公司接管、路由岗位或使用公司知识前，先取得 `company_ready`，并读取 `AGENTS.md`、`COMPANY.md`、`ROUTER.md`、`MEMORY_POLICY.md`、`KNOWLEDGE_POLICY.md` 与 `skills/ASSET_REGISTRY.md`。资产登记只用于发现公司 Skill；不自动加载 Skill 正文。
2. Codex 的全局适配器必须要求每个新会话先由陈知行 · 路由官（Chief of Staff）按 `COMPANY.md` 与 `ROUTER.md` 指定一名主责员工，并仅在有实质价值时指定至多一名顾问；首个实质回复须声明主责、咨询和交付目标。`/root` 等平台主代理只表示执行容器，不是员工分配。该规则的规范源为 `assets/imports/2026-09-09/ai-config/targets/codex.md`，同步目标为 `~/.codex/AGENTS.md`；不得只改适配器副本。初始化失败时报告 `blocked`，不得虚构分配。
3. 仅在信号命中时加载下列规则：项目绑定/迁移/恢复读取 `PROJECT_BINDING_POLICY.md`；模型预算或学习读取 `LEARNING_POLICY.md`；监督或多执行者读取 `SUPERVISION_POLICY.md`；临时任务生命周期读取 `TASK_LIFECYCLE.md`；交付、度量、独立评测和知识维护分别读取对应政策或手册。
4. 岗位知识先读主责的 `PROFILE.md` 与 `MEMORY.md`；仅在目录命中时读详情。摘要必须提供触发、可执行结论、关键限制、状态/时效和详情链接；摘要不授权行动，也不替代安全、授权或原始证据。
5. 条件加载不取消授权边界：外部或破坏性写入须有用户授权；未知模型、绑定、执行回执或计量一律标为 `unknown`、`blocked` 或 `partial`，不得补推为已执行。

## 平台适配边界

Codex hook 只在实际受信任、当前平台契约与回归测试均已验证时，才可产生 `platform_hook_verified`。`.codex/hooks.json`、`scripts/codex-company-takeover-hook.mjs` 和 `$ted-takeover` 均不能证明此前会话或后台监督；手动恢复只从调用时刻生效。平台输入字段、阻断行为、工作目录和通知语义属于适配器假设，未在目标平台验收前必须标为 `unverified`，不得写成公司事实。

`supervision_live` 仅由 `SUPERVISION_POLICY.md` 定义的实时执行证据产生。项目绑定、任务卡、模型预算解析、hook 注入和本地清理均不是监督证据。用户级 hook 可由用户管理；没有管理员托管证据时，不得称“不可绕过”或“组织级强制”。

## 完整性、迁移与变更

`scripts/check-company-bootstrap.sh` 只检查跨平台公司事实源、花名册和公司 Skill 规范源；它通过不等于平台 hook 已安装或已生效。平台适配器使用独立的、平台内可复验的验收，不把平台私有配置加入跨设备 bootstrap 门槛。

初始化失败时停止公司接管声明，按下方沟通边界报告实际影响；不得编辑平台副本来替代公司事实源。新增/退役岗位同步 `employees/ROSTER.txt`、`COMPANY.md` 与 `ROUTER.md`。修改事实源后才更新适配器；涉及目录结构或必需资产时，同步更新完整性检查并完成一次冷启动验证。

## 公司定位与业务沟通边界

- 公司根目录独立于业务工作目录。全局适配器必须先解析 `AI_VIRTUAL_COMPANY_ROOT`；未设置时，macOS 使用当前用户 iCloud Drive 中的公司目录。在该根目录读取政策并执行完整性校验；不得因业务仓库不存在公司政策文件就判定公司初始化失败，不得复制公司政策到业务仓库。
- 保留每个新会话默认初始化与员工路由。初始化失败时，`blocked` 仅描述无法完成的公司初始化部分，不自动阻塞普通业务任务；继续与否取决于任务本身的授权、权限与项目约束。明确依赖公司治理的任务暂停对应部分，不虚构员工分配或接管成功。
- 普通业务交付只说明结果、实际影响及必要操作，不主动输出公司政策文件名、内部路径、门禁标记或内部规则原文，也不写入业务代码、提交说明或对外消息。向用户说明故障时采用“公司工作流暂不可用”等简明表达；用户明确要求配置诊断时，可以提供必要、脱敏的证据，不隐瞒故障。
- 初始化政策与全局适配源、实际全局指令须同步维护。验证分别检查：业务目录外仍能定位公司、真正缺失时不虚构路由、业务输出不包含无关治理细节；静态文本核对不得宣称已完成新会话验收。
