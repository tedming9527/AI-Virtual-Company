#!/usr/bin/env node
// Compatibility CLI for the package-owned supervisor implementation.
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { supervisorCli } from '../mcp/ted-avc-manager/src/core/supervisor-runtime.mjs';
export { supervise, status, cancel, validState } from '../mcp/ted-avc-manager/src/core/supervisor-runtime.mjs';

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  supervisorCli().catch(() => {
    console.error('supervisor request failed; check plan, paths, and run lock (commands/output omitted)');
    process.exitCode = 1;
  });
}
