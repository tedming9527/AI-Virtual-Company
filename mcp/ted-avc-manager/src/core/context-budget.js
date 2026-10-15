// Counts only UTF-8 bodies returned by this adapter, never hidden model tokens.
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
export const CONTEXT_LIMITS = Object.freeze({ responseBytes: 8192, summaryBytes: 2048, hookBytes: 12288, turnBytes: 65536, sessionBytes: 262144 });
const hash = s => createHash('sha256').update(s).digest('hex');
export function bytePrefix(text, limit) {
  const bytes = Buffer.from(text); let end = Math.min(bytes.length, limit);
  while (end > 0 && end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
  return bytes.subarray(0, end).toString('utf8');
}
function location(root, key, create) {
  if (!key.sessionId || !key.turnId) throw Error('Context accounting requires session and turn');
  let dir = realpathSync(root);
  for (const part of ['runtime', 'context']) {
    dir = join(dir, part);
    if (create && !existsSync(dir)) { try { mkdirSync(dir); } catch (e) { if (e.code !== 'EEXIST') throw e; } }
    if (existsSync(dir) && (lstatSync(dir).isSymbolicLink() || !lstatSync(dir).isDirectory())) throw Error('Unsafe context directory');
  }
  const file = join(dir, hash(JSON.stringify([key.sessionId, key.agentId || ''])) + '.json');
  if (existsSync(file) && (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile())) throw Error('Unsafe context ledger');
  return file;
}
function read(file) {
  if (!existsSync(file)) return { schema: 'avc.context-budget.v1', bytes: 0, turns: {} };
  const v = JSON.parse(readFileSync(file, 'utf8'));
  if (v.schema !== 'avc.context-budget.v1' || !Number.isSafeInteger(v.bytes) || v.bytes < 0 || !v.turns || typeof v.turns !== 'object') throw Error('Invalid context ledger');
  return v;
}
export function contextStatus(root, key) {
  const v = read(location(root, key, false)), t = v.turns[hash(key.turnId)];
  return { unit: 'utf8-bytes', scope: 'adapter-delivered bodies; not model tokens or host context', limits: CONTEXT_LIMITS, sessionBytes: v.bytes, turnBytes: t?.bytes || 0 };
}
export function deliverContext(root, key, id, text, { maxBytes = CONTEXT_LIMITS.responseBytes } = {}) {
  const file = location(root, key, true), lock = file + '.lock';
  const deadline = Date.now() + 500;
  while (true) {
    try { mkdirSync(lock); break; } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      if (Date.now() >= deadline) throw Error('Context ledger locked');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try {
    const v = read(file), turnKey = hash(key.turnId), t = v.turns[turnKey] ||= { bytes: 0, delivered: {} };
    if (!Number.isSafeInteger(t.bytes) || t.bytes < 0 || !t.delivered || typeof t.delivered !== 'object') throw Error('Invalid context turn');
    const tag = hash(id), bytes = Buffer.byteLength(text);
    const budget = () => ({ unit: 'utf8-bytes', sessionBytes: v.bytes, turnBytes: t.bytes, limits: CONTEXT_LIMITS });
    if (t.delivered[tag]) return { status: 'already-delivered', content: '', budget: budget() };
    if (bytes > maxBytes || t.bytes + bytes > CONTEXT_LIMITS.turnBytes || v.bytes + bytes > CONTEXT_LIMITS.sessionBytes)
      return { status: 'budget-exhausted', content: '', budget: budget(), taskContinues: true };
    v.bytes += bytes; t.bytes += bytes; t.delivered[tag] = bytes || 1;
    const temp = file + '.' + randomUUID() + '.tmp';
    try { writeFileSync(temp, JSON.stringify(v), { flag: 'wx', mode: 0o600 }); renameSync(temp, file); }
    finally { rmSync(temp, { force: true }); }
    return { status: 'delivered', content: text, budget: budget() };
  } finally { rmSync(lock, { recursive: true }); }
}
// Deterministic extractive preview. Never represented as a complete semantic summary.
export function documentView(content, input = {}) {
  const mode = input.mode || 'summary', bytes = Buffer.byteLength(content), digest = hash(content);
  if (!['summary', 'chunk'].includes(mode)) throw Error('mode must be summary or chunk');
  const limit = input.maxBytes ?? (mode === 'summary' ? CONTEXT_LIMITS.summaryBytes : CONTEXT_LIMITS.responseBytes);
  if (!Number.isInteger(limit) || limit < 256 || limit > CONTEXT_LIMITS.responseBytes) throw Error('maxBytes must be 256..8192');
  if (mode === 'summary') {
    if (input.cursor !== undefined) throw Error('cursor requires chunk mode');
    const headings = []; let offset = 0, fenced = false;
    for (const line of content.split(/(?<=\n)/)) {
      if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
      if (!fenced && /^#{1,6}\s/.test(line) && headings.length < 12) headings.push({ heading: bytePrefix(line.trim(), 120), cursor: { sha256: digest, offset } });
      offset += Buffer.byteLength(line);
    }
    return { mode, content: bytePrefix(content, Math.min(limit, CONTEXT_LIMITS.summaryBytes)), headings, totalBytes: bytes,
      complete: false, previewOnly: true, nextCursor: { sha256: digest, offset: 0 }, warning: 'Extractive preview and bounded heading index; read chunks before claiming full adoption or review' };
  }
  const cursor = input.cursor || { sha256: digest, offset: 0 };
  if (cursor.sha256 !== digest || !Number.isInteger(cursor.offset) || cursor.offset < 0 || cursor.offset > bytes) throw Error('Stale or invalid document cursor');
  const buffer = Buffer.from(content);
  if (cursor.offset < bytes && (buffer[cursor.offset] & 0xc0) === 0x80) throw Error('Cursor must be on a UTF-8 boundary');
  let text = bytePrefix(buffer.subarray(cursor.offset).toString('utf8'), limit), view;
  do {
    const end = cursor.offset + Buffer.byteLength(text);
    view = { mode, content: text, totalBytes: bytes, startByte: cursor.offset, endByte: end, complete: cursor.offset === 0 && end === bytes,
      nextCursor: end < bytes ? { sha256: digest, offset: end } : null };
    if (Buffer.byteLength(JSON.stringify(view)) <= CONTEXT_LIMITS.responseBytes - 2048) return view;
    // Reserve envelope space, including JSON escaping; never split a code point.
    text = bytePrefix(text, Math.floor(Buffer.byteLength(text) * 0.75));
  } while (text);
  throw Error('Document envelope exceeds context budget');
}
