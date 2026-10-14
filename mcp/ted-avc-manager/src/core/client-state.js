// Deployment-owned state is separate from the central catalog and user assets.
import { readFileSync, realpathSync, lstatSync, existsSync } from 'node:fs';
import { resolve, join, parse, relative, isAbsolute } from 'node:path';
import { createHash } from 'node:crypto';
export function clientStateRoot(project) {
  if (!project.stateRoot) return realpathSync(project.root); // legacy deployments
  if (!isAbsolute(project.stateRoot)) throw new Error('stateRoot must be absolute');
  const target = resolve(project.stateRoot);
  let cursor = parse(target).root;
  for (const part of relative(cursor, target).split('/').filter(Boolean)) {
    cursor = join(cursor, part);
    if (lstatSync(cursor).isSymbolicLink()) throw new Error('Refusing client state symlink');
  }
  return realpathSync(target);
}
export function deploymentFileFor(root) {
  return process.env.AVC_DEPLOYMENT_FILE || join(root, 'runtime', 'footer-hook-deployment.json');
}
export function stateRootFor(root, file = process.env.AVC_DEPLOYMENT_FILE) {
  if (!file) return realpathSync(root);
  const project = JSON.parse(readFileSync(file, 'utf8')).projects.find(p => resolve(p.root) === resolve(root));
  if (!project) throw new Error('Client state project unbound');
  return clientStateRoot(project);
}
export function catalogRootFor(root) {
  if (!process.env.AVC_CATALOG_ROOT || resolve(root) !== resolve(process.env.AVC_PROJECT_ROOT || '')) return root;
  const catalog = clientStateRoot({ root, stateRoot: process.env.AVC_CATALOG_ROOT });
  const manifest = JSON.parse(readFileSync(join(catalog, '.distribution.json'), 'utf8'));
  if (manifest.schema !== 'avc.distribution.v1' || manifest.owner !== 'central' || resolve(manifest.source) !== (existsSync(root) ? realpathSync(root) : resolve(root))) throw new Error('Unverified downstream catalog mapping');
  return catalog;
}

// Installed catalog, running engine and central checkout are distinct versions.
export function catalogVersionFor(root) {
  const catalog = catalogRootFor(root);
  const file = join(catalog, 'bootstrap.json');
  verifyDistributedFile(root, file);
  const version = JSON.parse(readFileSync(file, 'utf8')).version;
  if (catalog !== root && process.env.CODEX_HOME) {
    const base = join(process.env.CODEX_HOME, 'ted-avc-manager');
    const installed = JSON.parse(readFileSync(join(base, 'manifest.json'), 'utf8'));
    const engine = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')).version;
    if (installed.version !== engine || version !== installed.version || (process.env.AVC_GENERATION && installed.generation !== process.env.AVC_GENERATION)) throw Error('Installed package/catalog/generation mismatch; raw event collection remains available');
  }
  return version;
}

export function verifyDistributedFile(root, file) {
  const catalog = catalogRootFor(root);
  if (catalog === root) return;
  const manifest = JSON.parse(readFileSync(join(catalog, '.distribution.json'), 'utf8'));
  const expected = manifest.files[relative(catalog, file)];
  if (!expected || createHash('sha256').update(readFileSync(file)).digest('hex') !== expected) throw new Error('Distributed asset changed; preserve as candidate and rebuild, never auto-promote');
}
