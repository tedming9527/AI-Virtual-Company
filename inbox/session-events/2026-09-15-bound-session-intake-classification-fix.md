id: 2026-09-15-bound-session-intake-classification-fix
created_at: 2026-09-15T00:00:00+08:00
source: codex
request: 修复已绑定项目会话因缺少路由记录而被误报为逃逸会话的问题。
scope: AI-Virtual-Company binding policy and template
sensitivity: internal
requested_outcome: implementation
level: S
owner: 陈知行 · 路由官（Chief of Staff）
actual_executor: Codex current task
consult: 苏映雪 · 信任设计官（Design Master），仅截图证据核对
acceptance: 已绑定但缺少事件的会话被定义为 intake_record_missing；绑定模板要求建立最小路由记录；未绑定的判定不再依赖事件是否存在。
status: verified
outcome: 已将项目绑定与路由审计拆分；缺少事件仅标记 intake_record_missing，绑定模板已要求新任务先建立最小路由记录。
evidence: PROJECT_BINDING_POLICY.md; skills/project-company-binding.template.md; user-provided project-sidebar screenshot; scripts/check-company-bootstrap.sh passed 2026-09-15; git diff --check passed 2026-09-15
remaining: 平台原生会话列表没有可用的检测器接口，本次修复覆盖公司规则与后续会话的审计入口。
next_action: 下一个新建的绑定项目任务按模板建立记录；如平台原生检测器仍显示“逃逸”，需由其维护方接入本分类，不得以事件缺失推断未绑定。
