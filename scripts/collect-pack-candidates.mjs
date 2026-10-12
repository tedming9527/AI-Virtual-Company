#!/usr/bin/env node
import { syncCandidates } from '../mcp/ted-avc-manager/src/panorama/candidates.js';
const result = await syncCandidates(process.cwd());
console.log(JSON.stringify({ status: result.status, count: result.entries.length, repository: result.repository, fetchedAt: result.fetchedAt }));
if (result.status !== 'available' && process.argv.includes('--strict')) process.exitCode = 1;
