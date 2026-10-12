import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveMemoryStorage, resolvePersonalStorage } from './storage.js';

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avc-storage-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('unconfigured storage resolves inside runtime without creating files', t => {
  const root = fixture(t), bootstrap = { name: 'demo' };
  assert.deepEqual(resolvePersonalStorage(root, bootstrap, {}), { root: path.join(root, 'runtime/personal'), slug: 'demo', fallback: true });
  assert.equal(resolveMemoryStorage(root, bootstrap, {}), path.join(root, 'runtime/personal/projects/demo/memory'));
  assert.deepEqual(fs.readdirSync(root), []);
});

test('absolute/relative deployment paths do not duplicate projects and local override survives central updates', t => {
  const root = fixture(t), bootstrap = { name: 'demo', storage: { personal: 'central/projects/first' } };
  assert.equal(resolvePersonalStorage(root, bootstrap, {}).root, path.join(root, 'central'));
  fs.mkdirSync(path.join(root, 'runtime'));
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal: path.join(root, 'private/projects/second') }));
  assert.equal(resolvePersonalStorage(root, bootstrap, {}).slug, 'second');
  const env = { AVC_PERSONAL_DIR: path.join(root, 'other/projects/third'), AVC_MEMORY_DIR: path.join(root, 'memory') };
  assert.equal(resolvePersonalStorage(root, bootstrap, env).root, path.join(root, 'other'));
  assert.equal(resolveMemoryStorage(root, bootstrap, env), path.join(root, 'memory'));
  fs.unlinkSync(path.join(root, 'runtime/storage.json'));
  assert.throws(() => resolvePersonalStorage(root, { storage: { personal: 'wrong/demo' } }, {}), /projects/);
});

test('cloud mapping requires explicit available root; failure and traversal never create fallback data', t => {
  const root = fixture(t), bootstrap = { storage: { personal: 'icloud://private/projects/demo' } };
  assert.throws(() => resolvePersonalStorage(root, bootstrap, {}), /AVC_ICLOUD_ROOT/);
  assert.throws(() => resolvePersonalStorage(root, bootstrap, { AVC_ICLOUD_ROOT: path.join(root, 'missing') }), /AVC_ICLOUD_ROOT/);
  const resolved = resolvePersonalStorage(root, bootstrap, { AVC_ICLOUD_ROOT: root });
  assert.equal(resolved.root, path.join(root, 'private'));
  assert.equal(resolved.slug, 'demo');
  assert.throws(() => resolvePersonalStorage(root, { storage: { personal: 'icloud://../../projects/escape' } }, { AVC_ICLOUD_ROOT: root }), /越出/);
  assert.deepEqual(fs.readdirSync(root), []);
});
