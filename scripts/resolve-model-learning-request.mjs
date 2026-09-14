import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const models = [['spark', 'gpt-5.3-codex-spark', 'codex_bengalfox'], ['luna', 'gpt-5.6-luna', 'codex'], ['terra', 'gpt-5.6-terra', 'codex'], ['sol', 'gpt-5.6-sol', 'codex'], ['astra', 'gpt-6-astra', 'codex']];
const args = process.argv.slice(2);
let request = args.join(' ').trim();
if (args[0] === '--file') {
  if (!args[1] || args.length !== 2) {
    console.error('usage: node scripts/resolve-model-learning-request.mjs --file <request.txt>');
    process.exit(2);
  }
  request = fs.readFileSync(path.resolve(args[1]), 'utf8').trim();
}
const errors = [];
const root = process.env.AI_VIRTUAL_COMPANY_ROOT || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let roster = [];
try {
  roster = fs.readFileSync(path.join(root, 'employees/ROSTER.txt'), 'utf8').split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#')).map(id => {
    const display = fs.readFileSync(path.join(root, 'employees', id, 'PROFILE.md'), 'utf8').split(/\r?\n/, 1)[0].replace(/^#\s*/, '').trim();
    const name = display.split(/\s*[·（(]/)[0].trim();
    if (!name || !display.includes('·')) throw new Error('invalid profile heading');
    return { id, name, display };
  });
  if (!roster.length || new Set(roster.map(p => p.name)).size !== roster.length) throw new Error('invalid roster');
} catch { errors.push('company roster or profile headings are not readable or valid'); }

// Read names only from participant slots, not arbitrary task prose.
const allRE = /^(?:全员|全部人员|所有同事|全体员工|全体同事|所有员工|每(?:个|位)(?:员工|同事)|各(?:岗|员工|同事))/;
function readPeople(text) {
  let rest = text.trim();
  const all = rest.match(allRE);
  if (all) return { people: roster, rest: rest.slice(all[0].length) };
  const people = [];
  while (rest) {
    const person = roster.find(p => rest.startsWith(p.name));
    if (!person) break;
    if (!people.includes(person)) people.push(person);
    rest = rest.slice(person.name.length);
    const separator = rest.match(/^\s*(?:、|和|与|及)\s*/);
    if (!separator) break;
    rest = rest.slice(separator[0].length);
    if (!roster.some(p => rest.startsWith(p.name))) { errors.push('unknown or ambiguous participant in list'); break; }
  }
  return { people, rest };
}
const selectedModels = models.filter(([alias]) => new RegExp(`(?<![a-z])${alias}(?![a-z])`, 'i').test(request));
const percents = [...request.matchAll(/(-?\d+(?:\.\d+)?)\s*[%％]/g)].map(m => Number(m[1]));
const selectedModel = selectedModels.length === 1 ? selectedModels[0] : null;
const percent = percents.length === 1 ? percents[0] : null;
const supervisorIds = [];
const supervisionRequested = /监督/.test(request);
const supervisedPeople = [];
for (const m of request.matchAll(/(?:监督者监督|监督)\s*/g)) {
  const parsed = readPeople(request.slice(m.index + m[0].length));
  if (parsed.people.length) supervisedPeople.push(parsed);
}
let body = request.replace(new RegExp(`(?:启用|由|让|请)?\\s*(${roster.map(p => p.name).join('|') || '(?!)'})\\s*(?:担任监督者|作为监督者|负责监督|监督者|监督)(?![\\u4e00-\\u9fff])`, 'g'), (_, name) => {
  supervisorIds.push(roster.find(p => p.name === name).id);
  return '';
}).replace(/启用监督者监督[^，。；;]*/g, '').trim();
const donorScopes = [];
const recipientScopes = [];
if (/(?:启用|由|让|请)[^，。；;]*监督/.test(body) && !/启用监督者/.test(body)) errors.push('unknown or ambiguous supervisor');
// Comma-separated registered names form one list; ordinary clause commas remain.
for (const person of roster) body = body.replace(new RegExp(`(${person.name})\\s*[,，]\\s*(?=${roster.map(p => p.name).join('|')})`, 'g'), '$1、');
for (const clause of body.split(/[，,。；;\n]/).map(s => s.trim()).filter(Boolean)) {
  for (const m of clause.matchAll(/(?:交给|转给|集中给|集中到|汇集给|汇集到|给)\s*/g)) {
    const prefix = clause.slice(0, m.index).trim();
    // Delivering an article/report to somebody is not pooling their budget.
    if (prefix && !/(?:额度|预算|[%％]\s*(?:的)?\s*(?:(?:gpt[\w.-]*|spark|luna|terra|sol|astra)\s*)?(?:额度|预算)?)$/i.test(prefix)) continue;
    const parsed = readPeople(clause.slice(m.index + m[0].length));
    if (!parsed.people.length) errors.push('unknown or missing budget recipient');
    else recipientScopes.push(parsed);
  }
  const leading = clause.replace(/^(?:授权|安排|让|请|由|启用|将|把)\s*/, '');
  const parsed = readPeople(leading);
  if (parsed.people.length && /^(?:\s*(?:学习|使用|用|各|每人|每位|每个|的(?:预算|额度)|最多|上限|不超过|总计|总预算|目标|至少|\d|Spark|Luna|Terra|Sol|Astra|gpt|预算|额度|$))/i.test(parsed.rest)) donorScopes.push(parsed);
  else if (/^(?:授权|安排|让|请|由)/.test(clause) && /使用|学习|额度|预算/.test(clause) && !parsed.people.length) errors.push('unknown or ambiguous executor');
}
const samePeople = (a, b) => a.map(p => p.id).sort().join(',') === b.map(p => p.id).sort().join(',');
for (const scopes of [donorScopes, recipientScopes]) if (scopes.some(s => !samePeople(s.people, scopes[0].people))) errors.push('conflicting participant scopes');
const donors = donorScopes[0]?.people || supervisedPeople[0]?.people || [];
const executors = recipientScopes[0]?.people || donors;
const peopleMatched = executors.length > 0;
const related = peopleMatched || allRE.test(request.replace(/^(?:授权|安排|让|请|由|启用|将|把)\s*/, '')) || supervisorIds.length > 0 || (supervisionRequested && roster.some(p => request.includes(p.name))) || (selectedModels.length > 0 && percents.length > 0 && (/监督|额度|预算|学习|使用/.test(request) || errors.length > 0 || roster.some(p => request.startsWith(p.name))));
if (related) {
  if (selectedModels.length > 1) errors.push('multiple models require separate unambiguous requests');
  if (percents.length > 1) errors.push('multiple percentages require explicit separate budget requests');
  if (percent !== null && (percent <= 0 || percent > 100)) errors.push('percentage must be greater than 0 and no more than 100');
  if (!peopleMatched) errors.push('missing or ambiguous executor scope');
  if (recipientScopes.length && !donors.length) errors.push('missing budget donor scope');
}
// Allocation modifiers belong to the percentage clause. Later instructions
// about each person's deliverable must not multiply or retarget the budget.
// Recipient clauses are parsed independently above, so pooling may cross clauses.
const percentageClause = body.split(/[，,。；;\n]/).find(clause => /-?\d+(?:\.\d+)?\s*[%％]/.test(clause)) || '';
const percentageEnd = percentageClause.match(/-?\d+(?:\.\d+)?\s*[%％]/);
const budgetText = percentageEnd ? percentageClause.slice(0, percentageEnd.index + percentageEnd[0].length)
  + (percentageClause.slice(percentageEnd.index + percentageEnd[0].length).match(/^\s*(?:的)?目标/)?.[0] || '') : '';
