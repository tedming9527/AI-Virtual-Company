import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Isolated fixtures validate index metadata and drift, not production knowledge.
const scripts = path.dirname(fileURLToPath(import.meta.url));
const digest = value => crypto.createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-bootstrap-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (file, value) => {
    fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    fs.writeFileSync(path.join(root, file), value);
  };
  return { root, write };
}

function entry(id, owner, status, updated) {
  return { id, owner, status, updated, index: 'packs/knowledge/INDEX.md', detail: 'packs/knowledge/' + id + '/SKILL.md',
    sha256: digest(id), trigger: 'trigger-' + id, summary: 'summary-' + id, limit: 'limit-' + id };
}
function section(e, values = e, ownerLabel = 'Owner', dateLabel = '索引核对日') {
  return `## ${e.id} · fixture\n- 触发：${e.trigger}\n- 摘要：${e.summary}\n- 限制：${e.limit}\n- 状态：${values.status}；${dateLabel}：${values.updated}；${ownerLabel}：${values.owner}\n- 详情：[detail](${e.id}/SKILL.md)；sha256:${e.sha256}\n\n`;
}
function knowledge(t) {
  const f = fixture(t);
  const entries = [entry('alpha', 'one', 'reviewed_case', '2026-09-11'), entry('beta', 'two', 'stale', '2026-09-12'), entry('delta', 'one', 'candidate', '2026-09-13')];
  f.write('packs/role/one/PROFILE.md', '# 甲 · 工程师\n');
  f.write('packs/role/two/PROFILE.md', '# 乙 · 工程师\n');
  f.write('packs/role/one/MEMORY.md', '# one\n');
  f.write('packs/role/two/MEMORY.md', '# two\n');
  for (const e of entries) f.write(e.detail, e.id);
  f.write('packs/knowledge/catalog.json', JSON.stringify({ entries }));
  f.write('packs/knowledge/INDEX.md', entries.map(e => section(e)).join(''));
  return { ...f, entries, check: id => {
    const run = spawnSync(process.execPath, [path.join(scripts, 'check-knowledge.mjs'), f.root, ...(id ? [id] : [])], { encoding: 'utf8' });
    return { status: run.status, ...JSON.parse(run.stdout) };
  } };
}

test('legal owner/date formats and explicit shared references remain valid', t => {
  const f = knowledge(t), [a, b, d] = f.entries;
  f.write('packs/knowledge/INDEX.md', section(a, { ...a, owner: '甲 · 工程师（岗位）' }, '负责人', '更新时间') + section(b) + section(d));
  f.write('packs/role/one/MEMORY.md', `## alpha · shared\n- 详情：[共享知识](../../../packs/knowledge/alpha/SKILL.md)\n`);
  const result = f.check();
  assert.equal(result.status, 0, JSON.stringify(result));
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some(w => /inherits canonical status/.test(w)));
});

for (const key of ['status', 'owner', 'updated']) {
  test('ID-bound ' + key + ' mismatch cannot borrow another paragraph', t => {
    const f = knowledge(t), [a, b, d] = f.entries;
    f.write('packs/knowledge/INDEX.md', section(a, { ...a, [key]: b[key] }) + section(b, { ...b, [key]: a[key] }) + section(d));
    const result = f.check();
    assert.equal(result.status, 1);
    assert.ok(result.errors.some(e => e.startsWith('alpha:') && e.includes(key + ' mismatch')), JSON.stringify(result));
    assert.ok(result.errors.some(e => e.startsWith('beta:') && e.includes(key + ' mismatch')), JSON.stringify(result));
    assert.equal(f.check('delta').status, 0, 'unrelated targeted entry stays valid');
  });
}

test('field moved to another ID fails, omitted employee ID is discovered', t => {
  const f = knowledge(t), [a, b, d] = f.entries;
  f.write('packs/knowledge/INDEX.md', section(a).replace(a.summary, b.summary) + section(b) + section(d) + '- 摘要：' + a.summary + '\n');
  f.write('packs/role/one/MEMORY.md', '## charlie · omitted\n- 触发：example\n- 摘要：new\n- 限制：case only\n');
  const result = f.check();
  assert.equal(result.status, 1);
  assert.ok(result.errors.some(e => /alpha:.*summary mismatch/.test(e)), JSON.stringify(result));
  assert.ok(result.errors.some(e => /charlie: missing or duplicate catalog entry/.test(e)), JSON.stringify(result));
  assert.equal(f.check('delta').status, 0);
});

test('shared reference with wrong target or explicit mismatched status fails', t => {
  const f = knowledge(t);
  f.write('packs/role/one/MEMORY.md', '## alpha · shared\n- 状态：reviewed_case\n- 详情：[wrong](../../../packs/knowledge/beta/SKILL.md)\n');
  assert.ok(f.check().errors.some(e => /shared reference.*detail mismatch/.test(e)));
  f.write('packs/role/one/MEMORY.md', '## alpha · shared\n- 状态：stale\n- 详情：[detail](../../../packs/knowledge/alpha/SKILL.md)\n');
  assert.ok(f.check().errors.some(e => /shared reference.*status mismatch/.test(e)));
});
