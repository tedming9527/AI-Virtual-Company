// Inventory visibility, content delivery and observed reads are separate evidence.
import { existsSync, readdirSync, lstatSync, readFileSync, writeFileSync, appendFileSync, mkdirSync, renameSync, watch } from 'node:fs';
import { join, resolve, relative, basename, sep, isAbsolute, dirname } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { discoverSkills, personalProject, nativeSkillRoots } from './local-assets.js';
import { prepareSkillCandidate } from './skill-candidates.js';
import { searchAssets, searchMetadata } from './asset-search.js';
import { describeAsset, compactDescription } from './description.js';

const hash = data => createHash('sha256').update(data).digest('hex');
const types = ['skill', 'knowledge', 'framework', 'role'];
function safePath(base, file) {
  base = resolve(base); file = resolve(file);
  if (file !== base && !file.startsWith(base + sep)) throw new Error('Asset path escapes its bundle');
  const segments = relative(base, file).split(sep).filter(Boolean);
  let current = base;
  if (existsSync(base) && lstatSync(base).isSymbolicLink()) throw new Error('拒绝资产目录符号链接');
  for (const segment of segments) {
    current = join(current, segment);
    if (existsSync(current) && lstatSync(current).isSymbolicLink()) throw new Error('拒绝资产符号链接');
  }
  return file;
}
function runtimeFile(root, name) { return safePath(root, join(root, 'runtime', name)); }
function atomic(file, value) {
  mkdirSync(dirname(file), { recursive: true });
  const tmp = file + '.' + randomUUID() + '.tmp';
  writeFileSync(tmp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(tmp, file);
}
function event(root, data) {
  const item = { schema: 'avc.asset-event.v1', id: randomUUID(), at: new Date().toISOString(), ...data };
  const file = runtimeFile(root, 'asset-events.jsonl');
  mkdirSync(dirname(file), { recursive: true });
  appendFileSync(file, JSON.stringify(item) + '\n', { mode: 0o600 });
  return item;
}
function context(input = {}) {
  return { sessionId: String(input.sessionId || input.session_id || 'unknown').slice(0, 200), turnId: String(input.turnId || input.turn_id || 'unknown').slice(0, 200) };
}
export function skillRoots(root, options = {}) {
  const personal = personalProject(root).directory;
  if (options.externalRoots) return [...new Set(options.externalRoots.map(p => resolve(p)))];
  const home = options.home || homedir();
  return [...new Set([
    ...nativeSkillRoots(home),
    join(root, '.codex', 'skills'), join(root, '.agents', 'skills'),
    join(personal, '.codex', 'skills'), join(personal, '.agents', 'skills'),
  ].map(p => resolve(p)))];
}
function bundleFiles(dir) {
  const files = [];
  const visit = current => {
    for (const name of readdirSync(current).sort()) {
      if (['.git', 'node_modules', '.DS_Store'].includes(name)) continue;
      const path = safePath(dir, join(current, name)), stat = lstatSync(path);
      if (stat.isDirectory()) visit(path);
      else if (stat.isFile()) files.push({ relativePath: relative(dir, path), bytes: stat.size, sha256: hash(readFileSync(path)) });
    }
  };
  visit(dir);
  return { files, bundleSha256: hash(JSON.stringify(files)) };
}
function bundle(dir, type, name, source, management) {
  const metaFile = safePath(dir, join(dir, 'meta.json'));
  let meta = {};
  if (existsSync(metaFile)) meta = JSON.parse(readFileSync(metaFile, 'utf8'));
  const entry = ['SKILL.md', ...(type === 'role' ? ['PROFILE.md'] : [])].map(n => join(dir, n)).find(f => existsSync(f) && lstatSync(safePath(dir, f)).isFile());
  if (!entry) return null;
  const content = readFileSync(entry, 'utf8');
  if (!content.trim()) return null;
  return { id: `${source}:${type}:${resolve(dir)}`, type, name, displayName: meta.displayName || name,
    description: describeAsset(meta, content).description || '', ...searchMetadata(meta),
    version: meta.version || null, source, management, dir: resolve(dir), entry: resolve(entry),
    entrySha256: hash(content), sha256: hash(content + '\0' + (existsSync(metaFile) ? readFileSync(metaFile) : '')),
    discovery: 'metadata-only', nativeInstalled: 'unverified', loaded: false };
}
export function listAssets(root, filter = {}, options = {}) {
  const personal = personalProject(root), assets = [], warnings = [];
  safePath(root, join(root, 'packs', 'skill'));
  safePath(personal.directory, join(personal.directory, 'custom', 'packs', 'skill'));
  safePath(personal.directory, join(personal.directory, 'custom', 'skills'));
  const externalRoots = skillRoots(root, options).filter(path => {
    let cursor = resolve(path);
    while (cursor !== dirname(cursor)) {
      if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) { warnings.push(`跳过符号链接技能根：${path}`); return false; }
      cursor = dirname(cursor);
    }
    return true;
  });
  const discovered = discoverSkills(root, { externalRoots });
  warnings.push(...discovered.warnings);
  for (const s of discovered.skills) assets.push({ ...s,
    description: s.description || '',
    discovery: 'metadata-only', placement: s.source === 'external-installed' ? 'native-skill-directory' : 'managed-project-directory', nativeInstalled: 'unverified', loaded: false });
  const knowledgeFile = safePath(root,join(root, 'packs/knowledge/catalog.json'));
  if (existsSync(knowledgeFile)) {
    const knowledge = JSON.parse(readFileSync(knowledgeFile, 'utf8'));
    for (const entry of knowledge.entries || []) {
      const match=/^packs\/(knowledge|role)\/([a-z0-9][a-z0-9-]*)\/(.+\.md)$/.exec(entry.detail || '');
      if(!match){warnings.push('Invalid knowledge detail identity: '+entry.id);continue;}
      const bundleType=match[1], bundleName=match[2], roleDir=safePath(root,join(root,'packs',bundleType,bundleName)), detail=safePath(roleDir,join(root,entry.detail));
      if (!existsSync(detail) || !lstatSync(detail).isFile()) continue;
      assets.push({ id: `general:knowledge-entry:${entry.id}`, type:'knowledge', name:entry.id, displayName:basename(detail), source:'general', management:'central-managed', dir:roleDir, entry:detail,
        description:compactDescription(entry.summary) || '', version:entry.updated, sha256:hash(readFileSync(detail)), entrySha256:hash(readFileSync(detail)), discovery:'metadata-only', loaded:false, nativeInstalled:'unverified',
        load:{source:'general',type:bundleType,name:bundleName,entry:relative(roleDir,detail)} });
    }
  }
  const nativeFile = runtimeFile(root, 'native-skill-index.json');
  if (existsSync(nativeFile)) {
    const native=JSON.parse(readFileSync(nativeFile,'utf8'));
    const listed=new Set(native.entries?.map(e=>resolve(e.path)) || []);
    for (const asset of assets) if (listed.has(resolve(asset.entry))) { asset.nativeClientListed=true;asset.nativeListedAt=native.fetchedAt;asset.nativeInstalled=true; }
  }
  for (const source of [{ path: root, source: 'general', management: 'central-managed' }, { path: join(personal.directory, 'custom'), source: 'local-custom', management: 'discovered-unregistered' }]) {
    for (const type of types.filter(t => t !== 'skill')) {
      const base = join(source.path, 'packs', type);
      if (!existsSync(base)) continue;
      try { safePath(source.path, base); } catch (e) { warnings.push(e.message); continue; }
      for (const name of readdirSync(base).sort()) {
        const dir = join(base, name);
        try {
          safePath(base, dir); if (!lstatSync(dir).isDirectory()) continue;
          const asset = bundle(dir, type, name, source.source, source.management);
          if (asset) assets.push(asset);
        } catch (e) { warnings.push(`${type}/${name}: ${e.message}`); }
      }
    }
  }
  for (const asset of assets) {
    try { Object.assign(asset, bundleFiles(asset.dir)); } catch (e) { asset.bundleIntegrity = 'unverified'; warnings.push(`${asset.name}: ${e.message}`); }
  }
  return { assets: searchAssets(assets.filter(a => (!filter.type || a.type === filter.type) && (!filter.source || a.source === filter.source)), filter.query), warnings };
}
export function refreshInventory(root, options = {}) {
  const current = listAssets(root, {}, options), file = runtimeFile(root, 'asset-inventory.json');
  const previous = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { assets: [] };
  const old = new Map(previous.assets.map(a => [a.id, a])), now = new Map(current.assets.map(a => [a.id, a]));
  const changes = [];
  for (const a of current.assets) {
    const before = old.get(a.id);
    if (!before || (before.bundleSha256 || before.sha256) !== (a.bundleSha256 || a.sha256)) changes.push({ change: before ? 'changed' : 'added', assetId: a.id, name: a.name, type: a.type, source: a.source, sha256: a.sha256, bundleSha256: a.bundleSha256 });
  }
  for (const a of previous.assets) if (!now.has(a.id)) changes.push({ change: 'removed', assetId: a.id, name: a.name, type: a.type, source: a.source, sha256: a.sha256, bundleSha256: a.bundleSha256 });
  for (const change of changes) event(root, { kind: 'inventory-detected', ...change });
  atomic(file, { schema: 'avc.asset-inventory.v1', scannedAt: new Date().toISOString(), assets: current.assets, warnings: current.warnings });
  return { ...current, changes, evidence: 'discovery-and-hash-only; no content delivery or semantic execution' };
}
export function watchAssets(root, options = {}) {
  let disposed = false, debounce, poll;
  const watchers = [], errors = [];
  const refresh = () => { if (disposed) return; try { const result = refreshInventory(root, options); options.onChange?.(result); } catch (e) { errors.push(e.message); options.onError?.(e); } };
  const changed = () => { clearTimeout(debounce); debounce = setTimeout(refresh, options.debounceMs || 150); debounce.unref?.(); };
  refresh();
  // Poll catches creation of currently absent roots; watchers accelerate existing-root events.
  for (const dir of [...skillRoots(root, options), join(root, 'packs'), join(personalProject(root).directory, 'custom')]) {
    if (!existsSync(dir)) continue;
    try { safePath(dir, dir); const w = watch(dir, { recursive: true }, changed); w.on('error', e => { errors.push(e.message); }); watchers.push(w); } catch (e) { errors.push(e.message); }
  }
  poll = setInterval(refresh, Math.max(250, options.intervalMs || 5000)); poll.unref?.();
  return { errors, dispose() { disposed = true; clearTimeout(debounce); clearInterval(poll); for (const w of watchers) w.close(); } };
}
export function recommendAssets(root, query = '', options = {}) {
  return { recommendations: query.trim() ? listAssets(root, {query}, options).assets : [], evidence: 'metadata-and-declared-aliases; not automatic activation' };
}
function resolveAsset(root, input, options) {
  const assets = listAssets(root, {}, options).assets;
  const matches = assets.filter(a => input.assetId ? a.id === input.assetId : a.name === input.name && (!input.type || a.type === input.type) && (!input.source || a.source === input.source));
  if (matches.length !== 1) throw new Error('Asset identity must resolve to one known bundle');
  return matches[0];
}
// Call only inside the server after the bound execution loader returns successfully.
// Do not expose this helper as an arbitrary model-declaration MCP tool.
export function noteDeliveredAsset(root, delivery, input = {}) {
  if (typeof delivery.content !== 'string' || !delivery.sha256 || hash(delivery.content) !== delivery.sha256) throw new Error('Trusted loader content/hash mismatch');
  return event(root, { kind: 'manager-delivered', ...context(input), name: delivery.name, type: delivery.type, source: delivery.source, entry: delivery.entry, sha256: delivery.sha256, evidence: 'bound-loader-tool-response; not semantic execution' });
}
export function recordAssetUse(root, input, options = {}) {
  const asset = resolveAsset(root, input, options);
  return event(root, { kind: 'model-reported', ...context(input), assetId: asset.id, name: asset.name, source: asset.source, type: asset.type, sha256: asset.sha256, declaration: 'model-reported', evidence: 'declaration-only; not observed read or semantic execution' });
}
export function proposeAsset(root, input) {
  if (!input.name || !types.includes(input.type || 'skill')) throw new Error('Candidate requires name and valid type');
  const personal = personalProject(root).directory;
  const id = randomUUID(), file = safePath(personal, join(personal, 'staging', 'proposals', id + '.json'));
  const proposal = { schema: 'avc.asset-proposal.v1', id, at: new Date().toISOString(), name: String(input.name).slice(0, 200), type: input.type || 'skill', origin: String(input.origin || 'model-recommendation').slice(0, 500), purpose: String(input.purpose || '').slice(0, 1000), status: 'pending-review', publication: 'none', installation: 'none' };
  runtimeFile(root, 'asset-events.jsonl'); // Preflight audit path before candidate write.
  if (input.assetId || input.validationId) Object.assign(proposal, prepareSkillCandidate(root, input, id));
  atomic(file, proposal); event(root, { kind: 'candidate-proposed', candidateId: id, name: proposal.name, type: proposal.type, status: proposal.status });
  return { ...proposal, file };
}
function literalReadPaths(input) {
  const args = input.tool_input || input.arguments || {}, tool = String(input.tool_name || input.tool || '').toLowerCase();
  if (['read', 'read_file', 'readfile'].includes(tool)) return [args.file_path || args.path].filter(x => typeof x === 'string');
  if (!['bash', 'exec_command', 'shell'].includes(tool)) return [];
  const cmd = args.command || args.cmd;
  if (typeof cmd !== 'string' || /[\n;|&<>`$\\]/.test(cmd)) return [];
  // Deliberately narrow: a single literal cat (no dynamic expansion or wrapper scripts).
  const tokens = cmd.match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g) || [];
  if (tokens.shift() !== 'cat') return [];
  return tokens.filter(t => t !== '--').filter(t => !t.startsWith('-')).map(t => /^['"]/.test(t) ? t.slice(1, -1) : t);
}
export function recordObservedRead(root, input, options = {}) {
  const paths = literalReadPaths(input), assets = listAssets(root, {}, options).assets, records = [];
  const cwd = input.cwd || root;
  const eventName = input.hook_event_name || input.event || '';
  const responseField = ['tool_response','tool_result','tool_output'].find(key => Object.prototype.hasOwnProperty.call(input,key) && input[key] !== null);
  const response = responseField ? input[responseField] : {};
  const tool = String(input.tool_name || input.tool || '').toLowerCase();
  const shell = ['bash', 'exec_command', 'shell'].includes(tool);
  const exitCode = response.exit_code ?? response.exitCode;
  const completed = Boolean(responseField) && eventName === 'PostToolUse' && response.status !== 'failed' && response.status !== 'error' && input.success !== false && response.isError !== true && (shell ? exitCode === 0 : !(Number.isInteger(exitCode) && exitCode !== 0));
  for (const path of paths) {
    const target = isAbsolute(path) ? resolve(path) : resolve(cwd, path);
    const asset = assets.find(a => target === a.entry) || assets.filter(a => !a.id.startsWith('general:knowledge-entry:') && target.startsWith(a.dir + sep)).sort((a,b)=>b.dir.length-a.dir.length)[0];
    if (!asset) continue;
    try {
      safePath(asset.dir, target); if (!existsSync(target) || !lstatSync(target).isFile()) continue;
      records.push(event(root, { kind: completed ? 'read-completed' : 'read-attempted', ...context(input), assetId: asset.id, name: asset.name, type: asset.type, source: asset.source, relativePath: relative(asset.dir, target), sha256: hash(readFileSync(target)), tool: String(input.tool_name || input.tool || ''), evidence: completed ? 'native-tool-completion; not semantic execution' : 'native-tool-intent; no completed-read proof' }));
    } catch { /* Unknown or escaping reads remain unverified. */ }
  }
  return { records, evidence: records.length ? 'literal-known-path-only' : 'no-observable-known-read; native automatic loads unknown' };
}
