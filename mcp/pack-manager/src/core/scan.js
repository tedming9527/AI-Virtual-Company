// scan.js —— 目录规约扫描（约定大于配置：FR-1）

import { readdirSync, existsSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { readJson, validateBootstrap, validatePackMeta } from './manifest.js';

export const PACK_TYPES = ['skill', 'knowledge', 'framework', 'role'];

export function readBootstrap(root) {
  const json = readJson(join(root, 'bootstrap.json'));
  const res = validateBootstrap(json);
  if (!res.valid) throw new Error(`bootstrap 校验失败: ${res.errors.join('; ')}`);
  return json;
}

// 扫描 packs/<type>/<name>/，约定：目录即身份，meta.json 即契约
export function scanPacks(root) {
  const packsDir = join(root, 'packs');
  const found = [];
  const errors = [];
  if (!existsSync(packsDir)) return { packs: [], errors: ['packs/ 目录缺失'] };
  for (const type of PACK_TYPES) {
    const typeDir = join(packsDir, type);
    if (!existsSync(typeDir)) continue;
    for (const name of readdirSync(typeDir)) {
      const dir = join(typeDir, name);
      if (!existsSync(join(dir, 'meta.json'))) continue;
      const meta = readJson(join(dir, 'meta.json'));
      const res = validatePackMeta(meta, `${type}/${name}`);
      if (!res.valid) {
        errors.push(`${type}/${name}: ${res.errors.join('; ')}`);
        continue;
      }
      if (meta.type !== type) {
        errors.push(`${type}/${name}: meta.type(${meta.type}) 与目录类型(${type})不符`);
        continue;
      }
      const entries = type === 'role' ? ['SKILL.md', 'PROFILE.md'] : ['SKILL.md'];
      const entry = entries.find(file => existsSync(join(dir, file)) && statSync(join(dir, file)).isFile() && readFileSync(join(dir, file), 'utf8').trim());
      if (!entry) {
        errors.push(`${type}/${name}: 缺少非空入口文档（${entries.join(' 或 ')}）`);
        continue;
      }
      found.push({ type, name, displayName: meta.displayName || name,
        ...(type === 'role' ? { nameZh: meta.nameZh, professionZh: meta.professionZh } : {}),
        version: meta.version, status: meta.status || 'unknown', rubric: meta.rubric, dir, entry });
    }
  }
  return { packs: found, errors };
}

export function countByType(packs) {
  const c = { skill: 0, knowledge: 0, framework: 0, role: 0 };
  for (const p of packs) c[p.type] += 1;
  return c;
}
