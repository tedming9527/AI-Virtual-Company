// personal.js —— 个人目录规约（FR-11/FR-12/FR-13）
// doctor 校验 / init 幂等补建 / preset 同步（custom 永不覆盖）/ config 合并 / staging 导入打标台账
// 规约事实源：docs/08-个人目录规约.md。init 只补建缺失目录，不删除、不移动用户文件。

import {
  existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync,
  copyFileSync, statSync, lstatSync, realpathSync,
} from 'node:fs';
import { join, dirname, relative, isAbsolute, resolve, sep } from 'node:path';
import { homedir } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { resolvePersonalStorage } from './storage.js';

// 固定目录集合（docs/08 §4：业务 10 + 治理 3 + 配置 2 + 工具白名单 2）
export const BUSINESS_DIRS = ['memory', 'learning', 'inbox', 'meetings', 'deliverables', 'output', 'research', 'schedule', 'plugins', 'infrastructure'];
export const GOVERNANCE_DIRS = ['experience', 'staging', 'archive', 'discard'];
export const CONFIG_DIRS = ['preset', 'custom'];
export const WHITELIST_DIRS = ['.agents', '.codex'];
export const TOPIC_DIRS = [...BUSINESS_DIRS, 'experience'];
export const PROJECT_DIRS = ['topics', ...BUSINESS_DIRS, ...GOVERNANCE_DIRS, ...CONFIG_DIRS, ...WHITELIST_DIRS];

// 不参与活跃扫描（doctor 不检查其内部命名）
const SCAN_EXEMPT_DIRS = ['archive', 'staging'];
// 事件型目录：顶层文件必须带 YYYY-MM-DD- 前缀（docs/08 §5）
const EVENT_DIRS = ['inbox', 'meetings'];
const DATE_PREFIX_RE = /^\d{4}-\d{2}-\d{2}-/;
const STATE_FIELDS = ['slug', 'repo', 'currentVersion', 'lastBootstrap', 'lastSync'];

function sha256(file) {
  return createHash('sha256').update(readFileSync(file)).digest('hex');
}

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function walkFiles(dir, base = dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    if (name === '.DS_Store') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out.push(...walkFiles(full, base));
    else out.push(relative(base, full));
  }
  return out.sort();
}

// storage.personal 指向 <personal-root>/projects/<slug>；部署配置由 storage.js 统一解析。
export const resolvePersonal = resolvePersonalStorage;

export function projectDirOf(personalRoot, slug) {
  return join(personalRoot, 'projects', slug);
}

// A conversation identifies a user topic; several sessions may share one topic.
export function createPersonalTopic(personalRoot, slug, input) {
  const { id, title, sessionId, description = '' } = input || {};
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id || '') || typeof title !== 'string' || !title.trim() || title.length > 300 || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 300) throw new Error('课题需有效 ID、标题和会话 ID');
  const base = join(projectDirOf(personalRoot, slug), 'topics');
  if (existsSync(base) && lstatSync(base).isSymbolicLink()) throw new Error('拒绝课题目录符号链接');
  const dir = join(base, id);
  if (existsSync(dir)) throw new Error('课题目录已存在；后续会话需显式关联，不能覆盖');
  for (const name of TOPIC_DIRS) mkdirSync(join(dir, name), { recursive: true });
  const topic = { schema: 'avc.personal-topic.v1', id, title: title.trim(), description: description.trim(), status: 'active', sessions: [{ id: sessionId, status: 'active' }], createdAt: new Date().toISOString() };
  writeJson(join(dir, 'topic.json'), topic);
  return { directory: dir, topic };
}

export function archivePersonalTopicSession(personalRoot, slug, topicId, sessionId) {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(topicId || '')) throw new Error('课题 ID 无效');
  const file = join(projectDirOf(personalRoot, slug), 'topics', topicId, 'topic.json');
  if (!existsSync(file)) throw new Error('课题不存在');
  const topic = readJson(file), session = topic.sessions?.find(item => item.id === sessionId);
  if (!session) throw new Error('会话不属于该课题');
  session.status = 'archived'; session.archivedAt = new Date().toISOString();
  if (topic.sessions.every(item => item.status === 'archived')) topic.status = 'archived';
  writeJson(file, topic);
  return topic;
}