const total = /总计|总预算|总共|合计/.test(budgetText);
// “每位同事” can name the participant range. Explicit total wording wins
// over that range, but not over a second, explicit per-person allocation.
const explicitPerPerson = /每人|各(?:岗|员工|同事)?\s*(?:使用|用|分配)?\s*(?:最多|上限|不超过|目标|至少)?\s*(?:总计|总预算|总共|合计)?\s*\d/.test(budgetText);
const perPerson = explicitPerPerson || (!total && /每(?:位|个)/.test(budgetText));
if (related && explicitPerPerson && total) errors.push('conflicting per-person and total budget scopes');
const budgetScope = perPerson ? 'per_person' : 'total';
const cap = /最多|上限|不超过/.test(budgetText);
const target = /(?:目标(?:额度|预算|配额)?(?:为|是)?|至少)\s*\d|\d+(?:\.\d+)?\s*[%％]\s*(?:的)?目标/.test(budgetText);
if (related && cap && target) errors.push('conflicting cap and target allocation modes');
const aggregate = percent === null ? null : Number((percent * (perPerson ? donors.length : 1)).toFixed(8));
if (related && aggregate > 100) errors.push(`aggregate budget ${aggregate}% exceeds one shared window`);
const explicitSerial = /串行|依次|逐个执行|不要并行|不并行/.test(body);
const explicitParallel = /并行|parallel/i.test(body.replace(/不要并行|不并行/g, ''));
if (related && explicitSerial && explicitParallel) errors.push('conflicting serial and parallel instructions');
const matched = related;
const complete = peopleMatched && selectedModel !== null && percent !== null;
const status = !matched ? 'unmatched' : errors.length ? 'invalid' : !complete ? 'incomplete' : 'planned';
const result = {
  matched, status,
  dispatch_status: status === 'planned' ? 'requires_dispatch_receipt' : 'not_dispatched',
  missing: matched ? [!peopleMatched && 'executors', !selectedModel && 'model', percent === null && 'percentage'].filter(Boolean) : [],
  signals: { people: peopleMatched, percentage: percent, model: selectedModel?.[1] || null, explicit_parallel: explicitParallel, explicit_serial: explicitSerial, parallel_defaulted: false },
  contract: matched ? {
    model: selectedModel?.[1] || null, usage_limit_id: selectedModel?.[2] || null,
    metering: selectedModel ? selectedModel[2] === 'codex' ? 'general_shared_window' : 'dedicated_shared_window' : null,
    supervisor: { count: 1, ids: supervisorIds, participates_in_employee_model_budget: false, duties: ['usage_snapshots', 'dependency_review', 'stop_gate', 'integration'] },
    allocation_mode: target ? 'target' : 'cap', budget_scope: budgetScope,
    per_role_percent: perPerson ? percent : null, total_percent: perPerson ? null : percent,
    role_count: donors.length, aggregate_percent: aggregate, budget_donor_count: donors.length,
    budget_donor_ids: donors.map(p => p.id),
    allocation_recipient: recipientScopes.length ? executors.map(p => p.display).join('、') : 'each_role',
    executor_count: executors.length, executor_ids: executors.map(p => p.id), executor_names: executors.map(p => p.display),
    parallelism_basis: 'requires_dependency_assessment',
    execution: explicitSerial ? 'supervised_serial' : explicitParallel ? 'supervised_asynchronous_parallel_batches' : executors.length === 1 ? 'supervised_single_owner' : 'supervised_dependency_batches',
    dispatch_status: status === 'planned' ? 'planned' : 'not_dispatched',
    attribution: 'shared_window_only', require_explicit_model: true, require_before_after_usage_snapshot: true,
    fail_if_model_unavailable: true, verified_requires_positive_usage_delta: true
  } : null,
  errors: matched ? [...new Set(errors)] : []
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = result.errors.length ? 1 : 0;
