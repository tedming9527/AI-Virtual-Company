#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

// import.meta.dirname 需 Node >= 20.11；用 fileURLToPath 兼容 Node 18
const root = path.resolve(process.env.AI_VIRTUAL_COMPANY_ROOT || path.join(path.dirname(fileURLToPath(import.meta.url)), '..'));
const readJson = file => JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9-]*$/.test(value);

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

function checkCompany() {
  const registry = readJson('mcp/REGISTRY.json');
  if (registry.schema !== 'avc.mcp-registry.v1' || !Array.isArray(registry.entries)) return fail('INVALID MCP REGISTRY');
  const ids = new Set();
  for (const entry of registry.entries) {
    if (!safeId(entry.id) || ids.has(entry.id) || !entry.profile) return fail('INVALID MCP REGISTRY ENTRY');
    ids.add(entry.id);
    const profilePath = path.resolve(root, entry.profile);
    if (!profilePath.startsWith(root + path.sep) || !fs.existsSync(profilePath)) return fail('MISSING MCP PROFILE: ' + entry.id);
    const profile = JSON.parse(fs.readFileSync(profilePath, 'utf8'));
    if (profile.schema !== 'avc.mcp-profile.v1' || profile.id !== entry.id || !['stdio','streamable-http'].includes(profile.transport)) return fail('INVALID MCP PROFILE: ' + entry.id);
    if (!Array.isArray(profile.environment?.required_names) || !Array.isArray(profile.environment?.optional_names) || !Array.isArray(profile.verification)) return fail('INVALID MCP PROFILE FIELDS: ' + entry.id);
    const names = [...profile.environment.required_names, ...profile.environment.optional_names];
    if (names.some(name => !/^[A-Z][A-Z0-9_]*$/.test(name)) || profile.network?.mode === 'proxy-required' && profile.network.direct_fallback !== false) return fail('UNSAFE MCP PROFILE: ' + entry.id);
    const serialized = JSON.stringify(profile);
    if (/sk-[A-Za-z0-9]|api[_-]?key["']?\s*[:=]\s*["'][^"']+/i.test(serialized)) return fail('POSSIBLE SECRET IN MCP PROFILE: ' + entry.id);
  }
  for (const name of fs.readdirSync(path.join(root, 'mcp/bundles'))) {
    if (!name.endsWith('.json')) continue;
    const bundle = readJson('mcp/bundles/' + name);
    if (bundle.schema !== 'avc.mcp-bundle.v1' || !safeId(bundle.id)) return fail('INVALID MCP BUNDLE: ' + name);
    for (const id of [...(bundle.required || []), ...(bundle.recommended || [])]) if (!ids.has(id)) return fail('UNKNOWN MCP IN BUNDLE: ' + id);
  }
  if (!process.exitCode) console.log(`MCP governance checked: ${ids.size} profiles`);
}

function auditLocal() {
  const registry = readJson('mcp/REGISTRY.json');
  const configRoot = process.env.MCP_LAUNCH_CONFIG_ROOT || path.join(os.homedir(), '.config/mcp-launch');
  const rows = registry.entries.map(entry => {
    const overlay = path.join(configRoot, 'profiles', entry.id, 'launch');
    let overlayStatus = 'not-required';
    if (entry.profile && readJson(entry.profile).local_overlay_required) {
      try {
        const stat = fs.lstatSync(overlay);
        overlayStatus = stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o022) === 0 ? 'ready' : 'unsafe';
      } catch { overlayStatus = 'missing'; }
    }
    return { id: entry.id, classification: entry.classification, overlay: overlayStatus };
  });
  console.log(JSON.stringify({ schema: 'avc.mcp-local-audit.v1', rows }, null, 2));
  if (rows.some(row => row.classification === 'company-required' && row.overlay !== 'ready')) process.exitCode = 2;
}

const command = process.argv[2];
if (command === 'check-company') checkCompany();
else if (command === 'audit-local') auditLocal();
else {
  console.error('usage: mcp-governance.mjs <check-company|audit-local>');
  process.exitCode = 64;
}
