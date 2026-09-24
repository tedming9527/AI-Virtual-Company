# 命令结果日志 · run 2026-09-24-company-audit-v1

快照根：/tmp/ted-audit-2026-09-24-wvepg37p（SNAP）；真实根：company root。

## 1. 快照构建与保真
- `python3 build-snapshot.py` → SNAPSHOT=/tmp/ted-audit-2026-09-24-wvepg37p，COPIED=104，OMITTED=15 项（见 MANIFEST.json）。
- 快照 bootstrap：`AI_VIRTUAL_COMPANY_ROOT=$SNAP zsh $SNAP/scripts/check-company-bootstrap.sh` → `Company bootstrap check passed`，exit 0（4 active skills、4 行平台登记 12 列校验通过）。
- 真实根 bootstrap（只读）：同样 passed，exit 0。
- check-knowledge 全量（快照 vs 真实根）：error 集完全一致 = 27 条、warnings=0、entries=49（保真验证通过）。
  - 27 条构成：8×`*-core` STALE hash mismatch、8×`*-experience-transfer` STALE、1×`ai-capability-source-link-radar` STALE、1×`backend-training-four-step-engineering-loop` STALE、1×`backend-training-architect-vanke-critical-distillation` STALE、8×`*-c2c-orchestration` missing/duplicate catalog entry。

## 2. 脚本回归（快照上）
- `node --test codex-company-takeover-hook.test.mjs` → 11/11 pass（含动态签名守卫用例：路由推导签名通过末行检查；空/畸形主责被拒绝）。
- `node --test knowledge-bootstrap-audit.test.mjs` → 7/7 pass。

## 3. 结构负例（SNAP/negatives/N1..N5，均一次性副本）
| 例 | 命令 | 实测 |
|---|---|---|
| N1 | 删 backend-expert/PROFILE.md → bootstrap | exit=1，`INCOMPLETE EMPLOYEE: backend-expert/PROFILE.md` |
| N2 | 删 design-master/ 整目录 → bootstrap | exit=1，INCOMPLETE EMPLOYEE ×3 |
| N3 | 新增 ghost-role → bootstrap | exit=1，`UNREGISTERED EMPLOYEE: ghost-role` |
| N4 | `check-knowledge.mjs <N4> no-such-id` | exit=1，`unknown or duplicate requested id` |
| N5 | catalog 删 1 条目 → 全量 | exit=1，该 ID `missing or duplicate catalog entry`（grep 命中 1 次） |
各例 run.log 已归档。

## 4. 定向条目（快照本体）
- `check-knowledge.mjs $SNAP frontend-expert-c2c-orchestration` → exit=1，unknown or duplicate requested id（AUD-002 现状证据）。
- `check-knowledge.mjs $SNAP verifiable-work-evidence-ledger` → exit=0，errors=[]（健康条目，工具对正常条目工作）。
- `check-knowledge.mjs $SNAP design-master-core` → exit=1，STALE summary/source hash mismatch（既有基线告警）。

## 5. AUD-001/002 收敛验证（一次性副本 SNAP/negatives/CONV）
- 现状核对：共享尾段 8 份逐字一致（127 字/257 字节 ×8 = 2056 字节重复）；8 条 c2c 的 MEMORY"原文版本 sha256"与当前 KNOWLEDGE.md 全部一致。
- 副本上收敛后：bootstrap exit=0；`check-knowledge.mjs CONV chief-of-staff-c2c-orchestration` 与 `frontend-expert-c2c-orchestration` → exit=0 errors=[]；全量 → exit=1，errors 27→19（8 条 c2c 归零）、warnings 0→8（8 条新 c2c 目录项 long-summary 非阻断提示，校验器自注"do not truncate limits"）、entries 49→57。
- 净变化：−8 error、+8 warning（净变化已按独立评审分歧补记）。

## 6. 真实根目录状态（审计期间并发漂移，如实报告）
- 基线（快照时刻）：真实根 = 27 error（与快照一致）。
- backlog 更新后：`check-knowledge.mjs <real>` → 29 error。新增 2 条：
  1. `audit-findings: STALE summary/source hash mismatch` — 本审计按手册 §5 更新 learning/audit-findings.md 产生的已知副效应（catalog/INDEX 中该条目 sha256 待授权同步）。
  2. `backend-training-architect-macro-first-induction: missing or duplicate catalog entry` — 真实根 employees/backend-training-architect/{MEMORY.md,KNOWLEDGE.md,TEACHING_PLAYBOOK.md} 于 2026-09-24 16:25–16:45 被并发修改（外部活动会话新增教学知识条目；与本审计子代理无关，各受测者产物均核实仅写快照）。快照保持冻结基线，不受影响。
- 结论：真实根为活动工作区，审计快照冻结于创建时刻；收敛/修复需在授权后基于更新后的真实根重建快照（r1）复测。

## 7. 读取账本（read-knowledge.mjs eval-logs）
见 ledgers/ 下各会话 jsonl 与本目录 READ_LEDGER.md 聚合。
