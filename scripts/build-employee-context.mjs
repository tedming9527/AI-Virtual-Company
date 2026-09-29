#!/usr/bin/env node
import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonical, sha256 } from './employee-participation-gate.mjs';

const requiredBrief = ['task_id', 'objective', 'success_criteria', 'authority', 'out_of_scope', 'responsibility', 'acceptance'];
const requiredLists = ['facts', 'decisions', 'unresolved', 'evidence_refs'];
const safeKnowledgeId = value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);

async function regularText(file, root) {
  const resolved = await realpath(file);
  if (resolved !== root && !resolved.startsWith(root + path.sep)) throw new Error('source_outside_root');
  const stat = await lstat(resolved);
  if (!stat.isFile() || stat.isSymbolicLink()) throw new Error('unsafe_source');
  return readFile(resolved, 'utf8');
}

function section(memory, id) {
  const blocks = memory.split(/(?=^## )/m);
  return blocks.find(block => block.startsWith(`## ${id} `) || block.startsWith(`## ${id}\n`))?.trim() ?? null;
}

export async function buildEmployeeContext(brief, employeeId, { root = process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd(), knowledge_ids = [], max_bytes = 16_000 } = {}) {
  root = await realpath(root);
  if (!brief || requiredBrief.some(key => typeof brief[key] !== 'string' || !brief[key].trim()) || requiredLists.some(key => !Array.isArray(brief[key]) || brief[key].some(item => typeof item !== 'string' || !item.trim()))) throw new Error('incomplete_task_brief');
  if (!Number.isInteger(max_bytes) || max_bytes < 1024 || max_bytes > 100_000) throw new Error('invalid_context_budget');
  if (!Array.isArray(knowledge_ids) || knowledge_ids.some(id => !safeKnowledgeId(id))) throw new Error('invalid_knowledge_id');
  const identities = JSON.parse(await regularText(path.join(root, 'employees/IDENTITIES.json'), root));
  const identity = identities.employees.find(item => item.employee_id === employeeId && item.status === 'active');
  if (!identity) throw new Error('employee_identity_not_active');
  const base = path.join(root, 'employees', identity.role_id);
  const profile = (await regularText(path.join(base, 'PROFILE.md'), root)).trim();
  const memory = await regularText(path.join(base, 'MEMORY.md'), root);
  const selected = knowledge_ids.map(id => {
    const content = section(memory, id);
    if (!content) throw new Error(`knowledge_summary_not_found:${id}`);
    return { id, content };
  });
  const chunks = [
    { kind: 'task_contract', source_ref: 'current-task-brief', content: brief },
    { kind: 'employee_profile', source_ref: `employees/${identity.role_id}/PROFILE.md`, content: profile },
    ...selected.map(item => ({ kind: 'knowledge_summary', source_ref: `employees/${identity.role_id}/MEMORY.md#${item.id}`, content: item.content }))
  ].map(item => ({ ...item, content_digest: sha256(canonical(item.content)) }));
  const manifest = { schema: 'ted.employee-context-manifest.v1', task_id: brief.task_id, employee_id: employeeId, role_id: identity.role_id, loading_policy: 'task contract + profile + explicit MEMORY sections only; detail cards are follow-up by reference', chunks };
  const bytes = Buffer.byteLength(canonical(manifest));
  if (bytes > max_bytes) throw new Error(`context_budget_insufficient:${bytes}>${max_bytes}`);
  return { ...manifest, bytes, manifest_digest: sha256(canonical(manifest)) };
}

async function main() {
  const args = process.argv.slice(2), taskIndex = args.indexOf('--task'), employeeIndex = args.indexOf('--employee'), knowledgeIndex = args.indexOf('--knowledge'), budgetIndex = args.indexOf('--max-bytes');
  if (taskIndex < 0 || employeeIndex < 0) throw new Error('usage: build-employee-context.mjs --task FILE --employee ID [--knowledge id,id] [--max-bytes N]');
  const brief = JSON.parse(await readFile(args[taskIndex + 1], 'utf8'));
  const result = await buildEmployeeContext(brief, args[employeeIndex + 1], { knowledge_ids: knowledgeIndex < 0 || !args[knowledgeIndex + 1] ? [] : args[knowledgeIndex + 1].split(','), max_bytes: budgetIndex < 0 ? 16_000 : Number(args[budgetIndex + 1]) });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => {
  console.error(JSON.stringify({ status: 'blocked', reason: error.message }));
  process.exitCode = 2;
});
