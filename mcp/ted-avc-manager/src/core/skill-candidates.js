import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { discoverSkills, personalProject, skillBundle } from './local-assets.js';
import { assertNoLinks } from './scan.js';
import { validatePackMeta } from './manifest.js';
const read = file => JSON.parse(readFileSync(file, 'utf8'));
function check(ok, message) { if (!ok) throw new Error(message); }
function personalPath(root, ...parts) { const base = personalProject(root).directory; return assertNoLinks(base, join(base, ...parts)); }
function write(file, value) { mkdirSync(dirname(file), {recursive:true}); writeFileSync(file, JSON.stringify(value, null, 2) + '\n', {flag:'wx', mode:0o600}); }
export function managedSkill(root, identity) {
  const matches = discoverSkills(root, {externalRoots:[]}).skills.filter(s => s.source === 'local-custom' && [s.id, s.name, `local-custom:skill:${s.name}`].includes(identity));
  check(matches.length === 1 && matches[0].management === 'local-managed' && !matches[0].error, 'Select one registered, unchanged local skill');
  return matches[0];
}
export function validateLocalSkill(root, {assetId}) {
  const skill = managedSkill(root, assetId), meta = read(join(skill.dir, 'meta.json')), body = readFileSync(skill.entry, 'utf8');
  const validation = validatePackMeta(meta, 'skill/' + skill.name, {requireDescription:true});
  check(validation.valid, validation.errors.join('; '));
  check(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/.test(body), 'SKILL.md frontmatter required');
  const front = body.split(/^---\s*$/m)[1] || '';
  check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(skill.name) && skill.name.length <= 64, 'Skill ID must be lowercase hyphenated words, at most 64 characters');
  const nameLines = front.match(/^name:.*$/gm) || [], descriptions = front.match(/^description:.*$/gm) || [];
  const name = nameLines[0]?.slice(5).trim().replace(/^(["'])(.*)\1$/, '$2');
  const description = descriptions[0]?.slice(12).trim();
  check(nameLines.length === 1 && descriptions.length === 1 && name === skill.name && description && !/^(?:[\[\]{},&*!|>@`#]|true$|false$|null$|~$)/i.test(description), 'Single-line string name/description frontmatter required');
  if (description.startsWith('"')) check(typeof JSON.parse(description) === 'string', 'Quoted description must be a string');
  else if (description.startsWith("'")) check(/^'(?:[^']|'')*'$/.test(description), 'Invalid quoted description');
  else check(!/:\s/.test(description), 'Quote descriptions containing colon-space');
  const result = {schema:'avc.skill-validation.v1', id:randomUUID(), assetName:skill.name, source:'local-custom', version:skill.version, ...skillBundle(skill.dir), status:'passed', scope:'structural-only; behavior and publication review still required', at:new Date().toISOString()};
  write(personalPath(root, 'learning', 'skill-validations', result.id + '.json'), result);
  return result;
}
function validateSources(sources) {
  check(Array.isArray(sources) && sources.length > 0 && sources.length <= 32, 'Candidate requires provenance sources');
  return sources.map(s => {
    check(s && typeof s.kind === 'string' && ['original', 'reference', 'adapted'].includes(s.kind), 'Invalid provenance kind');
    check(typeof s.license === 'string' && s.license.trim() && s.license !== 'unknown', 'Resolve redistribution license before candidate preparation');
    check(typeof s.note === 'string' && s.note.trim() && s.note.length <= 1000, 'Source decision note required');
    if (s.kind !== 'original') check(/^https:\/\//.test(s.url || '') && typeof s.revision === 'string' && s.revision.trim(), 'External source needs HTTPS URL and pinned revision');
    return {kind:s.kind, license:s.license, note:s.note, ...(s.kind !== 'original' ? {url:s.url, revision:s.revision} : {})};
  });
}
export function prepareSkillCandidate(root, input, candidateId) {
  const skill = managedSkill(root, input.assetId);
  check(input.name === skill.name && (!input.type || input.type === 'skill'), 'Candidate identity must match registered skill');
  check(/^[a-f0-9-]{36}$/.test(input.validationId || ''), 'A validationId from validate-local-skill is required');
  const validation = read(personalPath(root, 'learning', 'skill-validations', input.validationId + '.json'));
  const snapshot = skillBundle(skill.dir);
  check(validation.status === 'passed' && validation.assetName === skill.name && validation.bundleSha256 === snapshot.bundleSha256, 'Skill changed since validation; revalidate');
  const sources = validateSources(input.sources);
  // Refuse obvious private exports. This structural check does not replace human review.
  const privateText = /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\|-----BEGIN .*PRIVATE KEY-----|\b(?:sk-proj-|ghp_)[A-Za-z0-9_-]{12,}|(?:password|api[_-]?key|access[_-]?token)\s*[:=]\s*["']?[A-Za-z0-9_/-]{16,})/i;
  for (const f of snapshot.files) {
    check(!/(^|\/)(?:\.env(?:\.|$)|credentials|secrets?)(?:\.|\/|$)/i.test(f.path), 'Private configuration cannot enter a candidate');
    const bytes = readFileSync(assertNoLinks(skill.dir, join(skill.dir, f.path)));
    check(!bytes.includes(0) && !privateText.test(bytes.toString('utf8')), 'Candidate requires reviewed text files without private paths or secrets');
  }
  const dir = personalPath(root, 'staging', 'proposals', candidateId, 'bundle');
  try {
    mkdirSync(dir, {recursive:true});
    for (const f of snapshot.files) { const target = assertNoLinks(dir, join(dir, f.path)); mkdirSync(dirname(target), {recursive:true}); copyFileSync(assertNoLinks(skill.dir, join(skill.dir, f.path)), target); }
    check(skillBundle(dir).bundleSha256 === snapshot.bundleSha256, 'Skill changed while preparing snapshot');
  } catch (e) { rmSync(dirname(dir), {recursive:true, force:true}); throw e; }
  return {sourceSkill: {name:skill.name, version:skill.version, bundleSha256:snapshot.bundleSha256}, snapshot: {path:`${candidateId}/bundle`, ...snapshot}, validation, sources, review:'pending; structural validation does not authorize publication'};
}
export function listSkillCandidates(root) {
  const dir = personalPath(root, 'staging', 'proposals');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).flatMap(file => {
    const p = read(assertNoLinks(dir, join(dir, file)));
    if (!p.sourceSkill) return [];
    let validationState = 'current';
    try {
      const skill = managedSkill(root, p.sourceSkill.name);
      if (skill.bundleSha256 !== p.sourceSkill.bundleSha256 || skillBundle(assertNoLinks(dir, join(dir, p.snapshot.path))).bundleSha256 !== p.snapshot.bundleSha256) validationState = 'invalidated';
    } catch { validationState = 'invalidated'; }
    return [{id:p.id,name:p.name,status:p.status,version:p.sourceSkill.version,validationState,bundleSha256:p.snapshot.bundleSha256,publication:p.publication,installation:p.installation}];
  });
}
