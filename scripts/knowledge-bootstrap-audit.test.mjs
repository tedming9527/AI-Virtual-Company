import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// r0 first failure is retained in the independent audit: 46 entries, two AI
// source/hash errors; radar was silently omitted. These synthetic tests do not
// re-certify that historical knowledge or assert production improvement.
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
  return { id, owner, status, updated, index: 'knowledge/INDEX.md', detail: 'knowledge/' + id + '.md',
    sha256: digest(id), trigger: 'trigger-' + id, summary: 'summary-' + id, limit: 'limit-' + id };
}
function section(e, values = e, ownerLabel = 'Owner', dateLabel = '索引核对日') {
  return `## ${e.id} · fixture\n- 触发：${e.trigger}\n- 摘要：${e.summary}\n- 限制：${e.limit}\n- 状态：${values.status}；${dateLabel}：${values.updated}；${ownerLabel}：${values.owner}\n- 详情：[detail](${e.id}.md)；sha256:${e.sha256}\n\n`;
}
function knowledge(t) {
  const f = fixture(t);
  const entries = [entry('alpha', 'one', 'reviewed_case', '2026-09-11'), entry('beta', 'two', 'stale', '2026-09-12'), entry('delta', 'one', 'candidate', '2026-09-13')];
  f.write('employees/one/PROFILE.md', '# 甲 · 工程师\n');
  f.write('employees/two/PROFILE.md', '# 乙 · 工程师\n');
  f.write('employees/one/MEMORY.md', '# one\n');
  f.write('employees/two/MEMORY.md', '# two\n');
  for (const e of entries) f.write(e.detail, e.id);
  f.write('knowledge/catalog.json', JSON.stringify({ entries }));
  f.write('knowledge/INDEX.md', entries.map(e => section(e)).join(''));
  return { ...f, entries, check: id => {
    const run = spawnSync(process.execPath, [path.join(scripts, 'check-knowledge.mjs'), f.root, ...(id ? [id] : [])], { encoding: 'utf8' });
    return { status: run.status, ...JSON.parse(run.stdout) };
  } };
}

test('legal owner/date formats and explicit shared references remain valid', t => {
  const f = knowledge(t), [a, b, d] = f.entries;
  f.write('knowledge/INDEX.md', section(a, { ...a, owner: '甲 · 工程师（岗位）' }, '负责人', '更新时间') + section(b) + section(d));
  f.write('employees/one/MEMORY.md', `## alpha · shared\n- 详情：[共享知识](../../knowledge/alpha.md)\n`);
  const result = f.check();
  assert.equal(result.status, 0, JSON.stringify(result));
  assert.equal(result.errors.length, 0);
  assert.ok(result.warnings.some(w => /inherits canonical status/.test(w)));
});

for (const key of ['status', 'owner', 'updated']) {
  test('ID-bound ' + key + ' mismatch cannot borrow another paragraph', t => {
    const f = knowledge(t), [a, b, d] = f.entries;
    f.write('knowledge/INDEX.md', section(a, { ...a, [key]: b[key] }) + section(b, { ...b, [key]: a[key] }) + section(d));
    const result = f.check();
    assert.equal(result.status, 1);
    assert.ok(result.errors.some(e => e.startsWith('alpha:') && e.includes(key + ' mismatch')), JSON.stringify(result));
    assert.ok(result.errors.some(e => e.startsWith('beta:') && e.includes(key + ' mismatch')), JSON.stringify(result));
    assert.equal(f.check('delta').status, 0, 'unrelated targeted entry stays valid');
  });
}

test('field moved to another ID fails, omitted employee ID is discovered', t => {
  const f = knowledge(t), [a, b, d] = f.entries;
  f.write('knowledge/INDEX.md', section(a).replace(a.summary, b.summary) + section(b) + section(d) + '- 摘要：' + a.summary + '\n');
  f.write('employees/one/MEMORY.md', '## charlie · omitted\n- 触发：example\n- 摘要：new\n- 限制：case only\n');
  const result = f.check();
  assert.equal(result.status, 1);
  assert.ok(result.errors.some(e => /alpha:.*summary mismatch/.test(e)), JSON.stringify(result));
  assert.ok(result.errors.some(e => /charlie: missing or duplicate catalog entry/.test(e)), JSON.stringify(result));
  assert.equal(f.check('delta').status, 0);
});

test('shared reference with wrong target or explicit mismatched status fails', t => {
  const f = knowledge(t);
  f.write('employees/one/MEMORY.md', '## alpha · shared\n- 状态：reviewed_case\n- 详情：[wrong](../../knowledge/beta.md)\n');
  assert.ok(f.check().errors.some(e => /shared reference.*detail mismatch/.test(e)));
  f.write('employees/one/MEMORY.md', '## alpha · shared\n- 状态：stale\n- 详情：[detail](../../knowledge/alpha.md)\n');
  assert.ok(f.check().errors.some(e => /shared reference.*status mismatch/.test(e)));
});

function bootstrap(t) {
  const f = fixture(t);
  const script = path.join(scripts, 'check-company-bootstrap.sh');
  const source = fs.readFileSync(script, 'utf8');
  for (const file of source.match(/required_files=\(([\s\S]*?)\)/)[1].trim().split(/\s+/)) f.write(file, 'fixture\n');
  for (const directory of ['employees', 'knowledge', 'skills', 'memory', 'inbox', 'schedule']) fs.mkdirSync(path.join(f.root, directory), { recursive: true });
  f.write('employees/ROSTER.txt', '');
  f.write('skills/ASSET_REGISTRY.md', '| 资产 ID | 规范源 | 用途 | 调用策略 | 维护人 | 状态 |\n| `demo` | `skills/demo/` | fixture | 显式 | fixture | active |\n');
  f.write('skills/demo/SKILL.md', '---\nname: demo\ndescription: A fixture skill.\n---\nBODY_NOT_FOR_SESSION\n');
  return { ...f, check: () => spawnSync('zsh', [script], { encoding: 'utf8', env: { ...process.env, AI_VIRTUAL_COMPANY_ROOT: f.root } }) };
}

test('active skill source and required discovery metadata are enforced without body output', t => {
  const f = bootstrap(t);
  const initial = f.check();
  assert.equal(initial.status, 0, initial.stderr);
  assert.doesNotMatch(initial.stdout, /BODY_NOT_FOR_SESSION/);
  fs.renameSync(path.join(f.root, 'skills/demo/SKILL.md'), path.join(f.root, 'skills/demo/SKILL.saved'));
  const missingEntry = f.check();
  assert.equal(missingEntry.status, 1);
  assert.match(missingEntry.stderr, /INVALID ACTIVE SKILL: demo/);
  f.write('skills/demo/SKILL.md', '---\nname: demo\n---\n');
  const missingDescription = f.check();
  assert.equal(missingDescription.status, 1);
  assert.match(missingDescription.stderr, /missing or duplicate description/);
  f.write('skills/demo/SKILL.md', '---\nname: demo\ndescription: >\n  Valid multiline description.\n---\n');
  assert.equal(f.check().status, 0);
  fs.renameSync(path.join(f.root, 'skills/demo'), path.join(f.root, 'skills/retired-demo'));
  assert.equal(f.check().status, 1, 'missing canonical directory must fail');
  f.write('skills/ASSET_REGISTRY.md', '| `demo` | `skills/demo/` | fixture | 显式 | fixture | retired |\n');
  assert.equal(f.check().status, 0, 'retired assets are not mandatory');
});
