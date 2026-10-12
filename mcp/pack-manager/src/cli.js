#!/usr/bin/env node
// cli.js —— pack-manager 命令入口（FR-2~FR-9）

import process from 'node:process';
import { readFileSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { parseCommand } from './core/protocol.js';
import { flowInit, flowCheck, flowUpgrade, flowSync, flowPanorama, flowDoctor, flowConfig, flowImportScan, flowBind, runtimeDirOf } from './core/flows.js';
import { scanPacks, readBootstrap } from './core/scan.js';
import { validateLayout, REQUIRED_ROOT } from './core/layout.js';
import { validateLog, validateLogs } from './governance/schema.js';
import { mergeScore, detectAnomaly } from './governance/score.js';
import { cleanupRuntime } from './governance/cleanup.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const ROOT = process.cwd();
const args = process.argv.slice(2);
const cmd = args[0];

function ok(text) { console.log(text); }
function fail(err) { console.error(`[pack-manager] ${err.message}`); process.exitCode = 1; }

switch (cmd) {
  case 'install-codex-hooks': {
    try {
      if (!args[1] || !args[2]) throw new Error('用法: pack-manager install-codex-hooks <deployment.json> <codex-home>');
      const { installCodexHooks } = await import('./core/codex-hooks.js');
      ok(JSON.stringify(installCodexHooks(args[1], args[2]), null, 2));
    } catch (e) { fail(e); }
    break;
  }
  case 'init': {
    try {
      const c = parseCommand(args.slice(1).join(' ') || '根据 github://local/repo 开始执行初始化，安装 mcp');
      ok(`[命令协议] ${c.uri.uri} → ${c.intent}`);
      ok(flowInit(ROOT, { mcpTools: ['pack-manager'], repo: `github://${c.uri.owner}/${c.uri.repo}` }).summary);
    } catch (e) { fail(e); }
    break;
  }
  case 'check':
    try { ok(flowCheck(ROOT).summary); } catch (e) { fail(e); }
    break;
  case 'upgrade':
    try { ok(flowUpgrade(ROOT, { force: args.includes('--force') }).summary); } catch (e) { fail(e); }
    break;
  case 'sync':
    try { ok(flowSync(ROOT).summary); } catch (e) { fail(e); }
    break;
  case 'panorama':
    try { ok(flowPanorama(ROOT, { force: args.includes('--force') }).summary); } catch (e) { fail(e); }
    break;
  case 'doctor': {
    // FR-11：exit code 表示体检结果（issues 存在 → 1）
    let r;
    try { r = flowDoctor(ROOT); } catch (e) { fail(e); break; }
    ok(r.summary);
    if (!r.ok) process.exitCode = 1;
    break;
  }
  case 'config':
    try { ok(flowConfig(ROOT).summary); } catch (e) { fail(e); }
    break;
  case 'import-scan': {
    const src = args[1];
    if (!src) { fail(new Error('用法: pack-manager import-scan <外部资产路径>')); break; }
    try { ok(flowImportScan(ROOT, src).summary); } catch (e) { fail(e); }
    break;
  }
  case 'bind': {
    const uri = args[1];
    if (!uri) { fail(new Error('用法: pack-manager bind github://owner/repo[@ref]')); break; }
    try { ok(flowBind(ROOT, uri).summary); } catch (e) { fail(e); }
    break;
  }
  case 'validate-packs': {
    try {
      readBootstrap(ROOT);
      const { packs, errors } = scanPacks(ROOT);
      if (errors.length) throw new Error(`规约校验未通过:\n${errors.map(e => `  - ${e}`).join('\n')}`);
      ok(`规约校验通过：${packs.length} 个包（${packs.map(p => `${p.type}/${p.name}@v${p.version}`).join(', ')}）`);
    } catch (e) { fail(e); }
    break;
  }
  case 'validate-layout': {
    // 防逃逸门禁：仓库根白名单 + packs 散落检测（exit code 表示结果）
    const { ok: pass, issues } = validateLayout(ROOT);
    if (!pass) { fail(new Error(`布局校验未通过:\n${issues.map((i) => `  [${i.kind}] ${i.detail}`).join('\n')}`)); }
    else ok(`布局校验通过：仓库根 ${REQUIRED_ROOT.length} 必备项齐全，无越界条目`);
    break;
  }
  case 'validate-log': {
    const file = args[1];
    if (!file) { fail(new Error('用法: pack-manager validate-log <file.json>')); break; }
    try {
      const data = JSON.parse(readFileSync(isAbsolute(file) ? file : join(ROOT, file), 'utf8'));
      const r = Array.isArray(data) ? validateLogs(data) : validateLog(data);
      if (!r.valid) { fail(new Error(`日志校验未通过: ${r.errors.join('; ')}`)); }
      else ok(`日志校验通过${Array.isArray(data) ? `（${r.validCount}/${r.total}）` : ''}。可免审合并。`);
    } catch (e) { fail(e); }
    break;
  }
  case 'score': {
    const flag = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
    try {
      const llm = flag('--llm', 4);
      const res = mergeScore({ llm, empirical: { sampleSize: flag('--sample', 5), successRate: flag('--rate', 0.8), avgScore: flag('--avg', 3.8) } });
      ok(`质量分：${res.quality}${res.provisional ? '（临时，样本不足）' : ''}${res.note ? `；${res.note}` : ''}`);
    } catch (e) { fail(e); }
    break;
  }
  case 'anomaly': {
    try {
      const r = detectAnomaly({ successRate: 0.9 }, { successRate: 0.55 });
      ok(r.triggered ? `⚠ ${r.message}` : '无异常');
    } catch (e) { fail(e); }
    break;
  }
  case 'cleanup': {
    try {
      const res = cleanupRuntime(runtimeDirOf(ROOT), { dryRun: args.includes('--dry-run') });
      ok(`${res.dryRun ? '[dry-run] ' : ''}清理完成：cache ${res.removed.cache} 条 / logs ${res.removed.logs} 条。规则：${res.rule}`);
    } catch (e) { fail(e); }
    break;
  }
  case 'server': {
    const { start } = await import('./server.js');
    start();
    break;
  }
  default: {
    console.log(`pack-manager v${VERSION} —— 技能包管理器
用法：
  pack-manager init "根据 github://owner/repo 开始执行初始化，安装 mcp"
  pack-manager check | upgrade [--force] | sync | panorama [--force]
  pack-manager doctor                       （体检个人目录规约，问题则 exit 1）
  pack-manager config                       （合并 preset/custom，逐项标注来源）
  pack-manager import-scan <path>           （外部资产入 staging + 打标台账）
  pack-manager bind github://owner/repo     （绑定项目到个人目录）
  pack-manager validate-packs
  pack-manager validate-log <file.json>
  pack-manager score --llm 4 --sample 30 --rate 0.85 --avg 4.0
  pack-manager anomaly
  pack-manager cleanup [--dry-run]
  pack-manager install-codex-hooks <deployment.json> <codex-home> （原生署名 Hook，信任和触发另验）
  pack-manager server   （对外 MCP 适配器，stdio）`);
  }
}
