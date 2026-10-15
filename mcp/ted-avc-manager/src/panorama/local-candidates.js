// Read-only local lifecycle inventory. Never collected by the public view.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { personalProject } from '../core/local-assets.js';
import { assertNoLinks } from '../core/scan.js';
import { listTrialCandidates, trialStatus } from '../governance/candidate-trials.js';

export function readLocalCandidates(root) {
  const rows = [], warnings = [];
  const project = personalProject(root).directory;
  const dir = join(project, 'staging/proposals');
  try {
    assertNoLinks(project, dir);
    if (existsSync(dir)) for (const name of readdirSync(dir).sort().filter(n => n.endsWith('.json'))) {
      try {
        const file = assertNoLinks(project, join(dir, name));
        if (!lstatSync(file).isFile() || lstatSync(file).size > 1024 * 1024) throw Error('提案文件超限或非普通文件');
        const p = JSON.parse(readFileSync(file, 'utf8'));
        if (p.schema !== 'avc.asset-proposal.v1' || !p.id || !p.name || !p.type) throw Error('提案格式无效');
        rows.push({ identity:`proposal:${p.id}`, contentDigest:createHash('sha256').update(readFileSync(file)).digest('hex'), id:p.id, name:p.name, title:p.name, type:p.type, kind:'proposal', version:p.sourceSkill?.version || null,
          description:p.purpose, status:p.status || 'unknown', publication:p.publication || 'unknown', installation:p.installation || 'unknown',
          href:pathToFileURL(file).href, trials:[] });
      } catch (error) { warnings.push(`${name}: ${error.message}`); }
    }
  } catch (error) { warnings.push(`待复核提案：${error.message}`); }
  try {
    const found = listTrialCandidates(root);
    warnings.push(...found.warnings);
    let trials = [];
    try { trials = trialStatus(root).trials; } catch (error) { warnings.push(`试用记录：${error.message}`); }
    for (const r of found.candidates) {
      const c = r.candidate;
      rows.push({ identity:`trial-candidate:${c.id}@${c.version}`, contentDigest:r.sha256, id:c.id, name:c.id, title:c.title, type:c.type, kind:'trial', version:c.version,
        description:c.hypothesis, status:c.status, review:r.review, publication:r.publication, installation:r.installation,
        href:pathToFileURL(join(project,'staging/trial-candidates',`${c.id}-${c.version}.json`)).href,
        trials:trials.filter(t => t.candidateId === c.id && t.sha256 === r.sha256).map(t => ({status:t.status})) });
    }
  } catch (error) { warnings.push(`试用候选：${error.message}`); }
  return { rows, warnings, counts:{total:rows.length, proposals:rows.filter(r=>r.kind==='proposal').length, trials:rows.filter(r=>r.kind==='trial').length} };
}
