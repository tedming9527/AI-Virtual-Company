// cleanup.js —— runtime 约定目录清理（FR-7：TTL + 删除规则，根治临时文件膨胀）

import { readdirSync, statSync, existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const DAY = 24 * 60 * 60 * 1000;

function olderThan(file, days) {
  return Date.now() - statSync(file).mtimeMs > days * DAY;
}

// cache: TTL 到期即删；logs: 超过保留窗口且已消费（*.consumed.*）即删
export function cleanupRuntime(rt, opts = {}) {
  const cacheTtlDays = opts.cacheTtlDays ?? 7;
  const logRetentionDays = opts.logRetentionDays ?? 30;
  const dryRun = !!opts.dryRun;
  const removed = { cache: 0, logs: 0 };

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
      const consumed = f.includes('.consumed.');
      if (statSync(file).isFile() && olderThan(file, logRetentionDays) && consumed) {
        if (!dryRun) rmSync(file);
        removed.logs += 1;
      }
    }
  }

  return {
    dryRun,
    removed,
    rule: `cache TTL=${cacheTtlDays}天 / logs 保留窗口=${logRetentionDays}天（已消费才删）`,
  };
}
