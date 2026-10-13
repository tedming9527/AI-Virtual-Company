#!/usr/bin/env node
// cli.js —— ted-avc-manager 命令入口（FR-2~FR-9）

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
function fail(err) { console.error(`[ted-avc-manager] ${err.message}`); process.exitCode = 1; }

switch (cmd) {
  case 'discover-capabilities':
    try { const {discoverCapabilities} = await import('./core/discovery.js'); const input = JSON.parse(readFileSync(args[1], 'utf8')); const result = await discoverCapabilities(input); ok(JSON.stringify(result,null,2)); if (result.coverage !== 'both-languages') process.exitCode = 1; } catch(e) { fail(e); }
    break;
  case 'validate-local-skill': case 'list-skill-candidates':
    try { const {validateLocalSkill,listSkillCandidates} = await import('./core/skill-candidates.js'); ok(JSON.stringify(cmd === 'validate-local-skill' ? validateLocalSkill(ROOT,{assetId:args[1]}) : listSkillCandidates(ROOT),null,2)); } catch(e) { fail(e); }
    break;
  case 'workflow-create': case 'workflow-status': case 'workflow-run': case 'workflow-cancel': case 'workflow-templates':
    try {
      const {createWorkflow,workflowStatus,runWorkflow,cancelWorkflow,workflowTemplates} = await import('./core/workflow.js');
      let result;
      if(cmd === 'workflow-create') result = createWorkflow(ROOT,JSON.parse(readFileSync(args[1],'utf8')));
      if(cmd === 'workflow-status') result = workflowStatus(ROOT,args[1]);
      if(cmd === 'workflow-run') result = await runWorkflow(ROOT,args[1],{authorized:args.includes('--authorize-commands')});
      if(cmd === 'workflow-cancel') result = cancelWorkflow(ROOT,args[1]);
      if(cmd === 'workflow-templates') result = workflowTemplates(ROOT);
      ok(JSON.stringify(result,null,2));
      if(cmd === 'workflow-run' && ['completed_with_failures','needs_attention','cancelled'].includes(result.status)) process.exitCode=1;
    } catch(e) { fail(e); }
    break;
  case 'maintenance-doctor':
    try {
      const { maintenanceDoctor } = await import('./core/maintenance-diagnostics.js');
      const pos = args.indexOf('--deployment');
      if (pos >= 0 && !args[pos + 1]) throw new Error('--deployment requires a file');
      ok(JSON.stringify(maintenanceDoctor(ROOT, pos >= 0 ? args[pos + 1] : process.env.AVC_DEPLOYMENT_FILE || join(ROOT, 'runtime/footer-hook-deployment.json')), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'maintenance-open': case 'maintenance-status': case 'maintenance-close':
    try {
      if (!args[1]) throw new Error(`${cmd} <input.json> [--authorize-unbound-maintenance]`);
      if (cmd === 'maintenance-open' && !args.includes('--authorize-unbound-maintenance')) throw new Error('Explicit --authorize-unbound-maintenance required; use only after user authorization');
      const { openMaintenance, maintenanceStatus, endMaintenance } = await import('./core/maintenance.js');
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(({'maintenance-open':openMaintenance,'maintenance-status':maintenanceStatus,'maintenance-close':endMaintenance})[cmd](ROOT,input,process.env.AVC_DEPLOYMENT_FILE || join(ROOT,'runtime','footer-hook-deployment.json')),null,2));
    } catch (e) { fail(e); }
    break;
  case 'install-execution-hooks':
    try { const { installExecutionHooks } = await import('./core/execution.js'); if (!args[1] || !args[2]) throw new Error('install-execution-hooks <deployment.json> <codex-home>'); ok(JSON.stringify(installExecutionHooks(args[1], args[2]), null, 2)); } catch (e) { fail(e); }
    break;
  case 'task-begin': case 'load-asset': case 'task-closeout':
    try {
      const { beginTask, loadAsset, closeTask } = await import('./core/execution.js');
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(({'task-begin':beginTask,'load-asset':loadAsset,'task-closeout':closeTask})[cmd](ROOT,input,process.env.AVC_DEPLOYMENT_FILE || join(ROOT,'runtime','footer-hook-deployment.json')),null,2));
    } catch (e) { fail(e); }
    break;
  case 'install-codex-hooks': {
    try {
      if (!args[1] || !args[2]) throw new Error('用法: ted-avc-manager install-codex-hooks <deployment.json> <codex-home>');
      const { installCodexHooks } = await import('./core/codex-hooks.js');
      ok(JSON.stringify(installCodexHooks(args[1], args[2]), null, 2));
    } catch (e) { fail(e); }
    break;
  }
  case 'init': {
    try {
      const c = parseCommand(args.slice(1).join(' ') || '根据 github://local/repo 开始执行初始化，安装 mcp');
      ok(`[命令协议] ${c.uri.uri} → ${c.intent}`);
      ok(flowInit(ROOT, { mcpTools: ['ted-avc-manager'], repo: `github://${c.uri.owner}/${c.uri.repo}` }).summary);
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
    try {
      const view = args.includes('--public') ? 'public' : 'local';
      const { syncCandidates } = await import('./panorama/candidates.js');
      if (!args.includes('--offline')) await syncCandidates(ROOT);
      const pos = args.indexOf('--catalog-ref');
      ok(flowPanorama(ROOT, { view, ...(pos >= 0 ? { catalogRef: args[pos + 1] } : {}) }).summary);
    } catch (e) { fail(e); }
    break;
  case 'find-skill':
    try { const { findSkills } = await import('./core/local-assets.js'); ok(JSON.stringify(findSkills(ROOT, args.slice(1).join(' ')), null, 2)); } catch (e) { fail(e); }
    break;
  case 'register-skill':
    try { const { registerLocalSkill } = await import('./core/local-assets.js'); if (!args[1]) throw new Error('register-skill <personal/custom/skill-dir>'); ok(JSON.stringify(registerLocalSkill(ROOT, args[1]), null, 2)); } catch (e) { fail(e); }
    break;
  case 'sync-candidates':
    try { const { syncCandidates } = await import('./panorama/candidates.js'); ok(JSON.stringify(await syncCandidates(ROOT), null, 2)); } catch (e) { fail(e); }
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
    if (!src) { fail(new Error('用法: ted-avc-manager import-scan <外部资产路径>')); break; }
    try { ok(flowImportScan(ROOT, src).summary); } catch (e) { fail(e); }
    break;
  }
  case 'bind': {
    const uri = args[1];
    if (!uri) { fail(new Error('用法: ted-avc-manager bind github://owner/repo[@ref]')); break; }
    try { ok(flowBind(ROOT, uri).summary); } catch (e) { fail(e); }
    break;
  }
  case 'validate-packs': {
    try {
      readBootstrap(ROOT);
      const { packs, errors } = scanPacks(ROOT, { requireDescription: true });
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
    if (!file) { fail(new Error('用法: ted-avc-manager validate-log <file.json>')); break; }
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
    console.log(`ted-avc-manager v${VERSION} —— 技能包管理器
用法：
  ted-avc-manager init "根据 github://owner/repo 开始执行初始化，安装 mcp"
  ted-avc-manager check | upgrade [--force] | sync | panorama [--force]
  ted-avc-manager doctor                       （体检个人目录规约，问题则 exit 1）
  ted-avc-manager config                       （合并 preset/custom，逐项标注来源）
  ted-avc-manager import-scan <path>           （外部资产入 staging + 打标台账）
  ted-avc-manager bind github://owner/repo     （绑定项目到个人目录）
  ted-avc-manager validate-packs
  ted-avc-manager validate-log <file.json>
  ted-avc-manager score --llm 4 --sample 30 --rate 0.85 --avg 4.0
  ted-avc-manager anomaly
  ted-avc-manager cleanup [--dry-run]
  ted-avc-manager install-codex-hooks <deployment.json> <codex-home> （原生署名 Hook，信任和触发另验）
  ted-avc-manager panorama [--local|--public] [--catalog-ref vX.Y.Z] [--offline]
  ted-avc-manager find-skill <query> | register-skill <personal/custom/skill-dir>
  ted-avc-manager sync-candidates
  ted-avc-manager install-execution-hooks <deployment.json> <codex-home>
  ted-avc-manager task-begin|load-asset|task-closeout <input.json>
  ted-avc-manager maintenance-open <input.json> --authorize-unbound-maintenance
  ted-avc-manager maintenance-doctor [--deployment <deployment.json>] （固定只读自检，绑定前可用）
  ted-avc-manager maintenance-status|maintenance-close <input.json> （独立本地维护控制；非 MCP 工具）
  ted-avc-manager server   （对外 MCP 适配器，stdio）`);
  }
}
