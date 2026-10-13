import { createHash, randomUUID } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { join, resolve, relative, sep, basename, dirname } from 'node:path';
import { personalProject, fileInventory } from '../core/local-assets.js';

const DAY = 86400000;
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const validPart = value => value && value !== '.' && value !== '..' && !/[\\\0]/.test(value);
function safeFile(project, path) {
  if (typeof path !== 'string' || !path.split('/').every(validPart)) throw new Error('个人资料路径无效');
  const file = resolve(project, path), base = realpathSync(project);
  if (!file.startsWith(base + sep) || !existsSync(file) || !lstatSync(file).isFile() || lstatSync(file).isSymbolicLink() ||
    !realpathSync(file).startsWith(base + sep)) throw new Error('文件缺失、链接或越出个人目录');
  return file;
}
function sourcePath(path) {
  return /^experience\/(?!\.avc\/).+/.test(path) || /^topics\/[a-z0-9][a-z0-9-]*\/experience\/.+/.test(path);
}
function context(root) {
  const project = realpathSync(personalProject(root).directory), dir = join(project, 'experience', '.avc'), recovery = join(dir, 'recovery');
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
function validSpans(spans) {
  return Array.isArray(spans) && spans.length > 0 && spans.length <= 200 && spans.every(span => span && Number.isInteger(span.start) && span.start >= 0 &&
    Number.isInteger(span.end) && span.end > span.start && typeof span.candidateRef === 'string' && span.candidateRef.length > 0 && span.candidateRef.length <= 200 &&
    Object.keys(span).every(key => ['start', 'end', 'candidateRef'].includes(key)));
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
  const { project, dir, recovery, file, manifest } = context(root);
  if (!sourcePath(input?.sourcePath) || typeof input?.candidatePath !== 'string' || input?.sourcePath === input.candidatePath ||
    input?.review?.status !== 'approved' || input.review.coverage !== 'complete' || !validSpans(input.review.sourceSpans) ||
    !/^[a-f0-9]{64}$/.test(input.review.sourceSha256 || '') || !/^[a-f0-9]{64}$/.test(input.review.candidateSha256 || '')) throw new Error('须有已复核且完整覆盖的来源映射');
  const source = safeFile(project, input.sourcePath), candidate = safeFile(project, input.candidatePath);
  if (sha(source) !== input.review.sourceSha256 || sha(candidate) !== input.review.candidateSha256) throw new Error('来源或提炼目标已变化');
  if (manifest.items.some(item => item.sourcePath === input.sourcePath && !['restored', 'aborted'].includes(item.status))) throw new Error('来源已有回收记录');
  const id = randomUUID(), target = join(recovery, id, basename(source));
  const item = { id, sourcePath: input.sourcePath, candidatePath: input.candidatePath, targetPath: relative(project, target),
    sourceSha256: input.review.sourceSha256, candidateSha256: input.review.candidateSha256,
    sourceSpans: input.review.sourceSpans, reviewDigest: createHash('sha256').update(JSON.stringify(input.review)).digest('hex'),
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
  const { project, file, manifest } = context(root), results = [];
  for (const item of manifest.items) {
    if (item.status !== 'staged') continue;
    const expiry = Date.parse(item.expiresAt || '');
    if (!Number.isFinite(expiry)) { results.push({ id: item.id, action: 'refused', reason: '到期时间无效' }); continue; }
    if (now < expiry) continue;
    let source, target, candidate;
    try { target = safeFile(project, item.targetPath); candidate = safeFile(project, item.candidatePath); source = resolve(project, item.sourcePath); }
    catch { results.push({ id: item.id, action: 'refused', reason: '回收文件或目标缺失' }); continue; }
    if (!/^[0-9a-f-]{36}$/.test(item.id || '') || dirname(target) !== join(project, 'experience', '.avc', 'recovery', item.id) ||
      !target.startsWith(join(project, 'experience', '.avc', 'recovery') + sep) || sha(target) !== item.sourceSha256 || sha(candidate) !== item.candidateSha256 || existsSync(source) || hasOtherReferences(project, item)) {
      results.push({ id: item.id, action: 'refused', reason: '来源、目标或回收文件发生变化' }); continue;
    }
    results.push({ id: item.id, action: apply ? 'deleted' : 'would_delete' });
    if (apply) {
      rmSync(target);
      rmSync(join(project, 'experience', '.avc', 'recovery', item.id), { recursive: true });
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
