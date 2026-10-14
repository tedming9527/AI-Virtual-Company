// Central distribution is replaceable; custom/ and unowned legacy data are not.
import { existsSync, lstatSync, readdirSync, readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync, rmSync } from 'node:fs';
import { join, dirname, resolve, relative, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const json = file => JSON.parse(readFileSync(file, 'utf8'));
function safe(path) {
  let cursor = resolve(path);
  while (true) {
    try { if (lstatSync(cursor).isSymbolicLink()) throw new Error('Refusing preset symlink'); } catch (e) { if (e.code !== 'ENOENT') throw e; }
    const parent = dirname(cursor); if (parent === cursor) return; cursor = parent;
  }
}
function inventory(root) {
  safe(root); const result = {};
  if (!existsSync(root)) return result;
  function walk(dir) {
    for (const name of readdirSync(dir).sort()) {
      const file = join(dir, name), stat = lstatSync(file);
      if (stat.isSymbolicLink()) throw new Error('Refusing preset symlink');
      if (stat.isDirectory()) walk(file);
      else if (stat.isFile()) result[relative(root, file)] = sha(file);
      else throw new Error('Unsupported preset file');
    }
  }
  walk(root); return result;
}
function copy(root, target, files) {
  for (const [rel, hash] of Object.entries(files)) {
    const dst = join(target, rel); mkdirSync(dirname(dst), { recursive: true });
    copyFileSync(join(root, rel), dst);
    if (sha(dst) !== hash) throw new Error('Preset preservation hash mismatch');
  }
  if (JSON.stringify(inventory(root)) !== JSON.stringify(files)) throw new Error('Preset changed during preservation');
}
export function rebuildPresets(root, personalRoot, slug, bootstrap) {
  const names = bootstrap.presets || [];
  if (names.some(n => !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(n)) || new Set(names).size !== names.length) throw new Error('Invalid preset names');
  const project = join(personalRoot, 'projects', slug), dstRoot = join(project, 'preset');
  safe(dstRoot); mkdirSync(dstRoot, { recursive: true });
  const lock = join(dstRoot, '.sync.lock'); mkdirSync(lock);
  const result = { synced: [], conflicts: [], skipped: [], removed: [], recovery: [] };
  try {
    const oldNames = readdirSync(dstRoot).filter(n => n !== '.sync.lock' && existsSync(join(dstRoot,n,'.preset-manifest.json')));
    for (const name of new Set([...names, ...oldNames])) {
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(name)) throw new Error('Invalid installed preset name');
      const dst = join(dstRoot,name), src = join(root,'presets',name), oldFiles = inventory(dst);
      const mf = join(dst,'.preset-manifest.json');
      const old = existsSync(mf) ? json(mf) : null;
      if (old && (old.schema !== 'avc.preset-manifest.v1' || old.name !== name || old.source !== `presets/${name}` || !Array.isArray(old.files) || old.files.some(f => typeof f.path !== 'string' || resolve(dst,f.path) === dst || !resolve(dst,f.path).startsWith(dst+sep)))) throw new Error('Invalid preset ownership manifest');
      if (!old && Object.keys(oldFiles).length) { result.skipped.push(`${name}（来源不明，保留待核对）`); continue; }
      const wanted = names.includes(name);
      if (wanted && !existsSync(src)) throw new Error(`Central preset missing: ${name}`);
      const nextFiles = wanted ? inventory(src) : {};
      if (Object.hasOwn(nextFiles,'.preset-manifest.json')) throw new Error('Reserved preset manifest');
      const id = randomUUID(), temp = join(dstRoot,`.new-${id}`), rollback = join(dstRoot,`.old-${id}`);
      let archive;
      try {
        const hashes = new Map((old?.files || []).map(f=>[f.path,f.sha256]));
        const changed = Object.fromEntries(Object.entries(oldFiles).filter(([rel,hash])=>rel !== '.preset-manifest.json' && hashes.get(rel) !== hash));
        if (Object.keys(changed).length) {
          archive = join(project,'staging','central-recovery',id); safe(archive); mkdirSync(archive,{recursive:true});
          for (const [rel, hash] of Object.entries(changed)) {
            const target=join(archive,'files',rel);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(dst,rel),target);
            if(sha(target)!==hash)throw new Error('Preset preservation hash mismatch');
            result.conflicts.push(`preset/${name}/${rel}（本地资料已保全到 staging）`);
          }
          writeFileSync(join(archive,'recovery.json'),JSON.stringify({schema:'avc.central-recovery.v1',source:`preset/${name}`,ownership:'unpromoted-local-edit',files:changed,status:'pending-review',autoActivate:false},null,2)+'\n');
          result.recovery.push(archive);
        }
        if (wanted) {
          mkdirSync(temp); copy(src,temp,nextFiles);
          writeFileSync(join(temp,'.preset-manifest.json'), JSON.stringify({schema:'avc.preset-manifest.v1',name,source:`presets/${name}`,version:bootstrap.version,files:Object.entries(nextFiles).map(([path,sha256])=>({path,sha256}))},null,2)+'\n');
        }
        if (JSON.stringify(inventory(dst)) !== JSON.stringify(oldFiles)) throw new Error('Preset changed before replacement');
        if (existsSync(dst)) renameSync(dst,rollback);
        if (wanted) renameSync(temp,dst);
        rmSync(rollback,{recursive:true,force:true});
        (wanted ? result.synced : result.removed).push(name);
      } catch (e) {
        if (existsSync(rollback) && !existsSync(dst)) renameSync(rollback,dst);
        throw e;
      } finally { rmSync(temp,{recursive:true,force:true}); }
    }
    return result;
  } finally { rmSync(lock,{recursive:true}); }
}
