#!/usr/bin/env node
import {execFileSync} from 'node:child_process';

const endpoint = process.env.TED_REMOTE_MCP_URL?.trim();
const expectedSchema = 'ted.remote-mcp.release.v1';
const expectedProtocol = '2025-06-18';
const timeoutMs = Number(process.env.TED_REMOTE_MCP_CHECK_TIMEOUT_MS || 5000);
const requiredProxy = process.env.TED_REMOTE_MCP_PROXY_REQUIRED !== 'false';

function result(status, details = {}) {
  process.stdout.write(JSON.stringify({status, endpoint: endpoint || null, ...details}) + '\n');
}

if (!endpoint) {
  result('not-configured');
  process.exit(0);
}

let url;
try {
  url = new URL(endpoint);
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error('invalid');
} catch {
  result('invalid-configuration', {reason: 'TED_REMOTE_MCP_URL must be a canonical HTTPS origin or /mcp URL'});
  process.exit(2);
}

const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy || '';
const proxyConfigured = Boolean(proxy);
if (requiredProxy && !proxyConfigured) {
  result('not-checked', {reason: 'proxy-required'});
  process.exit(0);
}

const metadata = new URL('/.well-known/ted-mcp', url);
try {
  const seconds = String(Math.max(1, Math.ceil((Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 5000) / 1000)));
  const args = ['--silent', '--show-error', '--fail', '--max-redirs', '0', '--max-time', seconds, '--header', 'Accept: application/json', '--user-agent', 'ted-company-bootstrap/1'];
  if (proxyConfigured) args.push('--proxy', proxy);
  else args.push('--noproxy', '*');
  args.push(metadata.href);
  const raw = execFileSync('curl', args, {encoding: 'utf8', maxBuffer: 256 * 1024, stdio: ['ignore', 'pipe', 'ignore']});
  const value = JSON.parse(raw);
  if (value?.schema !== expectedSchema || value?.mcpProtocolVersion !== expectedProtocol || typeof value?.releaseVersion !== 'string') {
    result('incompatible', {reason: 'metadata-contract-mismatch'});
    process.exit(2);
  }
  const localRevision = process.env.TED_EXECUTION_LOCAL_REVISION?.trim();
  const remoteRevision = typeof value.sourceRevision === 'string' ? value.sourceRevision : null;
  result(localRevision && remoteRevision && localRevision !== remoteRevision ? 'revision-drift' : 'compatible', {
    releaseVersion: value.releaseVersion,
    sourceRevision: remoteRevision,
    localRevision: localRevision || null,
    capabilities: Array.isArray(value.capabilities) ? value.capabilities : []
  });
} catch (error) {
  result('unavailable', {reason: error?.name === 'TimeoutError' ? 'timeout' : 'request-failed'});
  process.exit(0);
}
