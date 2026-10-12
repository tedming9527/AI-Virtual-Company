#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const script = path.join(root, 'scripts/mcp-governance.mjs');
const profileCount = JSON.parse(fs.readFileSync(path.join(root, 'mcp/REGISTRY.json'), 'utf8')).entries.length;

const company = spawnSync(process.execPath, [script, 'check-company'], { cwd: root, encoding: 'utf8' });
assert.equal(company.status, 0, company.stderr || company.stdout);
assert.match(company.stdout, new RegExp(`MCP governance checked: ${profileCount} profiles`));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ted-mcp-governance-'));
try {
  const detached = spawnSync(process.execPath, [script, 'check-company'], {
    cwd: temp,
    env: { ...process.env, AI_VIRTUAL_COMPANY_ROOT: '' },
    encoding: 'utf8'
  });
  assert.equal(detached.status, 0, detached.stderr || detached.stdout);
  assert.match(detached.stdout, new RegExp(`MCP governance checked: ${profileCount} profiles`));

  const overlayDir = path.join(temp, 'profiles/jev');
  fs.mkdirSync(overlayDir, { recursive: true, mode: 0o700 });
  const overlay = path.join(overlayDir, 'launch');
  fs.writeFileSync(overlay, '#!/bin/sh\nexit 0\n', { mode: 0o700 });
  const audit = spawnSync(process.execPath, [script, 'audit-local'], {
    cwd: root,
    env: { ...process.env, MCP_LAUNCH_CONFIG_ROOT: temp },
    encoding: 'utf8'
  });
  assert.equal(audit.status, 0, audit.stderr || audit.stdout);
  const result = JSON.parse(audit.stdout);
  assert.equal(result.schema, 'avc.mcp-local-audit.v1');
  assert.equal(result.rows.find(row => row.id === 'jev')?.overlay, 'ready');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('mcp-governance tests passed');
