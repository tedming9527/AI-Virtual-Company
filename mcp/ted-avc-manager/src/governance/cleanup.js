// cleanup.js —— runtime 约定目录清理（FR-7：TTL + 删除规则，根治临时文件膨胀）

import { readdirSync, statSync, existsSync, rmSync, readFileSync, lstatSync, mkdirSync } from 'node:fs';
import { join,resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { assertNoLinks } from '../core/scan.js';
import { writeTaskState } from '../core/task-lifecycle.js';

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
  const forceCloseDays=opts.forceCloseDays??7;
  if(!Number.isInteger(forceCloseDays)||forceCloseDays<5||forceCloseDays>10)throw Error('Forced audit close must be five to ten days');
  const removed = { cache: 0, logs: 0 };
  const warnings=[];
  if(![cacheTtlDays,logRetentionDays].every(n=>Number.isFinite(n)&&n>=0))throw Error('Invalid cleanup retention');
  rt=resolve(rt);
  if(lstatSync(rt).isSymbolicLink())return {dryRun,removed,warnings:['Unsafe runtime root']};
  const safe=file=>assertNoLinks(rt,file);
  const receiptsFile = join(rt, 'governance', 'consumed-log-receipts.json');
  let receipts={schema:'avc.consumed-logs.v1',entries:[]};
  try{safe(receiptsFile);if(existsSync(receiptsFile))receipts=JSON.parse(readFileSync(receiptsFile,'utf8'));
  if (receipts.schema !== 'avc.consumed-logs.v1' || !Array.isArray(receipts.entries)) throw new Error('日志汇总回执无效');
  }catch{warnings.push('Log receipts unavailable; logs retained');receipts={entries:[]};}
  const eligible = new Map(receipts.entries.filter(e => {
    if (e?.status !== 'verified' || typeof e.taskClosed !== 'boolean' || e.investigationHold === true || !/^[a-zA-Z0-9._-]+$/.test(e.name || '') ||
      !/^[a-zA-Z0-9._-]+\.json$/.test(e.rollupFile || '') || !/^[a-f0-9]{64}$/.test(e.rollupSha256 || '') || !/^[a-f0-9]{64}$/.test(e.sha256 || '')) return false;
    const rollup = join(rt, 'governance', 'rollups', e.rollupFile);
    try{return safe(rollup) && existsSync(rollup) && lstatSync(rollup).isFile() && !lstatSync(rollup).isSymbolicLink() &&
      createHash('sha256').update(readFileSync(rollup)).digest('hex') === e.rollupSha256;
    }catch{return false;}
  }).map(e => [e.name, e]));

  const cacheDir = join(rt, 'cache');
  try{safe(cacheDir);
  if (existsSync(cacheDir)) {
    for (const f of readdirSync(cacheDir)) {
      const file = join(cacheDir, f);
      try{safe(file);const before=lstatSync(file);
      if (before.isFile() && olderThan(file, cacheTtlDays)) {
        if (!dryRun) {safe(file);const after=lstatSync(file);if(after.dev!==before.dev||after.ino!==before.ino||after.mtimeMs!==before.mtimeMs)throw Error('Cache changed');rmSync(file);}
        removed.cache += 1;
      }
      }catch{warnings.push('Unsafe or changed cache entry retained');}
    }
  }
  }catch{warnings.push('Unsafe cache directory retained');}

  const logsDir = join(rt, 'logs');
  try{safe(logsDir);
  if (existsSync(logsDir)) {
    for (const f of readdirSync(logsDir)) {
      const file = join(logsDir, f);
      const receipt = eligible.get(f);
      try{safe(file);const before=lstatSync(file);
      if (before.isFile() && olderThan(file, logRetentionDays) && receipt && (receipt.taskClosed||olderThan(file,forceCloseDays)) &&
        createHash('sha256').update(readFileSync(file)).digest('hex') === receipt.sha256) {
        if (!dryRun) {
          if(!receipt.taskClosed){
            const proof=join(rt,'governance','expired-log-receipts');safe(proof);
            mkdirSync(proof,{recursive:true,mode:0o700});
            const evidence={schema:'avc.expired-log-receipt.v1',name:f,sha256:receipt.sha256,rollupFile:receipt.rollupFile,rollupSha256:receipt.rollupSha256,auditClosure:'deadline',taskClosed:false,outcome:'unknown',at:new Date().toISOString()};
            writeTaskState(rt,join(proof,receipt.sha256+'.json'),evidence);
          }
          safe(file);const after=lstatSync(file);if(after.dev!==before.dev||after.ino!==before.ino||after.mtimeMs!==before.mtimeMs)throw Error('Log changed');rmSync(file);
        }
        removed.logs += 1;
      }
      }catch{warnings.push('Unsafe or changed log retained');}
    }
  }
  }catch{warnings.push('Unsafe logs directory retained');}

  return {
    dryRun,
    removed,
    warnings:[...new Set(warnings)],
    rule: `cache TTL=${cacheTtlDays}天 / logs 最早可删=${logRetentionDays}天（需已核验汇总及终态或到期未知结算凭证）`,
  };
}
