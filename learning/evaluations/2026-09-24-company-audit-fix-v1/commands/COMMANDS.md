# 2026-09-24 公司审计全量修复 · 执行命令记录

执行者：陈知行（路由官）。环境：macOS / zsh。ROOT=AI-Virtual-Company 根目录。

## §0 状态核对
```
git status --short
node scripts/check-knowledge.mjs .     # 基线：19 STALE + 9 missing + 1 audit STALE
```
结果：仅规格列明已知改动，无并发漂移。

## §1 AUD-001 共享段收敛
- python 脚本 apply-sec1.py（带 count==1 断言）：8 份 MEMORY c2c 摘要尾段 + 8 份 KNOWLEDGE "缺节点提醒"行替换为一行指针。全部 count==1。

## §2 / §3 catalog 登记
- apply-sec2.py：catalog load-modify-write 追加 9 条（8 c2c-orchestration + macro-first-induction），sha256 暂 64 零占位；entries 49→58。
- bta MEMORY macro-first 小节补 `原文版本：sha256:<64 零>` 行。

## §5 P2/P3
- 项 3：读 TASK_LIFECYCLE.md + task-lifecycle.mjs，新增 `needsDurableReceipt = task => Boolean(task.external_run_id)`，两处 saveReceipt 条件化；重写 task-lifecycle.test.mjs。
  ```
  node --test scripts/task-lifecycle.test.mjs   # tests 8 / pass 8 / fail 0
  ```
- 项 4：experience-internalization-v2 三处联动（catalog summary + INDEX L27，detail 不动）。
- apply-sec5-learning.py（16–28）、apply-sec5-last.py（29–33），全部 count==1 断言通过。

## §6 哈希同步（所有内容编辑完成后）
```
shasum -a 256 employees/<role>/KNOWLEDGE.md ...   # H<role> ×8
shasum -a 256 knowledge/2026-09-09-ai-delivery-principles.md
shasum -a 256 learning/audit-findings.md
shasum -a 256 employees/design-master/FIGMA_TRUST_EVIDENCE.md \
             employees/backend-training-architect/{JEV_LIKE_JUDGMENT_HABIT,REAL_PROJECT_FIVE_STAGE_TEACHING}.md
```
- apply-sec6-catalog.py：catalog 每条 detail 实算回填（33 处更新），audit-findings / design-figma-trust summary 更新。
- apply-sec6-memory.py：8 岗 MEMORY 48 小节 sha256 行同步。
- INDEX.md：audit-findings 摘要+sha、ai-delivery-principles sha 更新。

## §7 audit-findings 状态
- AUD-001/002 decision 行追加"已修复/已关闭"，补 fix_record 行，residual_risks 更新，注记段追加修复轮 bullet。

## 最终校验
```
node scripts/check-knowledge.mjs .
# { entries:58, errors:[], warnings:[], ... }   EXIT=0

AI_VIRTUAL_COMPANY_ROOT=<root> zsh scripts/check-company-bootstrap.sh
# Company bootstrap check passed                  EXIT=0
```
