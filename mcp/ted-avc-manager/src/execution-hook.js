#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { hookWarning } from './core/hook-warning.js';
try {
  const { runExecutionHook } = await import('./core/execution.js');
  const pos = process.argv.indexOf('--deployment');
  if (pos < 0 || !process.argv[pos + 1]) throw new Error('--deployment required');
  process.stdout.write(JSON.stringify(runExecutionHook(JSON.parse(readFileSync(0, 'utf8')), process.argv[pos + 1])) + '\n');
} catch (error) {
  process.stdout.write(JSON.stringify(hookWarning('execution', error.message)) + '\n');
}
