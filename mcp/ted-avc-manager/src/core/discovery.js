// Public metadata search only. No downloads, installation, account access or activation.
export function discoveryQueries({ zhQuery, enQuery, owners = ['openai', 'vercel-labs'] }) {
  if (typeof zhQuery !== 'string' || !/[\u3400-\u9fff]/u.test(zhQuery) || typeof enQuery !== 'string' || !/[a-z]/i.test(enQuery)) throw new Error('Provide both Chinese zhQuery and English enQuery');
  if ([zhQuery, enQuery].some(q => q.length > 240 || /[\r\n\0]/.test(q))) throw new Error('Use short public capability queries, not private task data');
  if (!Array.isArray(owners) || !owners.length || owners.length > 8 || owners.some(o => !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(o))) throw new Error('Specify 1..8 GitHub source owners');
  return [{ language: 'zh', query: zhQuery.trim() }, { language: 'en', query: enQuery.trim() }].map(q => ({ ...q, owners }));
}
export async function githubSearch(request, { fetchImpl = fetch } = {}) {
  const url = new URL('https://api.github.com/search/repositories');
  url.searchParams.set('q', request.query + ' ' + request.owners.map(o => 'user:' + o).join(' '));
  url.searchParams.set('per_page', '10');
  const response = await fetchImpl(url, { headers: { Accept: 'application/vnd.github+json' }, signal: AbortSignal.timeout(10000), redirect: 'error' });
  if (!response.ok) throw new Error('GitHub search HTTP ' + response.status);
  const body = await response.json();
  if (!Array.isArray(body.items)) throw new Error('Invalid search response');
  return { incomplete: body.incomplete_results === true, items: body.items.filter(item => request.owners.some(o => o.toLowerCase() === String(item.owner?.login).toLowerCase())).map(item => ({
    identity: item.full_name, url: item.html_url, description: item.description || '', source: 'github-repository', updatedAt: item.pushed_at, license: item.license?.spdx_id || 'unknown',
  })) };
}
export async function discoverCapabilities(input, { search = githubSearch } = {}) {
  const queries = discoveryQueries(input);
  const attempts = await Promise.all(queries.map(async request => {
    try { const result = await search(request); return { ...request, status: 'succeeded', incomplete: Boolean(result.incomplete), items: result.items }; }
    catch (error) { return { ...request, status: 'failed', error: String(error.message).slice(0, 400), items: [] }; }
  }));
  const unique = new Map();
  for (const attempt of attempts) for (const item of attempt.items) {
    if (!item.identity || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/?$/.test(item.url)) continue;
    const key = `${item.source}:${item.identity.toLowerCase()}`;
    if (!unique.has(key)) unique.set(key, { ...item, matchedQueries: [], status: 'discovered-unreviewed' });
    unique.get(key).matchedQueries.push({ language: attempt.language, query: attempt.query });
  }
  return { schema: 'avc.capability-discovery.v1', searchedAt: new Date().toISOString(), coverage: attempts.every(a => a.status === 'succeeded' && !a.incomplete) ? 'both-languages' : attempts.every(a => a.status === 'failed') ? 'unavailable' : 'partial',
    attempts: attempts.map(({ items, ...a }) => ({ ...a, resultCount: items.length })), candidates: [...unique.values()], evidence: 'public repository metadata; verify actual skill entry, pinned revision, license and behavior before reuse', installation: 'none' };
}
