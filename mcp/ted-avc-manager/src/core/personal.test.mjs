// personal.test.mjs —— 个人目录规约隔离测试（FR-11/FR-12/FR-13）
// 全部使用临时目录 fixture，不触碰真实 iCloud 个人目录。

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  initPersonal, doctorPersonal, syncPresets, mergeConfig, importScan,
  projectDirOf, PROJECT_DIRS,
} from './personal.js';

function fixture(t) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'pm-personal-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

function makeCentralPresets(root, version, body) {
  const dir = path.join(root, 'presets', 'base');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'config.json'), body ?? `{"schemaVersion":1,"version":"${version}"}`);
  return { name: 'ai-virtual-company', version, presets: ['base'] };
}

test('init 幂等补建骨架与 manifest/state，二次运行零变更', (t) => {
  const root = fixture(t);
  const first = initPersonal(root, 'Demo-Slug', { repo: 'github://acme/demo', version: '1.0.0', touch: 'bootstrap' });
  assert.ok(first.created.length >= PROJECT_DIRS.length + 3);
  const second = initPersonal(root, 'Demo-Slug', { repo: 'github://acme/demo', version: '1.0.0', touch: 'bootstrap' });
  assert.equal(second.created.length, 0);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.personal-manifest.json'), 'utf8'));
  assert.equal(manifest.projects.length, 1);
  assert.equal(manifest.projects[0].slug, 'Demo-Slug');
  assert.equal(manifest.projects[0].repo, 'github://acme/demo');
  const state = JSON.parse(fs.readFileSync(path.join(root, 'projects', 'Demo-Slug', '.project-state.json'), 'utf8'));
  assert.equal(state.repo, 'github://acme/demo');
  assert.equal(state.currentVersion, '1.0.0');
  assert.ok(state.lastBootstrap);

  const r = doctorPersonal(root, 'Demo-Slug');
  assert.ok(r.ok, JSON.stringify(r.issues));
});

test('doctor 检出缺失/多余/命名/state 问题，init 补建后转通过', (t) => {
  const root = fixture(t);
  initPersonal(root, 'demo', { version: '1.0.0' });
  const projDir = projectDirOf(root, 'demo');

  fs.rmSync(path.join(projDir, 'staging'), { recursive: true });
  fs.mkdirSync(path.join(projDir, 'misc'));
  fs.writeFileSync(path.join(projDir, 'inbox', '随手记.md'), 'x');
  fs.mkdirSync(path.join(projDir, 'inbox', 'session-events'));  // 子目录=自由组织，不套命名规则
  fs.rmSync(path.join(projDir, '.project-state.json'));

  const r = doctorPersonal(root, 'demo');
  const kinds = r.issues.map((i) => i.kind).sort();
  assert.deepEqual(kinds, ['missing', 'naming', 'state', 'unexpected']);
  assert.equal(r.ok, false);

  fs.rmSync(path.join(projDir, 'misc'), { recursive: true });
  fs.renameSync(path.join(projDir, 'inbox', '随手记.md'), path.join(projDir, 'inbox', '2026-10-13-随手记.md'));
  initPersonal(root, 'demo', { version: '1.0.0' });
  const clean = doctorPersonal(root, 'demo');
  assert.ok(clean.ok, JSON.stringify(clean.issues));
});

test('preset 同步：修改保全到 staging，中央副本全量更新', (t) => {
  const root = fixture(t);
  initPersonal(root, 'demo', { version: '1.0.0' });
  const central = makeCentralPresets(root, '1.0.0');
  const first = syncPresets(root, root, 'demo', central);
  assert.deepEqual(first.synced, ['base']);
  assert.equal(first.conflicts.length, 0);
  const presetFile = path.join(root, 'projects', 'demo', 'preset', 'base', 'config.json');
  assert.ok(fs.existsSync(presetFile));
  assert.ok(fs.existsSync(path.join(root, 'projects', 'demo', 'preset', 'base', '.preset-manifest.json')));
  assert.ok(doctorPersonal(root, 'demo').ok, '同步后哈希应一致');

  // 用户改过 preset 文件 + 中央发新版 → 保留 .local 并写入新版
  fs.writeFileSync(presetFile, '{"schemaVersion":1,"version":"user-edited"}');
  const tampered = doctorPersonal(root, 'demo');
  assert.equal(tampered.issues.filter((i) => i.kind === 'tampered').length, 1);
  central.version = '1.1.0';
  makeCentralPresets(root, '1.1.0');
  const second = syncPresets(root, root, 'demo', central);
  assert.equal(second.conflicts.length, 1);
  assert.ok(second.recovery.length);
  assert.match(fs.readFileSync(path.join(second.recovery[0], 'files/config.json'), 'utf8'), /user-edited/);
  assert.equal(fs.existsSync(`${presetFile}.local`), false);
  assert.match(fs.readFileSync(presetFile, 'utf8'), /1\.1\.0/);
  assert.ok(doctorPersonal(root, 'demo').ok, '同步后哈希应重新一致');
});

