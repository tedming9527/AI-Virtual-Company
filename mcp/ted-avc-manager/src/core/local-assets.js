import { existsSync, readdirSync, lstatSync, readFileSync, writeFileSync, mkdirSync, realpathSync } from 'node:fs';
import { join, relative, resolve, basename, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { scanPacks, readBootstrap, assertNoLinks } from './scan.js';
import { searchAssets, searchMetadata } from './asset-search.js';
import { describeAsset } from './description.js';
import { resolvePersonal, projectDirOf, PROJECT_DIRS } from './personal.js';

const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
export function personalProject(root) {
  const storage = resolvePersonal(root, readBootstrap(root));
  return { ...storage, directory: projectDirOf(storage.root, storage.slug) };
}
export function fileInventory(dir, warnings = []) {
  const files = [];
  if (!existsSync(dir)) return files;
  const walk = current => {
    for (const name of readdirSync(current).sort()) {
      if (name === '.DS_Store' || name === '.git' || name === 'node_modules') continue;
      const path = join(current, name), stat = lstatSync(path);
      if (stat.isSymbolicLink()) { warnings.push(`跳过符号链接：${relative(dir, path)}`); continue; }
      if (stat.isDirectory()) walk(path);
      else if (stat.isFile()) files.push({ path, relativePath: relative(dir, path), bytes: stat.size });
    }
  };
  if (lstatSync(dir).isSymbolicLink()) { warnings.push('跳过目录符号链接'); return files; }
  walk(dir);
  return files;
}
function registryFile(root) { return join(root, 'runtime', 'skill-registry.json'); }
function registry(root) {
  const file = registryFile(root);
  return existsSync(file) ? read(file) : { schema: 'avc.local-skill-registry.v1', entries: [] };
}
export function skillBundle(dir) {
  const warnings = [], inventory = fileInventory(dir, warnings);
  if (warnings.length || inventory.length > 256 || inventory.reduce((n, f) => n + f.bytes, 0) > 10 * 1024 * 1024) throw new Error('Skill bundle contains links or exceeds file/size limits');
  const files = inventory.map(f => ({ path: f.relativePath, bytes: f.bytes, sha256: sha(f.path) }));
  return { files, bundleSha256: createHash('sha256').update(JSON.stringify(files)).digest('hex') };
}
function skillFromDir(dir, source, root) {
  if (!existsSync(dir) || lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory()) return null;
  const entry = join(dir, 'SKILL.md');
  if (!existsSync(entry) || lstatSync(entry).isSymbolicLink() || !lstatSync(entry).isFile()) return null;
  const content = readFileSync(entry, 'utf8');
  if (!content.trim()) return null;
  const metaFile = join(dir, 'meta.json');
  let meta = {}, error;
  if (existsSync(metaFile)) {
    if (lstatSync(metaFile).isSymbolicLink() || !lstatSync(metaFile).isFile()) return null;
    try { meta = read(metaFile); } catch { error = 'meta.json 无效'; }
  }
  const name = meta.name || content.match(/^name:\s*["']?([^\n"']+)/m)?.[1]?.trim() || basename(dir);
  const displayName = meta.displayName || content.match(/^#\s+(.+)$/m)?.[1] || name;
  return { id: `${source}:${dir}`, name, displayName, type: 'skill', source, dir, entry,
    ...describeAsset(meta, content), ...searchMetadata(meta),
    version: meta.version || null, origin: meta.origin || null, entrySha256: sha(entry), metaSha256: existsSync(metaFile) ? sha(metaFile) : null,
    sha256: createHash('sha256').update(sha(entry) + ':' + (existsSync(metaFile) ? sha(metaFile) : '')).digest('hex'), error,
    metadataValid: meta.type === 'skill' && meta.name === basename(dir) && /^\d+\.\d+\.\d+$/.test(meta.version || '') && Array.isArray(meta.rubric) && meta.rubric.length > 0,
    pathLabel: source === 'general' ? relative(root, entry) : source === 'local-custom' ? relative(personalProject(root).directory, entry) : entry };
}
export function nativeSkillRoots(home=homedir()) {
  const codex=process.env.CODEX_HOME || join(home,'.codex'), roots=[join(codex,'skills'),join(home,'.agents','skills')];
  const visit=(dir,depth)=>{
    if(depth>6 || !existsSync(dir) || lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory())return;
    if(basename(dir)==='skills'){roots.push(dir);return;}
    for(const name of readdirSync(dir))if(!['.git','node_modules','runtime'].includes(name))visit(join(dir,name),depth+1);
  };
  visit(join(codex,'plugins','cache'),0);
  return roots;
}
export function discoverSkills(root, opts = {}) {
  const personal = personalProject(root), skills = [], warnings = [];
  const roots = [
    { path: join(root, 'packs', 'skill'), source: 'general' },
    { path: join(personal.directory, 'custom', 'packs', 'skill'), source: 'local-custom' },
    { path: join(personal.directory, 'custom', 'skills'), source: 'local-custom' },
    ...(opts.externalRoots || nativeSkillRoots()).map(path => ({ path, source: 'external-installed' })),
  ];
  const entries = registry(root).entries;
  for (const item of roots) {
    if (!existsSync(item.path) || lstatSync(item.path).isSymbolicLink()) continue;
    // Discover only immediate skill directories and the Codex system skill layer.
    const dirs = readdirSync(item.path).filter(n => n !== '.DS_Store').flatMap(n => {
      const d = join(item.path, n);
      if (lstatSync(d).isSymbolicLink() || !lstatSync(d).isDirectory()) return [];
      return n === '.system' ? readdirSync(d).map(x => join(d, x)) : [d];
    });
    for (const dir of dirs) {
      const skill = skillFromDir(dir, item.source, root);
      if (!skill) continue;
      const registration = entries.find(e => e.dir === realpathSync(dir));
      if (registration || item.source === 'local-custom') try { skill.bundleSha256 = skillBundle(dir).bundleSha256; } catch (e) { skill.error = e.message; }
      skill.management = item.source === 'general' ? 'central-managed'
        : registration ? registration.sha256 === skill.sha256 ? 'local-managed' : 'local-changed'
        : 'discovered-unregistered';
      if (registration && (!registration.bundleSha256 || registration.bundleSha256 !== skill.bundleSha256 || skill.error)) skill.management = 'local-changed';
      skills.push(skill);
    }
  }
  return { skills, warnings, personal };
}
export function findSkills(root, query = '', opts = {}) {
  const result = discoverSkills(root, opts);
  return { ...result, skills: searchAssets(result.skills, query), evidence: 'metadata-and-declared-aliases; local inventory, not web or semantic translation' };
}
export function registerLocalSkill(root, input) {
  const personal = personalProject(root), allowed = realpathSync(join(personal.directory, 'custom'));
  if (!resolve(input).startsWith(allowed + sep)) throw new Error('外部资产先走 import-scan / staging 复核');
  assertNoLinks(allowed, resolve(input));
  const dir = realpathSync(resolve(input));
  if (!dir.startsWith(allowed + sep)) throw new Error('只登记 personal/custom 内原创本地技能；外部资产先走 import-scan / staging 复核');
  const skill = skillFromDir(dir, 'local-custom', root);
  if (!skill?.metadataValid || skill.error) throw new Error('登记需非空 SKILL.md 与有效 skill/meta.json');
  const data = registry(root), file = registryFile(root);
  if (existsSync(join(root, 'runtime')) && lstatSync(join(root, 'runtime')).isSymbolicLink()) throw new Error('拒绝 runtime 符号链接');
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new Error('拒绝 registry 符号链接');
  const record = { name: skill.name, dir, source: 'local-custom', version: skill.version, sha256: skill.sha256, bundleSha256: skillBundle(dir).bundleSha256, entrySha256: skill.entrySha256, metaSha256: skill.metaSha256, registeredAt: new Date().toISOString() };
  const index = data.entries.findIndex(e => e.dir === dir);
  if (index < 0) data.entries.push(record); else data.entries[index] = record;
  mkdirSync(join(root, 'runtime'), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  return { ...record, management: 'local-managed', registryFile: file, publication: 'local-only; no automatic upstream PR or native-client skill installation' };
}
export function inventoryPersonal(root) {
  const personal = personalProject(root), warnings = [], areas = [];
  for (const name of PROJECT_DIRS) {
    const files = fileInventory(join(personal.directory, name), warnings);
    const state = name === 'staging' ? 'pending-review' : name === 'archive' ? 'historical' : name === 'preset' ? 'central-distribution' : name === 'custom' ? 'local-custom' : 'personal-record';
    areas.push({ name, state, exists: existsSync(join(personal.directory, name)), files });
  }
  const localPacks = existsSync(join(personal.directory, 'custom', 'packs')) ? scanPacks(join(personal.directory, 'custom')) : { packs: [], errors: [] };
  return { personal, areas, localPacks, warnings };
}
