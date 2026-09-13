# 后端日期过滤规范与可运行实验

## 依据
- 依据岗位：陆行远（可靠服务官）
- 证据：`app/page.tsx`“文章发布后默认保留 10 天”“公开保留至发布后第 10 天”。

## 字段规范
- `publishedAt`：ISO 8601 时间，必须可比较时区。
- `sourceUrl`：原始来源 URL（用于核验）。
- `isAudioAvailable`：boolean。
- `status`：`DRAFT | REVIEWING | PUBLISHED | EXPIRED`。
- `retentionDays`：int，当前默认 `10`。
- `visibility`：`PUBLIC | ARCHIVED`。

## 过滤策略（可运行）
- 输入：`now`（当前时间，精确到毫秒）
- 规则：
  - `visibility = PUBLIC`
  - `status = 'PUBLISHED'`
  - `publishedAt >= now - retentionHours`
  - `publishedAt <= now`
- 说明：统一使用滚动窗口 `240h`（即 `10` 天）闭区间，不使用“日历天 00:00”边界。
- 例外：未来时间稿件默认不可见（`publishedAt > now`）。
- 默认 `retentionHours = 240`，`retentionDays` 输入可在重算时转换为 `* 24`。

## 可运行实验（本地脚本可直接复现）
```sql
-- PostgreSQL/MySQL 可改造；以下以 MySQL 表达：
-- 期望：给定 now = '2026-09-10 12:00:00'
SELECT id, title, published_at,
       CASE
         WHEN published_at > '2026-09-10 12:00:00' THEN 'HIDE_FUTURE'
         WHEN published_at < DATE_SUB('2026-09-10 12:00:00', INTERVAL 240 HOUR) THEN 'HIDE_EXPIRED'
         ELSE 'SHOW'
       END AS decision
FROM contents;
```

### 样例输入与期望
- `2026-09-10 11:59:59` -> `SHOW`
- `2026-08-31 12:00:00` -> `SHOW`（恰好 10 天）
- `2026-08-31 11:59:59.999` -> `HIDE_EXPIRED`
- `2026-09-10 12:00:01` -> `HIDE_FUTURE`

### 7天迁移复现基准
- 给定 `now=2026-09-10T12:00:00Z`
- `retentionDays=7` 时：
  - `2026-09-03T12:00:00Z` -> `SHOW`（恰好 7 天）
  - `2026-09-03T11:59:59.999Z` -> `HIDE_EXPIRED`

## 可复用交付
- 将该规则抽象为服务函数：`isContentVisible(now, publishedAt, status, retentionDays)`。
- 本轮脚本产出：`learning/restart-2026-09-10/retention.mjs` 与 `learning/restart-2026-09-10/retention.test.mjs`。

## 基于研读的收获
1. 页面文案“公开保留至发布后第 10 天”不能直接解释为“按日历天 00:00 截止”，需要明确为 240 小时滚动窗口才能保证闭区间一致性。
2. 过滤条件必须同时约束 `status` 与 `visibility`，否则 `DRAFT` 或 `ARCHIVED` 条目可被错误暴露。
3. `publishedAt` 与 `now` 的时间类型统一为可比较的 ISO 且保留毫秒，能避免“隔天 00:00”误差。

## 给其他岗位的问题与基于产物的回答
- 给测试岗的问题：闭区间判定是否应加 240 小时而非 10 天天数计算？
- 回答：是的，当前规范明确为 240 小时滚动窗口，且在测试里必须用毫秒精度边界（恰好/超 1ms）覆盖。
