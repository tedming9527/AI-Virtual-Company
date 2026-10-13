// Explicit local associations. A filename or keyword match is never proof of a topic link.
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { inventoryPersonal, personalProject, fileInventory } from '../core/local-assets.js';
import { TOPIC_DIRS } from '../core/personal.js';

const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const indexFile = root => join(root, 'runtime', 'panorama-topics.json');
const validId = value => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,79}$/.test(value);
const validText = value => typeof value === 'string' && value.trim().length > 0 && value.length <= 300;
const empty = () => ({ schema: 'avc.panorama-topics.v1', topics: [] });

function readIndex(root) {
  const file = indexFile(root);
  if (!existsSync(file)) return empty();
  if (lstatSync(file).isSymbolicLink()) throw new Error('拒绝课题索引符号链接');
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schema !== 'avc.panorama-topics.v1' || !Array.isArray(data.topics)) throw new Error('课题索引格式无效');
  return data;
}
function writeIndex(root, data) {
  const file = indexFile(root);
  if (existsSync(join(root, 'runtime')) && lstatSync(join(root, 'runtime')).isSymbolicLink()) throw new Error('拒绝 runtime 符号链接');
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new Error('拒绝课题索引符号链接');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
}
function inventoryMap(root) {
  const inventory = inventoryPersonal(root);
  return new Map(inventory.areas.flatMap(area => area.files.map(file => [`${area.name}/${file.relativePath}`, file.path])));
}
function fileFor(root, path, personalFiles) {
  if (personalFiles.has(path)) return personalFiles.get(path);
  if (!path.startsWith('repo/')) return null;
  const target = resolve(root, path.slice(5));
  if (!target.startsWith(resolve(root) + sep) || !existsSync(target) || !lstatSync(target).isFile()) return null;
  if (!realpathSync(target).startsWith(realpathSync(root) + sep)) return null;
  return target;
}
export function addPanoramaTopic(root, { id, title, description = '', sessionId = null }) {
  if (!validId(id) || !validText(title) || (description && !validText(description)) || (sessionId && !validText(sessionId))) throw new Error('课题字段无效');
  const data = readIndex(root);
  if (data.topics.some(topic => topic.id === id)) throw new Error('课题 ID 已存在');
  const topic = { id, title: title.trim(), description: description.trim(), sessions: sessionId ? [sessionId] : [], links: [] };
  data.topics.push(topic); writeIndex(root, data);
  return topic;
}
export function linkPanoramaFile(root, { topicId, path, reason, sessionId = null }) {
  if (!validId(topicId) || !validText(path) || !validText(reason) || (sessionId && !validText(sessionId))) throw new Error('关联字段无效');
  const data = readIndex(root), topic = data.topics.find(item => item.id === topicId);
  if (!topic) throw new Error('课题不存在');
  const file = fileFor(root, path, inventoryMap(root));
  if (!file || !lstatSync(file).isFile()) throw new Error('文件必须属于当前个人项目的已发现清单');
  const link = { path, sha256: hash(file), reason: reason.trim(), sessionId, linkedAt: new Date().toISOString() };
  topic.links = (topic.links || []).filter(item => item.path !== path);
  topic.links.push(link);
  if (sessionId && !(topic.sessions || []).includes(sessionId)) topic.sessions = [...(topic.sessions || []), sessionId];
  writeIndex(root, data);
  return link;
}
export function readPanoramaTopics(root) {
  const data = readIndex(root), files = inventoryMap(root), linked = new Set();
  const topics = data.topics.map(topic => ({ id: topic.id, title: topic.title, description: topic.description, status: 'indexed', priority: 100, sessions: (topic.sessions || []).map(id => ({ id, status: 'active' })), links: (topic.links || []).map(link => {
    const file = fileFor(root, link.path, files);
    const status = !file ? 'missing' : hash(file) === link.sha256 ? 'verified' : 'changed';
    if (status === 'verified') linked.add(link.path);
    return { path: link.path, reason: link.reason, sessionId: link.sessionId, linkedAt: link.linkedAt, sha256: link.sha256, status, href: file ? pathToFileURL(file).href : null };
  }) }));
  const base = join(personalProject(root).directory, 'topics');
  if (existsSync(base) && !lstatSync(base).isSymbolicLink()) for (const id of readdirSync(base)) {
    if (!validId(id)) continue;
    const dir = join(base, id), metaFile = join(dir, 'topic.json');
    if (!lstatSync(dir).isDirectory() || !existsSync(metaFile) || lstatSync(metaFile).isSymbolicLink()) continue;
    let meta;
    try { meta = JSON.parse(readFileSync(metaFile, 'utf8')); } catch { continue; }
    if (meta.schema !== 'avc.personal-topic.v1' || meta.id !== id) continue;
    const migrationFile = join(dir, 'migration.json');
    let migrations = [];
    if (existsSync(migrationFile) && !lstatSync(migrationFile).isSymbolicLink()) {
      try { migrations = JSON.parse(readFileSync(migrationFile, 'utf8')).copies || []; } catch { /* malformed migration remains unverified */ }
    }
    const migrated = new Map(migrations.map(item => [item.target, item]));
    for (const item of migrations) {
      const original = files.get(item.source);
      if (original && hash(original) === item.sha256) linked.add(item.source);
    }
    const current = topics.find(topic => topic.id === id);
    const physicalLinks = TOPIC_DIRS.flatMap(category => fileInventory(join(dir, category)).map(file => {
      const path = `topics/${id}/${category}/${file.relativePath}`;
      linked.add(path);
      const record = migrated.get(path);
      return { path, reason: record ? `旧资料 ${record.source}；${record.reason}` : `存放于该课题的 ${category}/ 分类`, sessionId: null, linkedAt: record?.copiedAt || meta.createdAt, sha256: hash(file.path), status: record && hash(file.path) !== record.sha256 ? 'changed' : 'verified', href: pathToFileURL(file.path).href };
    }));
    if (current) {
      current.title = meta.title; current.description = meta.description;
      current.status = meta.status; current.sessions = meta.sessions; current.priority = meta.priority ?? 100; current.links.push(...physicalLinks);
    } else topics.push({ id, title: meta.title, description: meta.description, status: meta.status, priority: meta.priority ?? 100, sessions: meta.sessions, links: physicalLinks });
  }
  for (const path of files.keys()) if (path.startsWith('topics/')) linked.add(path);
  topics.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title, 'zh-CN'));
  return { topics, unlinkedCount: [...files.keys()].filter(path => TOPIC_DIRS.includes(path.split('/')[0]) && path.split('/')[0] !== 'schedule' && !linked.has(path)).length };
}
