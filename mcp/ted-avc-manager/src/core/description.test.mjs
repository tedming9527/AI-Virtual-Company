import test from 'node:test';
import assert from 'node:assert/strict';
import { describeAsset } from './description.js';
import { validatePackMeta } from './manifest.js';

const meta = { type: 'skill', name: 'demo', version: '1.0.0', rubric: ['quality'] };
test('release description gate rejects missing, blank, multiline and oversized descriptions; legacy metadata remains readable', () => {
  assert.equal(validatePackMeta(meta, 'skill/demo').valid, true);
  for (const description of [undefined, '', '  ', 42, 'first\nsecond', 'first\rsecond', '字'.repeat(161)]) {
    const result = validatePackMeta({ ...meta, description }, 'skill/demo', { requireDescription: true });
    assert.equal(result.valid, false);
    assert.match(result.errors.join(), /meta.description/);
  }
  assert.equal(validatePackMeta({ ...meta, description: '执行验收时核对实际证据。' }, 'skill/demo', { requireDescription: true }).valid, true);
});

test('explicit metadata wins; legacy fallback reads only single-line frontmatter, never body prose', () => {
  const content = '---\ndescription: "旧资产用途"\n---\nPRIVATE_BODY';
  assert.deepEqual(describeAsset({ description: '当前用途' }, content), { description: '当前用途', descriptionSource: 'meta' });
  assert.deepEqual(describeAsset({}, content), { description: '旧资产用途', descriptionSource: 'frontmatter' });
  for (const body of ['# PRIVATE_BODY', 'description: PRIVATE_BODY', '---\ndescription: |\n  PRIVATE_BODY\n---']) {
    assert.deepEqual(describeAsset({}, body), { description: null, descriptionSource: 'missing' });
  }
});
