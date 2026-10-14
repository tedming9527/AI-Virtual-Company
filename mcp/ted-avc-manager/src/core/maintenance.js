// Out-of-band, explicitly authorized recovery. Never fabricates a task receipt.
import { readFileSync, writeFileSync, appendFileSync, existsSync, lstatSync, realpathSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { resolve, join, sep, relative } from 'node:path';
import { createHash, randomBytes } from 'node:crypto';

import { stateRootFor, clientStateRoot } from './client-state.js';

const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const purposes = ['initialization-read', 'connection-diagnosis', 'adapter-edit', 'test'];
const deny = reason => ({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `ted-avc-manager maintenance: ${reason}` } });
function identifier(value, label) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512 || /[\r\n\0]/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}
// Object key ordering is not part of native tool semantics; string/array ordering is.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const digest = value => sha(JSON.stringify(canonical(value)));
function safe(root, path, create = false) {
  const target = resolve(path);
  if (target !== root && !target.startsWith(root + sep)) throw new Error('Maintenance path escapes project');
  let cursor = root;
  for (const part of relative(root, target).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (existsSync(cursor)) {
      if (lstatSync(cursor).isSymbolicLink()) throw new Error('Refusing maintenance symlink');
    } else {
      // existsSync follows symlinks, including dangling ones.
      try { if (lstatSync(cursor).isSymbolicLink()) throw new Error('Refusing maintenance symlink'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
      if (create) mkdirSync(cursor);
    }
  }
  return target;
}
function paths(root, input, deploymentFile, create = false) {
  identifier(input.sessionId, 'sessionId'); identifier(input.turnId, 'turnId');
  const id = digest([root, resolve(deploymentFile), input.sessionId, input.turnId]);
  const stateRoot = stateRootFor(root, deploymentFile);
  const base = safe(stateRoot, join(stateRoot, 'runtime/execution/maintenance'), create);
  return { id, state: safe(stateRoot, join(base, `${id}.json`)), lock: safe(stateRoot, join(base, `${id}.lock`)), audit: safe(stateRoot, join(base, 'events.jsonl')) };
}
function atomic(file, value) {
  const temporary = `${file}.${randomBytes(6).toString('hex')}.new`;
  try { writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); renameSync(temporary, file); }
  finally { rmSync(temporary, { force: true }); }
}
function locked(p, fn) {
  try { mkdirSync(p.lock); } catch (error) { if (error.code === 'EEXIST') throw new Error('Maintenance locked; retry'); throw error; }
  try { return fn(); } finally { rmSync(p.lock, { recursive: true }); }
}
function record(p, state, event, extra = {}) {
  appendFileSync(p.audit, JSON.stringify({ at: new Date().toISOString(), maintenanceId: p.id, sessionId: state.sessionId, turnId: state.turnId, event, executionStatus: 'unbound_maintenance', actualExecutor: 'platform agent', ...extra }) + '\n', { mode: 0o600 });
}
// Recovery does not depend on role assets, inventory, MCP or footer receipts.
// A readable, configured project is still required; damaged deployment JSON is
// repaired by its local operator outside the agent hook, never guessed here.
function projectFor(cwd, deploymentFile) {
  const root = realpathSync(resolve(cwd)), config = read(deploymentFile);
  if (!Array.isArray(config.projects)) throw new Error('Maintenance requires configured projects');
  return config.projects.map(project => ({ ...project, root: realpathSync(resolve(project.root)) }))
    .filter(project => root === project.root || root.startsWith(project.root + sep))
    .sort((a, b) => b.root.length - a.root.length)[0];
}
export function openMaintenance(root, input, deploymentFile) {
  root = realpathSync(root);
  const project = projectFor(root, deploymentFile);
  if (project?.root !== root || !project.execution?.enabled) throw new Error('Maintenance requires an execution-enabled project');
  if (input.userAuthorized !== true || input.reason !== 'task_begin_unavailable') throw new Error('Explicit user authorization and task_begin_unavailable required');
  identifier(input.authorizationRef, 'authorizationRef'); identifier(input.unavailableEvidence, 'unavailableEvidence');
  if (!Number.isInteger(input.ttlSeconds) || input.ttlSeconds < 1 || input.ttlSeconds > 3600) throw new Error('Maintenance TTL must be 1..3600 seconds');
  if (!Array.isArray(input.operations) || !input.operations.length || input.operations.length > 100) throw new Error('Maintenance requires 1..100 exact operations');
  const operations = input.operations.map(operation => {
    if (!purposes.includes(operation.purpose)) throw new Error('Invalid maintenance purpose');
    if (typeof operation.tool !== 'string' || !/^[a-zA-Z0-9_.:-]+$/.test(operation.tool)) throw new Error('Exact native tool name required');
    if (!Object.hasOwn(operation, 'input')) throw new Error('Exact tool input required');
    if (!Number.isInteger(operation.maxCalls) || operation.maxCalls < 1 || operation.maxCalls > 100) throw new Error('Operation budget must be 1..100');
    const cwd = safe(root, realpathSync(resolve(root, operation.cwd || '.')));
    return { purpose: operation.purpose, tool: operation.tool, cwd, inputSha256: digest(operation.input), maxCalls: operation.maxCalls };
  });
  if (operations.reduce((sum, operation) => sum + operation.maxCalls, 0) > 100) throw new Error('Maintenance budget exceeds 100');
  if (new Set(operations.map(operation => digest([operation.tool, operation.cwd, operation.inputSha256]))).size !== operations.length) throw new Error('Duplicate maintenance operation');
  const p = paths(root, input, deploymentFile, true);
  return locked(p, () => {
    if (existsSync(p.state)) throw new Error('Maintenance contract already pinned; use a new native turn for new authorization');
    // Do not use recovery to escape an existing task contract or its budget.
    const stateRoot = clientStateRoot(project);
    const tasks = safe(stateRoot, join(stateRoot, 'runtime/execution/tasks'));
    const receiptFile = safe(stateRoot, join(stateRoot, 'runtime/hooks/sessions', sha(input.sessionId) + '.json'));
    const receipt = existsSync(receiptFile) && read(receiptFile).turns?.[input.turnId]?.receipt;
    if (receipt && existsSync(safe(stateRoot, join(tasks, sha(JSON.stringify([root, input.sessionId, input.turnId, receipt])) + '.json')))) throw new Error('Task already bound; maintenance requires a new unbound native turn');
    const state = { schema: 'avc.unbound-maintenance.v1', id: p.id, projectRoot: root, sessionId: input.sessionId, turnId: input.turnId, status: 'active', executionStatus: 'unbound_maintenance', actualExecutor: 'platform agent', authorizationSource: 'explicit local operator declaration; not authenticated user identity', authorizationRef: input.authorizationRef, unavailableEvidence: input.unavailableEvidence, reason: input.reason, createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + input.ttlSeconds * 1000).toISOString(), operations, calls: {} };
    atomic(p.state, state); record(p, state, 'maintenance_opened', { authorizationRef: state.authorizationRef, expiresAt: state.expiresAt, operations });
    return state;
  });
}
export function maintenanceStatus(root, input, deploymentFile) {
  const p = paths(realpathSync(root), input, deploymentFile);
  if (!existsSync(p.state)) return { status: 'absent', bindingActive: 'unknown' };
  const state = read(p.state);
  // A historical rebind link is not a fresh check of the task's current state.
  return { ...state, status: state.status === 'active' && Date.parse(state.expiresAt) <= Date.now() ? 'expired' : state.status, bindingActive: 'unknown' };
}
export function endMaintenance(root, input, deploymentFile, taskId) {
  const p = paths(realpathSync(root), input, deploymentFile);
  if (!existsSync(p.state)) return { status: 'absent' };
  return locked(p, () => {
    const state = read(p.state);
    if (state.status === 'rebound' || (state.status === 'revoked' && !taskId)) return state;
    state.status = taskId ? 'rebound' : 'revoked'; state.endedAt = new Date().toISOString();
    if (taskId) state.reboundTaskId = taskId;
    atomic(p.state, state); record(p, state, taskId ? 'maintenance_rebound' : 'maintenance_revoked', taskId ? { taskId } : {});
    return state;
  });
}
export function runMaintenanceHook(input, deploymentFile) {
  if (!['UserPromptSubmit', 'PreToolUse', 'PostToolUse'].includes(input.hook_event_name)) return null;
  const project = projectFor(input.cwd, deploymentFile);
  if (!project?.execution?.enabled) return null;
  const key = { sessionId: input.session_id, turnId: input.turn_id };
  let p;
  try { p = paths(project.root, key, deploymentFile); }
  catch (error) { error.maintenance = true; throw error; }
  if (!existsSync(p.state)) return null;
  try { return locked(p, () => {
    const state = read(p.state);
    if (state.id !== p.id || state.projectRoot !== project.root || state.sessionId !== key.sessionId || state.turnId !== key.turnId) throw new Error('Maintenance scope mismatch');
    const call = Object.hasOwn(state.calls, input.tool_use_id) ? state.calls[input.tool_use_id] : null;
    if (input.hook_event_name === 'PostToolUse') {
      if (!call) return null;
      if (call.tool !== input.tool_name || call.status !== 'reserved') return {};
      const responseField = Object.hasOwn(input, 'tool_response') ? 'tool_response' : Object.hasOwn(input, 'tool_result') ? 'tool_result' : null;
      call.status = responseField ? 'observed' : 'unknown';
      if (responseField) call.responseSha256 = digest(input[responseField]);
      const response = responseField && input[responseField];
      call.exitCode = Number.isInteger(input.exit_code) ? input.exit_code : response && Number.isInteger(response.exit_code) ? response.exit_code : 'unknown';
      atomic(p.state, state); record(p, state, 'maintenance_tool_completed', { toolUseId: input.tool_use_id, ...call });
      return {};
    }
    if (state.status === 'revoked' || state.status === 'rebound') return null;
    const stateRoot = clientStateRoot(project);
    const receiptFile = safe(stateRoot, join(stateRoot, 'runtime/hooks/sessions', sha(key.sessionId) + '.json'));
    const receipt = existsSync(receiptFile) && read(receiptFile).turns?.[key.turnId]?.receipt;
    if (receipt && existsSync(safe(stateRoot, join(stateRoot, 'runtime/execution/tasks', sha(JSON.stringify([project.root, key.sessionId, key.turnId, receipt])) + '.json')))) return null;
    if (!Number.isFinite(Date.parse(state.expiresAt))) throw new Error('Invalid maintenance expiry');
    if (Date.parse(state.expiresAt) <= Date.now() && state.status === 'active') {
      state.status = 'expired'; atomic(p.state, state); record(p, state, 'maintenance_expired');
    }
    if (input.hook_event_name === 'UserPromptSubmit') return { hookSpecificOutput: { hookEventName: 'UserPromptSubmit', additionalContext: `Unbound maintenance ${state.status}; actual executor: platform agent. Only explicitly authorized exact tool inputs are admitted until ${state.expiresAt}. No task binding or employee participation is claimed. Restore task_begin, then bind with the real current native receipt; do not backfill maintenance operations into a bound task.` } };
    // Rebinding uses the ordinary bootstrap/receipt validation, not maintenance.
    if (project.execution.bootstrapTools?.includes(input.tool_name) && /^mcp__(?:ted_avc_manager|ted-avc-manager|pack_manager|pack-manager)__task_begin$/.test(input.tool_name)) return null;
    identifier(input.tool_use_id, 'tool_use_id');
    const inputSha256 = digest(input.tool_input ?? null), cwd = realpathSync(resolve(input.cwd));
    const index = state.operations.findIndex(operation => operation.tool === input.tool_name && operation.cwd === cwd && operation.inputSha256 === inputSha256);
    let reason;
    if (state.status !== 'active') reason = `Maintenance is ${state.status}; rebind or revoke through the local control entry`;
    else if (index < 0) reason = 'Tool, working directory or input outside authorized maintenance operations';
    else if (call && (call.tool !== input.tool_name || call.inputSha256 !== inputSha256 || call.operation !== index || call.status !== 'reserved')) reason = 'Maintenance tool_use_id replay or mismatch';
    else if (!call && Object.values(state.calls).filter(item => item.operation === index).length >= state.operations[index].maxCalls) reason = 'Maintenance operation budget exhausted';
    if (reason) { record(p, state, 'maintenance_tool_denied', { tool: input.tool_name, toolUseId: input.tool_use_id, reason }); return deny(reason); }
    if (!call) {
      Object.defineProperty(state.calls, input.tool_use_id, { value: { tool: input.tool_name, inputSha256, operation: index, status: 'reserved' }, enumerable: true, writable: true, configurable: true });
      atomic(p.state, state); record(p, state, 'maintenance_tool_reserved', { toolUseId: input.tool_use_id, tool: input.tool_name, inputSha256, purpose: state.operations[index].purpose });
    }
    return { systemMessage: 'Unbound maintenance execution; platform approvals and sandbox still apply.' };
  }); } catch (error) { error.maintenance = true; throw error; }
}
