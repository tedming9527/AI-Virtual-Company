// flows.js —— 预定义流程执行（FR-2~FR-5）：所有流程结束汇报必带当前版本号

import { existsSync, mkdirSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { resolveMemoryStorage } from './storage.js';
import { readBootstrap, scanPacks, countByType } from './scan.js';
import { readLock, writeLock } from './lockfile.js';
import { compare, diffKind } from './semver.js';
import { generatePanorama } from '../panorama/generate.js';
import { resolvePersonal, initPersonal, doctorPersonal, syncPresets, mergeConfig, importScan } from './personal.js';
import { parseGithubUri } from './protocol.js';

export function runtimeDirOf(root) {
  return join(root, 'runtime');
}

// 使用统一部署配置；只有实际恢复时创建记忆目录。
export function resolveMemoryDir(root, bootstrap) {
  const dir = resolveMemoryStorage(root, bootstrap);
  mkdirSync(dir, { recursive: true });
  return dir;
}

// 生效版本唯一来源：lockfile.current（无则回退中央 bootstrap.version）
export function effectiveVersion(root, runtimeDir) {
  const bootstrap = readBootstrap(root);
  const lock = readLock(runtimeDir);
  return { version: lock.current || bootstrap.version, bootstrapVersion: bootstrap.version, lock };
}

function finalLine(label, version) {
  const prefix = label ? `${label}。` : '';
  return `${prefix}当前版本 v${version}`;
}

export function flowInit(root, opts = {}) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const { packs, errors } = scanPacks(root);
  if (errors.length) throw new Error(`规约校验失败: ${errors.join('; ')}`);

  // 分层注入索引（FR-2）
  const index = {
    resident: packs.filter((p) => p.type === 'framework').map((p) => p.name),
    onDemand: packs.filter((p) => p.type === 'knowledge').map((p) => p.name),
    tools: packs.filter((p) => p.type === 'skill').map((p) => p.name),
    roles: packs.filter((p) => p.type === 'role').map((p) => p.name),
  };

  // 发现预置 MCP 包；客户端注册、启动与实际加载由部署适配器另行验证。
  const mcpTools = [];
  const mcpDir = join(root, 'mcp');
  if (existsSync(mcpDir)) {
    for (const tool of opts.mcpTools || ['pack-manager']) {
      if (existsSync(join(mcpDir, tool))) mcpTools.push(tool);
    }
  }

  // 先验证全部部署路径，错误配置不写 lockfile 或骨架。
  const personal = resolvePersonal(root, bootstrap);
  const memoryDir = resolveMemoryStorage(root, bootstrap);

  // 写 lockfile：钉住中央版本
  const packages = {};
  for (const p of packs) packages[`${p.type}/${p.name}`] = p.version;
  writeLock(rt, { current: bootstrap.version, packages });

  mkdirSync(memoryDir, { recursive: true });
  const counts = countByType(packs);
  const v = bootstrap.version;

  // 个人目录骨架 + 预设同步（FR-2 第 3/5 步：init 幂等补建；custom/ 保留不动）
  const initRes = initPersonal(personal.root, personal.slug, { repo: opts.repo || null, version: v, touch: 'bootstrap' });
  const presetRes = syncPresets(root, personal.root, personal.slug, bootstrap);

  const injected = [
    `常驻(索引/规则): ${index.resident.join(', ') || '无'}`,
    `按需(知识): ${index.onDemand.join(', ') || '无'}`,
    `技能(发现索引): ${index.tools.join(', ') || '无'}`,
    `岗位(发现索引): ${index.roles.join(', ') || '无'}`,
  ].join('；');

  const presetLine = presetRes.synced.length
    ? `预设同步：${presetRes.synced.join(', ')}${presetRes.conflicts.length ? `；冲突 ${presetRes.conflicts.length} 项（已保留 .local 副本）` : '（无冲突）'}`
    : '预设同步：无声明';
  const skeletonLine = initRes.created.length ? `个人目录补建 ${initRes.created.length} 项` : '个人目录骨架完整';

  return {
    ok: true,
    version: v,
    summary: `本机状态初始化完成，已发现 MCP 包 ${mcpTools.join(', ') || '无'}，索引包含 ${counts.skill} 个技能包、${counts.knowledge} 个知识包、${counts.framework} 个框架包、${counts.role} 个岗位包。分层索引：${injected}。记忆落点：${memoryDir}。${skeletonLine}；${presetLine}${personal.fallback ? '；个人存储未配置，使用 runtime/personal 本机临时目录' : ''}。客户端 MCP 安装和实际上下文加载仍需部署验收。${finalLine('', v)}`,
  };
}

export function flowCheck(root) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const lock = readLock(rt);
  const current = lock.current || bootstrap.version;
  const latest = bootstrap.version;
  const cmp = compare(latest, current);
  const kind = cmp > 0 ? diffKind(latest, current) : 'none';
  const upgrade = cmp > 0 ? { kind, latest, current } : null;
  return {
    ok: true,
    version: current,
    summary: `检查完成：当前版本 v${current}，中央声明最新 v${latest}，${upgrade ? `可升级（${upgrade.kind}，${upgrade.kind === 'major' ? '需人审' : 'opt-in'}）` : '已是最新'}。${finalLine('', current)}`,
  };
}