export function addPersonalTopicSession(personalRoot, slug, topicId, sessionId) {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(topicId || '') || typeof sessionId !== 'string' || !sessionId.trim() || sessionId.length > 300) throw new Error('课题或会话 ID 无效');
  const file = join(projectDirOf(personalRoot, slug), 'topics', topicId, 'topic.json');
  if (!existsSync(file)) throw new Error('课题不存在');
  const topic = readJson(file);
  if (topic.sessions?.some(item => item.id === sessionId)) return topic;
  topic.sessions.push({ id: sessionId, status: 'active' });
  topic.status = 'active';
  writeJson(file, topic);
  return topic;
}

export function copyLegacyFilesToTopic(personalRoot, slug, { topicId, paths, reason }) {
  if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(topicId || '') || !Array.isArray(paths) || !paths.length || paths.length > 1000 || typeof reason !== 'string' || !reason.trim()) throw new Error('迁移输入无效');
  const project = projectDirOf(personalRoot, slug), topicDir = join(project, 'topics', topicId);
  if (!existsSync(join(topicDir, 'topic.json'))) throw new Error('先创建课题目录');
  const manifestFile = join(topicDir, 'migration.json');
  if (existsSync(manifestFile) && lstatSync(manifestFile).isSymbolicLink()) throw new Error('拒绝迁移台账符号链接');
  const manifest = existsSync(manifestFile) ? readJson(manifestFile) : { schema: 'avc.topic-migration.v1', copies: [] };
  const copied = [];
  for (const path of paths) {
    if (typeof path !== 'string' || !path.split('/').every(part => part && part !== '.' && part !== '..' && !/[\\\0]/.test(part)) || !TOPIC_DIRS.includes(path.split('/')[0])) throw new Error(`非法旧资料路径: ${path}`);
    const source = resolve(project, path), target = resolve(topicDir, path);
    if (!source.startsWith(resolve(project) + sep) || !target.startsWith(resolve(topicDir) + sep) || !existsSync(source) || !lstatSync(source).isFile() || !realpathSync(source).startsWith(realpathSync(project) + sep)) throw new Error(`旧资料不存在或不安全: ${path}`);
    let cursor = topicDir;
    for (const part of path.split('/')) { cursor = join(cursor, part); if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) throw new Error(`课题目标包含符号链接: ${path}`); }
    if (existsSync(target)) {
      if (sha256(target) !== sha256(source)) throw new Error(`课题内已有不同内容: ${path}`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(source, target);
    if (sha256(target) !== sha256(source)) throw new Error(`复制校验失败: ${path}`);
    const record = { source: path, target: `topics/${topicId}/${path}`, sha256: sha256(source), reason: reason.trim(), copiedAt: new Date().toISOString() };
    manifest.copies.push(record); copied.push(record);
  }
  writeJson(manifestFile, manifest);
  return { topicId, copied: copied.length, preservedOriginals: true, manifestFile };
}

