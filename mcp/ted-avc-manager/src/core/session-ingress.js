// Native event capture and client-wide attachment are independent of attribution.
import { readFileSync, existsSync, lstatSync, mkdirSync, rmdirSync, writeFileSync, linkSync, unlinkSync, realpathSync, readdirSync } from 'node:fs';
import { resolve, join, relative, sep, dirname, basename } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';
import { clientStateRoot } from './client-state.js';

const hash = value => createHash('sha256').update(value).digest('hex');
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
const id = value => typeof value === 'string' && value.trim() && value.length <= 512 && !/[\r\n\0]/.test(value);
export function workspaceOf(input) {
  if (!input.cwd) return { root: null, status: 'none' };
  try { return { root: realpathSync(resolve(input.cwd)), status: 'available' }; }
  catch { return { root: null, status: 'missing' }; }
}
export function hookProject(config, input) {
  if (config.scope === 'client') return config.projects[0];
  const cwd = workspaceOf(input).root;
  return cwd && config.projects.filter(p => cwd === p.root || cwd.startsWith(p.root + sep)).sort((a,b) => b.root.length-a.root.length)[0];
}
function safe(root, file, directory = false) {
  root = clientStateRoot({ root, stateRoot: root });
  const target = resolve(file);
  if (target !== root && !target.startsWith(root + sep)) throw Error('Native state path escapes client');
  let cursor = root;
  for (const part of relative(root, target).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    try { if (lstatSync(cursor).isSymbolicLink()) throw Error('Refusing native state symlink'); }
    catch (e) { if (e.code !== 'ENOENT') throw e; }
  }
  if (directory) mkdirSync(target, { recursive: true, mode: 0o700 });
  return target;
}
function publish(file, data) {
  if (existsSync(file)) return JSON.parse(readFileSync(file, 'utf8'));
  const tmp = file + '.' + randomBytes(8).toString('hex') + '.tmp';
  try {
    writeFileSync(tmp, JSON.stringify(data) + '\n', { flag: 'wx', mode: 0o600 });
    try { linkSync(tmp, file); } catch (e) { if (e.code !== 'EEXIST') throw e; }
    return JSON.parse(readFileSync(file, 'utf8'));
  } finally { try { unlinkSync(tmp); } catch {} }
}
export function nativeTurnFile(stateRoot, sessionId, turnId, agentId = '') {
  return safe(stateRoot, join(stateRoot, 'runtime/mediation/turns', hash(JSON.stringify([sessionId, turnId, agentId])) + '.json'));
}
export function captureNative(input, deploymentFile) {
  let config, configurationError;
  try { config = JSON.parse(readFileSync(deploymentFile, 'utf8')); if (!Array.isArray(config.projects) || !config.projects.length || config.projects.some(p=>typeof p.root!=='string')) throw Error('Invalid deployment projects'); }
  catch (e) {
    // The managed client's event spool remains available if configuration fails.
    const base = dirname(resolve(deploymentFile));
    if (basename(base) !== 'ted-avc-manager' || !existsSync(join(base, 'state'))) throw e;
    configurationError = 'deployment-unavailable';
    config = { scope: 'client', projects: [{ root: base, stateRoot: join(base, 'state') }] };
  }
  const project = hookProject(config, input);
  if (!project) return { captured: false, attached: false, status: 'not-applicable' };
  const stateRoot = clientStateRoot(project), workspace = workspaceOf(input);
  const events = safe(stateRoot, join(stateRoot, 'runtime/mediation/events'), true);
  const captureId = hash(JSON.stringify(canonical(input)));
  const responseField = Object.hasOwn(input,'tool_response') ? 'tool_response' : Object.hasOwn(input,'tool_result') ? 'tool_result' : null;
  const event = publish(safe(stateRoot, join(events, captureId + '.json')), {
    schema: 'avc.native-event.v1', captureId, at: new Date().toISOString(),
    event: id(input.hook_event_name) ? input.hook_event_name : null, source: id(input.source) ? input.source : null,
    sessionId: id(input.session_id) ? input.session_id : null,
    turnId: id(input.turn_id) ? input.turn_id : null, agentId: id(input.agent_id) ? input.agent_id : null,
    tool: id(input.tool_name) ? input.tool_name : null, toolUseId: id(input.tool_use_id) ? input.tool_use_id : null,
    inputSha256: input.tool_input === undefined ? null : hash(JSON.stringify(canonical(input.tool_input))),
    responseSha256: responseField ? hash(JSON.stringify(canonical(input[responseField]))) : null,
    workspace, generation: config.environment?.AVC_GENERATION ?? null,
    evidence: 'native-event-only; not attribution, task routing or semantic compliance',
  });
  if (!id(input.session_id)) return { captured: true, captureId, attached: false, status: 'identity-missing' };
  const sessions = safe(stateRoot, join(stateRoot, 'runtime/mediation/sessions'), true);
  publish(safe(stateRoot, join(sessions, hash(JSON.stringify([input.session_id, input.agent_id ?? ''])) + '.json')), {
    schema: 'avc.session-attachment.v1', sessionChainId: input.session_id, sessionId: input.session_id, agentId: input.agent_id ?? null,
    attachedAt: event.at, firstCaptureId: captureId, historyCoverage: 'observed-events-only',
  });
  const associations = safe(stateRoot, join(stateRoot, 'runtime/mediation/workspaces', hash(input.session_id)), true);
  // A session can touch several projects. Only host metadata or explicit native
  // tool paths create associations; arbitrary shell text is never executed/guessed.
  const roots = [workspace.root, input.tool_input?.workdir, input.tool_input?.cwd];
  const patch = input.tool_name === 'apply_patch' ? input.tool_input?.patch ?? input.tool_input?.command : null;
  const patchFiles = typeof patch === 'string' ? [...patch.matchAll(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/gm)].map(m=>m[1]) : [];
  for (const file of [input.tool_input?.path, input.tool_input?.file_path, ...patchFiles]) {
    if (typeof file === 'string' && file.startsWith(sep)) {
      try { roots.push(lstatSync(file).isDirectory() ? file : dirname(file)); } catch {}
    }
  }
  for (const candidate of roots.filter(v => typeof v === 'string' && v.startsWith(sep))) {
    let root;
    try { root = realpathSync(candidate); } catch { continue; }
    let projectRoot = null, cursor = root;
    while (true) {
      if (existsSync(join(cursor, '.git'))) { projectRoot = cursor; break; }
      if (dirname(cursor) === cursor) break;
      cursor = dirname(cursor);
    }
    publish(safe(stateRoot, join(associations, hash(root) + '.json')), {
      schema: 'avc.session-workspace.v1', sessionId: input.session_id, workspaceRoot: root,
      projectRoot, captureId, evidence: 'host-cwd-or-explicit-tool-path; not additional authorization',
    });
  }
  if (configurationError || (config.protocolVersion !== undefined && config.protocolVersion !== 1)) return { captured: true, captureId, attached: false, status: configurationError || 'protocol-unsupported' };
  // Only a real prompt/tool/start event may attach its current turn; Stop never
  // invents a missing receipt to make an old final answer pass attribution.
  let turn;
  if (config.scope === 'client' && id(input.turn_id) && !['Stop', 'SubagentStop', 'SessionEnd', 'Interrupt'].includes(input.hook_event_name)) {
    safe(stateRoot, join(stateRoot, 'runtime/mediation/turns'), true);
    turn = publish(nativeTurnFile(stateRoot, input.session_id, input.turn_id, input.agent_id ?? ''), {
      schema: 'avc.turn-attachment.v1', sessionChainId: input.session_id, sessionId: input.session_id, turnId: input.turn_id, agentId: input.agent_id ?? null,
      receipt: randomBytes(12).toString('hex'), attachedAt: event.at, firstCaptureId: captureId,
      workspace, generation: config.environment?.AVC_GENERATION ?? null,
      routing: 'pending-native-task-contract',
    });
  }
  return { captured: true, captureId, attached: true, status: 'attached', ...(turn ? { turn } : {}) };
}