export function flowUpgrade(root, opts = {}) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const lock = readLock(rt);
  const current = lock.current || bootstrap.version;
  const latest = bootstrap.version;
  const cmp = compare(latest, current);
  if (cmp <= 0) {
    return { ok: true, version: current, summary: `无需升级：当前 v${current} 已是最新。${finalLine('', current)}` };
  }
  const kind = diffKind(latest, current);
  if (kind === 'major' && !opts.force) {
    throw new Error(`major 升级（v${current} → v${latest}）需人审。请管理员确认后以 --force 执行。`);
  }
  // 迁移：约定 migrations/<from>-<to>.js；本次无破坏性变更则直接更新
  writeLock(rt, { current: latest, packages: lock.packages, overrides: lock.overrides });
  return {
    ok: true,
    version: latest,
    summary: `升级完成（${kind}）：v${current} → v${latest}，本地 lockfile 已更新，迁移脚本见 migrations/ 约定。${finalLine('', latest)}`,
  };
}

export function flowSync(root) {
  const rt = runtimeDirOf(root);
  const lock = readLock(rt);
  const version = lock.current || readBootstrap(root).version;
  const logsDir = join(rt, 'logs');
  const pending = [];
  if (existsSync(logsDir)) {
    for (const f of readdirSync(logsDir)) {
      if (f.endsWith('.json') && !f.includes('.consumed.')) pending.push(f);
    }
  }
  return {
    ok: true,
    version,
    summary: `同步完成：待回传日志 ${pending.length} 条（logs/ 目录），生成 PR 后按保留窗口与删除规则消费。${finalLine('', version)}`,
  };
}

export function flowPanorama(root, opts = {}) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const lock = readLock(rt);
  const version = lock.current || bootstrap.version;
  const out = generatePanorama(root, { version, runtimeDir: rt, scoresFile: join(rt, 'scores.json'), force: opts.force });
  return { ok: true, version, summary: `全景图已生成：${out}。${finalLine('', version)}` };
}

// —— FR-3/FR-11~FR-13 新增流程 ——

// 体检：doctor 校验个人目录（缺失/多余/命名/哈希/state），只报告不修复
export function flowDoctor(root) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const { version } = effectiveVersion(root, rt);
  const personal = resolvePersonal(root, bootstrap);
  const { ok, issues } = doctorPersonal(personal.root, personal.slug);
  const lines = ok
    ? [`体检通过：projects/${personal.slug}/ 无违规项`]
    : [`体检发现 ${issues.length} 个问题：`, ...issues.map((i) => `  [${i.kind}] ${i.detail}`)];
  return { ok, version, issues, summary: `${lines.join('\n')}${personal.fallback ? '（未配置个人存储，正在使用 runtime/personal 本机临时目录）' : ''}。${finalLine('', version)}` };
}

// 配置：合并 preset/custom 展示生效配置，逐项标注来源
export function flowConfig(root) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const { version } = effectiveVersion(root, rt);
  const personal = resolvePersonal(root, bootstrap);
  const { merged, bySource } = mergeConfig(personal.root, personal.slug, bootstrap.presets);
  const keys = Object.keys(merged).sort();
  if (!keys.length) {
    return { ok: true, version, summary: `生效配置为空（preset/custom 均无 JSON 配置项）。${finalLine('', version)}` };
  }
  const lines = [
    `生效配置 ${keys.length} 项（${Object.entries(bySource).map(([s, n]) => `${s}: ${n} 项`).join('；')}）：`,
    ...keys.map((k) => `  ${k} = ${JSON.stringify(merged[k].value)}  ← ${merged[k].source}`),
  ];
  return { ok: true, version, summary: `${lines.join('\n')}\n${finalLine('', version)}` };
}

// 导入：外部资产进 staging → 自动打标 + 台账，待人工复核
export function flowImportScan(root, sourcePath, opts = {}) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const { version } = effectiveVersion(root, rt);
  const personal = resolvePersonal(root, bootstrap);
  const { entry, registryFile } = importScan(personal.root, personal.slug, sourcePath, opts);
  return {
    ok: true,
    version,
    summary: `导入完成：${entry.files.length} 个文件入 staging/imports/${entry.id}，自动打标「${entry.label}」（${entry.reason}），状态 pending-review，台账：${registryFile}。人工复核通过后通用者转正入中央 packs/。${finalLine('', version)}`,
  };
}

// 绑定：绑定项目到个人目录（注册 manifest + 创建骨架）
export function flowBind(root, uriText) {
  const rt = runtimeDirOf(root);
  const bootstrap = readBootstrap(root);
  const { version } = effectiveVersion(root, rt);
  const uri = parseGithubUri(uriText || '');
  if (!uri) throw new Error(`未识别到 github:// 地址: "${uriText}"`);
  const slug = uri.repo;
  const personal = resolvePersonal(root, bootstrap);
  const res = initPersonal(personal.root, slug, { repo: `github://${uri.owner}/${uri.repo}`, version, touch: 'bootstrap' });
  return {
    ok: true,
    version,
    summary: `绑定完成：${uri.uri} → projects/${slug}/，骨架${res.created.length ? `补建 ${res.created.length} 项` : '已完整'}，manifest 已登记。${finalLine('', version)}`,
  };
}
