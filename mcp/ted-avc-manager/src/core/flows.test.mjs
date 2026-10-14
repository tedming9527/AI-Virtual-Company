import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { flowCheck, flowUpgrade } from './flows.js';

function fixture(t, version = '1.4.2') {
  const root = mkdtempSync(join(tmpdir(), 'avc-update-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const home = join(root, 'client');
  const base = join(home, 'ted-avc-manager');
  mkdirSync(join(base, 'package'), { recursive: true });
  mkdirSync(join(root, 'runtime'));
  const save = (p, v) => writeFileSync(p, JSON.stringify(v));
  save(join(root, 'bootstrap.json'), { name: 'test', version: '1.5.0' });
  save(join(root, 'runtime/lockfile.json'), { current: '1.5.0' });
  const manifest = { schema: 'avc.client-installation.v1', owner: 'ted-avc-manager', version,
    generation: 'new', downstream: { central: root } };
  save(join(base, 'manifest.json'), manifest);
  save(join(base, 'package/package.json'), { version });
  return { root, home, base, manifest, save, check: options => flowCheck(root, { codexHome: home, generation: 'new', ...options }) };
}

test('old client stays upgradeable even when checkout and lockfile are latest', t => {
  const f = fixture(t), before = readFileSync(join(f.root, 'runtime/lockfile.json'), 'utf8');
  const r = f.check({ runningVersion: '1.4.2' });
  assert.equal(r.version, '1.4.2'); assert.equal(r.status, 'update-available');
  assert.deepEqual(r.upgrade, { kind: 'minor', current: '1.4.2', latest: '1.5.0' });
  assert.equal(readFileSync(join(f.root, 'runtime/lockfile.json'), 'utf8'), before);
  assert.match(r.summary, /未联网/);
});
test('matching installation is reported separately from native activation', t => {
  const r = fixture(t, '1.5.0').check({ runningVersion: '1.5.0' });
  assert.equal(r.status, 'current'); assert.equal(r.upgrade, null);
  assert.match(r.summary, /不代表新会话加载验收完成/);
});
test('ahead client is not automatically downgraded', t => {
  const r = fixture(t, '1.6.0').check(); assert.equal(r.status, 'client-ahead'); assert.equal(r.upgrade, null);
});
for (const fault of ['missing', 'invalid-json', 'invalid-version', 'wrong-owner', 'wrong-project', 'package-mismatch']) {
  test(`${fault} cannot fall back to repository latest`, t => {
    const f = fixture(t);
    if (fault === 'missing') rmSync(join(f.base, 'manifest.json'));
    if (fault === 'invalid-json') writeFileSync(join(f.base, 'manifest.json'), '{');
    if (fault === 'invalid-version') f.save(join(f.base, 'manifest.json'), { ...f.manifest, version: 'broken' });
    if (fault === 'wrong-owner') f.save(join(f.base, 'manifest.json'), { ...f.manifest, owner: 'unrelated' });
    if (fault === 'wrong-project') f.save(join(f.base, 'manifest.json'), { ...f.manifest, downstream: { central: f.home } });
    if (fault === 'package-mismatch') f.save(join(f.base, 'package/package.json'), { version: '1.3.0' });
    const r = f.check(); assert.equal(r.status, 'unknown'); assert.equal(r.version, null); assert.equal(r.ok, false);
    assert.match(r.summary, /当前任务照常推进/);
  });
}
test('running version and generation mismatches require reload even at latest install', t => {
  const f = fixture(t, '1.5.0');
  assert.equal(f.check({ runningVersion: '1.4.2' }).status, 'reload-required');
  assert.equal(f.check({ generation: 'old' }).status, 'reload-required');
});
test('legacy upgrade never claims it installed a client', t => {
  const f = fixture(t); const before = readFileSync(join(f.base, 'manifest.json'), 'utf8');
  assert.match(flowUpgrade(f.root).summary, /未执行客户端升级/);
  f.save(join(f.root, 'runtime/lockfile.json'), { current: '1.4.2' });
  assert.match(flowUpgrade(f.root).summary, /未执行客户端升级/);
  assert.equal(readFileSync(join(f.base, 'manifest.json'), 'utf8'), before);
  assert.equal(f.check().status, 'update-available');
});