export function sessionWorkspaces(stateRoot, sessionId) {
  const directory = safe(stateRoot, join(stateRoot, 'runtime/mediation/workspaces', hash(sessionId)));
  if (!existsSync(directory)) return [];
  return readdirSync(directory).filter(n => /^[a-f0-9]{64}\.json$/.test(n)).map(n => JSON.parse(readFileSync(safe(stateRoot, join(directory, n)), 'utf8')));
}

export function readNativeTurn(stateRoot, input) {
  const file = nativeTurnFile(stateRoot, input.sessionId, input.turnId, input.agentId ?? '');
  if (!existsSync(file)) throw Error('Native turn not attached; wait for a real host event');
  const turn = JSON.parse(readFileSync(file, 'utf8'));
  if (turn.sessionId !== input.sessionId || turn.turnId !== input.turnId || turn.receipt !== input.receipt) throw Error('Native session/turn receipt mismatch');
  return turn;
}

export function nativeTaskStatus(input, deploymentFile, turn) {
  const config=JSON.parse(readFileSync(deploymentFile,'utf8'));
  const project=hookProject(config,input);if(!project||!turn)return null;
  const stateRoot=clientStateRoot(project);
  const taskId=hash(JSON.stringify([resolve(project.root),input.session_id,input.turn_id,input.agent_id??'',turn.receipt]));
  const file=safe(stateRoot,join(stateRoot,'runtime/execution/tasks',taskId+'.json'));
  return existsSync(file)?JSON.parse(readFileSync(file,'utf8')).status:null;
}

