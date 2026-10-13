import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { cleanupRuntime } from './cleanup.js';

const sha = content => createHash('sha256').update(content).digest('hex');
test('old consumed log is protected until verified rollup and closed-task receipt exist', t => {
  const rt = fs.mkdtempSync(path.join(os.tmpdir(), 'avc-cleanup-'));
  t.after(() => fs.rmSync(rt, { recursive: true, force: true }));
  const logs = path.join(rt, 'logs'), governance = path.join(rt, 'governance'), rollups = path.join(governance, 'rollups');
  fs.mkdirSync(logs); fs.mkdirSync(rollups, { recursive: true });
  const name = 'task.consumed.jsonl', content = 'event\n', file = path.join(logs, name);
  fs.writeFileSync(file, content);
  const old = new Date(Date.now() - 31 * 86400000);
  fs.utimesSync(file, old, old);
  assert.equal(cleanupRuntime(rt, { dryRun: false }).removed.logs, 0);
  const rollupFile = 'window.json', rollup = '{}';
  fs.writeFileSync(path.join(rollups, rollupFile), rollup);
  const receipt = { schema: 'avc.consumed-logs.v1', entries: [{ name, sha256: sha(content), rollupFile, rollupSha256: sha(rollup), status: 'verified', taskClosed: true, investigationHold: false }] };
  fs.writeFileSync(path.join(governance, 'consumed-log-receipts.json'), JSON.stringify(receipt));
  assert.equal(cleanupRuntime(rt).removed.logs, 1);
  assert.equal(fs.existsSync(file), true);
  assert.equal(cleanupRuntime(rt, { dryRun: false }).removed.logs, 1);
  assert.equal(fs.existsSync(file), false);
});