// —— init（幂等补建，docs/08 §1/§4）——
export function initPersonal(personalRoot, slug, opts = {}) {
  const created = [];
  const ensureDir = (dir, label) => {
    if (!existsSync(dir)) { mkdirSync(dir, { recursive: true }); created.push(label); }
  };
  ensureDir(join(personalRoot, 'memory'), 'memory/');
  const projDir = projectDirOf(personalRoot, slug);
  for (const d of PROJECT_DIRS) ensureDir(join(projDir, d), `projects/${slug}/${d}/`);
  ensureDir(join(personalRoot, 'projects'), 'projects/');

  // .personal-manifest.json（工具生成）：缺则建；项目未登记则补登记（bind 亦走此路径）
  const manifestFile = join(personalRoot, '.personal-manifest.json');
  let manifest;
  if (!existsSync(manifestFile)) {
    manifest = { schemaVersion: 1, createdAt: new Date().toISOString(), projects: [] };
    created.push('.personal-manifest.json');
  } else {
    manifest = readJson(manifestFile);
  }
  let entry = manifest.projects.find((p) => p.slug === slug);
  if (!entry) {
    entry = { slug, repo: opts.repo || null };
    manifest.projects.push(entry);
    manifest.projects.sort((a, b) => a.slug.localeCompare(b.slug));
  }
  if (!entry.repo && opts.repo) entry.repo = opts.repo;
  writeJson(manifestFile, manifest);

  // README.md（工具生成，人类可读规约说明）
  const readme = join(personalRoot, 'README.md');
  if (!existsSync(readme)) {
    writeFileSync(readme, personalReadme(slug), 'utf8');
    created.push('README.md');
  }

  // .project-state.json（docs/08 §4 字段；已有则只刷新版本与时间，不覆盖 repo）
  const stateFile = join(projDir, '.project-state.json');
  let state;
  if (!existsSync(stateFile)) {
    state = { slug, repo: opts.repo || null, currentVersion: opts.version || null, lastBootstrap: null, lastSync: null };
    created.push(`projects/${slug}/.project-state.json`);
  } else {
    state = readJson(stateFile);
  }
  const now = new Date().toISOString();
  if (opts.version) state.currentVersion = opts.version;
  if (opts.repo && !state.repo) state.repo = opts.repo;
  if (opts.touch === 'bootstrap') state.lastBootstrap = now;
  if (opts.touch === 'sync') state.lastSync = now;
  writeJson(stateFile, state);

  return { created, manifest, state, projDir };
}

function personalReadme(slug) {
  return `# 个人目录

本目录由 ted-avc-manager 依 docs/08-个人目录规约.md 维护：部署存储可跨机器同步，不入 git。未配置时使用 runtime/personal 本机临时目录。

## 根级

- \`.personal-manifest.json\`：项目清单（工具读写）
- \`memory/\`：全局记忆（跨项目共享）
- \`projects/<slug>/\`：每个中央仓库项目一个目录（当前含 ${slug}）

## 项目级固定目录（目录即契约，固定目录之外自建 = 违规）

- 新资料主入口：\`topics/<topic-id>/\`；会话确定课题，课题内再按用途放入 ${TOPIC_DIRS.join(' · ')}。
- 原顶层业务目录是兼容区，旧资料不自动移动；废弃会话只更新课题状态，不删除文件。
- 业务：${BUSINESS_DIRS.join(' · ')}
- 治理：${GOVERNANCE_DIRS.join(' · ')}（archive/staging 不参与活跃扫描）
- 配置分层：${CONFIG_DIRS.join(' · ')}（preset 只读由中央下发；custom 用户自有，升级永不覆盖）
- 工具白名单：${WHITELIST_DIRS.join(' · ')}

## 命名规则

- 目录：kebab-case；事件型文件：\`YYYY-MM-DD-<topic>\` 前缀
- doctor 校验：缺失/多余/命名/哈希(tampered)/state，init 只补建、不删除不移动
`;
}

