import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { addPanoramaTopic, linkPanoramaFile, readPanoramaTopics } from './topics.js';
import { buildPanoramaModel, renderPanorama } from './generate.js';
import { createPersonalTopic, archivePersonalTopicSession, copyLegacyFilesToTopic } from '../core/personal.js';

test('topic links require explicit evidence, bind file hash and stay local', t => {
  const root = fs.mkdtempSync(path.join(process.cwd(), 'runtime', 'topic-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0', presets: [] }));
  const personal = path.join(root, 'private/projects/demo');
  fs.mkdirSync(path.join(personal, 'deliverables'), { recursive: true });
  fs.writeFileSync(path.join(personal, 'deliverables/brief.md'), 'approved');
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal }));
  addPanoramaTopic(root, { id: 'user-topic', title: '用户课题', sessionId: 'session-1' });
  assert.throws(() => linkPanoramaFile(root, { topicId: 'user-topic', path: '../secret', reason: 'guess' }), /已发现清单/);
  linkPanoramaFile(root, { topicId: 'user-topic', path: 'deliverables/brief.md', reason: '本次会话确认的交付物', sessionId: 'session-1' });
  let local = buildPanoramaModel(root, { view: 'local', externalRoots: [] });
  assert.equal(local.topics.topics[0].links[0].status, 'verified');
  assert.match(renderPanorama(local), /本次会话确认的交付物/);
  assert.equal(buildPanoramaModel(root, { view: 'public' }).topics, undefined);
  fs.writeFileSync(path.join(personal, 'deliverables/brief.md'), 'changed');
  local = buildPanoramaModel(root, { view: 'local', externalRoots: [] });
  assert.equal(local.topics.topics[0].links[0].status, 'changed');
  assert.match(renderPanorama(local), /文件已变更，原关联待复核/);
});

test('legacy copy preserves its source and counts as organized only while hashes agree', t => {
  const root = fs.mkdtempSync(path.join(process.cwd(), 'runtime', 'topic-copy-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0', presets: [] }));
  const personalRoot = path.join(root, 'private'), personal = path.join(personalRoot, 'projects/demo');
  fs.mkdirSync(path.join(personal, 'memory'), { recursive: true });
  fs.writeFileSync(path.join(personal, 'memory/brief.md'), 'one-person company');
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal }));
  createPersonalTopic(personalRoot, 'demo', { id: 'solo', title: '一人公司', sessionId: 'legacy-event:solo' });
  assert.equal(copyLegacyFilesToTopic(personalRoot, 'demo', { topicId: 'solo', paths: ['memory/brief.md'], reason: '内容对应' }).copied, 1);
  assert.equal(fs.readFileSync(path.join(personal, 'memory/brief.md'), 'utf8'), 'one-person company');
  assert.equal(readPanoramaTopics(root).unlinkedCount, 0);
  fs.writeFileSync(path.join(personal, 'memory/brief.md'), 'changed');
  assert.equal(readPanoramaTopics(root).unlinkedCount, 1);
});

test('physical topic owns categorized files and archiving a session preserves them', t => {
  const root = fs.mkdtempSync(path.join(process.cwd(), 'runtime', 'topic-layout-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0', presets: [] }));
  const personalRoot = path.join(root, 'private');
  const personal = path.join(personalRoot, 'projects/demo');
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal }));
  const created = createPersonalTopic(personalRoot, 'demo', { id: 'topic-a', title: '课题 A', sessionId: 'session-a' });
  const artifact = path.join(created.directory, 'meetings/decision.md');
  fs.writeFileSync(artifact, 'decision');
  let model = buildPanoramaModel(root, { view: 'local', externalRoots: [] });
  assert.equal(model.topics.topics[0].links[0].path, 'topics/topic-a/meetings/decision.md');
  assert.equal(model.topics.topics[0].links[0].status, 'verified');
  archivePersonalTopicSession(personalRoot, 'demo', 'topic-a', 'session-a');
  assert.equal(fs.readFileSync(artifact, 'utf8'), 'decision');
  model = buildPanoramaModel(root, { view: 'local', externalRoots: [] });
  assert.equal(model.topics.topics[0].status, 'archived');
  assert.match(renderPanorama(model), /session-a（已归档）/);
});
