// Counts only UTF-8 bodies returned by this adapter, never hidden model tokens.
import { existsSync, lstatSync, mkdirSync, readFileSync, writeFileSync, renameSync, rmSync, realpathSync } from 'node:fs';
import { join,dirname } from 'node:path';
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
  // A shared session ledger prevents each child from obtaining a fresh quota.
  const file = join(dir, hash(JSON.stringify([key.sessionId, ''])) + '.json');
  if (existsSync(file) && (lstatSync(file).isSymbolicLink() || !lstatSync(file).isFile())) throw Error('Unsafe context ledger');
  return file;
}
function read(file) {
  if (!existsSync(file)) return { schema: 'avc.context-budget.v2', bytes: 0, turns: {}, importedAgents: [] };
  if(lstatSync(file).size>4194304)throw Error('Context ledger exceeds bounded read');
  const v = JSON.parse(readFileSync(file, 'utf8'));
  if (!['avc.context-budget.v1','avc.context-budget.v2'].includes(v.schema) || !Number.isSafeInteger(v.bytes) || v.bytes < 0 || !v.turns || typeof v.turns !== 'object') throw Error('Invalid context ledger');
  if(v.schema==='avc.context-budget.v1'){
    for(const t of Object.values(v.turns))t.agents={[hash('')]:{bytes:t.bytes,delivered:t.delivered}};
    v.schema='avc.context-budget.v2';v.importedAgents=[];
  }
  if(!Array.isArray(v.importedAgents))throw Error('Invalid context migration state');
  let total=0;
  for(const t of Object.values(v.turns)){
    if(!Number.isSafeInteger(t.bytes)||t.bytes<0||!t.agents||typeof t.agents!=='object')throw Error('Invalid context turn totals');
    let sum=0;for(const a of Object.values(t.agents)){if(!Number.isSafeInteger(a.bytes)||a.bytes<0||!a.delivered||typeof a.delivered!=='object')throw Error('Invalid context agent totals');sum+=a.bytes;}
    if(!Number.isSafeInteger(sum)||sum!==t.bytes)throw Error('Inconsistent context turn totals');total+=sum;
  }
  if(!Number.isSafeInteger(total)||total!==v.bytes)throw Error('Inconsistent context session total');
  return v;
}
function readSession(file,key) {
  const v=read(file),agent=key.agentId||'',tag=hash(agent);
  // Legacy files lack raw session identities. Import only a caller's exact
  // known agent file; never guess ownership of unrelated ledgers.
  if(agent&&!v.importedAgents.includes(tag)){
    const legacy=join(dirname(file),hash(JSON.stringify([key.sessionId,agent]))+'.json');
    if(existsSync(legacy)){
      if(lstatSync(legacy).isSymbolicLink()||!lstatSync(legacy).isFile())throw Error('Unsafe legacy context ledger');
      const old=read(legacy);v.bytes+=old.bytes;
      for(const [id,t]of Object.entries(old.turns)){
        const target=v.turns[id]||={bytes:0,agents:{}};
        target.bytes+=t.bytes;target.agents[hash(agent)]={bytes:t.bytes,delivered:t.delivered||t.agents?.[hash('')]?.delivered||{}};
      }
    }
    v.importedAgents.push(tag);
  }
  return v;
}
export function contextStatus(root, key) {
  const v = readSession(location(root, key, false),key), t = v.turns[hash(key.turnId)];
  return { unit: 'utf8-bytes', scope: 'shared session and turn across agents; not model tokens or host context', limits: CONTEXT_LIMITS, sessionBytes: v.bytes, turnBytes: t?.bytes || 0,agentTurnBytes:t?.agents?.[hash(key.agentId||'')]?.bytes||0,legacyCoverage:'parent and explicitly encountered legacy agents only' };
}
export function deliverContext(root, key, id, text, { maxBytes = CONTEXT_LIMITS.responseBytes,parts,build,always=false } = {}) {
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
    const v = readSession(file,key), turnKey = hash(key.turnId), t = v.turns[turnKey] ||= { bytes: 0, agents: {} };
    if (!Number.isSafeInteger(t.bytes) || t.bytes < 0 || !t.agents || typeof t.agents !== 'object') throw Error('Invalid context turn');
    const agent=t.agents[hash(key.agentId||'')]||={bytes:0,delivered:{}};
    if(!Number.isSafeInteger(agent.bytes)||agent.bytes<0||!agent.delivered||typeof agent.delivered!=='object')throw Error('Invalid context agent');
    if(parts&&(!Array.isArray(parts)||typeof build!=='function'||parts.some(p=>typeof p.id!=='string'||typeof p.text!=='string')))throw Error('Invalid context parts');
    const unsent=parts?.filter(p=>!agent.delivered[hash('part:'+p.id)]);
    if(parts)text=JSON.stringify(build(unsent.map(p=>p.text)));
    const tag = hash(id), bytes = Buffer.byteLength(text);
    const budget = () => ({ unit: 'utf8-bytes', sessionBytes: v.bytes, turnBytes: t.bytes, limits: CONTEXT_LIMITS });
    if (parts?(!always&&!unsent.length):agent.delivered[tag]) return { status: 'already-delivered', content: '', budget: budget() };
    if (bytes > maxBytes || t.bytes + bytes > CONTEXT_LIMITS.turnBytes || v.bytes + bytes > CONTEXT_LIMITS.sessionBytes)
      return { status: 'budget-exhausted', content: '', budget: budget(), taskContinues: true };
    v.bytes += bytes; t.bytes += bytes; agent.bytes+=bytes; agent.delivered[tag] = bytes || 1;
    for(const part of unsent||[])agent.delivered[hash('part:'+part.id)]=1;
    const temp = file + '.' + randomUUID() + '.tmp';
    try { writeFileSync(temp, JSON.stringify(v), { flag: 'wx', mode: 0o600 }); renameSync(temp, file); }
    finally { rmSync(temp, { force: true }); }
    return { status: 'delivered', content: text, budget: budget() };
  } finally { rmSync(lock, { recursive: true }); }
}
// Complete adapter JSON body accounting, including escaping and its own meter.
// A small, explicitly unaccounted control is the only failure fallback.
export function deliverResponse(root,key,result,{id='response:'+randomUUID(),maxBytes=CONTEXT_LIMITS.responseBytes,operationOutcome}={}) {
  const control=(status,reason)=>({status,reason,taskContinues:true,detailsOmitted:true,...(operationOutcome?{operationOutcome}:{}),contextDelivery:{status,accounted:false,controlOnly:true}});
  let value={...(Array.isArray(result)?{items:result}:result),contextDelivery:{status:key?.sessionId&&key?.turnId?'delivered':'unbound',accounted:!!(key?.sessionId&&key?.turnId),unit:'utf8-bytes',responseBytes:0}};
  for(let i=0;i<8;i++){const n=Buffer.byteLength(JSON.stringify(value));if(n===value.contextDelivery.responseBytes)break;value.contextDelivery.responseBytes=n;}
  const text=JSON.stringify(value);
  if(Buffer.byteLength(text)>maxBytes)return control('response-too-large','Read a smaller page or chunk');
  if(!key?.sessionId||!key?.turnId)return value;
  try{const delivery=deliverContext(root,key,id,text,{maxBytes});return delivery.status==='delivered'?value:control(delivery.status,'Optional context withheld; task continues');}
  catch{return control('unverified','Context accounting unavailable; optional content withheld');}
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
