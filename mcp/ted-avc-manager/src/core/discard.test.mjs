import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { discardPersonalFile, cleanupPersonalDiscard } from './discard.js';

test('discard waits 90 days and refuses changed files', t => {
  const root = fs.mkdtempSync(path.join(process.cwd(), 'runtime', 'discard-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0', presets: [] }));
  const personal = path.join(root, 'private/projects/demo');
  fs.mkdirSync(path.join(personal, 'inbox'), { recursive: true });
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal }));
  const source = path.join(personal, 'inbox/old.txt');
  fs.writeFileSync(source, 'old');
  const item = discardPersonalFile(root, { path: 'inbox/old.txt', reason: '已核对无课题归属' });
  assert.equal(fs.existsSync(source), false);
  assert.equal(cleanupPersonalDiscard(root, { now: Date.parse(item.expiresAt) - 1 }).results.length, 0);
  assert.equal(cleanupPersonalDiscard(root, { now: Date.parse(item.expiresAt) }).results[0].action, 'would_delete');
  const staged = path.join(personal, item.path);
  fs.writeFileSync(staged, 'changed');
  assert.equal(cleanupPersonalDiscard(root, { dryRun: false, now: Date.parse(item.expiresAt) }).results[0].action, 'refused');
  fs.writeFileSync(staged, 'old');
  assert.equal(cleanupPersonalDiscard(root, { dryRun: false, now: Date.parse(item.expiresAt) }).results[0].action, 'deleted');
  assert.equal(fs.existsSync(staged), false);
});
