import { CONTEXT_LIMITS, deliverContext, documentView } from '../core/context-budget.js';
import { readNativeTurn } from '../core/session-ingress.js';
import { candidateTrialSummary } from './candidate-trials.js';
import { stateRootFor } from '../core/client-state.js';
import { existsSync, lstatSync, readFileSync, readdirSync, mkdirSync, writeFileSync, renameSync, openSync, closeSync, unlinkSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { hostname } from 'node:os';
import { personalProject, fileInventory } from '../core/local-assets.js';
import { summarizeUsage, proposeGovernance, assetKey } from './usage.js';
import { collectedSignalSummary } from './task-retention.js';

const DAY = 86400000, WEEK = 7 * DAY;
const PERSONAL_SOFT_LIMIT = 1024 ** 3;
const sha = value => createHash('sha256').update(value).digest('hex');
const localWriterId = () => process.env.AVC_WEEKLY_WRITER_ID || `host_${sha(hostname()).slice(0, 20)}`;
const read = file => JSON.parse(readFileSync(file, 'utf8'));
function paths(root) {
  const project = personalProject(root).directory;
  return { project, dir: join(project, 'experience', '.avc'), tasks: join(stateRootFor(root), 'runtime', 'execution', 'tasks') };
}
function atomic(file, data) {
  const temp = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temp, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  renameSync(temp, file);
}
function stateOf(dir) {
  const file = join(dir, 'weekly-state.json');
  const state = existsSync(file) ? read(file) : { schema: 'avc.weekly-governance.v1', writerId: null, coveredThrough: null, lastSucceededAt: null, pending: null };
  if (state.schema !== 'avc.weekly-governance.v1') throw new Error('周度状态格式无效');
  return state;
}
export function weeklyStatus(root, { now = Date.now() } = {}) {
  const { dir } = paths(root), state = stateOf(dir);
  const last = Date.parse(state.lastSucceededAt || '');
  return { due: state.pending !== null || !Number.isFinite(last) || now - last >= WEEK,
    pending: state.pending, coveredThrough: state.coveredThrough, lastSucceededAt: state.lastSucceededAt,
    writerId: state.writerId, writerAvailable: !state.writerId || state.writerId === localWriterId() };
}
function deliveredEvents(tasks,suppressed=new Set()) {
  if (!existsSync(tasks)) return [];
  const events = [];
  for (const name of readdirSync(tasks)) {
    if (!name.endsWith('.json')) continue;
    const file = join(tasks, name);
    if (!lstatSync(file).isFile() || lstatSync(file).isSymbolicLink()) continue;
    let task;
    try { task = read(file); } catch { continue; }
    for (const item of task.assets || []) {
      if (!item.bundleSha256 || !item.loadedAt || !['general', 'local-custom'].includes(item.source)) continue;
      const asset = { source: item.source, type: item.type, id: item.name, version: item.version, bundleSha256: item.bundleSha256 };
      if(suppressed.has(assetKey(asset)))continue;
      events.push({ schema: 'avc.asset-usage.v2', eventId: sha(`${task.taskId}:${item.loadedAt}:${item.source}:${item.type}:${item.name}:${item.bundleSha256}`),
        asset, taskId: task.taskId, signal: 'delivered', observedAt: item.loadedAt });
    }
  }
  return events;
}
function experienceInventory(project) {
  const roots = [join(project, 'experience')], topics = join(project, 'topics');
  if (existsSync(topics) && lstatSync(topics).isDirectory() && !lstatSync(topics).isSymbolicLink())
    for (const topic of readdirSync(topics)) {
      const dir = join(topics, topic, 'experience');
      if (existsSync(dir) && lstatSync(dir).isDirectory() && !lstatSync(dir).isSymbolicLink()) roots.push(dir);
    }
  const files = [];
  for (const root of roots) for (const item of fileInventory(root)) {
    if (item.relativePath.startsWith('.avc' + sep)) continue;
    files.push({ path: relative(project, item.path), sha256: sha(readFileSync(item.path)), bytes: item.bytes });
    if (files.length > 5000) throw new Error('经验文件过多，需分批提炼');
  }
  return files;
}
function personalCapacity(project) {
  const areas = {};
  for (const item of fileInventory(project)) {
    const area = item.relativePath.split(sep)[0];
    areas[area] = (areas[area] || 0) + item.bytes;
  }
  const bytes = Object.values(areas).reduce((total, value) => total + value, 0);
  return { bytes, softLimitBytes: PERSONAL_SOFT_LIMIT, overLimit: bytes > PERSONAL_SOFT_LIMIT, areas };
}
export function prepareWeekly(root, { now = Date.now(), writerId = localWriterId() } = {}) {
  if (typeof writerId !== 'string' || !/^[a-zA-Z0-9_-]{8,80}$/.test(writerId)) throw new Error('须在单一执行设备配置 AVC_WEEKLY_WRITER_ID');
  const { project, dir, tasks } = paths(root);
  mkdirSync(dir, { recursive: true });
  const lock = join(dir, 'weekly.lock');
  let fd;
  try { fd = openSync(lock, 'wx', 0o600); } catch { throw new Error('周度任务已有锁；需核查运行状态，不自动抢锁'); }
  try {
    const state = stateOf(dir);
    if (state.writerId && state.writerId !== writerId) throw new Error('周度任务属于另一执行设备');
    if (state.pending) return { status: 'pending-ai', ...state.pending };
    if (!weeklyStatus(root, { now }).due) return { status: 'not-due', coveredThrough: state.coveredThrough };
    const end = Math.floor(now / 1000) * 1000;
    const start = state.coveredThrough ? Date.parse(state.coveredThrough) : end - WEEK;
    if (!Number.isFinite(start) || start > end || end - start > 52 * WEEK) throw new Error('覆盖水位无效或积压超过一年，需人工核查');
    const retiredFile=join(stateRootFor(root),'observation-retirement.json'),retired=existsSync(retiredFile)?read(retiredFile):{};
    const events = deliveredEvents(tasks,new Set(retired.suppressedAssetKeys||retired.retiredAssetKeys||[])), windows = [];
    for (let cursor = start; cursor < end; cursor += WEEK) {
      const through = Math.min(cursor + WEEK, end);
      const rollup = summarizeUsage(events, { from: new Date(cursor).toISOString(), through: new Date(through).toISOString() });
      windows.push({ ...rollup, suggestions: proposeGovernance(rollup) });
    }
    const inventory = experienceInventory(project), runId = randomUUID();
    let candidateTrials;
    try {candidateTrials=candidateTrialSummary(root);} catch(error) {candidateTrials={status:'unavailable',warning:error.message};}
    let collectionSignals;try{collectionSignals=collectedSignalSummary(stateRootFor(root));}catch(error){collectionSignals={status:'unavailable',reason:error.message,taskContinues:true};}
    const manifest = { candidateTrials, collectionSignals, schema: 'avc.weekly-preparation.v1', runId, from: new Date(start).toISOString(), through: new Date(end).toISOString(), windows, experience: inventory, capacity: personalCapacity(project), contextPolicy: { limits: CONTEXT_LIMITS, reader: 'governance-weekly-read', summaryIsCompleteReview: false }, status: 'awaiting-ai-proposal' };
    const file = join(dir, `preparation-${runId}.json`);
    atomic(file, manifest);
    const pending = { runId, file: relative(project, file), through: manifest.through, sha256: sha(readFileSync(file)) };
    atomic(join(dir, 'weekly-state.json'), { ...state, writerId, pending });
    return { status: 'pending-ai', ...pending, experienceCount: inventory.length, windows: windows.length, capacity: manifest.capacity };
  } finally { closeSync(fd); unlinkSync(lock); }
}
// The full preparation remains on disk. Only bounded index pages and source views
// are delivered; preserved files are never truncated or promoted by this reader.
export function readWeekly(root, input, { writerId = localWriterId() } = {}) {
  const { project, dir } = paths(root), state = stateOf(dir);
  if (!state.pending || state.writerId !== writerId || input.runId !== state.pending.runId) throw Error('周度准备回执不匹配');
  const stateRoot = stateRootFor(root);
  if (process.env.AVC_DEPLOYMENT_FILE && read(process.env.AVC_DEPLOYMENT_FILE).scope === 'client') readNativeTurn(stateRoot, input);
  else {
    const receiptFile = join(stateRoot, 'runtime/hooks/sessions', sha(input.sessionId || '') + '.json');
    if (!input.receipt || !existsSync(receiptFile) || read(receiptFile).turns?.[input.turnId]?.receipt !== input.receipt) throw Error('Native session/turn receipt mismatch');
  }
  const file = join(project, state.pending.file);
  if (lstatSync(file).isSymbolicLink() || sha(readFileSync(file)) !== state.pending.sha256) throw Error('周度准备内容已变化');
  const manifest = read(file);
  let view, identity, source;
  if (!input.path) {
    const offset = input.indexCursor?.offset ?? 0;
    if (!Number.isInteger(offset) || offset < 0 || offset > manifest.experience.length || (input.indexCursor && input.indexCursor.sha256 !== state.pending.sha256)) throw Error('Invalid preparation cursor');
    const entries = []; let end = offset;
    while (end < manifest.experience.length && entries.length < 20) {
      const next = manifest.experience[end];
      if (Buffer.byteLength(JSON.stringify([...entries, next])) > 4096) break;
      entries.push(next); end++;
    }
    if (end === offset && offset < manifest.experience.length) throw Error('Source metadata exceeds page budget');
    view = { entries, total: manifest.experience.length, nextIndexCursor: end < manifest.experience.length ? { sha256: state.pending.sha256, offset: end } : null,
      complete: false, evidence: 'Metadata only; not source review', preparedSha256: state.pending.sha256 };
    identity = `index:${offset}`;
  } else {
    source = manifest.experience.find(e => e.path === input.path);
    if (!source) throw Error('Source not in frozen preparation');
    // Match a fresh safe inventory rather than resolving arbitrary user paths.
    const current = experienceInventory(project).find(e => e.path === source.path && e.sha256 === source.sha256);
    if (!current) throw Error('Source changed or unavailable');
    if (source.bytes > 1024 * 1024) return { status: 'source-too-large', taskContinues: true, source, complete: false, warning: 'Split this source into reviewed documents before extraction; original retained' };
    view = documentView(readFileSync(join(project, source.path), 'utf8'), input);
    identity = `${source.sha256}:${source.path}:${view.mode}:${view.startByte ?? 0}:${view.endByte ?? Buffer.byteLength(view.content)}`;
  }
  const delivery = deliverContext(stateRoot, input, `weekly:${input.runId}:${identity}`, JSON.stringify(view));
  if (delivery.status !== 'delivered') return { status: delivery.status, taskContinues: true, contextBudget: delivery.budget, retry: { runId: input.runId, path: input.path, cursor: input.cursor, indexCursor: input.indexCursor } };
  if (source && view.mode === 'chunk') {
    const lock = join(dir, 'weekly.lock'); let fd;
    try { fd = openSync(lock, 'wx', 0o600); } catch { return { status: 'unverified', taskContinues: true, warning: 'Review evidence locked; no completion claimed' }; }
    try {
      const evidenceFile = join(dir, `reads-${input.runId}.json`);
      if (existsSync(evidenceFile) && lstatSync(evidenceFile).isSymbolicLink()) throw Error('Unsafe extraction evidence');
      const evidence = existsSync(evidenceFile) ? read(evidenceFile) : { sources: {} };
      const ranges = evidence.sources[source.sha256 + ':' + source.path] ||= [];
      ranges.push([view.startByte, view.endByte]); atomic(evidenceFile, evidence);
    } finally { closeSync(fd); unlinkSync(lock); }
  }
  return { status: 'delivered', ...view, contextBudget: delivery.budget };
}
export function completeWeekly(root, input, { now = Date.now(), writerId = localWriterId() } = {}) {
  const { project, dir } = paths(root);
  const lock = join(dir, 'weekly.lock');
  let fd;
  try { fd = openSync(lock, 'wx', 0o600); } catch { throw new Error('周度任务已有锁；需核查运行状态，不自动抢锁'); }
  try {
  const state = stateOf(dir);
  if (!state.pending || writerId !== state.writerId || input?.runId !== state.pending.runId || !Array.isArray(input.proposals)) throw new Error('周度提炼回执与执行设备不匹配');
  const file = join(dir, `preparation-${input.runId}.json`);
  if (relative(project, file) !== state.pending.file || !existsSync(file) || lstatSync(file).isSymbolicLink()) throw new Error('周度准备文件无效');
  const content = readFileSync(file);
  if (sha(content) !== state.pending.sha256) throw new Error('周度准备内容已变化');
  const manifest = JSON.parse(content), sources = new Map(manifest.experience.map(e => [e.path, e.sha256]));
  const currentSources = new Map(experienceInventory(project).map(e => [e.path, e.sha256]));
  const evidenceFile = join(dir, `reads-${input.runId}.json`);
  if (existsSync(evidenceFile) && lstatSync(evidenceFile).isSymbolicLink()) throw Error('Unsafe extraction evidence');
  const reviewed = existsSync(evidenceFile) ? read(evidenceFile).sources : {};
  for (const source of manifest.experience) {
    let through = 0;
    for (const [start, end] of (reviewed[source.sha256 + ':' + source.path] || []).sort((a,b) => a[0] - b[0])) {
      if (start > through) break;
      through = Math.max(through, end);
    }
    if (currentSources.get(source.path) !== source.sha256 || through !== source.bytes) throw Error('提取未完成：未读、变更或预算不足的来源不能推进覆盖水位');
  }

  for (const p of input.proposals) {
    if (!p || Object.keys(p).some(key => !['title', 'action', 'sources', 'reason'].includes(key)) || typeof p.title !== 'string' || !p.title.trim() || p.title.length > 200 || !['extract', 'merge', 'observe', 'audit'].includes(p.action) ||
      !Array.isArray(p.sources) || !p.sources.length || p.sources.some(s => !s || Object.keys(s).some(key => !['path', 'sha256', 'bytes'].includes(key)) || !sources.has(s.path) || sources.get(s.path) !== s.sha256 || currentSources.get(s.path) !== s.sha256) ||
      typeof p.reason !== 'string' || !p.reason.trim() || p.reason.length > 1000) throw new Error('提炼建议缺少有效来源或理由');
  }
  const result = { schema: 'avc.weekly-proposals.v1', runId: input.runId, preparedSha256: state.pending.sha256, createdAt: new Date(now).toISOString(),
    proposals: input.proposals, review: 'pending', publication: 'none' };
  atomic(join(dir, `proposals-${input.runId}.json`), result);
  atomic(join(dir, 'weekly-state.json'), { ...state, coveredThrough: state.pending.through, lastSucceededAt: new Date(now).toISOString(), pending: null });
  return { status: 'awaiting-human-review', proposals: result.proposals.length, coveredThrough: state.pending.through };
  } finally { closeSync(fd); unlinkSync(lock); }
}
