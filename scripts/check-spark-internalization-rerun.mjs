import fs from 'node:fs';
import path from 'node:path';

const root = fs.realpathSync(process.argv[2] || process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const runDir = path.join(root, 'learning', 'internalization', 'runs', '2026-09-13-spark');
const roster = fs.readFileSync(path.join(root, 'employees', 'ROSTER.txt'), 'utf8')
  .split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
const phases = ['extract', 'transfer', 'audit'];
const errors = [];
const warnings = [];

for (const role of roster) {
  for (const phase of phases) {
    const file = path.join(runDir, `${role}-${phase}.md`);
    if (!fs.existsSync(file)) {
      errors.push(`${role}: missing ${phase}`);
      continue;
    }
    const body = fs.readFileSync(file, 'utf8');
    if (!body.includes('gpt-5.3-codex-spark')) errors.push(`${role}/${phase}: missing actual model`);
    if (body.length < 600) warnings.push(`${role}/${phase}: unusually short output`);
    if (phase === 'extract' && !/触发|trigger/i.test(body)) errors.push(`${role}/${phase}: missing trigger`);
    if (phase === 'extract' && !/反例|失效|counterexample/i.test(body)) errors.push(`${role}/${phase}: missing counterexample or failure boundary`);
    if (phase === 'transfer' && !/质疑/.test(body)) errors.push(`${role}/${phase}: missing stakeholder challenge`);
    if (phase === 'transfer' && !/迁移题|transfer/i.test(body)) errors.push(`${role}/${phase}: missing transfer test`);
    if (phase === 'audit' && !/claim/i.test(body)) errors.push(`${role}/${phase}: missing claim`);
    if (phase === 'audit' && !/evidence/i.test(body)) errors.push(`${role}/${phase}: missing evidence`);
    if (phase === 'audit' && !/verdict/i.test(body)) errors.push(`${role}/${phase}: missing verdict`);
  }
}

const markdownFiles = fs.readdirSync(runDir).filter((name) => name.endsWith('.md'));
console.log(JSON.stringify({
  run_dir: path.relative(root, runDir),
  roster_roles: roster.length,
  expected_role_outputs: roster.length * phases.length,
  found_role_outputs: markdownFiles.filter((name) => phases.some((phase) => name.endsWith(`-${phase}.md`))).length,
  errors,
  warnings,
  scope: 'file coverage, explicit model declaration, and minimum content markers; not semantic or production certification'
}, null, 2));
process.exitCode = errors.length ? 1 : 0;
