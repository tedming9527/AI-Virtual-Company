import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { readBootstrap, scanPacks, assertNoLinks } from '../core/scan.js';
import { releasedIdentity } from './ratings.js';

const outputFile = root => assertNoLinks(root, join(root, 'panorama', 'source-quality.json'));
const sameOrigin = (record, pack) => record?.identity === releasedIdentity(pack) && record.origin?.url === pack.origin?.url && record.origin?.revision === pack.origin?.revision;

export function readSourceQuality(root, packs, catalogVersion) {
  const file = outputFile(root);
  if (!existsSync(file)) return {};
  const data = JSON.parse(readFileSync(file, 'utf8'));
  if (data.schema !== 'avc.source-quality.v1' || data.catalogVersion !== catalogVersion) return {};
  return Object.fromEntries(packs.filter(p => p.origin).flatMap(p => {
    const record = data.entries?.[releasedIdentity(p)];
    return sameOrigin(record, p) ? [[releasedIdentity(p), record]] : [];
  }));
}

export function validateSourceQuality(root) {
  const bootstrap = readBootstrap(root), packs = scanPacks(root).packs.filter(p => p.origin);
  if (!packs.length) return { valid:true, count:0 };
  const file = outputFile(root);
  if (!existsSync(file)) return { valid:false, count:0, errors:['第三方包缺少发布质量快照'] };
  const data = JSON.parse(readFileSync(file, 'utf8'));
  const errors = [];
  if (data.schema !== 'avc.source-quality.v1' || data.catalogVersion !== bootstrap.version) errors.push('快照目录版本不匹配');
  for (const pack of packs) if (!sameOrigin(data.entries?.[releasedIdentity(pack)], pack)) errors.push(`${pack.type}/${pack.name} 来源或版本与快照不匹配`);
  return { valid:errors.length===0, count:packs.length, errors };
}

export async function buildSourceQuality(root, opts = {}) {
  const bootstrap = readBootstrap(root), { packs, errors } = scanPacks(root);
  if (errors.length) throw new Error(errors.join('; '));
  const request = opts.request || fetch;
  const get = async url => {
    try { const response = await request(url, { headers:{ accept:'application/json' }, signal:AbortSignal.timeout(5000) }); return response.ok ? await response.json() : null; }
    catch { return null; }
  };
  const entries = {}, external = packs.filter(p => p.origin);
  let cursor = 0;
  const worker = async () => { while (cursor < external.length) {
    const pack = external[cursor++];
    const identity = releasedIdentity(pack), origin = pack.origin;
    const record = { identity, origin:{ url:origin.url, revision:origin.revision }, checkedAt:new Date().toISOString(), status:'unavailable', evidence:[] };
    if (origin.repository) {
      const repo = await get(`https://api.github.com/repos/${origin.repository}`);
      if (repo?.full_name?.toLowerCase() === origin.repository.toLowerCase() && repo.private === false) {
        record.status = 'partial';
        record.evidence.push({ kind:'repository', value:repo.html_url, source:repo.html_url });
        if (Number.isInteger(repo.stargazers_count) && repo.stargazers_count >= 0) record.evidence.push({ kind:'stars', value:repo.stargazers_count, source:repo.html_url });
        if (repo.pushed_at) record.evidence.push({ kind:'maintainedAt', value:repo.pushed_at, source:repo.html_url });
        if (opts.deep) {
          const [scorecard, advisories] = await Promise.all([
            get(`https://api.scorecard.dev/projects/github.com/${origin.repository}`),
            get(`https://api.github.com/repos/${origin.repository}/security-advisories?per_page=100`),
          ]);
          if (typeof scorecard?.score === 'number') record.evidence.push({ kind:'scorecard', value:scorecard.score, source:`https://scorecard.dev/viewer/?uri=github.com/${origin.repository}` });
          if (Array.isArray(advisories)) record.evidence.push({ kind:'advisories', value:advisories.length, source:`https://github.com/${origin.repository}/security/advisories` });
        }
      }
    }
    if (origin.npm) {
      const [pkg, downloads] = await Promise.all([
        get(`https://registry.npmjs.org/${encodeURIComponent(origin.npm)}/latest`),
        get(`https://api.npmjs.org/downloads/point/last-week/${encodeURIComponent(origin.npm)}`),
      ]);
      if (pkg?.name === origin.npm && typeof pkg.version === 'string') {
        record.status = 'partial';
        record.evidence.push({ kind:'npm', value:`${pkg.name}@${pkg.version}`, source:`https://www.npmjs.com/package/${encodeURIComponent(origin.npm)}` });
      }
      if (downloads?.package === origin.npm && Number.isInteger(downloads.downloads) && downloads.downloads >= 0) {
        record.status = 'partial';
        record.evidence.push({ kind:'npmWeeklyDownloads', value:downloads.downloads, source:`https://www.npmjs.com/package/${encodeURIComponent(origin.npm)}` });
      }
    }
    entries[identity] = record;
  } };
  await Promise.all(Array.from({length:Math.min(4,external.length)},worker));
  const snapshot = { schema:'avc.source-quality.v1', catalogVersion:bootstrap.version, generatedAt:new Date().toISOString(), entries:Object.fromEntries(Object.entries(entries).sort(([a],[b])=>a.localeCompare(b))) };
  if (!opts.dryRun) {
    const file = outputFile(root);
    mkdirSync(join(root,'panorama'),{recursive:true});
    writeFileSync(file,JSON.stringify(snapshot,null,2)+'\n');
  }
  return snapshot;
}
