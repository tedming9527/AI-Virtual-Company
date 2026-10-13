import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

test('copied manager package starts without repository scripts', t => {
  const temp = mkdtempSync(join(tmpdir(), 'avc-standalone-'));
  t.after(() => rmSync(temp, { recursive: true, force: true }));
  const source = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
  const packageDir = join(temp, 'manager');
  cpSync(source, packageDir, { recursive: true });
  const result = spawnSync(process.execPath, [join(packageDir, 'src/cli.js'), '--help'], {
    cwd: temp, encoding: 'utf8',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /ted-avc-manager v/);
});
