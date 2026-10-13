// layout.test.mjs —— 仓库布局门禁隔离测试（FR-1 防逃逸）

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateLayout, REQUIRED_ROOT } from './layout.js';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pm-layout-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const item of REQUIRED_ROOT) {
    const p = path.join(root, item);
    if (item.endsWith('.json') || item.endsWith('.md')) fs.writeFileSync(p, '{}\n');
    else fs.mkdirSync(p, { recursive: true });
  }
  // 一个合规包
  fs.mkdirSync(path.join(root, 'packs/skill/demo'), { recursive: true });
  fs.writeFileSync(path.join(root, 'packs/skill/demo/meta.json'), '{"type":"skill"}\n');
  return root;
}

test('合规仓库布局通过', (t) => {
  const r = validateLayout(fixture(t));
  assert.ok(r.ok, JSON.stringify(r.issues));
});

test('根级逃逸目录与缺失必备项被检出', (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'output'));          // 逃逸目录（真实案例：本机视图落仓库根）
  fs.writeFileSync(path.join(root, 'notes.md'), 'x'); // 逃逸文件
  fs.rmSync(path.join(root, 'presets'), { recursive: true }); // 必备项缺失
  const r = validateLayout(root);
  const kinds = r.issues.map((i) => i.kind).sort();
  assert.deepEqual(kinds, ['missing', 'unexpected', 'unexpected']);
  assert.ok(r.issues.some((i) => /output/.test(i.detail)));
});

test('packs 下散落文件与无 meta.json 目录被检出，外部导入被引导至 staging', (t) => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'packs/knowledge'), { recursive: true });
  fs.mkdirSync(path.join(root, 'packs/skill/外部导入'), { recursive: true }); // 无 meta.json
  fs.writeFileSync(path.join(root, 'packs/knowledge/random-note.md'), 'x'); // 散落文件
  const r = validateLayout(root);
  const strays = r.issues.filter((i) => i.kind === 'stray');
  assert.equal(strays.length, 2);
  assert.ok(strays.some((i) => /staging/.test(i.detail)), '应提示走个人 staging 导入');
});

test('白名单策略文件不误报', (t) => {
  const root = fixture(t);
  fs.writeFileSync(path.join(root, 'packs/skill/SKILL_ASSET_POLICY.md'), '策略\n');
  assert.ok(validateLayout(root).ok);
});

test('packs root rejects imported directories and loose files outside the four types', t => {
  const root = fixture(t);
  fs.mkdirSync(path.join(root, 'packs', 'external-import'));
  fs.writeFileSync(path.join(root, 'packs', 'private-note.md'), 'private');
  const result = validateLayout(root);
  assert.equal(result.ok, false);
  assert.equal(result.issues.filter(i => i.kind === 'stray').length, 2);
});

test('任务副本不能塞进仓库 runtime/cache/tasks', t => {
  const root = fixture(t);
  const site = path.join(root, 'runtime/cache/tasks/example/site');
  fs.mkdirSync(path.join(site, 'node_modules'), { recursive: true });
  const result = validateLayout(root);
  assert.ok(result.issues.some(issue => issue.kind === 'task-copy'));
});
