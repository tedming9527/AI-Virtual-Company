import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, rmdirSync, appendFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep, basename } from 'node:path';
import { personalProject } from './local-assets.js';
import { BUSINESS_DIRS } from './personal.js';
import { assertNoLinks } from './scan.js';

const DAY = 86400000;
const RETENTION_DAYS = 90;
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const safePart = part => !!part && part !== '.' && part !== '..' && !/[\\\0]/.test(part);
const timestamp=value=>{const n=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(n)&&new Date(n).toISOString()===value?n:NaN;};
function context(root) {
  const project = personalProject(root).directory, discard = join(project, 'discard');
  if (existsSync(discard) && lstatSync(discard).isSymbolicLink()) throw new Error('拒绝废弃目录符号链接');
  const manifestFile = join(discard, 'manifest.json');
  assertNoLinks(project,manifestFile);assertNoLinks(project,join(discard,'history.jsonl'));
  if (existsSync(manifestFile) && lstatSync(manifestFile).isSymbolicLink()) throw new Error('拒绝废弃台账符号链接');
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : { schema: 'avc.personal-discard.v1', items: [] };
  if (manifest.schema !== 'avc.personal-discard.v1' || !Array.isArray(manifest.items)) throw new Error('废弃台账格式无效');
  return { project, discard, manifestFile, manifest };
}
function save(file, data) { writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 }); }
export function discardPersonalFile(root, { path, reason, sessionId = null }) {
  if (typeof path !== 'string' || !path.split('/').every(safePart) || !BUSINESS_DIRS.includes(path.split('/')[0]) || typeof reason !== 'string' || !reason.trim() || reason.length > 300) throw new Error('只能废弃已核对的旧业务分类文件，并提供原因');
  const { project, discard, manifestFile, manifest } = context(root);
  const source = resolve(project, path);
  if (!source.startsWith(resolve(project) + sep) || !existsSync(source) || !lstatSync(source).isFile() || !realpathSync(source).startsWith(realpathSync(project) + sep)) throw new Error('源文件无效或不在个人项目中');
  const id = randomUUID(), targetDir = join(discard, 'items', id), target = join(targetDir, basename(source));
  assertNoLinks(project,source);assertNoLinks(project,target);
  const now = new Date(), item = { id, originalPath: path, path: relative(project, target), sha256: digest(source), reason: reason.trim(), sessionId, movedAt: now.toISOString(), expiresAt: new Date(now.getTime() + RETENTION_DAYS * DAY).toISOString() };
  mkdirSync(targetDir, { recursive: true });
  renameSync(source, target);
  manifest.items.push(item); save(manifestFile, manifest);
  return item;
}
export function cleanupPersonalDiscard(root, { dryRun = true, now = Date.now() } = {}) {
  if(!Number.isFinite(now))throw Error('清理时间无效');
  const { project, discard, manifestFile, manifest } = context(root), results = [], remaining = [];
  for (const item of manifest.items) {
    const file = resolve(project, item.path || '');
    const itemDir = join(discard, 'items', item.id || '');
    let valid=false;try{assertNoLinks(project,file);assertNoLinks(project,itemDir);
    valid = /^[0-9a-f-]{36}$/.test(item.id || '') && item.path?.startsWith(`discard/items/${item.id}/`) && file.startsWith(resolve(discard) + sep) && existsSync(file) && lstatSync(file).isFile() && realpathSync(file).startsWith(realpathSync(discard) + sep) && readdirSync(itemDir).length === 1 && digest(file) === item.sha256;
    }catch{}
    if (!valid) { results.push({ id: item.id, action: 'refused', reason: '文件缺失、路径或摘要不符' }); remaining.push(item); continue; }
    const expiry=timestamp(item.expiresAt),moved=timestamp(item.movedAt);
    if(!Number.isFinite(expiry)||!Number.isFinite(moved)||expiry<moved+RETENTION_DAYS*DAY){results.push({id:item.id,action:'refused',reason:'保留期日期无效'});remaining.push(item);continue;}
    if (expiry > now) { remaining.push(item); continue; }
    results.push({ id: item.id, action: dryRun ? 'would_delete' : 'deleted', originalPath: item.originalPath });
    if (!dryRun) {
      assertNoLinks(project,file);if(digest(file)!==item.sha256)throw Error('废弃资料发生变化');
      rmSync(file);
      try{rmdirSync(itemDir);}catch(error){if(error.code!=='ENOTEMPTY')throw error;results.at(-1).cleanupWarning='New files retained in item directory';}
      appendFileSync(join(discard, 'history.jsonl'), JSON.stringify({ id: item.id, originalPath: item.originalPath, sha256: item.sha256, deletedAt: new Date(now).toISOString() }) + '\n', { mode: 0o600 });
    }
  }
  if (!dryRun && results.some(item => item.action === 'deleted')) save(manifestFile, { ...manifest, items: remaining });
  return { dryRun, retentionDays: RETENTION_DAYS, results };
}
