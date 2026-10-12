#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { runExecutionHook } from './core/execution.js';
try {
  const pos = process.argv.indexOf('--deployment');
  if (pos < 0 || !process.argv[pos + 1]) throw new Error('--deployment required');
  process.stdout.write(JSON.stringify(runExecutionHook(JSON.parse(readFileSync(0, 'utf8')), process.argv[pos + 1])) + '\n');
} catch (error) {
  process.stderr.write(`ted-avc-manager execution hook: ${error.message}\n`);
  process.exitCode = 1;
}
