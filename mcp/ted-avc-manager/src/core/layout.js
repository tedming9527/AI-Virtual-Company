// layout.js —— 中央仓库布局门禁（FR-1 白名单 + 防逃逸）
// 仓库根只允许约定项；packs/<type>/ 下散落文件/无 meta.json 目录 = 逃逸，CI 与本地共用。

import { existsSync, lstatSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

// FR-1 必备项（缺失 = missing）
export const REQUIRED_ROOT = [
  'bootstrap.json', 'CHANGELOG.md', 'README.md', 'AGENTS.md',
  'docs', 'mcp', 'packs', 'panorama', 'presets', 'rules', 'runtime',
];
// 仓库运营允许项（必备之外白名单；其余根级条目 = unexpected）
export const ALLOWED_ROOT = ['.git', '.github', '.gitignore', 'scripts', 'templates', 'platforms', 'package.json'];
// packs/<type>/ 根部允许的非包文件（花名册/语音档案等包基础设施，审计判定保留）
export const ALLOWED_PACK_FILES = new Set([
  'SKILL_ASSET_POLICY.md', // packs/skill 策略
  'ASSET_REGISTRY.md', // 通用技能发现目录
  'INDEX.md', 'catalog.json', // 通用知识索引及哈希契约
  'ROSTER.txt', 'VOICE_PROFILES.md', 'VOICE_PROFILES.json', // packs/role 花名册与语音档案
]);

export function validateLayout(root) {
  const issues = [];
  for (const item of REQUIRED_ROOT) {
    if (!existsSync(join(root, item))) issues.push({ kind: 'missing', detail: `仓库根缺少必备项: ${item}` });
  }
  const allowed = new Set([...REQUIRED_ROOT, ...ALLOWED_ROOT]);
  for (const name of readdirSync(root)) {
    if (name === '.DS_Store') continue;
    if (!allowed.has(name)) issues.push({ kind: 'unexpected', detail: `仓库根未约定项: ${name}（个人数据请落个人目录，运行态/视图请落 runtime/）` });
  }
  const packsDir = join(root, 'packs');
  if (existsSync(packsDir)) {
    for (const name of readdirSync(packsDir)) {
      if (!['skill', 'knowledge', 'framework', 'role'].includes(name) || !statSync(join(packsDir, name)).isDirectory()) {
        issues.push({ kind: 'stray', detail: `packs/ 根未约定项: ${name}（外部资产请先进入个人 staging/）` });
      }
    }
    for (const type of ['skill', 'knowledge', 'framework', 'role']) {
      const dir = join(packsDir, type);
      if (!existsSync(dir)) continue;
      if (!statSync(dir).isDirectory()) continue;
      for (const name of readdirSync(dir)) {
        const p = join(dir, name);
        if (statSync(p).isDirectory()) {
          if (!existsSync(join(p, 'meta.json'))) {
            issues.push({ kind: 'stray', detail: `packs/${type}/${name} 缺 meta.json（非规约包；外部资产请走个人 staging/ import-scan 导入）` });
          }
        } else if (!ALLOWED_PACK_FILES.has(name)) {
          issues.push({ kind: 'stray', detail: `packs/${type} 下散落文件: ${name}` });
        }
      }
    }
  }
  // A task checkout is not repository runtime state. In particular, a synced
  // repository must not become the home of a second checkout and its deps.
  const taskCache = join(root, 'runtime', 'cache', 'tasks');
  if (existsSync(taskCache) && lstatSync(taskCache).isDirectory() && !lstatSync(taskCache).isSymbolicLink()) {
    for (const name of readdirSync(taskCache)) {
      const task = join(taskCache, name);
      if (!lstatSync(task).isDirectory() || lstatSync(task).isSymbolicLink()) continue;
      const candidates = [task, ...readdirSync(task).map(child => join(task, child))];
      if (candidates.some(dir => lstatSync(dir).isDirectory() && !lstatSync(dir).isSymbolicLink() &&
        (existsSync(join(dir, '.git')) || existsSync(join(dir, 'node_modules'))))) {
        issues.push({ kind: 'task-copy', detail: `runtime/cache/tasks/${name} 包含临时检出或依赖；中介层不得把任务副本写入仓库 runtime/，请使用客户端原有工作区` });
      }
    }
  }
  return { ok: issues.length === 0, issues };
}
