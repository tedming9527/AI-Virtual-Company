import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { listAssets, refreshInventory, recommendAssets, recordAssetUse, recordObservedRead, proposeAsset, noteDeliveredAsset, watchAssets } from './awareness.js';
const sha = v => createHash('sha256').update(v).digest('hex');
function fixture(t) {
  fs.mkdirSync('runtime/cache', { recursive: true });
  const root = fs.mkdtempSync(path.resolve('runtime/cache/awareness-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const personal = path.join(root, 'private/projects/demo');
  fs.mkdirSync(path.join(personal, 'custom'), { recursive: true });
  fs.mkdirSync(path.join(root, 'runtime')); fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0' }));
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal }));
  return { root, personal, options: { externalRoots: [path.join(root, 'external')] } };
}
function pack(dir, type, name, body = 'Private body that must not enter audit') {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: Scoped asset recovery\n---\n# 来源核验\n${body}\n`);
  fs.writeFileSync(path.join(dir, 'meta.json'), JSON.stringify({ type, name, version: '1.0.0', rubric: ['traceability'] }));
}
test('discovery tracks additions, changes and removals across generic and native layers without use claims', t => {
  const { root, options } = fixture(t), dir = path.join(root, 'external/recovery');
  pack(path.join(root, 'packs/knowledge/recovery'), 'knowledge', 'recovery');
  pack(dir, 'skill', 'recovery');
  let found = refreshInventory(root, options);
  assert.equal(found.changes.length, 2); assert.ok(found.assets.every(a => !a.loaded));
  assert.equal(found.assets.find(a => a.source === 'external-installed').management, 'discovered-unregistered');
  assert.equal(refreshInventory(root, options).changes.length, 0);
  fs.mkdirSync(path.join(dir, 'references'));
  fs.writeFileSync(path.join(dir, 'references/new.md'), 'New supporting knowledge');
  assert.equal(refreshInventory(root, options).changes[0].change, 'changed');
  fs.appendFileSync(path.join(dir, 'SKILL.md'), 'Changed');
  assert.equal(refreshInventory(root, options).changes[0].change, 'changed');
  fs.rmSync(dir, { recursive: true });
  assert.equal(refreshInventory(root, options).changes[0].change, 'removed');
  assert.ok(!fs.readFileSync(path.join(root, 'runtime/asset-events.jsonl'), 'utf8').includes('Private body'));
});
test('model declarations, native attempted reads, completed reads and delivery remain separate evidence', t => {
  const { root, options } = fixture(t), dir = path.join(root, 'packs/skill/recovery'); pack(dir, 'skill', 'recovery');
  const file = path.join(dir, 'SKILL.md');
  assert.equal(recordAssetUse(root, { name: 'recovery' }, options).kind, 'model-reported');
  let observed = recordObservedRead(root, { hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: file } }, options);
  assert.equal(observed.records[0].kind, 'read-attempted');
  observed = recordObservedRead(root, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: `cat '${file}'` }, tool_response: { exit_code: 0 } }, options);
  assert.equal(observed.records[0].kind, 'read-completed');
  assert.match(observed.records[0].evidence, /not semantic/);
  observed = recordObservedRead(root, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: `cat '${file}'` }, tool_response: { exit_code: 1 } }, options);
  assert.equal(observed.records[0].kind, 'read-attempted');
  assert.equal(recordObservedRead(root, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: `cat '${file}'; echo ok` } }, options).records.length, 0);
  assert.equal(recordObservedRead(root, { hook_event_name: 'PostToolUse', tool_name: 'Bash', tool_input: { command: `cat '${file}'` } }, options).records[0].kind, 'read-attempted');
  for(const extra of [{},{tool_result:{isError:true}},{tool_response:{status:'failed'}}]) {
    assert.equal(recordObservedRead(root,{hook_event_name:'PostToolUse',tool_name:'Read',tool_input:{file_path:file},...extra},options).records[0].kind,'read-attempted');
  }
  const content = fs.readFileSync(file, 'utf8');
  const receipt = noteDeliveredAsset(root, { source: 'general', type: 'skill', name: 'recovery', entry: 'SKILL.md', content, sha256: sha(content) }, { sessionId: 's', turnId: 't' });
  assert.equal(receipt.kind, 'manager-delivered'); assert.equal(receipt.sessionId, 's');
  assert.throws(() => noteDeliveredAsset(root, { content, sha256: 'wrong' }), /hash/);
});
test('review proposals do not install or register assets and ambiguous declarations are rejected', t => {
  const { root, personal, options } = fixture(t);
  pack(path.join(root, 'packs/skill/recovery'), 'skill', 'recovery'); pack(path.join(root, 'external/recovery'), 'skill', 'recovery');
  assert.throws(() => recordAssetUse(root, { name: 'recovery' }, options), /one/);
  assert.equal(recommendAssets(root, 'recovery', options).recommendations.length, 2);
  const result = proposeAsset(root, { name: 'new-skill', purpose: 'Recover workspace assets' });
  assert.equal(result.status, 'pending-review'); assert.equal(result.installation, 'none');
  assert.ok(result.file.startsWith(path.join(personal, 'staging/proposals')));
  assert.ok(!fs.existsSync(path.join(root, 'runtime/skill-registry.json')));
  assert.ok(!listAssets(root, {}, options).assets.find(a => a.name === 'new-skill'));
});
test('linked asset documents and audit write paths are rejected', t => {
  const { root, options } = fixture(t), dir = path.join(root, 'packs/knowledge/recovery'); pack(dir, 'knowledge', 'recovery');
  fs.rmSync(path.join(dir, 'SKILL.md')); fs.symlinkSync(path.join(root, 'bootstrap.json'), path.join(dir, 'SKILL.md'));
  assert.equal(listAssets(root, {}, options).assets.length, 0);
  assert.ok(listAssets(root, {}, options).warnings.length);
  fs.symlinkSync(path.join(root, 'bootstrap.json'), path.join(root, 'runtime/asset-events.jsonl'));
  assert.throws(() => proposeAsset(root, { name: 'candidate' }), /符号链接/);
});
test('bounded watcher detects native root creation and disposal stops further updates', async t => {
  const { root, options } = fixture(t); let callbacks = 0;
  const watcher = watchAssets(root, { ...options, intervalMs: 250, onChange: () => { callbacks++; } });
  t.after(() => watcher.dispose());
  pack(path.join(root, 'external/recovery'), 'skill', 'recovery');
  await new Promise(resolve => setTimeout(resolve, 400));
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'runtime/asset-inventory.json'))).assets.length, 1);
  watcher.dispose(); const before = callbacks;
  await new Promise(resolve => setTimeout(resolve, 300)); assert.equal(callbacks, before);
});
