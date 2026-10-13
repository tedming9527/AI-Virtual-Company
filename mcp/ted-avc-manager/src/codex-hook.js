#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { runCodexHook } from './core/codex-hooks.js';
try {
  const pos = process.argv.indexOf('--deployment');
  if (pos < 0 || !process.argv[pos + 1]) throw new Error('--deployment required');
  console.log(JSON.stringify(runCodexHook(JSON.parse(readFileSync(0, 'utf8')), process.argv[pos + 1])));
} catch (error) {
  // Errors remain visibly unverified; never emit a success receipt.
  console.error(`ted-avc-manager footer hook: ${error.message}`);
  process.exitCode = 1;
}
