import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { stageReviewedExperience, cleanupReviewedExperience, restoreReviewedExperience, reconcileReviewedExperience } from './experience-recovery.js';

const hash = text => createHash('sha256').update(text).digest('hex');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'avc-recovery-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const project = path.join(root, 'private/projects/demo');
  fs.mkdirSync(path.join(root, 'runtime'), { recursive: true });
  fs.mkdirSync(path.join(project, 'topics/one/experience'), { recursive: true });
  fs.mkdirSync(path.join(project, 'custom'), { recursive: true });
  fs.writeFileSync(path.join(root, 'bootstrap.json'), JSON.stringify({ name: 'demo', version: '1.0.0', presets: [] }));
  fs.writeFileSync(path.join(root, 'runtime/storage.json'), JSON.stringify({ personal: project }));
  fs.writeFileSync(path.join(project, 'topics/one/experience/raw.md'), 'raw');
  fs.writeFileSync(path.join(project, 'custom/refined.md'), 'refined');
  const input = { sourcePath: 'topics/one/experience/raw.md', candidatePath: 'custom/refined.md', review: {
    status: 'approved', coverage: 'complete', sourceSha256: hash('raw'), candidateSha256: hash('refined'),
    sourceSpans: [{ start: 0, end: 3, candidateRef: 'summary' }],
  } };
  return { root, project, input };
}
test('reviewed experience stays recoverable for 90 days and refuses changed target', t => {
  const { root, project, input } = fixture(t), now = Date.parse('2026-10-13T00:00:00Z');
  assert.equal(stageReviewedExperience(root, input).action, 'would_stage');
  const staged = stageReviewedExperience(root, input, { apply: true, now });
  assert.equal(fs.existsSync(path.join(project, input.sourcePath)), false);
  assert.deepEqual(cleanupReviewedExperience(root, { now: now + 89 * 86400000 }).results, []);
  fs.writeFileSync(path.join(project, input.candidatePath), 'changed');
  assert.equal(cleanupReviewedExperience(root, { apply: true, now: now + 90 * 86400000 }).results[0].action, 'refused');
  fs.writeFileSync(path.join(project, input.candidatePath), 'refined');
  assert.equal(cleanupReviewedExperience(root, { now: now + 90 * 86400000 }).results[0].action, 'would_delete');
  assert.equal(restoreReviewedExperience(root, staged.item.id).status, 'restored');
  assert.equal(fs.readFileSync(path.join(project, input.sourcePath), 'utf8'), 'raw');
});
test('interrupted move can be reconciled without deleting source or target', t => {
  const { root, project, input } = fixture(t);
  const staged = stageReviewedExperience(root, input, { apply: true });
  const manifestPath = path.join(project, 'experience/.avc/recovery-manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  manifest.items[0].status = 'prepared';
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.equal(reconcileReviewedExperience(root).results[0].action, 'would_staged');
  assert.equal(reconcileReviewedExperience(root, { apply: true }).results[0].action, 'staged');
  assert.equal(restoreReviewedExperience(root, staged.item.id).status, 'restored');
});