// —— doctor（只报告，exit code 表示结果，docs/08 §8）——
export function doctorPersonal(personalRoot, slug) {
  const issues = [];
  const projDir = projectDirOf(personalRoot, slug);
  if (!existsSync(projDir)) {
    return { ok: false, issues: [{ kind: 'missing', detail: `项目目录缺失: projects/${slug}（init 可补建）` }] };
  }
  for (const d of PROJECT_DIRS) {
    if (!existsSync(join(projDir, d))) issues.push({ kind: 'missing', detail: `固定目录缺失: ${d}/（init 可补建）` });
  }
  for (const name of readdirSync(projDir)) {
    if (name === '.project-state.json' || name === '.DS_Store') continue;
    if (!PROJECT_DIRS.includes(name)) issues.push({ kind: 'unexpected', detail: `顶层未约定项: projects/${slug}/${name}` });
  }
  const topicsDir = join(projDir, 'topics');
  if (existsSync(topicsDir) && lstatSync(topicsDir).isSymbolicLink()) issues.push({ kind: 'topic', detail: '课题目录是符号链接' });
  else if (existsSync(topicsDir)) for (const id of readdirSync(topicsDir)) {
    const dir = join(topicsDir, id), meta = join(dir, 'topic.json');
    if (!/^[a-z0-9][a-z0-9-]{1,79}$/.test(id) || !lstatSync(dir).isDirectory()) { issues.push({ kind: 'topic', detail: `无效课题目录: topics/${id}` }); continue; }
    if (!existsSync(meta)) { issues.push({ kind: 'topic', detail: `课题清单缺失: topics/${id}/topic.json` }); continue; }
    try {
      const value = readJson(meta);
      if (value.schema !== 'avc.personal-topic.v1' || value.id !== id || !value.title || !Array.isArray(value.sessions) || !value.sessions.length || value.sessions.some(item => !item.id || !['active','archived'].includes(item.status))) issues.push({ kind: 'topic', detail: `课题清单无效: topics/${id}/topic.json` });
    } catch { issues.push({ kind: 'topic', detail: `课题清单无法解析: topics/${id}/topic.json` }); }
    for (const name of TOPIC_DIRS) if (!existsSync(join(dir, name))) issues.push({ kind: 'topic', detail: `课题分类目录缺失: topics/${id}/${name}/` });
  }
  for (const d of EVENT_DIRS) {
    const dir = join(projDir, d);
    if (!existsSync(dir)) continue;
    for (const name of readdirSync(dir)) {
      if (name.startsWith('.')) continue;
      // 只校验事件型文件；子目录为自由组织结构（docs/08 §5），不套命名规则
      if (statSync(join(dir, name)).isDirectory()) continue;
      if (!DATE_PREFIX_RE.test(name)) issues.push({ kind: 'naming', detail: `事件文件缺日期前缀: ${d}/${name}` });
    }
  }
  // preset 哈希校验：与 .preset-manifest.json 不符 = tampered
  const presetRoot = join(projDir, 'preset');
  if (existsSync(presetRoot)) {
    for (const name of readdirSync(presetRoot)) {
      const manifestFile = join(presetRoot, name, '.preset-manifest.json');
      if (!existsSync(manifestFile)) continue;
      const manifest = readJson(manifestFile);
      for (const f of manifest.files || []) {
        const file = join(presetRoot, name, f.path);
        if (!existsSync(file)) { issues.push({ kind: 'tampered', detail: `preset 文件缺失: ${name}/${f.path}` }); continue; }
        if (sha256(file) !== f.sha256) issues.push({ kind: 'tampered', detail: `preset 哈希不符（用户改过）: preset/${name}/${f.path}` });
      }
    }
  }
  const stateFile = join(projDir, '.project-state.json');
  if (!existsSync(stateFile)) {
    issues.push({ kind: 'state', detail: '.project-state.json 缺失（init 可补建）' });
  } else {
    const state = readJson(stateFile);
    for (const k of STATE_FIELDS) {
      if (!(k in state)) issues.push({ kind: 'state', detail: `.project-state.json 缺字段: ${k}` });
    }
  }
  // layout：业务目录被误当配置目录（出现 preset manifest）
  for (const d of BUSINESS_DIRS) {
    if (existsSync(join(projDir, d, '.preset-manifest.json'))) {
      issues.push({ kind: 'layout', detail: `业务目录混入配置文件: ${d}/.preset-manifest.json` });
    }
  }
  return { ok: issues.length === 0, issues };
}

// —— preset 同步（FR-12：中央 presets/<name>/ → 个人 preset/<name>/ 只读 + manifest + sha256）——
// 用户改过（哈希与旧 manifest 不符）→ 保留 .local 副本并提示，不静默覆盖；custom/ 永不触碰
export { rebuildPresets as syncPresets } from './preset-rebuild.js';

// —— config 合并（FR-12：preset 打底 → custom 同名覆盖，逐项标注来源）——
function flatten(obj, prefix, out) {
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) flatten(v, key, out);
    else out[key] = v;
  }
  return out;
}

