#!/usr/bin/env node
// cli.js —— ted-avc-manager 命令入口（FR-2~FR-9）

import { deploymentFileFor, stateRootFor } from './core/client-state.js';
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
const ROOT = process.env.AVC_PROJECT_ROOT || process.cwd();
const args = process.argv.slice(2);
const cmd = args[0];

function ok(text) { console.log(text); }
function fail(err) { console.error(`[ted-avc-manager] ${err.message}`); process.exitCode = 1; }

switch (cmd) {
  case 'ted': {
    try {const {runTedCommand}=await import('./core/ted-commands.js');ok(JSON.stringify(await runTedCommand(ROOT,{action:args[1]||'help',offline:args.includes('--offline')}),null,2));}catch(error){fail(error);}break;
  }
  case 'setup':
    process.argv.splice(2,1);
    await import('./setup.js');
    break;
  case 'client-status': {
    try { const {clientStatus}=await import('./core/client-status.js');ok(JSON.stringify(clientStatus(),null,2)); } catch(e) {fail(e);}
    break;
  }
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
      ok(JSON.stringify(maintenanceDoctor(ROOT, pos >= 0 ? args[pos + 1] : deploymentFileFor(ROOT)), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'governance-weekly-status': case 'governance-weekly-prepare': case 'governance-weekly-complete':
    try {
      const { weeklyStatus, prepareWeekly, completeWeekly } = await import('./governance/weekly.js');
      const result = cmd === 'governance-weekly-status' ? weeklyStatus(ROOT) :
        cmd === 'governance-weekly-prepare' ? prepareWeekly(ROOT) : completeWeekly(ROOT, JSON.parse(readFileSync(args[1], 'utf8')));
      ok(JSON.stringify(result, null, 2));
    } catch (e) { fail(e); }
    break;
  case 'experience-recovery-stage': case 'experience-recovery-cleanup': case 'experience-recovery-restore': case 'experience-recovery-reconcile':
    try {
      const { stageReviewedExperience, cleanupReviewedExperience, restoreReviewedExperience, reconcileReviewedExperience } = await import('./governance/experience-recovery.js');
      const result = cmd === 'experience-recovery-stage' ? stageReviewedExperience(ROOT, JSON.parse(readFileSync(args[1], 'utf8')), { apply: args.includes('--apply') }) :
        cmd === 'experience-recovery-cleanup' ? cleanupReviewedExperience(ROOT, { apply: args.includes('--apply') }) :
        cmd === 'experience-recovery-reconcile' ? reconcileReviewedExperience(ROOT, { apply: args.includes('--apply') }) : restoreReviewedExperience(ROOT, args[1]);
      ok(JSON.stringify(result, null, 2));
    } catch (e) { fail(e); }
    break;
  case 'maintenance-open': case 'maintenance-status': case 'maintenance-close':
    try {
      if (!args[1]) throw new Error(`${cmd} <input.json> [--authorize-unbound-maintenance]`);
      if (cmd === 'maintenance-open' && !args.includes('--authorize-unbound-maintenance')) throw new Error('Explicit --authorize-unbound-maintenance required; use only after user authorization');
      const { openMaintenance, maintenanceStatus, endMaintenance } = await import('./core/maintenance.js');
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(({'maintenance-open':openMaintenance,'maintenance-status':maintenanceStatus,'maintenance-close':endMaintenance})[cmd](ROOT,input,deploymentFileFor(ROOT)),null,2));
    } catch (e) { fail(e); }
    break;
  case 'install-execution-hooks':
    try { const { installExecutionHooks } = await import('./core/execution.js'); if (!args[1] || !args[2]) throw new Error('install-execution-hooks <deployment.json> <codex-home>'); ok(JSON.stringify(installExecutionHooks(args[1], args[2]), null, 2)); } catch (e) { fail(e); }
    break;
  case 'task-begin': case 'load-asset': case 'task-closeout':
    try {
      const { beginTask, loadAsset, closeTask } = await import('./core/execution.js');
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(({'task-begin':beginTask,'load-asset':loadAsset,'task-closeout':closeTask})[cmd](ROOT,input,deploymentFileFor(ROOT)),null,2));
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
    console.log('客户端初始化请执行 yarn setup 或 npm run setup；由安装器保全并重建受管环境。该命令不将配置写入当作原生接入成功。');
    break;
  }
  case 'init-personal': {
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
  case 'panorama-topic-add': case 'panorama-topic-link':
    try {
      if (!args[1]) throw new Error(`${cmd} <input.json>`);
      const { addPanoramaTopic, linkPanoramaFile } = await import('./panorama/topics.js');
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(cmd === 'panorama-topic-add' ? addPanoramaTopic(ROOT, input) : linkPanoramaFile(ROOT, input), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'topic-create': case 'topic-session-add': case 'topic-session-archive': case 'topic-copy-legacy':
    try {
      if (!args[1]) throw new Error(`${cmd} <input.json>`);
      const { createPersonalTopic, addPersonalTopicSession, archivePersonalTopicSession, copyLegacyFilesToTopic } = await import('./core/personal.js');
      const { resolvePersonal } = await import('./core/personal.js');
      const storage = resolvePersonal(ROOT, readBootstrap(ROOT));
      const input = JSON.parse(readFileSync(args[1], 'utf8'));
      ok(JSON.stringify(cmd === 'topic-create' ? createPersonalTopic(storage.root, storage.slug, input) : cmd === 'topic-session-add' ? addPersonalTopicSession(storage.root, storage.slug, input.topicId, input.sessionId) : cmd === 'topic-copy-legacy' ? copyLegacyFilesToTopic(storage.root, storage.slug, input) : archivePersonalTopicSession(storage.root, storage.slug, input.topicId, input.sessionId), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'personal-discard': case 'personal-discard-cleanup':
    try {
      const { discardPersonalFile, cleanupPersonalDiscard } = await import('./core/discard.js');
      if (cmd === 'personal-discard' && !args[1]) throw new Error('personal-discard <input.json>');
      ok(JSON.stringify(cmd === 'personal-discard' ? discardPersonalFile(ROOT, JSON.parse(readFileSync(args[1], 'utf8'))) : cleanupPersonalDiscard(ROOT, { dryRun: !args.includes('--apply') }), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'panorama-mcp-check':
    try {
      if (!args[1]) throw new Error('用法：panorama-mcp-check <网上 MCP 名称>');
      const { checkRemoteMcp } = await import('./panorama/mcp-connections.js');
      ok(JSON.stringify(await checkRemoteMcp(ROOT, args[1]), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'panorama-mcp-quality':
    try {
      const githubAt = args.indexOf('--github'), npmAt = args.indexOf('--npm');
      if (!args[1] || githubAt < 0 || !args[githubAt + 1]) throw new Error('用法：panorama-mcp-quality <网上 MCP 名称> --github owner/repo [--npm 包名]');
      const { updateRemoteMcpQuality } = await import('./panorama/mcp-connections.js');
      ok(JSON.stringify(await updateRemoteMcpQuality(ROOT, args[1], args[githubAt + 1], npmAt < 0 ? null : args[npmAt + 1], { deep: args.includes('--deep') }), null, 2));
    } catch (e) { fail(e); }
    break;
  case 'panorama-source-snapshot':
    try {
      const { buildSourceQuality, validateSourceQuality } = await import('./panorama/source-quality.js');
      if (args.includes('--check')) {
        const result = validateSourceQuality(ROOT);
        ok(JSON.stringify(result, null, 2));
        if (!result.valid) process.exitCode = 1;
      } else ok(JSON.stringify(await buildSourceQuality(ROOT, { deep: args.includes('--deep') }), null, 2));
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
      ok(`质量分：${res.quality === null ? '未评分／证据不足' : res.quality}；静态评估：${res.staticQuality}${res.note ? `；${res.note}` : ''}`);
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
      const res = cleanupRuntime(join(stateRootFor(ROOT), 'runtime'), { dryRun: !args.includes('--apply') });
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
  ted-avc-manager setup [install|status|recover] （确定性安装向导；也可 yarn setup / npm run setup）
  ted-avc-manager init （引导安装器，不写配置）
  ted-avc-manager init-personal "根据 github://owner/repo 开始执行初始化" （独立用户目录初始化）
  ted-avc-manager client-status （源码不可用时也可只读核对当前安装与原生事件）
  ted-avc-manager ted [help|update|panorama|scores|doctor|repair|status] [--offline] （聊天 Ted 技能与 MCP 的同一后端）
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
  ted-avc-manager panorama-topic-add <input.json> （登记用户课题，可附会话 ID）
  ted-avc-manager panorama-topic-link <input.json> （按个人目录相对路径登记文件关联与依据）
  ted-avc-manager topic-create <input.json> （按会话建立 topics/<课题>/ 分类目录）
  ted-avc-manager topic-session-add <input.json> （后续会话延续已有课题）
  ted-avc-manager topic-copy-legacy <input.json> （按内容复制旧资料并核对摘要，保留原路径）
  ted-avc-manager topic-session-archive <input.json> （归档会话；全部会话归档后课题归档，不删文件）
  ted-avc-manager personal-discard <input.json> （明确核对后将旧资料移入 90 天废弃区）
  ted-avc-manager personal-discard-cleanup [--apply] （预览／清理到期且摘要未变的废弃文件）
  ted-avc-manager panorama-mcp-check <网上 MCP 名称> （按需只读握手，记录本地状态）
  ted-avc-manager panorama-mcp-quality <名称> --github owner/repo [--npm 包名] [--deep] （按需查询公开网络指标）
  ted-avc-manager panorama-source-snapshot [--check|--deep] （发布前采集或校验第三方来源证据）
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
