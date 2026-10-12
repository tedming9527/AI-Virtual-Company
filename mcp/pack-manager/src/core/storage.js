// Deployment paths are local configuration, never a machine-specific default.
import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, resolve, sep } from 'node:path';

export function storageConfig(root, bootstrap, env = process.env) {
  const file = join(root, 'runtime', 'storage.json');
  const local = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  return {
    ...bootstrap.storage, ...local,
    ...(env.AVC_PERSONAL_DIR ? { personal: env.AVC_PERSONAL_DIR } : {}),
    ...(env.AVC_MEMORY_DIR ? { memory: env.AVC_MEMORY_DIR } : {}),
    ...(env.AVC_ICLOUD_ROOT ? { icloudRoot: env.AVC_ICLOUD_ROOT } : {}),
  };
}

export function resolveStoragePath(root, spec, config) {
  if (typeof spec !== 'string' || !spec.trim()) throw new Error('存储路径必须为非空字符串');
  if (spec.startsWith('icloud://')) {
    if (!config.icloudRoot || !isAbsolute(config.icloudRoot) || !existsSync(config.icloudRoot)) {
      throw new Error('icloud:// 需要配置可用的 AVC_ICLOUD_ROOT 或 runtime/storage.json 的 icloudRoot；不静默回退');
    }
    const cloud = resolve(config.icloudRoot);
    const target = resolve(cloud, spec.slice('icloud://'.length));
    if (!target.startsWith(cloud + sep)) throw new Error('icloud:// 路径不得越出已配置根目录');
    return target;
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(spec)) throw new Error('不支持的存储协议');
  return resolve(root, spec);
}

export function resolvePersonalStorage(root, bootstrap, env = process.env) {
  const config = storageConfig(root, bootstrap, env);
  const spec = config.personal;
  const slug = bootstrap.name || basename(root);
  const project = spec ? resolveStoragePath(root, spec, config) : join(root, 'runtime', 'personal', 'projects', slug);
  if (basename(dirname(project)) !== 'projects') throw new Error('storage.personal 必须指向 <personal-root>/projects/<slug>');
  return { root: dirname(dirname(project)), slug: basename(project), fallback: !spec };
}

export function resolveMemoryStorage(root, bootstrap, env = process.env) {
  const config = storageConfig(root, bootstrap, env);
  if (config.memory) return resolveStoragePath(root, config.memory, config);
  const personal = resolvePersonalStorage(root, bootstrap, env);
  return join(personal.root, 'projects', personal.slug, 'memory');
}
