import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { scanPacks } from './scan.js';

test('missing or blank pack entry is rejected; role PROFILE is the documented equivalent', t => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avc-scan-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  function pack(type, name, entry, body) {
    const dir = path.join(root, 'packs', type, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ type, name, version: '1.0.0', rubric: ['quality'] }));
    if (entry) fs.writeFileSync(path.join(dir, entry), body);
  }
  pack('skill', 'missing');
  pack('knowledge', 'blank', 'SKILL.md', '   \n');
  pack('role', 'expert', 'PROFILE.md', '# 通用岗位\n职责与约束');
  pack('framework', 'valid', 'SKILL.md', '# 通用框架');
  const result = scanPacks(root);
  assert.equal(result.errors.length, 2);
  assert.deepEqual(result.packs.map(p => `${p.type}/${p.name}`).sort(), ['framework/valid', 'role/expert']);
  assert.equal(result.packs.find(p => p.type === 'role').entry, 'PROFILE.md');
});
