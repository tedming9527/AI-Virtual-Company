import { catalogRootFor } from './client-state.js';
// Shared orchestration above packs. Native agents and local processes remain distinct adapters.
import { existsSync, readFileSync, writeFileSync, mkdirSync, renameSync, rmSync, lstatSync, realpathSync, readdirSync } from 'node:fs';
import { join, resolve, isAbsolute } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { managedSkill } from './skill-candidates.js';
import { skillBundle } from './local-assets.js';
import { assertNoLinks } from './scan.js';
import { supervise, status as processStatus, cancel as cancelProcess } from './supervisor-runtime.mjs';
const hash = x => createHash('sha256').update(x).digest('hex');
const read = p => JSON.parse(readFileSync(p, 'utf8'));
const stamp = () => new Date().toISOString();
const terminal = new Set(['succeeded', 'failed', 'skipped', 'blocked', 'cancelled', 'timed_out', 'needs_attention']);
const live = new Set(['reserved', 'running']);
const assetPattern = /^(general:(skill|knowledge|framework|role)|local-custom:skill):[a-z0-9][a-z0-9-]*$/;
const idPattern = /^[a-z0-9][a-z0-9-]{0,47}$/;
function check(ok, message) { if (!ok) throw new Error(message); }
function fields(value, keys, label) {
  check(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  check(Object.keys(value).every(k => keys.includes(k)), `Unknown ${label} field`);
}
function text(value, label, max = 512) { check(typeof value === 'string' && value.trim() && value.length <= max && !/[\0\r\n]/.test(value), `Invalid ${label}`); return value; }
function integer(value, min, max, label) { check(Number.isInteger(value) && value >= min && value <= max, `Invalid ${label}`); }
function relativePath(value) { text(value, 'relative path'); check(!isAbsolute(value) && !value.includes('\\') && !value.split(/[\\/]/).some(p => !p || p === '..' || p === '.'), 'Safe project-relative path required'); return value; }
function combinations(items = []) {
  check(Array.isArray(items) && items.length <= 24, 'assets must contain at most 24 references');
  const seen = new Set();
  return items.map(item => {
    fields(item, ['id', 'usage', 'purpose'], 'asset');
    check(assetPattern.test(item.id) && !seen.has(item.id), 'Invalid or duplicate asset identity'); seen.add(item.id);
    check(['primary', 'support', 'verify'].includes(item.usage), 'Asset usage must be primary/support/verify');
    return { id: item.id, usage: item.usage, purpose: text(item.purpose, 'asset purpose', 160) };
  });
}
export function validateWorkflow(input) {
  fields(input, ['schema', 'id', 'title', 'goal', 'owner', 'assets', 'maxParallel', 'maxAttemptsTotal', 'nodes'], 'workflow');
  check(input.schema === 'avc.workflow.v1' && idPattern.test(input.id), 'Invalid workflow schema/id');
  text(input.title, 'title', 160); text(input.goal, 'goal'); check(idPattern.test(input.owner), 'Invalid owner role');
  integer(input.maxParallel, 1, 8, 'maxParallel'); integer(input.maxAttemptsTotal, 1, 128, 'maxAttemptsTotal');
  check(Array.isArray(input.nodes) && input.nodes.length > 0 && input.nodes.length <= 32, 'nodes must contain 1..32 entries');
  const spec = { ...input, assets: combinations(input.assets), nodes: [] }, ids = new Set();
  for (const n of input.nodes) {
    fields(n, ['id', 'title', 'role', 'assets', 'dependsOn', 'when', 'maxAttempts', 'executor', 'outputs', 'acceptance'], 'node');
    check(idPattern.test(n.id) && !ids.has(n.id), 'Invalid or duplicate node id'); ids.add(n.id);
    check(idPattern.test(n.role), 'Invalid node role'); text(n.title, 'node title', 160); text(n.acceptance, 'acceptance');
    integer(n.maxAttempts, 1, 5, 'maxAttempts');
    check(Array.isArray(n.dependsOn) && n.dependsOn.length <= 32 && new Set(n.dependsOn).size === n.dependsOn.length, 'Invalid dependencies');
    check(Array.isArray(n.outputs) && n.outputs.length > 0 && n.outputs.length <= 16, 'At least one output evidence path required'); n.outputs.forEach(relativePath); check(new Set(n.outputs).size === n.outputs.length, 'Duplicate output path');
    if (n.when) { fields(n.when, ['node', 'status'], 'condition'); check(n.dependsOn.includes(n.when.node) && ['succeeded', 'failed', 'timed_out'].includes(n.when.status), 'Condition must reference a direct dependency terminal result'); }
    const e = n.executor;
    fields(e, e?.kind === 'command' ? ['kind', 'command', 'args', 'cwd', 'timeoutMs'] : ['kind', 'allowedTools', 'maxToolCalls'], 'executor');
    check(['native', 'command'].includes(e.kind), 'Unsupported executor');
    if (e.kind === 'command') {
      text(e.command, 'command'); check(Array.isArray(e.args) && e.args.length <= 128 && e.args.every(a => typeof a === 'string' && !a.includes('\0') && a.length <= 16384), 'Invalid argv');
      if (e.cwd !== '.') relativePath(e.cwd); integer(e.timeoutMs, 1, 3600000, 'timeoutMs');
    } else {
      check(Array.isArray(e.allowedTools) && e.allowedTools.length > 0 && e.allowedTools.length <= 128 && e.allowedTools.every(t => typeof t === 'string' && /^[a-zA-Z0-9_.:-]+$/.test(t)), 'Exact native tools required');
      integer(e.maxToolCalls, 1, 10000, 'maxToolCalls');
    }
    const assets = combinations(n.assets);
    check(spec.assets.length + assets.length <= 24, 'Node context exceeds asset budget');
    spec.nodes.push({ ...n, assets });
  }
  check(spec.nodes.reduce((sum, n) => sum + n.maxAttempts, 0) <= input.maxAttemptsTotal, 'Total attempt budget must cover declared node attempts');
  const visited = new Set(), visiting = new Set();
  function visit(id) {
    check(ids.has(id), 'Unknown dependency'); check(!visiting.has(id), 'Workflow dependency cycle'); if (visited.has(id)) return;
    visiting.add(id); spec.nodes.find(n => n.id === id).dependsOn.forEach(visit); visiting.delete(id); visited.add(id);
  }
  spec.nodes.forEach(n => visit(n.id));
  const depends = (a, b) => a.dependsOn.includes(b.id) || a.dependsOn.some(id => depends(spec.nodes.find(n => n.id === id), b));
  for (let i = 0; i < spec.nodes.length; i++) for (let j = i + 1; j < spec.nodes.length; j++) {
    const a = spec.nodes[i], b = spec.nodes[j];
    if (!depends(a, b) && !depends(b, a)) check(!a.outputs.some(x => b.outputs.some(y => x === y || x.startsWith(y + '/') || y.startsWith(x + '/'))), 'Parallel nodes cannot share output ownership');
  }
  return structuredClone(spec);
}
export function nodeAssets(spec, node) {
  const map = new Map(spec.assets.map(a => [a.id, a])); node.assets.forEach(a => map.set(a.id, a)); return [...map.values()];
}
function assetSnapshot(root, id) {
  check(assetPattern.test(id), 'Invalid asset'); const [source, type, name] = id.split(':');
  if (source === 'local-custom') {
    const skill = managedSkill(root, id);
    return {id, version:skill.version, sha256:skill.entrySha256, metaSha256:skill.metaSha256, bundleSha256:skill.bundleSha256};
  }
  root = catalogRootFor(root);
  const dir = assertNoLinks(root, join(root, 'packs', type, name)), metaFile = assertNoLinks(root, join(dir, 'meta.json'));
  const file = assertNoLinks(root, join(dir, type === 'role' ? 'PROFILE.md' : 'SKILL.md'));
  const meta = read(metaFile); check(meta.type === type && meta.name === name && typeof meta.version === 'string', 'Asset identity mismatch');
  check(lstatSync(file).isFile() && lstatSync(file).size <= 1024 * 1024 && readFileSync(file, 'utf8').trim(), 'Invalid asset entry');
  return { id, version: meta.version, entry: file.slice(root.length + 1), sha256: hash(readFileSync(file)), metaSha256: hash(readFileSync(metaFile)), bundleSha256: skillBundle(dir).bundleSha256 };
}
function paths(root, id, create = false) {
  check(idPattern.test(id), 'Invalid workflow id'); root = realpathSync(root);
  const dir = assertNoLinks(root, join(root, 'runtime/workflows', id)); if (create) mkdirSync(dir, { recursive: true, mode: 0o700 });
  return { root, dir, file: assertNoLinks(root, join(dir, 'state.json')), lock: assertNoLinks(root, join(dir, 'state.lock')) };
}
function save(file, state) { const temp = file + '.' + randomUUID() + '.new'; try { writeFileSync(temp, JSON.stringify(state, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); renameSync(temp, file); } finally { rmSync(temp, { force: true }); } }
function load(file) { const s = read(file); check(s.schema === 'avc.workflow-run.v1' && hash(JSON.stringify(s.spec)) === s.specSha256, 'Workflow contract corrupted'); validateWorkflow(s.spec); return s; }
function change(root, id, fn, create = false) {
  const p = paths(root, id, create); try { mkdirSync(p.lock); } catch (e) { if (e.code === 'EEXIST') throw new Error('Workflow locked; retry without resetting state'); throw e; }
  try { const s = existsSync(p.file) ? load(p.file) : null, result = fn(s, p); if (result?.state) { result.state.updatedAt = stamp(); save(p.file, result.state); } return result?.value; }
  finally { rmSync(p.lock, { recursive: true }); }
}
function event(s, kind, detail = {}) { s.events.push({ at: stamp(), kind, ...detail }); }
function reconcile(s) {
  let updated = true;
  while (updated) {
    updated = false;
    for (const n of s.spec.nodes) {
      const state = s.nodes[n.id]; if (!['pending', 'ready'].includes(state.status)) continue;
      if (s.cancelRequested) { state.status = 'cancelled'; updated = true; continue; }
      const deps = n.dependsOn.map(id => s.nodes[id]); if (deps.some(d => !terminal.has(d.status))) continue;
      const next = n.when && s.nodes[n.when.node].status !== n.when.status ? 'skipped' :
        n.dependsOn.some(id => id !== n.when?.node && s.nodes[id].status !== 'succeeded') ? 'blocked' : 'ready';
      if (next !== state.status) { state.status = next; updated = true; }
    }
  }
  const states = Object.values(s.nodes).map(n => n.status);
  s.status = states.some(v => live.has(v)) ? (s.cancelRequested ? 'cancelling' : 'active') : states.includes('needs_attention') ? 'needs_attention' :
    s.cancelRequested ? 'cancelled' : states.some(v => ['ready', 'pending'].includes(v)) ? 'ready' :
    states.some(v => ['failed', 'blocked', 'timed_out'].includes(v)) ? 'completed_with_failures' : 'succeeded';
}
function checkSnapshots(root, s, node) {
  const ids = new Set([`general:role:${s.spec.owner}`, `general:role:${node.role}`, ...nodeAssets(s.spec, node).map(a => a.id)]);
  for (const id of ids) check(JSON.stringify(assetSnapshot(root, id)) === JSON.stringify(s.assets.find(a => a.id === id)), `Pinned workflow asset drift: ${id}`);
}
export function createWorkflow(root, input) {
  const spec = validateWorkflow(input), digest = hash(JSON.stringify(spec));
  return change(root, spec.id, (old, p) => {
    if (old) { check(old.specSha256 === digest, 'Workflow ID already has an immutable contract'); return { value: old }; }
    const ids = new Set([`general:role:${spec.owner}`, ...spec.nodes.flatMap(n => [`general:role:${n.role}`, ...nodeAssets(spec, n).map(a => a.id)])]);
    const s = { schema: 'avc.workflow-run.v1', spec, specSha256: digest, createdAt: stamp(), assets: [...ids].map(id => assetSnapshot(p.root, id)), attemptsUsed: 0, actualExecutor: 'platform agent', binding: 'unbound-until-native-node-claim', nodes: Object.fromEntries(spec.nodes.map(n => [n.id, { status: 'pending', attempts: [] }])), events: [] };
    reconcile(s); event(s, 'workflow_created'); return { state: s, value: s };
  }, true);
}
export function workflowStatus(root, id) {
  const p = paths(root, id), s = load(p.file); reconcile(s);
  // A crashed runner is not a successful node and never gets replayed automatically.
  for (const n of Object.values(s.nodes)) if (live.has(n.status) && n.attempts.at(-1)?.adapter === 'command') {
    try { process.kill(n.attempts.at(-1).ownerPid, 0); } catch (e) { if (e.code === 'ESRCH') { n.recordedStatus = n.status; n.status = 'needs_attention'; } }
  }
  reconcile(s); return s;
}
export function listWorkflows(root) {
  const dir = assertNoLinks(root, join(root, 'runtime/workflows')); if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(id => idPattern.test(id)).map(id => workflowStatus(root, id));
}
export function workflowNodeContract(root, id, nodeId) {
  const s = workflowStatus(root, id), node = s.spec.nodes.find(n => n.id === nodeId); check(node, 'Unknown workflow node'); checkSnapshots(realpathSync(root), s, node);
  return { workflowId: id, node, requiredAssets: nodeAssets(s.spec, node).map(a => a.id), specSha256: s.specSha256 };
}
function claim(root, id, nodeId, adapter, bindingId) {
  return change(root, id, s => {
    check(s, 'Workflow missing'); reconcile(s); const node = s.spec.nodes.find(n => n.id === nodeId), n = s.nodes[nodeId]; check(node && node.executor.kind === adapter, 'Wrong node executor');
    const previous = n.attempts.at(-1);
    if (adapter === 'native' && previous?.bindingId === bindingId && live.has(n.status)) { check(!s.cancelRequested, 'Workflow cancelled'); return { value: previous }; }
    check(!s.cancelRequested && n.status === 'ready', 'Workflow node is not ready');
    check(Object.values(s.nodes).filter(n => live.has(n.status)).length < s.spec.maxParallel, 'Workflow concurrency limit');
    check(n.attempts.length < node.maxAttempts && s.attemptsUsed < s.spec.maxAttemptsTotal, 'Workflow attempt budget exhausted');
    checkSnapshots(realpathSync(root), s, node);
    const attempt = { id: randomUUID(), number: n.attempts.length + 1, adapter, bindingId, ownerPid: adapter === 'command' ? process.pid : null, reservedAt: stamp(), status: 'reserved', contextDelivery: adapter === 'command' ? 'reference-only; command execution does not apply skill semantics' : 'pending-bound-load-asset', calls: [] };
    attempt.outputBaseline = Object.fromEntries(node.outputs.map(path => { const file = assertNoLinks(root, join(root, path)); return [path, existsSync(file) ? outputFingerprint(file) : null]; }));
    if (adapter === 'command') attempt.runId = 'wf-' + hash(id).slice(0, 16) + '-' + nodeId + '-' + attempt.number;
    n.attempts.push(attempt); n.status = 'reserved'; s.attemptsUsed++; reconcile(s); event(s, 'node_reserved', { nodeId, attemptId: attempt.id, adapter }); return { state: s, value: attempt };
  });
}
export function claimNativeNode(root, id, nodeId, executionTaskId) { return claim(root, id, nodeId, 'native', executionTaskId); }
export function assertNativeNode(root, ref, executionTaskId) {
  const s = workflowStatus(root, ref.workflowId), n = s.nodes[ref.nodeId], a = n?.attempts.at(-1);
  check(!s.cancelRequested && live.has(n?.status) && a?.bindingId === executionTaskId && a?.id === ref.attemptId, 'Native workflow node is not active or was cancelled');
  checkSnapshots(realpathSync(root), s, s.spec.nodes.find(n => n.id === ref.nodeId));
}
export function observeNativeNode(root, ref, executionTaskId, callId) {
  return change(root, ref.workflowId, s => {
    const n = s.nodes[ref.nodeId], a = n?.attempts.at(-1); check(a?.bindingId === executionTaskId && a.id === ref.attemptId && live.has(n.status), 'Native node binding mismatch or terminal node');
    if (!a.calls.includes(callId)) a.calls.push(callId); a.status = 'running'; n.status = 'running'; reconcile(s); return { state: s };
  });
}
function outputFingerprint(file) { const stat = lstatSync(file); check(stat.isFile(), 'Output evidence must be a real file'); return {sha256:hash(readFileSync(file)), mtimeMs:stat.mtimeMs, ctimeMs:stat.ctimeMs}; }
function artifacts(root, node, attempt) {
  return node.outputs.map(path => { const file = assertNoLinks(root, join(root, path)); const fingerprint = outputFingerprint(file); check(JSON.stringify(fingerprint) !== JSON.stringify(attempt.outputBaseline?.[path]), 'Output unchanged since node reservation'); return { path, sha256: fingerprint.sha256, bytes: lstatSync(file).size }; });
}
function finish(root, id, nodeId, attemptId, result) {
  return change(root, id, s => {
    const node = s.spec.nodes.find(n => n.id === nodeId), n = s.nodes[nodeId], a = n?.attempts.at(-1); check(a?.id === attemptId && live.has(n.status), 'Attempt no longer active');
    Object.assign(a, result, { finishedAt: stamp() }); n.status = result.status;
    if (!s.cancelRequested && ['failed', 'timed_out'].includes(n.status) && n.attempts.length < node.maxAttempts) n.status = 'ready';
    reconcile(s); event(s, 'node_finished', { nodeId, attemptId, status: a.status }); return { state: s, value: s };
  });
}
export function finishNativeNode(root, ref, task) {
  const s = workflowStatus(root, ref.workflowId), node = s.spec.nodes.find(n => n.id === ref.nodeId), attempt = s.nodes[ref.nodeId]?.attempts.at(-1);
  check(attempt?.bindingId === task.taskId && attempt.id === ref.attemptId, 'Native node binding mismatch');
  // Same closeout can be safely retried after a process failure between the two state writes.
  if (terminal.has(attempt.status)) return s;
  const calls = Object.values(task.calls); let status = s.cancelRequested ? 'cancelled' : task.integrity.status !== 'matched' || !calls.length || calls.some(c => c.status !== 'observed' || c.exitCode === 'unknown') ? 'needs_attention' : (calls.some(c => c.exitCode !== 0 || c.violation) || task.violations?.length) ? 'failed' : 'succeeded';
  let outputs = [], reason;
  try {
    checkSnapshots(realpathSync(root), s, node); outputs = artifacts(realpathSync(root), node, attempt);
    for (const output of outputs) check(task.artifacts.some(a => resolve(a.path) === resolve(root, output.path) && a.sha256 === output.sha256), 'Node output is not in native closeout evidence');
  } catch (e) { if (status === 'succeeded') status = 'failed'; reason = e.message; }
  return finish(root, ref.workflowId, ref.nodeId, ref.attemptId, { status, outputs, reason, nativeTaskId: task.taskId, contextDelivery: 'bound task asset receipts; semantic compliance unverified', observation: task.observation });
}
export function cancelWorkflow(root, id) {
  return change(root, id, s => { check(s, 'Workflow missing'); s.cancelRequested = true; reconcile(s); event(s, 'cancel_requested'); return { state: s, value: s }; });
}
async function executeCommand(root, id, node, attempt) {
  let poll, progress = Promise.resolve(), progressError;
  try {
    const task = { id: 'execute', command: node.executor.command, args: node.executor.args, cwd: node.executor.cwd, timeout_ms: node.executor.timeoutMs };
    const run = supervise({ id: attempt.runId, adapter: 'local_process', tasks: [task], max_concurrency: 1, poll_ms: 20, timeout_ms: node.executor.timeoutMs }, { root });
    const update = async () => {
      const s = workflowStatus(root, id); if (s.cancelRequested) { try { await cancelProcess(attempt.runId, { root }); } catch (e) { if (e.code !== 'ENOENT') throw e; } }
      let actual; try { actual = await processStatus(attempt.runId, { root }); } catch (e) { if (e.code === 'ENOENT') return; throw e; }
      if (actual.tasks[0]?.pid) change(root, id, current => { const n = current.nodes[node.id], a = n.attempts.at(-1); if (a.id === attempt.id && live.has(n.status)) { a.pid = actual.tasks[0].pid; a.startedAt = actual.tasks[0].started_at; a.status = n.status = 'running'; reconcile(current); return { state: current }; } });
    };
    poll = setInterval(() => { progress = progress.then(update).catch(error => { progressError ||= error; }); }, 50);
    const actual = await run; clearInterval(poll); await progress; if (progressError) throw progressError;
    let status = actual.status, outputs = [], reason = actual.reason;
    if (status === 'succeeded') try { checkSnapshots(root, workflowStatus(root, id), node); outputs = artifacts(root, node, attempt); } catch (e) { status = 'failed'; reason = e.message; }
    if (workflowStatus(root, id).cancelRequested) status = 'cancelled';
    finish(root, id, node.id, attempt.id, { status, outputs, reason, pid: actual.tasks[0]?.pid, exitCode: actual.tasks[0]?.exit_code, receipt: `runtime/supervision/${attempt.runId}/state.json` });
  } catch (error) {
    // Unknown runner termination must never trigger an automatic retry or dependent side effect.
    finish(root, id, node.id, attempt.id, { status: 'needs_attention', reason: error.message });
  } finally { clearInterval(poll); }
}
export async function runWorkflow(root, id, { authorized = false } = {}) {
  check(authorized === true, 'Explicit authorization to run the pinned command contract required'); root = realpathSync(root);
  const p = paths(root, id), runnerLock = assertNoLinks(root, join(p.dir, 'runner.lock'));
  try { mkdirSync(runnerLock); } catch (e) { if (e.code === 'EEXIST') throw new Error('Workflow runner already active or stale; inspect before recovery'); throw e; }
  const running = new Map();
  try {
    while (true) {
      const s = workflowStatus(root, id);
      if (s.cancelRequested) for (const n of Object.values(s.nodes)) { const a = n.attempts.at(-1); if (live.has(n.status) && a?.runId) try { await cancelProcess(a.runId, { root }); } catch (error) { if (error.code !== 'ENOENT') throw error; } }
      if (!s.cancelRequested) for (const node of s.spec.nodes) {
        if (node.executor.kind !== 'command' || s.nodes[node.id].status !== 'ready' || running.has(node.id)) continue;
        if (Object.values(workflowStatus(root, id).nodes).filter(n => live.has(n.status)).length >= s.spec.maxParallel) break;
        let a; try { a = claim(root, id, node.id, 'command'); } catch (error) {
          change(root, id, state => { state.nodes[node.id].status = 'blocked'; state.nodes[node.id].reason = error.message; reconcile(state); return { state }; }); continue;
        }
        const promise = executeCommand(root, id, node, a).finally(() => running.delete(node.id)); running.set(node.id, promise);
      }
      if (!running.size) return workflowStatus(root, id); // Native-ready nodes await their real client, not a synthetic agent.
      await Promise.race(running.values());
    }
  } finally { await Promise.allSettled(running.values()); rmSync(runnerLock, { recursive: true }); }
}
export function workflowTemplates(root) {
  root = catalogRootFor(root);
  const dir = assertNoLinks(root, join(root, 'packs/framework/company/workflows'));
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(file => validateWorkflow(read(assertNoLinks(root, join(dir, file)))));
}