test('config 合并：preset 打底、custom 同名覆盖并标注来源', (t) => {
  const root = fixture(t);
  const central = makeCentralPresets(root, '1.0.0', '{"schemaVersion":1,"update":{"channel":"main"},"limit":10}');
  syncPresets(root, root, 'demo', central);
  const customDir = path.join(root, 'projects', 'demo', 'custom');
  fs.mkdirSync(customDir, { recursive: true });
  fs.writeFileSync(path.join(customDir, 'override.json'), '{"limit":99}');

  const { merged } = mergeConfig(root, 'demo');
  assert.equal(merged['update.channel'].value, 'main');
  assert.equal(merged['update.channel'].source, 'preset/base/config.json');
  assert.equal(merged['limit'].value, 99);
  assert.equal(merged['limit'].source, 'custom/override.json');
});

test('import-scan：复制入 staging、台账登记、个人路径打标', (t) => {
  const root = fixture(t);
  initPersonal(root, 'demo', { version: '1.0.0' });
  const srcDir = path.join(root, 'external');
  fs.mkdirSync(srcDir, { recursive: true });
  const user = os.homedir().split('/').pop();
  fs.writeFileSync(path.join(srcDir, 'note.md'), `本机路径 /Users/${user}/Documents 资料`);
  fs.writeFileSync(path.join(srcDir, 'template.md'), '# 通用模板\n无个人特征');

  const { entry, registryFile } = importScan(root, 'demo', srcDir, { id: 'test001' });
  assert.equal(entry.files.length, 2);
  assert.equal(entry.label, 'personal');
  assert.match(entry.reason, new RegExp(user));
  assert.equal(entry.status, 'pending-review');
  const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
  assert.equal(registry.entries.length, 1);
  assert.equal(registry.entries[0].id, entry.id);
  assert.ok(fs.existsSync(path.join(root, 'projects', 'demo', 'staging', 'imports', entry.id, 'note.md')));

  const again = importScan(root, 'demo', path.join(srcDir, 'template.md'), { id: 'test002' });
  assert.equal(again.entry.label, 'general-candidate');
});

test('bind 新项目：manifest 登记 + 独立骨架', (t) => {
  const root = fixture(t);
  initPersonal(root, 'first', { repo: 'github://acme/first', version: '1.0.0' });
  initPersonal(root, 'second', {});  // 先无 repo 登记
  initPersonal(root, 'second', { repo: 'github://acme/second' });  // 后补 repo 应回填
  const manifest = JSON.parse(fs.readFileSync(path.join(root, '.personal-manifest.json'), 'utf8'));
  assert.deepEqual(manifest.projects.map((p) => `${p.slug}:${p.repo}`).sort(),
    ['first:github://acme/first', 'second:github://acme/second']);
  assert.ok(fs.existsSync(path.join(root, 'projects', 'second', 'custom')));
});

test('config follows declared preset order rather than directory sorting', t => {
  const root = fixture(t);
  const preset = path.join(projectDirOf(root, 'demo'), 'preset');
  for (const [name, limit] of [['z-base', 10], ['a-overlay', 20]]) {
    fs.mkdirSync(path.join(preset, name), { recursive: true });
    fs.writeFileSync(path.join(preset, name, 'config.json'), JSON.stringify({ limit }));
  }
  const result = mergeConfig(root, 'demo', ['z-base', 'a-overlay']);
  assert.equal(result.merged.limit.value, 20);
  assert.equal(result.merged.limit.source, 'preset/a-overlay/config.json');
});

test('central preset removal deletes obsolete copies, preserves local edits and unrelated custom', t => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'avc-preset-retire-')));
  t.after(() => fs.rmSync(root,{recursive:true,force:true}));
  const src=path.join(root,'presets/base');fs.mkdirSync(src,{recursive:true});
  fs.writeFileSync(path.join(src,'old.md'),'central');
  const b={version:'1.0.0',presets:['base']};syncPresets(root,root,'demo',b);
  const dst=path.join(root,'projects/demo/preset/base');
  fs.writeFileSync(path.join(dst,'draft.md'),'unique edit');
  fs.unlinkSync(path.join(src,'old.md'));
  const result=syncPresets(root,root,'demo',{...b,version:'2.0.0'});
  assert.equal(fs.existsSync(path.join(dst,'old.md')),false);
  assert.equal(fs.existsSync(path.join(dst,'draft.md')),false);
  assert.equal(fs.readFileSync(path.join(result.recovery[0],'files/draft.md'),'utf8'),'unique edit');
  assert.equal(fs.existsSync(path.join(result.recovery[0],'files/old.md')),false);
  const last=syncPresets(root,root,'demo',{version:'3.0.0',presets:[]});
  assert.deepEqual(last.removed,['base']);assert.equal(fs.existsSync(dst),false);
});
