import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const root = fs.realpathSync(process.argv[2] || process.env.AI_VIRTUAL_COMPANY_ROOT || process.cwd());
const catalog = JSON.parse(fs.readFileSync(path.join(root, 'knowledge/catalog.json'), 'utf8'));
const requested = process.argv[3];
const selected = requested ? catalog.entries.filter(e => e.id === requested) : catalog.entries;
const errors = [], warnings = [], ids = new Set(), indexes = new Map();
if (requested && selected.length !== 1) errors.push('unknown or duplicate requested id');

function resolve(p) {
  if (path.isAbsolute(p)) throw Error('absolute path');
  const f = fs.realpathSync(path.join(root, p));
  if (!f.startsWith(root + path.sep)) throw Error('outside root');
  return f;
}

// A knowledge heading owns its fields only until the next level-1/2 heading.
function sections(file) {
  if (indexes.has(file)) return indexes.get(file);
  const result = new Map();
  let current, fence;
  for (const line of fs.readFileSync(resolve(file), 'utf8').split(/\r?\n/)) {
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = undefined;
      continue;
    }
    if (fence) continue;
    if (/^#{1,2}\s/.test(line)) {
      current = undefined;
      const id = line.match(/^##\s+`?([a-z0-9][a-z0-9-]*)`?(?=\s|$)/)?.[1];
      if (id) {
        if (result.has(id)) throw Error('duplicate index id ' + id);
        current = [];
        result.set(id, current);
      }
    } else if (current) current.push(line);
  }
  for (const [id, lines] of result) result.set(id, lines.join('\n'));
  indexes.set(file, result);
  return result;
}

function field(section, names) {
  const match = section.match(new RegExp('(?:^\\s*(?:-\\s*)?|[；;]\\s*|\\n\\s*-\\s*)(?:' + names + ')[：:][ \\t]*([^；;\\n]+)', 'i'));
  return match?.[1].trim().replace(/^`([^`]+)`$/, '$1').replace(/[。.]$/, '');
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function matchesOwner(value, role) {
  if (value === role) return true;
  if (!/^[a-z][a-z0-9-]+$/.test(role)) return false;
  const profile = fs.readFileSync(resolve('employees/' + role + '/PROFILE.md'), 'utf8');
  const heading = profile.match(/^#\s+(.+)$/m)?.[1];
  // Profiles use the same person's name with both short and full job titles.
  return heading && value.split(/\s*[·｜|]\s*/)[0] === heading.split(/\s*[·｜|]\s*/)[0];
}

function hasDetail(section, index, detail) {
  const expected = resolve(detail);
  return [...section.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)].some(([, target]) => {
    if (/^[a-z]+:/i.test(target)) return false;
    try { return resolve(path.join(path.dirname(index), target.split('#')[0])) === expected; }
    catch { return false; }
  });
}

function checkMetadata(e, section, index, reference = false) {
  const status = field(section, '状态');
  if ((!reference || status) && status !== e.status) throw Error('index/catalog status mismatch');
  const updated = field(section, '更新时间|索引核对日');
  if ((!reference || updated) && updated !== e.updated) throw Error('index/catalog updated mismatch');
  const owner = field(section, 'Owner|负责人');
  const role = index.match(/^employees\/([^/]+)\/MEMORY\.md$/)?.[1];
  if (owner && !matchesOwner(owner, e.owner)) throw Error('index/catalog owner mismatch');
  if (!reference && role && role !== e.owner) throw Error('index path/catalog owner mismatch');
  if (!owner && !role && !reference) warnings.push(e.id + ': legacy index has no explicit owner');
  if (reference && !updated) warnings.push(e.id + ': shared reference has no updated date in ' + index);
  if (reference && !status) warnings.push(e.id + ': shared reference inherits canonical status in ' + index);
  const hashes = [...section.matchAll(/sha256:([a-f0-9]{64})(?![a-f0-9])/g)].map(m => m[1]);
  if ((!reference || hashes.length) && !hashes.includes(e.sha256)) throw Error('index/catalog sha256 mismatch');
  if (!hasDetail(section, index, e.detail)) throw Error('index/catalog detail mismatch');
}

for (const e of selected) {
  try {
    for (const k of ['id', 'owner', 'index', 'detail', 'sha256', 'status', 'updated', 'trigger', 'summary', 'limit']) {
      if (!e[k]) throw Error('missing ' + k);
    }
    if (ids.has(e.id)) throw Error('duplicate id');
    ids.add(e.id);
    if (!['candidate', 'reviewed_case', 'verified_context', 'stale', 'superseded'].includes(e.status)) throw Error('invalid status');
    if (!validDate(e.updated)) throw Error('invalid updated date');
    const digest = crypto.createHash('sha256').update(fs.readFileSync(resolve(e.detail))).digest('hex');
    if (digest !== e.sha256) throw Error('STALE summary/source hash mismatch');
    const section = sections(e.index).get(e.id);
    if (!section) throw Error('missing ID section in index');
    for (const [key, label] of [['trigger', '触发'], ['summary', '摘要'], ['limit', '限制']]) {
      const line = section.match(new RegExp('^\\s*-\\s*' + label + '[：:]\\s*(.*)$', 'm'))?.[1];
      if (!line?.includes(e[key])) throw Error('index/catalog ' + key + ' mismatch');
    }
    checkMetadata(e, section, e.index);
    if ([...e.summary + e.limit].length > 220) warnings.push(e.id + ': long summary, do not truncate limits');
  } catch (err) { errors.push(e.id + ': ' + err.message); }
}

// Full audits discover omitted entries; targeted checks stay local.
if (!requested) {
  const employeeDirs = fs.readdirSync(path.join(root, 'employees'), { withFileTypes: true }).filter(d => d.isDirectory());
  const files = new Set(['knowledge/INDEX.md', ...catalog.entries.map(e => e.index)]);
  for (const d of employeeDirs) {
    if (!catalog.entries.some(e => e.owner === d.name)) errors.push('missing employee ' + d.name);
    files.add('employees/' + d.name + '/MEMORY.md');
  }
  for (const file of files) {
    try {
      for (const [id, section] of sections(file)) {
        const entries = catalog.entries.filter(e => e.id === id);
        if (entries.length !== 1) { errors.push(id + ': missing or duplicate catalog entry (' + file + ')'); continue; }
        const e = entries[0];
        if (e.index === file) continue;
        // Shared IDs are references only when they link to the canonical detail.
        if (e.index !== 'knowledge/INDEX.md') { errors.push(id + ': noncanonical duplicate index (' + file + ')'); continue; }
        try { checkMetadata(e, section, file, true); }
        catch (err) { errors.push(id + ': shared reference ' + file + ': ' + err.message); }
      }
    } catch (err) { errors.push(file + ': ' + err.message); }
  }
}

console.log(JSON.stringify({ entries: selected.length, requested: requested || 'all', errors, warnings, scope: 'ID-bound structure, catalog coverage and drift only; not semantic certification' }, null, 2));
process.exitCode = errors.length ? 1 : 0;
