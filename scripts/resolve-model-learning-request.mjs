import fs from 'node:fs';
import path from 'node:path';

const models = [
  {aliases: [/gpt[- ]?5\.3[- ]?codex[- ]?spark/i, /codex[- ]?spark/i, /spark/i], canonical: 'gpt-5.3-codex-spark', limitId: 'codex_bengalfox', metering: 'dedicated_shared_window'},
  {aliases: [/gpt[- ]?5\.6[- ]?luna/i, /luna/i], canonical: 'gpt-5.6-luna', limitId: 'codex', metering: 'general_shared_window'},
  {aliases: [/gpt[- ]?5\.6[- ]?terra/i, /terra/i], canonical: 'gpt-5.6-terra', limitId: 'codex', metering: 'general_shared_window'},
  {aliases: [/gpt[- ]?5\.6[- ]?sol/i, /sol/i], canonical: 'gpt-5.6-sol', limitId: 'codex', metering: 'general_shared_window'},
  {aliases: [/gpt[- ]?6[- ]?astra/i, /astra/i], canonical: 'gpt-6-astra', limitId: 'codex', metering: 'general_shared_window'}
];

const args = process.argv.slice(2);
let request = args.join(' ').trim();
if (args[0] === '--file') {
  if (!args[1]) {
    console.error('usage: node scripts/resolve-model-learning-request.mjs --file <request.txt>');
    process.exit(2);
  }
  request = fs.readFileSync(path.resolve(args[1]), 'utf8').trim();
}

const peopleMatched = /(每(?:个|位)(?:员工|同事)|全体员工|全员)/i.test(request);
const selectedModel = models.find((model) => model.aliases.some((alias) => alias.test(request))) || null;
const percentMatch = request.match(/(\d+(?:\.\d+)?)\s*%/);
const percent = percentMatch ? Number(percentMatch[1]) : null;
const explicitSerial = /(串行|依次执行|逐个执行|不要并行|不并行)/i.test(request);
const explicitParallel = /(异步并行|并行|parallel)/i.test(request) && !explicitSerial;
const matched = peopleMatched && selectedModel !== null && percent !== null;
const errors = [];

if (percent !== null && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) {
  errors.push('percentage must be greater than 0 and no more than 100');
}

let roleCount = null;
try {
  const root = fs.realpathSync(process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
  roleCount = fs.readFileSync(path.join(root, 'employees', 'ROSTER.txt'), 'utf8')
    .split(/\r?\n/).map((line) => line.trim()).filter(Boolean).length;
} catch {
  errors.push('company roster is not readable');
}

const allocationMode = /(最多|上限|不超过)/.test(request) ? 'cap' : 'target';
const aggregatePercent = matched && roleCount !== null ? percent * roleCount : null;
if (aggregatePercent !== null && aggregatePercent > 100) {
  errors.push(`aggregate target ${aggregatePercent}% exceeds one shared window`);
}

const execution = explicitSerial ? 'supervised_serial' : 'supervised_asynchronous_parallel_batches';
const result = {
  matched,
  signals: {
    people: peopleMatched,
    percentage: percent,
    model: selectedModel?.canonical || null,
    explicit_parallel: explicitParallel,
    explicit_serial: explicitSerial,
    parallel_defaulted: matched && !explicitParallel && !explicitSerial
  },
  contract: matched ? {
    model: selectedModel.canonical,
    usage_limit_id: selectedModel.limitId,
    metering: selectedModel.metering,
    supervisor: {
      count: 1,
      participates_in_employee_model_budget: false,
      duties: ['usage_snapshots', 'async_backfill', 'stop_gate', 'integration']
    },
    allocation_mode: allocationMode,
    per_role_percent: percent,
    role_count: roleCount,
    aggregate_percent: aggregatePercent,
    execution,
    attribution: 'shared_window_only',
    require_explicit_model: true,
    require_before_after_usage_snapshot: true,
    fail_if_model_unavailable: true,
    verified_requires_positive_usage_delta: true
  } : null,
  errors
};

console.log(JSON.stringify(result, null, 2));
process.exitCode = errors.length ? 1 : 0;
