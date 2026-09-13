id: 2026-09-12-evaluation-and-knowledge-maintenance
created_at: 2026-09-12
source: codex
request: 固化独立审查与隔离实测流程，生成知识积累、防退化及受控修复规则
project: AI-Virtual-Company公司文档
scope: 两份操作规则、两份模板、路由/政策/初始化入口与限定验收
out_of_scope: 后台自治进程、定时任务、生产、账号、外部项目适配器、原知识大规模迁移
sensitivity: internal
requested_outcome: implementation-and-bounded-document-review
level: M
reason: 多规则依赖与新增必需入口，需要结构及独立语义复核
owner: 陈知行 · 路由官
executor: /root
consult: /root/maintenance_review（新上下文，未参与规则实现）
authority: 当前用户明确授权固化与知识维护规则；不扩大未来任务权限
baseline: 2026-09-11-workflow-v1评测发现及当前政策，保留历史报告不覆盖
decisions: 固定快照、默认最多2轮整改、实际岗位执行者与独立顾问分开；失效先停止采用，修复须有当前授权和新证据
artifacts: EVALUATION_RUNBOOK.md、KNOWLEDGE_MAINTENANCE.md及templates两份操作模板
acceptance: 路由可发现、新必需文件缺失能拒绝、独立新上下文检查3个授权/证据反例
evidence: learning/2026-09-12-maintenance-rule-review.md；learning/2026-09-12-maintenance-bootstrap-tests.json
status: verified
remaining: 本轮只验证文档/入口与合成语义；未部署后台自愈、未执行完整新一轮全公司行为评测，长期防退化效果待真实任务
knowledge: 新操作规则由ROUTER按需读取，不向每个小任务注入全文
metrics: model/tokens/cost unknown；5项结构正反检查结果见证据
next_action: 用户下次明确要求独立评测或知识维护时按相应手册执行；不自动排期
