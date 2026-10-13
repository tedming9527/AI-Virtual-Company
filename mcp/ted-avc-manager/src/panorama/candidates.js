import { assertNoLinks } from '../core/scan.js';
import { compactDescription } from '../core/description.js';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

function publicOrigin(value) {
  if (!value || typeof value.revision !== 'string' || !value.revision.trim()) return null;
  try { const url = new URL(value.url); if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return null; return {url:url.href,revision:value.revision}; }
  catch { return null; }
}

export function repositoryOf(root) {
  try {
    const remote = execFileSync('git', ['-C', root, 'remote', 'get-url', 'origin'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    return remote.match(/github\.com[:/]([^/]+\/[^/]+?)(?:\.git)?$/)?.[1] || null;
  } catch { return null; }
}
export async function collectCandidates(repository, options = {}) {
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository || '')) throw new Error('需要明确 GitHub owner/repo');
  const request = options.request || (async path => {
    // Local CLI uses the already-configured GitHub client; CI uses its scoped token.
    if (!process.env.GITHUB_TOKEN && !process.env.CI) {
      try { return JSON.parse(execFileSync('gh', ['api', '--hostname', 'github.com', `repos/${repository}${path ? '/' + path : ''}`], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })); }
      catch (failure) { const error = new Error('GitHub CLI metadata request failed'); try { error.status = JSON.parse(failure.stdout).status; } catch {} throw error; }
    }
    const response = await fetch(`https://api.github.com/repos/${repository}${path ? '/' + path : ''}`, {
      headers: { Accept: 'application/vnd.github+json', ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}) },
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) { const error = new Error(`GitHub API ${response.status}`); error.status = response.status; throw error; }
    return response.json();
  });
  const info = await request('');
  if (info.private !== false) throw new Error('通用候选清单仅接受公开仓库');
  const prs = [];
  for (let page = 1; ; page++) {
    const batch = await request(`pulls?state=open&per_page=100&page=${page}`);
    prs.push(...batch); if (batch.length < 100) break;
  }
  const entries = [];
  for (const pr of prs) {
    const files = [];
    for (let page = 1; ; page++) {
      const batch = await request(`pulls/${pr.number}/files?per_page=100&page=${page}`);
      files.push(...batch); if (batch.length < 100) break;
    }
    const paths = [...new Set(files.flatMap(f => [f.filename, f.previous_filename].filter(Boolean)).map(f => f.match(/^packs\/(skill|knowledge|framework|role)\/([^/]+)\//)?.slice(1).join('/')).filter(Boolean))];
    if (!paths.length) continue;
    const changes = [];
    for (const path of paths) {
      const getMeta = async ref => {
        try {
          const file = await request(`contents/packs/${path}/meta.json?ref=${ref}`);
          return JSON.parse(Buffer.from(file.content, 'base64').toString('utf8'));
        } catch (e) { if (e.status === 404) return null; throw e; }
      };
      const base = await getMeta(pr.base.sha), head = await getMeta(pr.head.sha);
      changes.push({ type: path.split('/')[0], name: path.split('/')[1], displayName: head?.displayName || base?.displayName || path.split('/')[1],
        description: compactDescription((head || base)?.description),
        origin: publicOrigin((head || base)?.origin),
        baseVersion: base?.version || null, proposedVersion: head?.version || null, operation: !head ? 'remove' : !base ? 'add' : 'update' });
    }
    entries.push({ number: pr.number, title: pr.title, url: `https://github.com/${repository}/pull/${pr.number}`, draft: !!pr.draft, state: 'open', updatedAt: pr.updated_at, headSha: pr.head.sha, baseSha: pr.base.sha, changes });
  }
  return { schema: 'avc.public-pack-candidates.v1', repository, repositoryPublic: true, status: 'available', fetchedAt: new Date().toISOString(), entries };
}
export async function syncCandidates(root, options = {}) {
  const file = options.file || join(root, 'runtime', 'cache', 'pack-candidates.json');
  const repository = options.repository || repositoryOf(root);
  let result;
  try { result = await collectCandidates(repository, options); }
  catch (error) { result = { schema: 'avc.public-pack-candidates.v1', repository, status: 'unavailable', fetchedAt: new Date().toISOString(), error: error.message, entries: [] }; }
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(result, null, 2) + '\n');
  return result;
}
function locallyMergedCandidates(root, entries) {
  if (!entries.length) return [];
  let merges;
  try {
    merges = execFileSync('git', ['-C', root, 'log', '--first-parent', '--merges', '--format=%H%x00%P%x00%s', 'HEAD'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1024 * 1024 }).trim().split('\n');
  } catch { return []; }
  const matching = [];
  for (const entry of entries) {
    const merge = merges.map(line => line.split('\0')).find(([, parents, subject]) =>
      subject === `Merge pull request #${entry.number}` || subject?.startsWith(`Merge pull request #${entry.number} `));
    if (!merge) continue;
    const [sha, parents] = merge;
    const mergedHead = parents?.split(' ')[1];
    if (!mergedHead) continue;
    try {
      execFileSync('git', ['-C', root, 'merge-base', '--is-ancestor', entry.headSha, mergedHead],
        { stdio: 'ignore' });
      matching.push({ number: entry.number, mergeCommitSha: sha });
    } catch { /* A matching message without the candidate commit is insufficient evidence. */ }
  }
  return matching;
}
export function readCandidates(root, file = join(root, 'runtime', 'cache', 'pack-candidates.json')) {
  if (!existsSync(file)) return { status: 'not-synced', entries: [] };
  assertNoLinks(root,file);
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schema !== 'avc.public-pack-candidates.v1' || data.status !== 'available' || data.repositoryPublic !== true) return { status: 'unavailable', entries: [], fetchedAt: data.fetchedAt };
  if (data.repository !== repositoryOf(root)) return { status: 'repository-mismatch', entries: [] };
  const valid = data.entries.filter(p => Number.isInteger(p.number) && /^[a-f0-9]{40}$/.test(p.headSha || '') && /^[a-f0-9]{40}$/.test(p.baseSha || ''));
  const locallyMerged = locallyMergedCandidates(root, valid);
  const mergedNumbers = new Set(locallyMerged.map(p => p.number));
  return { schema: data.schema, repository: data.repository, repositoryPublic: true, status: 'available', fetchedAt: data.fetchedAt, locallyMerged,
    entries: valid.filter(p => !mergedNumbers.has(p.number)).map(p => ({ number: p.number, title: String(p.title),
      url: `https://github.com/${data.repository}/pull/${p.number}`, draft: !!p.draft, state: 'open', updatedAt: p.updatedAt, headSha: p.headSha, baseSha: p.baseSha,
      changes: p.changes.map(c => ({ type:c.type, name:String(c.name), displayName:String(c.displayName), description:compactDescription(c.description), origin:publicOrigin(c.origin), baseVersion:c.baseVersion, proposedVersion:c.proposedVersion, operation:c.operation })) })) };
}
