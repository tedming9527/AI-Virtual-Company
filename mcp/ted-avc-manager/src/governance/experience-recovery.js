import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, rmdirSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep, basename, dirname } from 'node:path';
import { personalProject, fileInventory } from '../core/local-assets.js';
import { assertNoLinks } from '../core/scan.js';

const DAY = 86400000;
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const validPart = value => value && value !== '.' && value !== '..' && !/[\\\0]/.test(value);
const timestamp=value=>{const n=typeof value==='string'?Date.parse(value):NaN;return Number.isFinite(n)&&new Date(n).toISOString()===value?n:NaN;};
function safeFile(project, path) {
  if (typeof path !== 'string' || !path.split('/').every(validPart)) throw new Error('个人资料路径无效');
  const file = resolve(project, path), base = realpathSync(project);
  assertNoLinks(project,file);
  if (!file.startsWith(base + sep) || !existsSync(file) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() ||
    !realpathSync(file).startsWith(base + sep)) throw new Error('文件缺失、链接或越出个人目录');
  return file;
}
function sourcePath(path) {
  return /^experience\/(?!\.avc\/).+/.test(path) || /^topics\/[a-z0-9][a-z0-9-]*\/experience\/.+/.test(path);
}
function context(root) {
  const project = realpathSync(personalProject(root).directory), dir = join(project, 'experience', '.avc'), recovery = join(dir, 'recovery');
  assertNoLinks(project,recovery);
  if (existsSync(dir) && lstatSync(dir).isSymbolicLink()) throw new Error('经验治理目录不能为链接');
  const file = join(dir, 'recovery-manifest.json');
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new Error('回收台账不能为链接');
  const manifest = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { schema: 'avc.experience-recovery.v1', items: [] };
  if (manifest.schema !== 'avc.experience-recovery.v1' || !Array.isArray(manifest.items)) throw new Error('回收台账无效');
  return { project, dir, recovery, file, manifest };
}
function save(file, value) {
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(value, null, 2) + '\n', { mode: 0o600 });
  renameSync(temp, file);
}
function validSpans(spans,source,candidate,unit) {
  if(unit!=='utf8-bytes'||!Array.isArray(spans)||!spans.length||spans.length>200)return false;
  const bytes=Buffer.from(source);let end=0;
  return [...spans].sort((a,b)=>a?.start-b?.start).every(span => span && Number.isInteger(span.start) && span.start === end &&
    Number.isInteger(span.end) && span.end > span.start && typeof span.candidateRef === 'string' && span.candidateRef.length > 0 && span.candidateRef.length <= 200 &&
    span.end<=bytes.length && (span.start===bytes.length||(bytes[span.start]&0xc0)!==0x80) && (span.end===bytes.length||(bytes[span.end]&0xc0)!==0x80) &&
    candidate.includes(span.candidateRef) && candidate.indexOf(span.candidateRef)===candidate.lastIndexOf(span.candidateRef) &&
    Object.keys(span).every(key => ['start', 'end', 'candidateRef'].includes(key)) && !!(end=span.end)) && end===bytes.length;
}
function deletionAuthorized(authorization,item){
 return authorization?.decision==='discard' && authorization.sourcePath===item.sourcePath && authorization.sourceSha256===item.sourceSha256 &&
  typeof authorization.reference==='string' && authorization.reference.trim().length>0 && authorization.reference.length<=300;
}
function hasOtherReferences(project, item) {
  for (const entry of fileInventory(project)) {
    if (entry.relativePath === item.candidatePath || entry.relativePath.startsWith(`experience/.avc/`) || entry.bytes > 1024 * 1024 ||
      !/\.(md|txt|json)$/.test(entry.relativePath)) continue;
    if (readFileSync(entry.path, 'utf8').includes(item.sourcePath)) return true;
  }
  return false;
}
export function stageReviewedExperience(root, input, { apply = false, now = Date.now() } = {}) {
  if(!Number.isFinite(now))throw Error('回收时间无效');
  const { project, dir, recovery, file, manifest } = context(root);
  if (!sourcePath(input?.sourcePath) || typeof input?.candidatePath !== 'string' || input?.sourcePath === input.candidatePath ||
    input?.review?.status !== 'approved' || input.review.coverage !== 'complete' ||
    !/^[a-f0-9]{64}$/.test(input.review.sourceSha256 || '') || !/^[a-f0-9]{64}$/.test(input.review.candidateSha256 || '')) throw new Error('须有已复核且完整覆盖的来源映射');
  const source = safeFile(project, input.sourcePath), candidate = safeFile(project, input.candidatePath);
  if (sha(source) !== input.review.sourceSha256 || sha(candidate) !== input.review.candidateSha256) throw new Error('来源或提炼目标已变化');
  if(!validSpans(input.review.sourceSpans,readFileSync(source),readFileSync(candidate,'utf8'),input.review.spanUnit))throw Error('来源字节覆盖不完整或候选引用无法核验');
  if(input.discardAuthorization&&!deletionAuthorized(input.discardAuthorization,{sourcePath:input.sourcePath,sourceSha256:input.review.sourceSha256}))throw Error('废弃授权未绑定具体来源版本');
  if (manifest.items.some(item => item.sourcePath === input.sourcePath && !['restored', 'aborted'].includes(item.status))) throw new Error('来源已有回收记录');
  const id = randomUUID(), target = join(recovery, id, basename(source));
  const item = { id, sourcePath: input.sourcePath, candidatePath: input.candidatePath, targetPath: relative(project, target),
    sourceSha256: input.review.sourceSha256, candidateSha256: input.review.candidateSha256,
    sourceSpans: input.review.sourceSpans,spanUnit:input.review.spanUnit,discardAuthorization:input.discardAuthorization||null,authorizationEvidence:'explicit local operator declaration; not authenticated user identity; summary approval alone grants no deletion', reviewDigest: createHash('sha256').update(JSON.stringify(input.review)).digest('hex'),
    status: 'prepared', stagedAt: new Date(now).toISOString(), expiresAt: new Date(now + 90 * DAY).toISOString() };
  if (hasOtherReferences(project, item)) throw new Error('其他资料仍引用原文，不能移入回收区');
  if (!apply) return { action: 'would_stage', item };
  mkdirSync(join(recovery, id), { recursive: true });
  manifest.items.push(item); save(file, manifest); // Intent record precedes the move.
  renameSync(source, target);
  item.status = 'staged'; save(file, manifest);
  return { action: 'staged', item };
}
export function reconcileReviewedExperience(root, { apply = false } = {}) {
  const { project, file, manifest } = context(root), results = [];
  for (const item of manifest.items.filter(row => row.status === 'prepared')) {
    const source = resolve(project, item.sourcePath), target = resolve(project, item.targetPath);
    if (!sourcePath(item.sourcePath) || !/^[0-9a-f-]{36}$/.test(item.id || '') ||
      target !== join(project, 'experience', '.avc', 'recovery', item.id, basename(source))) {
      results.push({ id: item.id, action: 'refused', reason: '准备记录路径无效' }); continue;
    }
    const sourceExists = existsSync(source), targetExists = existsSync(target);
    const candidateValid = (() => { try { return sha(safeFile(project, item.candidatePath)) === item.candidateSha256; } catch { return false; } })();
    const sourceValid = sourceExists && (() => { try { return sha(safeFile(project, item.sourcePath)) === item.sourceSha256; } catch { return false; } })();
    const targetValid = targetExists && (() => { try { return sha(safeFile(project, item.targetPath)) === item.sourceSha256; } catch { return false; } })();
    const next = candidateValid && sourceValid && !targetExists ? 'aborted' : candidateValid && targetValid && !sourceExists ? 'staged' : null;
    if (!next) { results.push({ id: item.id, action: 'refused', reason: '来源、目标或候选存在冲突' }); continue; }
    results.push({ id: item.id, action: apply ? next : `would_${next}` });
    if (apply) item.status = next;
  }
  if (apply && results.some(row => ['aborted', 'staged'].includes(row.action))) save(file, manifest);
  return { results, dryRun: !apply };
}
export function cleanupReviewedExperience(root, { apply = false, now = Date.now() } = {}) {
  if(!Number.isFinite(now))throw Error('清理时间无效');
  const { project, file, manifest } = context(root), results = [];
  for (const item of manifest.items) {
    if (item.status !== 'staged') continue;
    const expiry = timestamp(item.expiresAt);
    const staged=timestamp(item.stagedAt);
    if (!Number.isFinite(expiry)||!Number.isFinite(staged)||expiry<staged+90*DAY) { results.push({ id: item.id, action: 'refused', reason: '到期时间无效' }); continue; }
    if (now < expiry) continue;
    let source, target, candidate;
    try { target = safeFile(project, item.targetPath); candidate = safeFile(project, item.candidatePath); source = resolve(project, item.sourcePath); }
    catch { results.push({ id: item.id, action: 'refused', reason: '回收文件或目标缺失' }); continue; }
    if (!/^[0-9a-f-]{36}$/.test(item.id || '') || dirname(target) !== join(project, 'experience', '.avc', 'recovery', item.id) ||
      !target.startsWith(join(project, 'experience', '.avc', 'recovery') + sep) || sha(target) !== item.sourceSha256 || sha(candidate) !== item.candidateSha256 || existsSync(source) ||
      readdirSync(dirname(target)).length!==1 || !deletionAuthorized(item.discardAuthorization,item) ||
      !validSpans(item.sourceSpans,readFileSync(target),readFileSync(candidate,'utf8'),item.spanUnit) || hasOtherReferences(project, item)) {
      results.push({ id: item.id, action: 'refused', reason: '来源、目标或回收文件发生变化' }); continue;
    }
    results.push({ id: item.id, action: apply ? 'deleted' : 'would_delete' });
    if (apply) {
      safeFile(project,item.targetPath);if(sha(target)!==item.sourceSha256)throw Error('回收原文发生变化');
      rmSync(target);
      try{rmdirSync(dirname(target));}catch(error){if(error.code!=='ENOTEMPTY')throw error;results.at(-1).cleanupWarning='New files retained in recovery directory';}
      item.status = 'deleted'; item.deletedAt = new Date(now).toISOString();
      save(file, manifest);
    }
  }
  return { results, dryRun: !apply };
}
export function restoreReviewedExperience(root, id) {
  const { project, file, manifest } = context(root), item = manifest.items.find(row => row.id === id && row.status === 'staged');
  if (!item) throw new Error('没有可恢复的原文');
  const target = safeFile(project, item.targetPath), source = resolve(project, item.sourcePath);
  if (!sourcePath(item.sourcePath) || !source.startsWith(realpathSync(project) + sep) || sha(target) !== item.sourceSha256 || existsSync(source) ||
    !existsSync(dirname(source)) || !realpathSync(dirname(source)).startsWith(realpathSync(project) + sep)) throw new Error('原文已变化、原路径冲突或目录不安全');
  renameSync(target, source);
  item.status = 'restored'; item.restoredAt = new Date().toISOString(); save(file, manifest);
  return { status: 'restored', sourcePath: item.sourcePath };
}
