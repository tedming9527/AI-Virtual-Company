import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { assertNoLinks } from '../core/scan.js';

const cacheName = 'mcp-connections.json';
const safeName = name => typeof name === 'string' && /^[\w. -]{1,100}$/.test(name);
const cacheFile = root => join(root, 'runtime', 'cache', cacheName);
const readJson = (root, file, fallback) => {
  if (!existsSync(file)) return fallback;
  const text = readFileSync(assertNoLinks(root, file), 'utf8');
  try { return JSON.parse(text); } catch { return fallback; }
};

export function configuredRemoteMcps(root, opts = {}) {
  let configured = opts.configured;
  if (!configured) {
    try { configured = JSON.parse(execFileSync('codex', ['mcp', 'list', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 })); }
    catch { return { status: 'unavailable', entries: [] }; }
  }
  const entries = configured.filter(item => item.transport?.type === 'streamable_http' && safeName(item.name)).flatMap(item => {
    try {
      const url = new URL(item.transport.url);
      if (url.protocol !== 'https:' || ['localhost','127.0.0.1','::1'].includes(url.hostname)) return [];
      return [{ name: item.name, origin: url.origin, enabled: item.enabled === true, authStatus: item.auth_status || 'unknown' }];
    } catch { return []; }
  });
  return { status: 'available', entries };
}

export function remoteMcpOverview(root, opts = {}) {
  const configured = configuredRemoteMcps(root, opts);
  const checks = readJson(root, cacheFile(root), { entries: {} }).entries || {};
  const quality = readJson(root, join(root, 'runtime', 'cache', 'mcp-quality.json'), { entries: {} }).entries || {};
  return { status: configured.status, entries: configured.entries.map(item => ({ ...item,
    purpose: opts.purposes?.[item.name] || '用途待补充',
    connection: checks[item.name]?.origin === item.origin ? { status: checks[item.name].status, checkedAt: checks[item.name].checkedAt } : { status: 'not-checked', checkedAt: null },
    quality: quality[item.name]?.origin === item.origin && /^https:\/\//.test(quality[item.name].source || '') && Number.isFinite(Date.parse(quality[item.name].checkedAt)) ? quality[item.name] : null,
  })) };
}

export async function checkRemoteMcp(root, name, opts = {}) {
  const configured = opts.configured || JSON.parse(execFileSync('codex', ['mcp', 'list', '--json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], timeout: 10000 }));
  const item = configured.find(entry => entry.name === name && entry.transport?.type === 'streamable_http');
  if (!item || !safeName(name)) throw new Error('未找到指定的网上 MCP');
  const url = new URL(item.transport.url);
  if (url.protocol !== 'https:' || ['localhost','127.0.0.1','::1'].includes(url.hostname) || url.username || url.password || !item.enabled) throw new Error('仅检查已启用的网上 HTTPS MCP');
  const request = opts.request || fetch;
  let status = 'unreachable';
  try {
    const response = await request(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', 'mcp-protocol-version': '2025-06-18' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'ted-avc-manager-panorama', version: '1.3.0' } } }), signal: AbortSignal.timeout(8000) });
    if (response.status === 401 || response.status === 403) status = 'auth-required';
    else if (!response.ok) status = 'server-error';
    else {
      const contentType = response.headers?.get('content-type') || '';
      const reader = response.body?.getReader();
      let body = '', size = 0;
      if (reader) {
        while (size < 16384) {
          const chunk = await reader.read();
          if (chunk.done) break;
          size += chunk.value.byteLength;
          body += new TextDecoder().decode(chunk.value);
          if (body.includes('\n\n') && contentType.includes('text/event-stream')) break;
        }
        await reader.cancel();
      }
      let packet = null;
      try { packet = JSON.parse(contentType.includes('text/event-stream') ? body.match(/^data:\s*(.+)$/m)?.[1] || '' : body); } catch { /* HTTP response is not a verified MCP handshake. */ }
      status = packet?.jsonrpc === '2.0' && packet.id === 1 && packet.result?.protocolVersion ? 'handshake-response' : 'http-response';
    }
  } catch { status = 'unreachable'; }
  const record = { origin: url.origin, status, checkedAt: new Date().toISOString() };
  const file = cacheFile(root), data = readJson(root, file, { schema: 'avc.mcp-connections.v1', entries: {} });
  data.entries ||= {};
  data.entries[name] = record;
  mkdirSync(join(root, 'runtime', 'cache'), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  return { name, ...record };
}

export async function updateRemoteMcpQuality(root, name, repository, packageName, opts = {}) {
  if (!safeName(name) || !/^[\w.-]+\/[\w.-]+$/.test(repository || '')) throw new Error('需要 MCP 名称和明确的 GitHub owner/repo');
  if (packageName && !/^(?:@[-\w.]+\/)?[-\w.]+$/.test(packageName)) throw new Error('npm 包名无效');
  const configured = configuredRemoteMcps(root, opts);
  const item = configured.entries.find(entry => entry.name === name);
  if (!item) throw new Error('该网上 MCP 不在客户端配置中');
  const request = opts.request || fetch;
  const get = async url => {
    try {
      const response = await request(url, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(5000) });
      return response.ok ? await response.json() : null;
    } catch { return null; }
  };
  const github = await get(`https://api.github.com/repos/${repository}`);
  if (github?.full_name?.toLowerCase() !== repository.toLowerCase() || github.private) throw new Error('无法核验公开 GitHub 仓库，未保存质量快照');
  const [advisories, scorecard, npm, downloads] = await Promise.all([
    opts.deep ? get(`https://api.github.com/repos/${repository}/security-advisories?per_page=100`) : Promise.resolve(null),
    opts.deep ? get(`https://api.scorecard.dev/projects/github.com/${repository}`) : Promise.resolve(null),
    packageName ? get(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/latest`) : Promise.resolve(null),
    packageName ? get(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(packageName)}`) : Promise.resolve(null),
  ]);
  const record = { origin: item.origin, repository: github.html_url, association:'user-declared', maintainedAt: github.pushed_at || null,
    ...(Number.isInteger(github.stargazers_count) ? { stars:github.stargazers_count } : {}),
    ...(Array.isArray(advisories) ? { advisories: advisories.length } : {}),
    ...(typeof scorecard?.score === 'number' ? { scorecard: scorecard.score } : {}),
    ...(npm?.name === packageName ? { package: `${npm.name}@${npm.version}` } : {}),
    ...(downloads?.package === packageName && Number.isInteger(downloads.downloads) ? { weeklyDownloads:downloads.downloads } : {}),
    source: github.html_url, checkedAt: new Date().toISOString() };
  const file = join(root, 'runtime', 'cache', 'mcp-quality.json');
  const data = readJson(root, file, { schema: 'avc.mcp-quality.v1', entries: {} });
  data.entries ||= {};
  data.entries[name] = record;
  mkdirSync(join(root, 'runtime', 'cache'), { recursive: true });
  writeFileSync(file, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
  return { name, ...record };
}
