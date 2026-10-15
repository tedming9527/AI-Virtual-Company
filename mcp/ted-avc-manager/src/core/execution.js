import { deliverContext, documentView, CONTEXT_LIMITS } from './context-budget.js';
// Project-scoped native execution receipts. This is not a hosted model gateway.
import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync, realpathSync, lstatSync, renameSync, rmSync, readdirSync } from 'node:fs';
import { resolve, join, sep, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { readHookDeployment } from './codex-hooks.js';
import { clientStateRoot, catalogRootFor, verifyDistributedFile, catalogVersionFor } from './client-state.js';
import { hookProject, captureNative, readNativeTurn, sessionWorkspaces } from './session-ingress.js';
import { hookWarning } from './hook-warning.js';
import { resolvePersonalStorage } from './storage.js';
import { refreshInventory, recordObservedRead, listAssets } from './awareness.js';
import { endMaintenance, runMaintenanceHook } from './maintenance.js';
import { diagnosticCall, isDiagnosticCall } from './maintenance-diagnostics.js';
import { skillBundle } from './local-assets.js';
import { taskTrialContext, trialStatus } from '../governance/candidate-trials.js';
import { workflowNodeContract, claimNativeNode, assertNativeNode, observeNativeNode, finishNativeNode } from './workflow.js';

const engineVersion = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(readFileSync(file, 'utf8'));
const quote = value => "'" + value.replaceAll("'", "'\\''") + "'";
const now = () => new Date().toISOString();
const owns = (value, key) => Object.prototype.hasOwnProperty.call(value, key);
const MCP_TOOL = /^mcp__(?:ted_avc_manager|ted-avc-manager|pack_manager|pack-manager)__(list_packs|find_skill|find_skills|list_assets|recommend_assets|workflow_status|workflow_templates|check_update|ted_help|ted_update|ted_scores|ted_doctor|ted_repair|ted_status|ted_summary|load_asset|task_begin|task_closeout)$/;
function identifier(value, name) {
  if (typeof value !== 'string' || !value.trim() || value.length > 512 || /[\r\n\0]/.test(value)) throw new Error(`Invalid ${name}`);
  return value;
}
function safePath(root, path, create = false) {
  const base = realpathSync(root), target = resolve(path);
  if (target !== base && !target.startsWith(base + sep)) throw new Error('Path escapes allowed root');
  let cursor = base;
  for (const part of relative(base, target).split(sep).filter(Boolean)) {
    cursor = join(cursor, part);
    if (existsSync(cursor)) {
      if (lstatSync(cursor).isSymbolicLink()) throw new Error('Refusing symlink');
    } else if (create) {
      try { mkdirSync(cursor); } catch (error) { if (error.code !== 'EEXIST') throw error; }
      // A concurrent creator is fine only when it produced a real directory.
      const created=lstatSync(cursor);
      if (created.isSymbolicLink()) throw new Error('Refusing symlink');
      if (!created.isDirectory()) throw new Error('Expected directory');
    }
  }
  return target;
}
function deployment(root, file) {
  const canonical = resolve(root), config = readHookDeployment(file);
  const project = config.projects.find(item => item.root === canonical);
  if (!project?.execution?.enabled) throw new Error('Execution adapter disabled or project unbound');
  const settings = project.execution;
  if (!['monitor', 'enforce'].includes(settings.mode)) throw new Error('execution.mode must be monitor or enforce');
  if (!Array.isArray(settings.bootstrapTools) || settings.bootstrapTools.some(tool => !MCP_TOOL.test(tool) || tool.endsWith('__task_closeout'))) throw new Error('bootstrapTools must explicitly name ted-avc-manager introspection/load/task_begin tools');
  if (!Number.isInteger(settings.maxToolCalls) || settings.maxToolCalls < 1 || settings.maxToolCalls > 10000) throw new Error('execution.maxToolCalls must be 1..10000');
  if (settings.allowedTools !== undefined && (!Array.isArray(settings.allowedTools) || settings.allowedTools.some(tool => typeof tool !== 'string' || !/^[a-zA-Z0-9_.:-]+$/.test(tool)))) throw new Error('execution.allowedTools must list exact native tool names');
  if (settings.requiredAssets !== undefined && (!Array.isArray(settings.requiredAssets) || settings.requiredAssets.some(id => typeof id !== 'string' || !/^(general:(skill|knowledge|framework|role)|local-custom:skill):[a-z0-9][a-z0-9-]*$/.test(id)))) throw new Error('execution.requiredAssets must list canonical asset identities');
  return { project, settings, stateRoot: clientStateRoot(project), root: canonical, clientScope: config.scope === 'client', catalogVersion: catalogVersionFor(canonical) };
}
function binding(root, input, stateRoot = root, clientScope = false) {
  identifier(input.sessionId, 'sessionId'); identifier(input.turnId, 'turnId'); identifier(input.receipt, 'receipt');
  if (clientScope) {
    const turn = readNativeTurn(stateRoot, input);
    return { sessionId: input.sessionId, turnId: input.turnId, receipt: input.receipt, sessionChainId: turn.sessionChainId || input.sessionId, agentId: input.agentId ?? null, workspace: turn.workspace, taskId: sha(JSON.stringify([root, input.sessionId, input.turnId, input.agentId ?? '', input.receipt])) };
  }
  const file = safePath(stateRoot, join(stateRoot, 'runtime/hooks/sessions', sha(input.sessionId) + '.json'));
  const receipt = existsSync(file) && read(file).turns?.[input.turnId]?.receipt;
  if (!receipt || receipt !== input.receipt) throw new Error('Native session/turn receipt mismatch');
  return { sessionId: input.sessionId, turnId: input.turnId, receipt: input.receipt, taskId: sha(JSON.stringify([root, input.sessionId, input.turnId, input.receipt])) };
}
function files(root, taskId) {
  const base = safePath(root, join(root, 'runtime/execution'), true);
  const directory = safePath(root, join(base, 'tasks'), true);
  return { task: safePath(root, join(directory, `${taskId}.json`)), lock: safePath(root, join(directory, `${taskId}.lock`)), audit: safePath(root, join(base, 'events.jsonl')) };
}
function atomic(file, value) {
  const temporary = `${file}.${randomBytes(6).toString('hex')}.new`;
  try { writeFileSync(temporary, JSON.stringify(value, null, 2) + '\n', { mode: 0o600, flag: 'wx' }); renameSync(temporary, file); }
  finally { rmSync(temporary, { force: true }); }
}
function locked(root, taskId, fn) {
  const paths = files(root, taskId);
  // Different real events in the same turn can run concurrently. Serialize their
  // metadata writes briefly; never retry the business tool or steal an old lock.
  const deadline = Date.now() + 1000;
  while (true) {
    try { mkdirSync(paths.lock); break; }
    catch (error) {
      if (error.code !== 'EEXIST') throw error;
      if (Date.now() >= deadline) throw new Error('Task locked by another operation; bounded verification wait expired');
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10);
    }
  }
  try { return fn(paths); } finally { rmSync(paths.lock, { recursive: true }); }
}
function record(paths, task, event, extra = {}) {
  appendFileSync(paths.audit, JSON.stringify({ at: now(), taskId: task.taskId, sessionId: task.sessionId, turnId: task.turnId, engineVersion, catalogVersion: task.catalogVersion, event, ...extra }) + '\n', { mode: 0o600 });
}
function pinnedCatalog(root) {
  root = catalogRootFor(root);
  const rows = [];
  for (const type of ['skill', 'knowledge', 'framework', 'role']) {
    const directory = safePath(root, join(root, 'packs', type));
    if (!existsSync(directory)) continue;
    for (const name of readdirSync(directory).sort()) {
      const file = safePath(root, join(directory, name, 'meta.json'));
      if (existsSync(file)) rows.push({ type, name, sha256: sha(readFileSync(file)) });
    }
  }
  return sha(JSON.stringify(rows));
}
function active(paths, key) {
  if (!existsSync(paths.task)) throw new Error('task_begin required');
  const task = read(paths.task);
  if (task.receipt !== key.receipt || task.sessionId !== key.sessionId || task.turnId !== key.turnId) throw new Error('Task/native binding mismatch');
  if (task.status !== 'active') throw new Error(`Task is ${task.status}`);
  return task;
}
function registeredFingerprint(base, directory) {
  const entrySha256 = sha(readFileSync(safePath(base, join(directory, 'SKILL.md'))));
  const metaSha256 = sha(readFileSync(safePath(base, join(directory, 'meta.json'))));
  return { entrySha256, metaSha256, bundleSha256: skillBundle(directory).bundleSha256, sha256: sha(entrySha256 + ':' + metaSha256) };
}
function registrationMatches(record, fingerprint) {
  return (typeof record.bundleSha256 === 'string' && record.bundleSha256 === fingerprint.bundleSha256) && record.sha256 === fingerprint.sha256 && (!record.entrySha256 || record.entrySha256 === fingerprint.entrySha256) && (!record.metaSha256 || record.metaSha256 === fingerprint.metaSha256);
}
function integrity(root, task, catalogVersion) {
  const issues = [];
  try {
    const meta = safePath(catalogRootFor(root), join(catalogRootFor(root), 'packs/role', task.role.id, 'meta.json'));
    const profile = safePath(catalogRootFor(root), join(catalogRootFor(root), 'packs/role', task.role.id, 'PROFILE.md'));
    if (task.catalogVersion !== catalogVersion || task.catalogSha256 !== pinnedCatalog(root) || task.role.metaSha256 !== sha(readFileSync(meta)) || task.role.profileSha256 !== sha(readFileSync(profile))) issues.push('Pinned catalog/role drift; begin a new native turn');
  } catch (error) { issues.push(`Pinned role verification unavailable: ${error.message}`); }
  for (const asset of task.assets) {
    try {
      let base = catalogRootFor(root);
      if (asset.source === 'local-custom') {
        const personal = resolvePersonalStorage(root, read(join(catalogRootFor(root), 'bootstrap.json')));
        base = safePath(personal.root, join(personal.root, 'projects', personal.slug, 'custom'));
        const registry = read(safePath(root, join(root, 'runtime/skill-registry.json'))).entries;
        const matching = registry.filter(item => item.source === 'local-custom' && item.name === asset.name && item.dir === resolve(asset.file, '..'));
        if (matching.length !== 1 || matching[0].version !== asset.version || matching[0].sha256 !== asset.registrationSha256 || !registrationMatches(matching[0], registeredFingerprint(base, matching[0].dir))) issues.push('Loaded personal registration drift');
      }
      if (sha(readFileSync(safePath(base, asset.file))) !== asset.sha256 || sha(readFileSync(safePath(base, asset.metaFile))) !== asset.metaSha256) issues.push('Loaded asset digest drift');
    } catch (error) { issues.push(`Loaded asset verification unavailable: ${error.message}`); }
  }
  return { status: issues.length ? 'invalidated' : 'matched', issues };
}
function deliverRole(root, key, profile) {
  try {
    const delivery = deliverContext(root, key, 'role:' + sha(profile), profile);
    return { roleProfile: delivery.content, contextBudget: delivery.budget, contextDelivery: delivery.status,
      roleProfileComplete: delivery.status === 'delivered', actualCompliance: 'unknown' };
  } catch (error) { return { roleProfile: '', contextDelivery: 'unverified', warning: error.message, taskContinues: true }; }
}
export function beginTask(root, input, deploymentFile) {
  const d = deployment(root, deploymentFile), key = binding(d.root, input, d.stateRoot, d.clientScope);
  if (!d.project.roles.includes(input.role)) throw new Error('Role not allowed by deployment');
  identifier(input.goal, 'goal');
  if (!Array.isArray(input.allowedTools) || !input.allowedTools.length || input.allowedTools.length > 128 || input.allowedTools.some(tool => typeof tool !== 'string' || !/^[a-zA-Z0-9_.:-]+$/.test(tool))) throw new Error('allowedTools must be exact native tool names, without wildcards');
  if (!Number.isInteger(input.maxToolCalls) || input.maxToolCalls < 1 || input.maxToolCalls > d.settings.maxToolCalls) throw new Error('Task budget exceeds configured maxToolCalls');
  const metaFile = safePath(catalogRootFor(d.root), join(catalogRootFor(d.root), 'packs/role', input.role, 'meta.json'));
  const profileFile = safePath(catalogRootFor(d.root), join(catalogRootFor(d.root), 'packs/role', input.role, 'PROFILE.md'));
  verifyDistributedFile(d.root, metaFile); verifyDistributedFile(d.root, profileFile);
  const meta = read(metaFile), profile = readFileSync(profileFile, 'utf8');
  if (!profile.trim()) throw new Error('Role PROFILE is empty');
  if (d.settings.allowedTools && input.allowedTools.some(tool => !d.settings.allowedTools.includes(tool))) throw new Error('Task tool outside deployment-approved tool set');
  if (input.requiredAssets !== undefined && !Array.isArray(input.requiredAssets)) throw new Error('requiredAssets must be an array');
  let workflow;
  if (input.workflowId !== undefined || input.nodeId !== undefined) {
    workflow = workflowNodeContract(d.root, input.workflowId, input.nodeId);
    if (workflow.node.executor.kind !== 'native' || workflow.node.role !== input.role) throw new Error('Workflow node requires its declared native role');
    if (input.maxToolCalls > workflow.node.executor.maxToolCalls || input.allowedTools.some(t => !workflow.node.executor.allowedTools.includes(t))) throw new Error('Task exceeds workflow node tool contract');
  }
  const requiredAssets = [...new Set([...(d.settings.requiredAssets || []), ...(input.requiredAssets || []), ...(workflow?.requiredAssets || [])])].sort();
  if (requiredAssets.some(id=>!/^general:(skill|knowledge|framework|role):[a-z0-9][a-z0-9-]*$/.test(id) && !/^local-custom:skill:[a-z0-9][a-z0-9-]*$/.test(id))) throw new Error('Invalid required asset identity');
  if (input.candidateTaskKey !== undefined) identifier(input.candidateTaskKey, 'candidateTaskKey');
  const contract = { ...(input.candidateTaskKey ? {candidateTaskKey:input.candidateTaskKey} : {}), role: input.role, goal: input.goal, allowedTools: [...new Set(input.allowedTools)].sort(), maxToolCalls: input.maxToolCalls, requiredAssets, ...(workflow ? { workflow: { workflowId: input.workflowId, nodeId: input.nodeId, specSha256: workflow.specSha256 } } : {}) };
  return locked(d.stateRoot, key.taskId, paths => {
    if (existsSync(paths.task)) {
      const existing = active(paths, key);
      if (JSON.stringify(existing.contract) !== JSON.stringify(contract)) throw new Error('Task contract already pinned; cannot expand in the same turn');
      if (existing.role.profileSha256 !== sha(profile) || existing.role.metaSha256 !== sha(readFileSync(metaFile)) || existing.catalogSha256 !== pinnedCatalog(d.root) || existing.catalogVersion !== d.catalogVersion) throw new Error('Pinned assets changed; begin a new native turn');
      endMaintenance(d.root, input, deploymentFile, existing.taskId);
      return { ...existing, candidateTrials: taskTrialContext(d.root, contract.candidateTaskKey || key.taskId, input.goal), ...deliverRole(d.stateRoot, key, profile) };
    }
    const task = { schema: 'avc.execution-task.v1', ...key, projectRoot: d.root, engineVersion, catalogVersion: d.catalogVersion, catalogSha256: pinnedCatalog(d.root), mode: d.settings.mode, status: 'active', startedAt: now(), contract,
      role: { id: input.role, displayName: meta.displayName, version: meta.version, metaSha256: sha(readFileSync(metaFile)), profileSha256: sha(profile) }, actualExecutor: 'platform agent', calls: {}, assets: [], violations: [] };
    if (workflow) {
      const attempt = claimNativeNode(d.root, input.workflowId, input.nodeId, key.taskId);
      task.workflow = { ...contract.workflow, attemptId: attempt.id };
    }
    atomic(paths.task, task); record(paths, task, 'task_started', { roleId: input.role, mode: task.mode, roleProfileSha256: task.role.profileSha256 });
    endMaintenance(d.root, input, deploymentFile, task.taskId);
    return { ...task, candidateTrials: taskTrialContext(d.root, contract.candidateTaskKey || key.taskId, input.goal), ...deliverRole(d.stateRoot, key, profile) };
  });
}
export function loadAsset(root, input, deploymentFile) {
  const d = deployment(root, deploymentFile), key = binding(d.root, input, d.stateRoot, d.clientScope);
  if (!['general', 'local-custom'].includes(input.source)) throw new Error('Asset source must be general or registered local-custom');
  if (!['skill', 'knowledge', 'framework', 'role'].includes(input.type) || !/^[a-z0-9][a-z0-9-]*$/.test(input.name || '')) throw new Error('Invalid asset identity');
  const entry = input.entry || (input.type === 'role' ? 'PROFILE.md' : 'SKILL.md');
  if (typeof entry !== 'string' || !entry.endsWith('.md') || isAbsolute(entry) || /[\0\r\n]/.test(entry) || entry.split(/[\\/]/).some(part => !part || part === '.' || part === '..')) throw new Error('Only a safe pack-relative document may be loaded');
  let directory, registryEntry;
  if (input.source === 'general') directory = safePath(catalogRootFor(d.root), join(catalogRootFor(d.root), 'packs', input.type, input.name));
  else {
    if (input.type !== 'skill') throw new Error('Only explicitly registered personal skills can be loaded');
    const personal = resolvePersonalStorage(d.root, read(join(catalogRootFor(d.root), 'bootstrap.json')));
    const custom = safePath(personal.root, join(personal.root, 'projects', personal.slug, 'custom'));
    const registryFile = safePath(d.root, join(d.root, 'runtime/skill-registry.json'));
    const entries = existsSync(registryFile) ? read(registryFile).entries : [];
    const matches = entries.filter(item => item.source === 'local-custom' && item.name === input.name);
    if (matches.length !== 1) throw new Error('Personal skill must have one explicit registration');
    registryEntry = matches[0]; directory = safePath(custom, registryEntry.dir);
    if (!registrationMatches(registryEntry, registeredFingerprint(custom, directory))) throw new Error('Registered personal skill changed or legacy digest unverified; register reviewed content again');
  }
  const file = safePath(input.source === 'general' ? catalogRootFor(d.root) : directory, join(directory, entry));
  if (!lstatSync(file).isFile() || lstatSync(file).size > 1024 * 1024) throw new Error('Asset must be a file no larger than 1 MiB');
  if (input.source === 'general') { verifyDistributedFile(d.root, file); verifyDistributedFile(d.root, join(directory, 'meta.json')); }
  const content = readFileSync(file, 'utf8');
  if (!content.trim() || Buffer.byteLength(content) > 1024 * 1024) throw new Error('Asset empty or exceeds 1 MiB');
  const meta = read(safePath(input.source === 'general' ? catalogRootFor(d.root) : directory, join(directory, 'meta.json')));
  if (meta.type !== input.type || meta.name !== input.name) throw new Error('Asset metadata/identity mismatch');
  if (registryEntry && meta.version !== registryEntry.version) throw new Error('Registered personal skill version changed');
  const asset = { source: input.source, type: input.type, name: input.name, entry, version: meta.version, sha256: sha(content),
    bundleSha256: skillBundle(directory).bundleSha256, ...(registryEntry ? { registrationSha256: registryEntry.sha256 } : {}) };
  const view = documentView(content, input);
  return locked(d.stateRoot, key.taskId, paths => {
    const task = active(paths, key);
    let delivery;
    try { delivery = deliverContext(d.stateRoot, key, `asset:${asset.source}:${asset.type}:${asset.name}:${entry}:${asset.sha256}:${view.mode}:${view.startByte ?? 0}:${view.endByte ?? Buffer.byteLength(view.content)}`, JSON.stringify(view)); }
    catch (error) { return { ...asset, content: '', contextDelivery: 'unverified', warning: error.message, taskContinues: true }; }
    if (delivery.status !== 'delivered') return { ...asset, content: '', mode: view.mode, nextCursor: delivery.status === 'already-delivered' ? view.nextCursor : (input.cursor || { sha256: asset.sha256, offset: 0 }), contextDelivery: delivery.status, contextBudget: delivery.budget, taskContinues: true };
    const prior = task.assets.find(a => a.file === file && a.sha256 === asset.sha256);
    const evidence = { mode: view.mode, startByte: view.startByte, endByte: view.endByte };
    if (prior) (prior.deliveries ||= []).push(evidence);
    else task.assets.push({ ...asset, file, metaFile: join(directory, 'meta.json'), metaSha256: sha(readFileSync(join(directory, 'meta.json'))), loadedAt: now(), complete: false, deliveries: [evidence] });
    const loaded = prior || task.assets.at(-1);
    let through = 0;
    for (const range of loaded.deliveries.filter(r => r.mode === 'chunk').sort((a,b) => a.startByte - b.startByte)) {
      if (range.startByte > through) break;
      through = Math.max(through, range.endByte);
    }
    loaded.complete = through === Buffer.byteLength(content);
    atomic(paths.task, task); record(paths, task, 'asset_context_returned', { ...asset, mode: view.mode, complete: loaded.complete });
    return { ...asset, ...view, contentSha256: sha(view.content), documentComplete: loaded.complete, contextBudget: delivery.budget, contextDelivery: 'delivered', actualCompliance: 'unknown' };
  });
}
export function closeTask(root, input, deploymentFile) {
  const d = deployment(root, deploymentFile), key = binding(d.root, input, d.stateRoot, d.clientScope);
  return locked(d.stateRoot, key.taskId, paths => {
    const task = active(paths, key);
    for (const item of input.unknownCalls || []) {
      identifier(item.reason, 'unknown reason');
      if (!task.calls[item.toolUseId] || task.calls[item.toolUseId].status !== 'reserved') throw new Error('Only reserved, unobserved calls can be classified unknown');
      task.calls[item.toolUseId].status = 'unknown'; task.calls[item.toolUseId].unknownReason = item.reason;
    }
    if (Object.values(task.calls).some(call => call.status === 'reserved')) throw new Error('Unobserved reservations require explicit unknownCalls classification');
    if (!Array.isArray(input.artifacts) || !input.artifacts.length) throw new Error('At least one actual output artifact required');
    const bootstrap = read(join(catalogRootFor(d.root), 'bootstrap.json')), personal = resolvePersonalStorage(d.root, bootstrap);
    const deliverables = join(personal.root, 'projects', personal.slug, 'deliverables');
    const workspaces = d.clientScope ? sessionWorkspaces(d.stateRoot, input.sessionId).map(w => w.workspaceRoot) : [d.root];
    const artifacts = input.artifacts.map(item => {
      const requested = resolve(key.workspace?.root || d.root, item.path);
      const base = [...workspaces, deliverables].filter(root => requested === root || requested.startsWith(root + sep)).sort((a,b) => b.length-a.length)[0];
      if (!base) throw Error('Output evidence outside observed session workspaces/deliverables');
      const file = safePath(base, requested);
      if (!lstatSync(file).isFile()) throw new Error('Output evidence must be a real file');
      const digest = sha(readFileSync(file));
      if (item.sha256 && item.sha256 !== digest) throw new Error('Output artifact SHA mismatch');
      return { path: file, sha256: digest, bytes: lstatSync(file).size };
    });
    task.projects = sessionWorkspaces(d.stateRoot, input.sessionId).filter(w => w.projectRoot && artifacts.some(a=>a.path===w.projectRoot || a.path.startsWith(w.projectRoot+sep))).map(w => w.projectRoot).filter((p,i,a) => a.indexOf(p)===i);
    task.projectEvidence = 'artifact-location within observed session workspaces; change semantics require separate evidence';
    try { task.candidateTrials = trialStatus(d.root, task.contract.candidateTaskKey || task.taskId); } catch (error) { task.candidateTrials = {status:'unavailable',warning:error.message,taskContinues:true}; }
    task.status = 'closed'; task.closedAt = now(); task.artifacts = artifacts;
    task.integrity = integrity(d.root, task, d.catalogVersion);
    task.observation = { reservedCalls: Object.keys(task.calls).length, observedCalls: Object.values(task.calls).filter(call => call.status === 'observed').length, unknownCalls: Object.values(task.calls).filter(call => call.status === 'unknown').length, violations: task.violations.length, modelTokens: 'unknown', modelCost: 'unknown', scope: 'Native hooks observed only; user can disable adapter; no hosted gateway or full supervision claim' };
    if (task.workflow) finishNativeNode(d.root, task.workflow, task);
    atomic(paths.task, task); record(paths, task, 'task_closed', { integrity: task.integrity, observation: task.observation, artifactSha256: artifacts.map(item => item.sha256) });
    return task;
  });
}
function denial(mode, reason) {
  return mode === 'enforce' ? { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: `ted-avc-manager: ${reason}` } } : hookWarning('monitor', reason);
}
function executeHook(input, deploymentFile, options = {}) {
  const config = readHookDeployment(deploymentFile), cwd = input.cwd || '';
  const p = hookProject(config, input);
  if (!p?.execution?.enabled || (!options.contextOnly && !['UserPromptSubmit', 'PreToolUse', 'PostToolUse'].includes(input.hook_event_name))) return {};
  const d = deployment(p.root, deploymentFile);
  const attachment = d.clientScope ? captureNative(input, deploymentFile) : null;
  // Inventory discovery is auxiliary and cannot erase a captured native event.
  try { refreshInventory(d.root); } catch {}
  if (!options.contextOnly && ['PreToolUse','PostToolUse'].includes(input.hook_event_name)) recordObservedRead(d.root,input);
  identifier(input.session_id, 'native session_id'); identifier(input.turn_id, 'native turn_id');
  const receiptFile = safePath(d.stateRoot, join(d.stateRoot, 'runtime/hooks/sessions', sha(input.session_id) + '.json'));
  const receipt = attachment?.turn?.receipt ?? (existsSync(receiptFile) && read(receiptFile).turns?.[input.turn_id]?.receipt);
  if (!receipt) {
    if (input.hook_event_name === 'PreToolUse') return denial(d.settings.mode, 'Native footer receipt missing; no task binding established');
    throw new Error('Native footer receipt missing; run footer adapter first');
  }
  const key = binding(d.root, { sessionId: input.session_id, turnId: input.turn_id, agentId: input.agent_id, receipt }, d.stateRoot, d.clientScope);
  if (input.hook_event_name === 'UserPromptSubmit' || options.contextOnly) {
    return { hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext:
      `Ted execution adapter engine v${engineVersion}; catalog v${d.catalogVersion}; mode=${d.settings.mode}. Native binding sessionId=${JSON.stringify(input.session_id)}, turnId=${JSON.stringify(input.turn_id)}, agentId=${JSON.stringify(input.agent_id ?? '')}, receipt=${JSON.stringify(receipt)}.
Route one task with task_begin using this exact binding, one allowed role, goal, exact native tool names (shell: Bash), maxToolCalls <= ${d.settings.maxToolCalls}; include task_closeout. Contract does not grant permissions. Actual executor: platform agent.
Collection failures only warn; continue authorized work. Preserve native permissions and independent maintenance restrictions. Diagnostics ted_help/update/scores/doctor/repair/status/summary do not require file delivery. task_begin returns role PROFILE and optional candidateTrials; private candidate trials need explicit choice and source-bound evidence.
Discover relevant metadata via recommend_assets/list_assets; no automatic inventory bodies. load_asset defaults to extractive preview; use mode=chunk and digest-bound nextCursor for full evidence. Summaries are not full adoption. Adapter UTF-8 budgets: response ${CONTEXT_LIMITS.responseBytes}, turn ${CONTEXT_LIMITS.turnBytes}, session ${CONTEXT_LIMITS.sessionBytes}; not model tokens. Budget exhaustion withholds optional context, never business execution. ted summary gives optimization advice without clearing host context.
Before closeout query ted_status for pending calls, classify only still-reserved calls lacking completion unknown. Use real file artifacts; no output means closeout unverified. Footer/receipt never proves full supervision. Across resume retain this turn binding; never reuse another turn's receipt.` } };
  }
  identifier(input.tool_name, 'tool_name'); identifier(input.tool_use_id, 'tool_use_id');
  return locked(d.stateRoot, key.taskId, paths => {
    if (!existsSync(paths.task)) {
      if (input.hook_event_name === 'PreToolUse' && d.settings.bootstrapTools.includes(input.tool_name)) return {};
      const task = { ...key, catalogVersion: d.catalogVersion };
      record(paths, task, 'unbound_tool_observed', { tool: input.tool_name, toolUseId: input.tool_use_id, nativeEvent: input.hook_event_name });
      if (d.settings.mode === 'monitor') {
        // Missing optional routing is a normal state, not a collection failure.
        // Keep this internal marker out of legacy native JSON output.
        return Object.defineProperty({ hookSpecificOutput: { hookEventName: input.hook_event_name,
          additionalContext: 'Ted 事件已采集；任务待关联。尚未登记 task_begin，未声明角色路由、契约验证或署名通过；当前已授权任务照常推进。' } },
        '_tedTask', { value: { status: 'pending', verified: false } });
      }
      return input.hook_event_name === 'PreToolUse' ? denial(d.settings.mode, 'task_begin required before this tool') : {};
    }
    const task = read(paths.task);
    if (input.hook_event_name === 'PostToolUse') {
      const call = task.calls[input.tool_use_id];
      if (!call || call.tool !== input.tool_name) { record(paths, task, 'unmatched_post_tool', { tool: input.tool_name, toolUseId: input.tool_use_id }); return {}; }
      if (call.status !== 'reserved') { record(paths, task, 'post_tool_replayed', { tool: input.tool_name, toolUseId: input.tool_use_id }); return {}; }
      const responseField = owns(input, 'tool_response') ? 'tool_response' : owns(input, 'tool_result') ? 'tool_result' : null;
      call.status = responseField ? 'observed' : 'unknown'; call.completedAt = now();
      if (responseField) call.responseSha256 = sha(JSON.stringify(input[responseField]));
      const response = responseField && input[responseField];
      call.exitCode = owns(input, 'exit_code') && Number.isInteger(input.exit_code) ? input.exit_code : response && typeof response === 'object' && Number.isInteger(response.exit_code) ? response.exit_code : 'unknown';
      if (!responseField) call.unknownReason = 'PostToolUse exposed no response field';
      if (task.workflow) observeNativeNode(d.root, task.workflow, task.taskId, input.tool_use_id);
      atomic(paths.task, task); record(paths, task, 'tool_completion_observed', { toolUseId: input.tool_use_id, tool: call.tool, status: call.status, responseSha256: call.responseSha256, exitCode: call.exitCode });
      return {};
    }
    const reasons = [];
    const control = MCP_TOOL.test(input.tool_name) && /__(task_closeout|load_asset)$/.test(input.tool_name);
    if (task.status !== 'active') reasons.push(`Task is ${task.status}`);
    if (!control) reasons.push(...integrity(d.root, task, d.catalogVersion).issues);
    if (!control && task.workflow) try { assertNativeNode(d.root, task.workflow, task.taskId); } catch (error) { reasons.push(error.message); }
    if (!control) for (const id of task.contract.requiredAssets || []) {
      if (id === `general:role:${task.role.id}`) continue; // beginTask already returned this exact PROFILE.
      if (!task.assets.some(a=>`${a.source}:${a.type}:${a.name}`===id && a.entry===(a.type==='role'?'PROFILE.md':'SKILL.md') && a.complete === true)) reasons.push(`Required asset body not delivered: ${id}`);
    }
    if (!task.contract.allowedTools.includes(input.tool_name)) reasons.push('Tool outside exact task allowlist');
    const prior = task.calls[input.tool_use_id];
    const inputSha256 = sha(JSON.stringify(input.tool_input ?? null));
    if (prior && (prior.tool !== input.tool_name || prior.inputSha256 !== inputSha256)) reasons.push('tool_use_id reused for a different call');
    if (prior && prior.status !== 'reserved') reasons.push('Completed tool_use_id cannot execute again');
    if (!prior && !control && Object.keys(task.calls).length >= task.contract.maxToolCalls) reasons.push('Task tool-call budget exhausted');
    if (reasons.length) {
      const reason = reasons.join('; '); task.violations.push({ at: now(), tool: input.tool_name, toolUseId: input.tool_use_id, reason });
      if (d.settings.mode === 'enforce') { atomic(paths.task, task); record(paths, task, 'tool_denied', { tool: input.tool_name, toolUseId: input.tool_use_id, reason }); return denial(d.settings.mode, reason); }
      record(paths, task, 'tool_violation_monitored', { tool: input.tool_name, toolUseId: input.tool_use_id, reason });
    }
    if (!prior && !control) task.calls[input.tool_use_id] = { tool: input.tool_name, inputSha256, status: 'reserved', admittedAt: now(), violation: reasons.length > 0 };
    atomic(paths.task, task); record(paths, task, control ? 'management_control_admitted' : prior ? 'tool_reservation_replayed' : 'tool_reserved', { tool: input.tool_name, toolUseId: input.tool_use_id });
    return {}; // No permissionDecision=allow: preserve native approval/sandbox policy.
  });
}
export function runExecutionHook(input, deploymentFile, options = {}) {
  try {
    if (isDiagnosticCall(input, deploymentFile)) return input.hook_event_name === 'PostToolUse' ? {} : { systemMessage: 'Read-only maintenance self-check; no task binding claimed. Native permissions still apply.' };
    let maintenance;
    try { maintenance = runMaintenanceHook(input, deploymentFile); }
    catch (error) { if (error.maintenance || read(deploymentFile).scope !== 'client') throw error; }
    return maintenance ?? executeHook(input, deploymentFile, options);
  }
  catch (error) {
    if (input?.hook_event_name !== 'PreToolUse') return hookWarning('execution', error.message);
    if (error.maintenance) return denial('enforce', `Maintenance verification unavailable: ${error.message}`);
    // Collection/storage exceptions are not evidence of a forbidden operation.
    // Explicit contract denials above remain separate from this diagnostic path.
    return hookWarning('execution', `Native verification unavailable: ${error.message}`);
  }
}
export function installExecutionHooks(deploymentFile, codexHome) {
  if (existsSync(join(resolve(codexHome), 'ted-avc-manager', 'manifest.json'))) throw new Error('Managed client: use scripts/client_environment.py rebuild; partial hook replacement is disabled');
  const configFile = realpathSync(resolve(deploymentFile)), config = readHookDeployment(configFile);
  for (const project of config.projects) if (project.execution?.enabled) deployment(project.root, configFile);
  const home = resolve(codexHome); mkdirSync(home, { recursive: true });
  const file = safePath(home, join(home, 'hooks.json'));
  const document = existsSync(file) ? read(file) : { hooks: {} }; document.hooks ??= {};
  const entry = fileURLToPath(new URL('../execution-hook.js', import.meta.url));
  const suffix = ` --deployment ${quote(configFile)}`, command = `${quote(process.execPath)} ${quote(entry)} --ted-avc-manager-execution${suffix}`;
  for (const event of ['UserPromptSubmit', 'PreToolUse', 'PostToolUse']) {
    document.hooks[event] = (document.hooks[event] || []).map(group => ({ ...group, hooks: group.hooks.filter(hook => !(hook.command?.includes('/src/execution-hook.js') && hook.command.includes('--ted-avc-manager-execution'))) })).filter(group => group.hooks.length);
    document.hooks[event].push({ hooks: [{ type: 'command', command, timeout: 10, statusMessage: `ted-avc-manager v${engineVersion}: ${event === 'PreToolUse' ? 'Check task tool contract' : event === 'PostToolUse' ? 'Observe tool result' : 'Load execution contract'}`, ...(event === 'UserPromptSubmit' ? { additionalContextLimit: 12288 } : {}) }] });
  }
  atomic(file, document);
  return { engineVersion, file, events: ['UserPromptSubmit', 'PreToolUse', 'PostToolUse'], command, trust: 'Review native hook trust separately; this installer never grants trust', activation: 'Place footer UserPromptSubmit before execution UserPromptSubmit; restart/reload then verify native receipts' };
}
