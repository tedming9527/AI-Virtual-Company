// Native Codex adapter. Instance identities and paths stay in deployment config.
import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync, lstatSync, appendFileSync } from 'node:fs';
import { resolve, dirname, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomBytes } from 'node:crypto';
import { weeklyStatus } from '../governance/weekly.js';
import { clientStateRoot, catalogRootFor } from './client-state.js';
import { hookWarning } from './hook-warning.js';

const version = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url))).version;
const hash = text => createHash('sha256').update(text).digest('hex');
const quote = text => "'" + text.replaceAll("'", "'\\''") + "'";
const json = file => JSON.parse(readFileSync(file, 'utf8'));

function text(value, label) {
  if (typeof value !== 'string' || !value.trim() || /[\r\n；]/.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}

export function readHookDeployment(file) {
  const c = json(file);
  text(c.organization, 'organization');
  if (!Array.isArray(c.projects) || !c.projects.length) throw new Error('projects required');
  for (const p of c.projects) {
    p.root = realpathSync(resolve(p.root));
    if (!Array.isArray(p.roles) || !p.roles.length) throw new Error('allowed role IDs required');
    p.owners = {};
    for (const role of p.roles) {
      if (!/^[a-z][a-z0-9-]*$/.test(role)) throw new Error('Invalid role ID');
      const meta = json(join(catalogRootFor(p.root), 'packs', 'role', role, 'meta.json'));
      if (meta.type !== 'role' || meta.name !== role || !/[\u4e00-\u9fff]/.test(meta.nameZh ?? '') || !/[\u4e00-\u9fff]/.test(meta.professionZh ?? '') || meta.displayName !== `${meta.nameZh}·${meta.professionZh}`) throw new Error(`Role ${role} requires canonical Chinese name + profession`);
      p.owners[role] = text(meta.displayName, 'owner display');
    }
  }
  return c;
}

export function installCodexHooks(deploymentFile, codexHome) {
  if (existsSync(join(resolve(codexHome), 'ted-avc-manager', 'manifest.json'))) throw new Error('Managed client: use scripts/client_environment.py rebuild; partial hook replacement is disabled');
  const config = realpathSync(resolve(deploymentFile));
  readHookDeployment(config);
  const home = resolve(codexHome);
  mkdirSync(home, { recursive: true });
  const file = join(home, 'hooks.json');
  if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new Error('Refusing hooks.json symlink');
  const entry = fileURLToPath(new URL('../codex-hook.js', import.meta.url));
  const suffix = ` --deployment ${quote(config)}`;
  const command = `${quote(process.execPath)} ${quote(entry)} --ted-avc-manager-footer${suffix}`;
  const document = existsSync(file) ? json(file) : { hooks: {} };
  document.hooks ??= {};
  for (const event of ['SessionStart', 'UserPromptSubmit', 'Stop']) {
    const groups = document.hooks[event] ?? [];
    // Replace all owned definitions, including stale deployment paths; preserve other adapters.
    document.hooks[event] = groups.map(g => ({ ...g, hooks: g.hooks.filter(h => !(h.command?.includes('/src/codex-hook.js') && h.command.includes('--ted-avc-manager-footer'))) })).filter(g => g.hooks.length);
    document.hooks[event].push({ ...(event === 'SessionStart' ? { matcher: 'startup|resume|clear|compact' } : {}), hooks: [{
      type: 'command', command, timeout: 10,
      statusMessage: `ted-avc-manager v${version}: ${event === 'Stop' ? 'Verify delivery footer' : 'Load delivery attribution'}`,
      ...(event !== 'Stop' ? { additionalContextLimit: 1500 } : {}),
    }] });
  }
  writeFileSync(file, JSON.stringify(document, null, 2) + '\n', { mode: 0o600 });
  return { version, file, command, events: ['SessionStart', 'UserPromptSubmit', 'Stop'], trust: 'Review exact definitions in Codex /hooks; installation does not grant trust', activation: 'Native runtime acceptance still required' };
}

function safeDirectory(root, directory) {
  const realRoot = realpathSync(root);
  if (!directory.startsWith(realRoot + sep)) throw new Error('Hook receipt directory escapes project root');
  let cursor = realRoot;
  for (const part of directory.slice(realRoot.length + 1).split(sep)) {
    cursor = join(cursor, part);
    if (existsSync(cursor)) {
      if (lstatSync(cursor).isSymbolicLink() || !lstatSync(cursor).isDirectory()) throw new Error('Refusing hook receipt directory symlink/non-directory');
    } else mkdirSync(cursor);
  }
}

export function runCodexHook(input, deploymentFile) {
  try { return collectCodexHook(input, deploymentFile); }
  catch (error) { return hookWarning('footer', error.message); }
}

function collectCodexHook(input, deploymentFile) {
  const c = readHookDeployment(deploymentFile);
  const cwd = realpathSync(resolve(input.cwd));
  const project = c.projects.find(p => cwd === p.root || cwd.startsWith(p.root + sep));
  if (!project) return {}; // No claims about unbound projects.
  if (!['SessionStart', 'UserPromptSubmit', 'Stop'].includes(input.hook_event_name)) return {};
  text(input.session_id, 'session_id');
  const release = json(join(project.root, 'bootstrap.json')).version;
  if (release !== version) throw new Error(`Hook/package v${version} differs from project v${release}`);
  const stateRoot = clientStateRoot(project);
  const base = join(stateRoot, 'runtime', 'hooks');
  const stateDir = join(base, 'sessions');
  safeDirectory(stateRoot, stateDir);
  const stateFile = join(stateDir, hash(input.session_id) + '.json');
  const auditFile = join(base, 'events.jsonl');
  for (const file of [stateFile, auditFile]) if (existsSync(file) && lstatSync(file).isSymbolicLink()) throw new Error('Refusing hook receipt symlink');
  let state = existsSync(stateFile) ? json(stateFile) : { turns: {} };
  const record = (status, extra = {}) => appendFileSync(auditFile, JSON.stringify({
    at: new Date().toISOString(), event: input.hook_event_name,
    sessionId: input.session_id, turnId: input.turn_id ?? null, version, status, ...extra,
  }) + '\n', { mode: 0o600 });
  if (input.hook_event_name === 'SessionStart') {
    // Resume/compact can run after UserPromptSubmit. Never issue a competing
    // delivery instruction or mutate a turn nonce at session scope.
    record('session_context_injected', { receiptScope: 'session', turnReceiptIssued: false });
    let weekly = '';
    if (existsSync(join(project.root, 'runtime', 'storage.json'))) {
      try {
        const status = weeklyStatus(project.root);
        if (status.due && status.writerAvailable) weekly = ' Weekly governance is due: after binding the user turn, dispatch one background subagent to run governance-weekly-prepare, review private experience and sources within the user-authorized scope, then submit a source-bound proposal through governance-weekly-complete. Do not mark complete from this hook or publish/delete assets.';
      } catch { weekly = ' Weekly governance status unavailable; do not claim a completed run.'; }
    }
    return { hookSpecificOutput: { hookEventName: 'SessionStart', additionalContext:
      `ted-avc-manager native delivery adapter v${version} is scoped to this configured project. Allowed logical owners: ${Object.entries(project.owners).map(([role, display]) => `${role}: ${display}`).join('; ')}. Actual executor is the platform agent. SessionStart supplies project context only and does not issue a delivery receipt. For the final footer and execution binding use the exact current-turn UserPromptSubmit context; preserve it across resume/compact. Never use a session-scoped or another turn's receipt. The footer alone does not prove supervision.${weekly}` } };
  }
  text(input.turn_id, 'turn_id');
  const turn = input.turn_id;
  // Older adapters stored a nonce without the issuing release. Recover only
  // the matching native prompt audit; do not substitute the current release.
  const issuedVersion = pending => {
    if (pending?.deliveryVersion) return pending.deliveryVersion;
    if (pending && existsSync(auditFile)) {
      for (const line of readFileSync(auditFile, 'utf8').trim().split('\n').reverse()) {
        if (!line) continue;
        const event = JSON.parse(line);
        if (event.event === 'UserPromptSubmit' && event.status === 'context_injected' && event.sessionId === input.session_id && event.turnId === turn && event.receipt === pending.receipt) return event.deliveryVersion ?? event.version;
      }
    }
    return version;
  };
  const footer = (owner, receipt, deliveryVersion) => `以上内容由 ${c.organization} 提供；发布版本：v${deliveryVersion}；任务主责：${owner}；实际执行者：platform agent；Hook 回执：${receipt}`;
  if (input.hook_event_name === 'UserPromptSubmit') {
    // Reuse both the nonce and issuing version during a Stop continuation.
    state.turns[turn] ??= { receipt: randomBytes(6).toString('hex'), deliveryVersion: version };
    const pending = state.turns[turn];
    pending.deliveryVersion = issuedVersion(pending);
    writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
    const options = Object.entries(project.owners).map(([role, display]) => `${role}: ${footer(display, pending.receipt, pending.deliveryVersion)}`).join('\n');
    record('context_injected', { receipt: pending.receipt, deliveryVersion: pending.deliveryVersion, receiptScope: 'turn' });
    return { hookSpecificOutput: { hookEventName: input.hook_event_name, additionalContext:
      `ted-avc-manager native delivery adapter v${version} is scoped to this configured project. Route the current task to one allowed role before execution. Use canonical Chinese name + profession from the professional package for public role display; keep role IDs for internal routing. The following footer belongs exclusively to sessionId=${JSON.stringify(input.session_id)}, turnId=${JSON.stringify(turn)}; SessionStart does not replace it. In the final response choose the corresponding exact footer below and put it at the end (before a required memory citation block). Display names denote logical role ownership, never authenticated employee execution. Actual executor is the platform agent. The footer/receipt alone does not prove supervision or protected mediation. Do not use the footer for unrelated projects.\n${options}` } };
  }
  const pending = state.turns[turn];
  const deliveryVersion = issuedVersion(pending);
  const message = input.last_assistant_message ?? '';
  // Required application memory citations may follow the visible delivery footer.
  const visible = message.replace(/\s*<oai-mem-citation>[\s\S]*<\/oai-mem-citation>\s*$/, '').trimEnd();
  const selected = pending && Object.entries(project.owners).find(([, display]) => visible.endsWith(footer(display, pending.receipt, deliveryVersion)));
  if (selected) {
    record('footer_verified', { receipt: pending.receipt, deliveryVersion, owner: selected[0], messageSha256: hash(message) });
    return {};
  }
  record('footer_unverified', { receipt: pending?.receipt ?? null, repairRequired: true });
  return hookWarning('footer', 'Delivery footer missing or invalid; no mediation acceptance claim');
}
