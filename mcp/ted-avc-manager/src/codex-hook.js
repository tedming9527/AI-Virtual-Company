#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { hookWarning } from './core/hook-warning.js';
try {
  const { runCodexHook } = await import('./core/codex-hooks.js');
  const pos = process.argv.indexOf('--deployment');
  if (pos < 0 || !process.argv[pos + 1]) throw new Error('--deployment required');
  console.log(JSON.stringify(runCodexHook(JSON.parse(readFileSync(0, 'utf8')), process.argv[pos + 1])));
} catch (error) {
  // Errors remain visibly unverified; never emit a success receipt.
  console.log(JSON.stringify(hookWarning('footer', error.message)));
}
