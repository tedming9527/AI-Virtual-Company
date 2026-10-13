// cleanup.js —— runtime 约定目录清理（FR-7：TTL + 删除规则，根治临时文件膨胀）

import { readdirSync, statSync, existsSync, rmSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

const DAY = 24 * 60 * 60 * 1000;

function olderThan(file, days) {
  return Date.now() - statSync(file).mtimeMs > days * DAY;
}

// A consumed filename does not prove that a durable rollup or task proof exists.
// Only manifest entries bound to the exact file hash may authorize log deletion.
export function cleanupRuntime(rt, opts = {}) {
  const cacheTtlDays = opts.cacheTtlDays ?? 7;
  const logRetentionDays = opts.logRetentionDays ?? 30;
  const dryRun = opts.dryRun !== false;
  const removed = { cache: 0, logs: 0 };
  const receiptsFile = join(rt, 'governance', 'consumed-log-receipts.json');
  const receipts = existsSync(receiptsFile) ? JSON.parse(readFileSync(receiptsFile, 'utf8')) : { schema: 'avc.consumed-logs.v1', entries: [] };
  if (receipts.schema !== 'avc.consumed-logs.v1' || !Array.isArray(receipts.entries)) throw new Error('日志汇总回执无效');
  const eligible = new Map(receipts.entries.filter(e => {
    if (e?.status !== 'verified' || e.taskClosed !== true || e.investigationHold === true || !/^[a-zA-Z0-9._-]+$/.test(e.name || '') ||
      !/^[a-zA-Z0-9._-]+\.json$/.test(e.rollupFile || '') || !/^[a-f0-9]{64}$/.test(e.rollupSha256 || '') || !/^[a-f0-9]{64}$/.test(e.sha256 || '')) return false;
    const rollup = join(rt, 'governance', 'rollups', e.rollupFile);
    return existsSync(rollup) && lstatSync(rollup).isFile() && !lstatSync(rollup).isSymbolicLink() &&
      createHash('sha256').update(readFileSync(rollup)).digest('hex') === e.rollupSha256;
  }).map(e => [e.name, e]));

  const cacheDir = join(rt, 'cache');
  if (existsSync(cacheDir)) {
    for (const f of readdirSync(cacheDir)) {
      const file = join(cacheDir, f);
      if (statSync(file).isFile() && olderThan(file, cacheTtlDays)) {
        if (!dryRun) rmSync(file);
        removed.cache += 1;
      }
    }
  }

  const logsDir = join(rt, 'logs');
  if (existsSync(logsDir)) {
    for (const f of readdirSync(logsDir)) {
      const file = join(logsDir, f);
      const receipt = eligible.get(f);
      if (statSync(file).isFile() && olderThan(file, logRetentionDays) && receipt &&
        createHash('sha256').update(readFileSync(file)).digest('hex') === receipt.sha256) {
        if (!dryRun) rmSync(file);
        removed.logs += 1;
      }
    }
  }

  return {
    dryRun,
    removed,
    rule: `cache TTL=${cacheTtlDays}天 / logs 最早可删=${logRetentionDays}天（需已核验汇总及任务终态回执）`,
  };
}