// Cached legacy commands may invoke the same event concurrently. Capture first,
// then share one actual handler result; duplicate callbacks must not race task locks.
export function handleCapturedOnce(input, deploymentFile, collection, handler) {
  if (!collection.captured) return handler();
  const config=JSON.parse(readFileSync(deploymentFile,'utf8'));
  const project=hookProject(config,input);if(!project)return handler();
  const root=clientStateRoot(project), directory=safe(root,join(root,'runtime/mediation/handling'),true);
  const file=safe(root,join(directory,collection.captureId+'.json')), lock=safe(root,join(directory,collection.captureId+'.lock'));
  const cached=()=>{
    if(!existsSync(file))return null;
    const value=JSON.parse(readFileSync(file,'utf8'));
    if(value.schema!=='avc.native-handling.v1'||value.captureId!==collection.captureId||!value.result||typeof value.result!=='object'||Array.isArray(value.result))throw Error('Invalid native handling record');
    // A cached handler proves processing, not a need to inject its context again.
    const result = structuredClone(value.result);
    if (result.hookSpecificOutput?.additionalContext) {
      delete result.hookSpecificOutput.additionalContext;
      if (Object.keys(result.hookSpecificOutput).length === 1) delete result.hookSpecificOutput;
    }
    if (result._tedCollection) { result._tedCollection.contextReturned = false; result._tedCollection.contextDelivery = 'already-delivered'; }
    return result;
  };
  const deadline=Date.now()+2000;
  while(true) {
    const result=cached();if(result)return result;
    try {mkdirSync(lock,{mode:0o700});break;}
    catch(error) {
      if(error.code!=='EEXIST')throw error;
      if(Date.now()>=deadline)throw Error('Concurrent native handler unavailable; raw event retained');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,20);
    }
  }
  try {
    const result=cached();if(result)return result;
    const value=handler();publish(file,{schema:'avc.native-handling.v1',captureId:collection.captureId,result:value});return value;
  } finally { unlinkSafeLock(lock); }
}
function unlinkSafeLock(lock) {
  // The lock is an empty directory created by this process, never an arbitrary tree.
  try { rmdirSync(lock); } catch {}
}
