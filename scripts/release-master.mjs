#!/usr/bin/env node
import { readFileSync, mkdirSync, writeFileSync, appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const VERSION = /^(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})\.(0|[1-9]\d{0,5})$/;
const SHA = /^[a-f0-9]{40}$/;
const execute = (tool, args, cwd) => execFileSync(tool, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

export function compareVersions(a, b) {
  if (!VERSION.test(a) || !VERSION.test(b)) throw new Error('Stable semver required');
  const left = a.split('.').map(Number), right = b.split('.').map(Number);
  for (let i = 0; i < 3; i++) if (left[i] !== right[i]) return Math.sign(left[i] - right[i]);
  return 0;
}

export function readRelease(root, { baseSha, run = execute } = {}) {
  const version = JSON.parse(readFileSync(join(root, 'bootstrap.json'))).version;
  if (!VERSION.test(version) || JSON.parse(readFileSync(join(root, 'mcp/ted-avc-manager/package.json'))).version !== version) throw new Error('Bootstrap and manager must share a stable version');
  let held = false;
  const policyFile = join(root, '.github/release-policy.json');
  if (existsSync(policyFile)) {
    const policy = JSON.parse(readFileSync(policyFile));
    if (policy.schema !== 'avc.release-policy.v1' || !VERSION.test(policy.holdVersion || '') || typeof policy.reason !== 'string' || !policy.reason.trim() || Object.keys(policy).some(key => !['schema','holdVersion','reason'].includes(key))) throw new Error('Invalid release policy; refusing publication');
    held = policy.holdVersion === version;
  }
  const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8');
  const section = changelog.split('\n## ').find(part => part.startsWith(`[${version}] - `));
  if (!section || !/^\[\d+\.\d+\.\d+\] - \d{4}-\d{2}-\d{2}\n/.test(section) || !section.split('\n').slice(1).join('\n').trim()) throw new Error('Dated, non-empty release notes required');
  if (baseSha) {
    if (!SHA.test(baseSha)) throw new Error('Invalid base SHA');
    const base = JSON.parse(run('git', ['show', `${baseSha}:bootstrap.json`], root)).version;
    if (compareVersions(version, base) < 0 || compareVersions(version, base) === 0 && !held) throw new Error('Every release PR must increase the version');
  }
  return { version, tag: `v${version}`, ...(held ? {publish:false,reason:'version-bound merge-only hold'} : {}), notes: section.split('\n').slice(1).join('\n').trim() + '\n' };
}

export function publishRelease(root, env, run = execute) {
  if (env.GITHUB_REF !== 'refs/heads/master' || !SHA.test(env.GITHUB_SHA || '') || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.GITHUB_REPOSITORY || '')) throw new Error('Release must run for an exact master commit');
  if (run('git', ['rev-parse', 'HEAD'], root) !== env.GITHUB_SHA) throw new Error('Checkout differs from approved commit');
  const release = readRelease(root), repo = env.GITHUB_REPOSITORY, sha = env.GITHUB_SHA;
  const prs = JSON.parse(run('gh', ['api', `repos/${repo}/commits/${sha}/pulls`], root));
  if (!Array.isArray(prs) || !prs.some(pr => pr.merged_at && pr.base?.ref === 'master' && pr.merge_commit_sha === sha)) throw new Error('Merged PR to master required');
  if (release.publish === false) return { skipped:true, publish:false, version:release.version, commit:sha, reason:release.reason };
  const refs = run('git', ['ls-remote', '--tags', 'origin', `refs/tags/${release.tag}`, `refs/tags/${release.tag}^{}`], root).split('\n').filter(Boolean).map(line => line.split(/\s+/));
  const peeled = refs.find(([, ref]) => ref === `refs/tags/${release.tag}^{}`) || refs.find(([, ref]) => ref === `refs/tags/${release.tag}`);
  if (peeled && peeled[0] !== sha) throw new Error('Version tag belongs to a different commit; increase the version');
  if (!peeled) {
    run('git', ['-c', 'user.name=github-actions[bot]', '-c', 'user.email=41898282+github-actions[bot]@users.noreply.github.com', 'tag', '-a', release.tag, sha, '-m', `Release ${release.tag}`], root);
    run('git', ['push', 'origin', `refs/tags/${release.tag}`], root);
  }
  let existing;
  try { existing = JSON.parse(run('gh', ['api', `repos/${repo}/releases/tags/${release.tag}`], root)); }
  catch (error) {
    const message = error.stderr?.toString() || error.message;
    if (!/(HTTP 404|release not found|Not Found)/i.test(message)) throw error;
  }
  if (existing) {
    if (existing.tag_name !== release.tag || existing.draft || existing.prerelease) throw new Error('Existing release is not the expected published stable release');
  } else {
    const directory = join(root, 'runtime/cache/releases'); mkdirSync(directory, { recursive: true });
    const notes = join(directory, `${release.tag}.md`); writeFileSync(notes, release.notes);
    run('gh', ['release', 'create', release.tag, '--repo', repo, '--verify-tag', '--title', release.tag, '--notes-file', notes], root);
  }
  return { tag: release.tag, commit: sha, reusedTag: Boolean(peeled), reusedRelease: Boolean(existing) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2), baseAt = args.indexOf('--base');
    if (baseAt >= 0 && !args[baseAt + 1]) throw new Error('--base requires a SHA');
    const result = args.includes('--check') ? readRelease(process.cwd(), { baseSha: baseAt < 0 ? undefined : args[baseAt + 1] }) : publishRelease(process.cwd(), process.env);
    if (args.includes('--check') && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `publish=${result.publish !== false}\n`);
    if (!args.includes('--check') && !result.skipped && process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `tag=${result.tag}\n`);
    console.log(JSON.stringify(result));
  } catch (error) { console.error(error.stderr?.toString() || error.message); process.exitCode = 1; }
}
