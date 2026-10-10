#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const script = path.join(root, 'scripts/mcp-governance.mjs');

const company = spawnSync(process.execPath, [script, 'check-company'], { cwd: root, encoding: 'utf8' });
assert.equal(company.status, 0, company.stderr || company.stdout);
assert.match(company.stdout, /MCP governance checked: 5 profiles/);

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ted-mcp-governance-'));
try {
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
  assert.equal(result.schema, 'ted.mcp-local-audit.v1');
  assert.equal(result.rows.find(row => row.id === 'jev')?.overlay, 'ready');
} finally {
  fs.rmSync(temp, { recursive: true, force: true });
}

console.log('mcp-governance tests passed');
