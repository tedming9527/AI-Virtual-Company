import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { buildEmployeeContext } from './build-employee-context.mjs';

const brief = { task_id: 'task-1', objective: '验证身份门禁', success_criteria: '有效回执通过，无效回执拒绝', authority: '只读 fixture', out_of_scope: '外部系统', responsibility: '独立复核', acceptance: '测试通过', facts: ['门禁已实现'], decisions: ['使用签名回执'], unresolved: ['真实适配器未验证'], evidence_refs: ['scripts/employee-participation-gate.mjs'] };

async function fixture() {
  const dir = await mkdtemp(path.join(os.tmpdir(), 'employee-context-'));
  await mkdir(path.join(dir, 'employees/test-expert'), { recursive: true });
  await writeFile(path.join(dir, 'employees/IDENTITIES.json'), JSON.stringify({ schema: 'ted.employee-identities.v1', employees: [{ employee_id: 'ted:employee:test-expert', role_id: 'test-expert', display_name: '顾清妍', status: 'active' }] }));
  await writeFile(path.join(dir, 'employees/test-expert/PROFILE.md'), '# 顾清妍\n\nMission: quality evidence.\n');
  await writeFile(path.join(dir, 'employees/test-expert/MEMORY.md'), '# index\n\n## relevant-case · 命中\n- 结论：只加载这段。\n\n## unrelated-case · 不命中\n- 结论：不应进入上下文。\n');
  return dir;
}

test('loads task contract, profile and only explicit memory sections', async t => {
  const dir = await fixture(); t.after(() => rm(dir, { recursive: true, force: true }));
  const result = await buildEmployeeContext(brief, 'ted:employee:test-expert', { root: dir, knowledge_ids: ['relevant-case'], max_bytes: 8000 });
  const text = JSON.stringify(result);
  assert.match(text, /只加载这段/);
  assert.doesNotMatch(text, /不应进入上下文/);
  assert.match(result.manifest_digest, /^sha256:/);
});

test('fails closed when required brief or context budget is insufficient', async t => {
  const dir = await fixture(); t.after(() => rm(dir, { recursive: true, force: true }));
  await assert.rejects(buildEmployeeContext({ ...brief, authority: '' }, 'ted:employee:test-expert', { root: dir }), /incomplete_task_brief/);
  await assert.rejects(buildEmployeeContext(brief, 'ted:employee:test-expert', { root: dir, knowledge_ids: ['relevant-case'], max_bytes: 1024 }), /context_budget_insufficient/);
});