function mergeInto(merged, dir, label) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir).sort()) {
    if (!name.endsWith('.json') || name.startsWith('.')) continue;
    const flat = flatten(readJson(join(dir, name)), '', {});
    for (const [key, value] of Object.entries(flat)) {
      merged[key] = { value, source: `${label}/${name}` };
    }
  }
}

export function mergeConfig(personalRoot, slug, presetNames) {
  const projDir = projectDirOf(personalRoot, slug);
  const merged = {};
  // preset 打底：preset/<name>/ 下的 JSON（<name> 为预设名，如 base）
  const presetDir = join(projDir, 'preset');
  if (existsSync(presetDir)) {
    for (const name of presetNames || readdirSync(presetDir).sort()) {
      const dir = join(presetDir, name);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      mergeInto(merged, dir, `preset/${name}`);
    }
  }
  mergeInto(merged, join(projDir, 'custom'), 'custom');   // 同名覆盖
  const bySource = {};
  for (const item of Object.values(merged)) bySource[item.source] = (bySource[item.source] || 0) + 1;
  return { merged, bySource };
}

// —— import-scan（FR-13：外部资产 → staging/ 自动打标 + imports-registry 台账，待人工复核）——
// 打标为规则初筛（不含 LLM 调用）；复核与转正由人工流程完成，本命令不自动入库
const SECRET_RE = /sk-[A-Za-z0-9]{16,}|api[_-]?key["']?\s*[:=]\s*["'][^"']{8,}|BEGIN (?:RSA )?PRIVATE KEY/i;

function autoLabel(files) {
  let hasPersonalPath = false;
  let hasSecret = false;
  const user = homedir().split('/').pop();
  for (const f of files) {
    const text = readFileSync(f, 'utf8');
    if (SECRET_RE.test(text)) hasSecret = true;
    if (text.includes(`/Users/${user}`) || text.includes('com~apple~CloudDocs')) hasPersonalPath = true;
  }
  if (hasSecret) return { label: 'needs-human', reason: '疑似密钥/凭据，须人工处理后再定' };
  if (hasPersonalPath) return { label: 'personal', reason: `含本机用户路径（/Users/${user} 或 iCloud 路径）` };
  return { label: 'general-candidate', reason: '规则初筛未见个人特征（LLM 复核与人工确认待后续）' };
}

export function importScan(personalRoot, slug, sourcePath, opts = {}) {
  const src = isAbsolute(sourcePath) ? sourcePath : join(process.cwd(), sourcePath);
  if (!existsSync(src)) throw new Error(`导入源不存在: ${sourcePath}`);
  const stagingDir = join(projectDirOf(personalRoot, slug), 'staging');
  const id = `${new Date().toISOString().slice(0, 10)}-${opts.id || randomUUID().slice(0, 8)}`;
  const dst = join(stagingDir, 'imports', id);
  mkdirSync(dst, { recursive: true });

  // 复制（文件或目录），保留相对结构
  const copied = [];
  if (statSync(src).isDirectory()) {
    for (const rel of walkFiles(src)) {
      const target = join(dst, rel);
      mkdirSync(dirname(target), { recursive: true });
      copyFileSync(join(src, rel), target);
      copied.push(rel);
    }
  } else {
    copyFileSync(src, join(dst, src.split('/').pop()));
    copied.push(src.split('/').pop());
  }
  const files = walkFiles(dst).map((rel) => join(dst, rel));
  const { label, reason } = autoLabel(files);

  // 台账：来源/标签/状态/版本/文件哈希，可追溯
  const registryFile = join(stagingDir, 'imports-registry.json');
  const registry = existsSync(registryFile)
    ? readJson(registryFile)
    : { schema: 'avc.imports-registry.v1', entries: [] };
  const entry = {
    id,
    source: opts.source || sourcePath,
    label,
    reason,
    status: 'pending-review',
    version: 1,
    importedAt: new Date().toISOString(),
    files: files.map((f) => ({ path: relative(dst, f), sha256: sha256(f) })),
  };
  registry.entries.push(entry);
  writeJson(registryFile, registry);
  return { entry, registryFile, copied };
}
