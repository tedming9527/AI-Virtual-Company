// server.js —— 对外薄 MCP 适配器（FR-9/FR-3）：把 ted-avc-manager 能力暴露为标准 MCP 工具
// 内部核心链路仍为直连（无协议层）；本层仅服务「对接新模式 / 第三方 MCP 客户端」。

import { clientStatus } from './core/client-status.js';
import { runTedCommand, tedAction, TED_COMMANDS } from './core/ted-commands.js';
import { acquireClientLease } from './core/client-lease.js';
import { deploymentFileFor, stateRootFor } from './core/client-state.js';
import { createInterface } from 'node:readline';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { discoverCapabilities } from './core/discovery.js';
import { validateLocalSkill, listSkillCandidates } from './core/skill-candidates.js';
import { scanPacks } from './core/scan.js';
import { flowCheck, flowUpgrade, flowPanorama, flowSync } from './core/flows.js';
import { validateLog } from './governance/schema.js';
import { findSkills, registerLocalSkill } from './core/local-assets.js';
import { syncCandidates } from './panorama/candidates.js';
import { createWorkflow, workflowStatus, cancelWorkflow, workflowTemplates } from './core/workflow.js';
import { beginTask, loadAsset, closeTask } from './core/execution.js';
import { listAssets, recommendAssets, proposeAsset, recordAssetUse, watchAssets, noteDeliveredAsset } from './core/awareness.js';

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;

const TOOLS = [
  ...TED_COMMANDS.map(c=>({name:'ted_'+c.action,description:c.description,annotations:{readOnlyHint:c.action!=='panorama',destructiveHint:false,openWorldHint:c.action==='update'},inputSchema:{type:'object',additionalProperties:false,properties:c.action==='update'?{offline:{type:'boolean'}}:c.action==='status'?{sessionId:{type:'string'},turnId:{type:'string'}}:{}}})),
  {name:'ted_command',description:'Ted 便捷命令：help/update/panorama/scores/doctor/repair/status；支持 /ted 文本别名，确定性分派，repair 只提供修复方案',annotations:{readOnlyHint:false,destructiveHint:false},inputSchema:{type:'object',additionalProperties:false,properties:{command:{type:'string'},action:{type:'string',enum:TED_COMMANDS.map(c=>c.action)},offline:{type:'boolean'}}}},
  { name: 'client_status', description: '只读核对当前安装、真实事件、会话接入和任务路由；旧 MCP 进程也可诊断，不宣称模型语义遵从', annotations: {readOnlyHint:true}, inputSchema:{type:'object',properties:{sessionId:{type:'string'},turnId:{type:'string'}}} },
  {name:'discover_capabilities', description:'向 GitHub 发送明确的中英文公开能力查询，合并仓库候选；不读取私有文件、不下载或安装', inputSchema:{type:'object',properties:{zhQuery:{type:'string'},enQuery:{type:'string'},owners:{type:'array',items:{type:'string'}}},required:['zhQuery','enQuery']}},
  {name:'validate_local_skill', description:'验证已登记本地技能结构并保存绑定完整包哈希的证据；不代替行为验收', inputSchema:{type:'object',properties:{assetId:{type:'string'}},required:['assetId']}},
  {name:'list_skill_candidates', description:'查看本地技能候选及验证是否仍有效', inputSchema:{type:'object',properties:{}}},
  ...['workflow_create', 'workflow_status', 'workflow_cancel', 'workflow_templates'].map(name => ({name, description: ({workflow_create:'固定任务级多技能组合与流程节点；不启动执行',workflow_status:'查询任务依赖、节点状态与实际证据',workflow_cancel:'请求停止后续节点；活动执行需真实停止后才能记取消',workflow_templates:'列出公共流程模板，模板不是授权或运行事实'})[name], inputSchema: {type:'object', properties:{spec:{type:'object'},workflowId:{type:'string'}}}})),
  { name: 'list_packs', description: '列出全部技能包（目录规约扫描，约定大于配置）', inputSchema: { type: 'object', properties: {} } },
  { name: 'check_update', description: '比较已安装客户端与本地中央仓库声明版本，区分 MCP 运行版本；不查询远端发布', inputSchema: { type: 'object', properties: {} } },
  { name: 'upgrade', description: '仅更新仓库版本账本（major 需 force）；不安装或升级客户端', inputSchema: { type: 'object', properties: { force: { type: 'boolean' } } } },
  { name: 'generate_panorama', description: '生成本地全景图（默认 runtime/panorama）或通用公开目录（public）', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['local', 'public'] }, catalogRef: { type: 'string' }, offline: { type: 'boolean' } } } },
  { name: 'find_skill', description: '发现中央、本地自定义及本机技能，区分发现与管理状态', inputSchema: { type: 'object', properties: { query: { type: 'string' } } } },
  { name: 'register_skill', description: '登记 personal/custom 内原创技能，绑定版本与正文/元数据哈希；外部先导入复核', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  ...['list_assets','recommend_assets','report_asset_use','propose_asset'].map(name=>({name,description:({list_assets:'列出通用/本地/native技能与知识元数据；不等于正文加载',recommend_assets:'根据任务关键词推荐可发现资产，不自动激活',report_asset_use:'记录模型使用声明，与真实读取/正文交付分开统计',propose_asset:'将技能/插件建议写入个人待复核候选；不自动安装或发布'})[name],inputSchema:{type:'object',properties:{query:{type:'string'},type:{type:'string'},source:{type:'string'},assetId:{type:'string'},name:{type:'string'},origin:{type:'string'},purpose:{type:'string'},validationId:{type:'string'},sources:{type:'array',items:{type:'object'}},sessionId:{type:'string'},turnId:{type:'string'}}}})),
  ...['task_begin', 'load_asset', 'task_closeout'].map(name => ({ name, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, description: ({task_begin:'在本地登记当前回合任务、角色和工具范围并写入审计记录；不执行目标中描述的操作，不授予后续工具权限，不联网',load_asset:'读取明确选定的本地资产正文，写入加载记录及摘要；不安装、不执行资产内容，不联网',task_closeout:'读取本地产物计算 SHA，写入任务关闭与审计记录；不执行或发布产物，不联网'})[name], inputSchema: { type: 'object', properties: { sessionId: {type:'string'},turnId:{type:'string'},receipt:{type:'string'},agentId:{type:'string'},workflowId:{type:'string'},nodeId:{type:'string'},role:{type:'string'},goal:{type:'string'},allowedTools:{type:'array',items:{type:'string'}},maxToolCalls:{type:'integer'},requiredAssets:{type:'array',items:{type:'string'}},source:{type:'string'},type:{type:'string'},name:{type:'string'},entry:{type:'string'},artifacts:{type:'array',items:{type:'object'}},unknownCalls:{type:'array',items:{type:'object'}} } } })),
  { name: 'submit_log', description: '校验并暂存使用日志（免审合并前提：过 schema 校验门）', inputSchema: { type: 'object', properties: { log: { type: 'object' } } } },
];

export function start() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  let ready=false, changedBeforeReady=false;
  const watcher = watchAssets((process.env.AVC_PROJECT_ROOT || process.cwd()), { onChange: result => {
    if (result.changes.length && ready) process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/resources/list_changed'})+'\n');
    else if(result.changes.length)changedBeforeReady=true;
  }});
  rl.on('close',()=>watcher.dispose());

  rl.on('line', (line) => {
    let msg;
    try { msg = JSON.parse(line); } catch { return; }
    if (msg.method === 'initialize') {
      respond(msg.id, { protocolVersion: '2024-11-05', capabilities: { tools: {}, prompts:{}, resources: {listChanged:true} }, serverInfo: { name: 'ted-avc-manager', version: VERSION } });
      return;
    }
    if (msg.method === 'notifications/initialized') {ready=true;if(changedBeforeReady)process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/resources/list_changed'})+'\n');return;}
    if (msg.method === 'notifications/cancelled') return;
    if (msg.method === 'tools/list') { respond(msg.id, { tools: TOOLS }); return; }
    if(msg.method==='prompts/list'){respond(msg.id,{prompts:[{name:'ted',description:'Ted 便捷命令入口：检查更新、生成本地全景、评分、doctor 与修复方案',arguments:[{name:'action',description:TED_COMMANDS.map(c=>c.action).join('/'),required:false}]}]});return;}
    if(msg.method==='prompts/get'){
      try {
        if(msg.params?.name!=='ted')throw Error('Unknown prompt');const action=tedAction({action:msg.params.arguments?.action||'help'});
        respond(msg.id,{description:'Ted 确定性便捷命令',messages:[{role:'user',content:{type:'text',text:`调用 ted_${action}，如实展示返回证据；repair 只生成方案，不冒充已执行。`}}]});
      }catch(error){respondError(msg.id,-32602,error.message);}return;
    }
    if (msg.method === 'resources/list') {
      respond(msg.id,{resources:listAssets((process.env.AVC_PROJECT_ROOT || process.cwd())).assets.filter(a=>a.source==='general'||a.management==='local-managed').map(a=>({uri:'tedavc://asset/'+encodeURIComponent(a.id),name:a.displayName||a.name,description:`${a.type} · ${a.source} · ${a.version||'unversioned'}; body via bound load_asset`,mimeType:'application/json'}))});return;
    }
    if (msg.method === 'resources/read') {
      let id;
      try { if (!String(msg.params?.uri||'').startsWith('tedavc://asset/')) throw new Error(); id=decodeURIComponent(msg.params.uri.slice('tedavc://asset/'.length)); } catch {respondError(msg.id,-32602,'Invalid asset resource URI');return;}
      const asset=listAssets((process.env.AVC_PROJECT_ROOT || process.cwd())).assets.find(a=>a.id===id);
      if(!asset){respondError(msg.id,-32602,'Unknown asset resource');return;}
      respond(msg.id,{contents:[{uri:msg.params.uri,mimeType:'application/json',text:JSON.stringify({...asset,bodyAccess:'Metadata only; use bound load_asset before use'})}]});return;
    }
    if (msg.method === 'tools/call') { handleCall(msg.id, msg.params || {}); return; }
    if (msg.method) respondError(msg.id, -32601, `unknown method: ${msg.method}`);
  });

  function respond(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  }
  function respondError(id, code, message) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message } }) + '\n');
  }

  async function handleCall(id, params) {
    const ROOT = (process.env.AVC_PROJECT_ROOT || process.cwd());
    const name = params.name;
    const args = (params.arguments) || {};
    let release;
    try {
      // Diagnostics must work even in a cached process after installation changes.
      const shortcut=TED_COMMANDS.find(c=>'ted_'+c.action===name);
      release = name === 'check_update' || name === 'client_status' || shortcut&&shortcut.action!=='panorama' || name==='ted_command'&&tedAction(args)!=='panorama' ? () => {} : acquireClientLease();
      let text;
      if(shortcut){text=JSON.stringify(await runTedCommand(ROOT,{action:shortcut.action,...(shortcut.action==='update'?{offline:args.offline}:{})},{runningVersion:VERSION,...(shortcut.action==='status'?{sessionId:args.sessionId,turnId:args.turnId}:{})}));}
      else if(name==='ted_command'){text=JSON.stringify(await runTedCommand(ROOT,args,{runningVersion:VERSION}));}
      else if (name === 'client_status') { text = JSON.stringify(clientStatus(args)); } else if (name === 'discover_capabilities') {
        text = JSON.stringify(await discoverCapabilities(args));
      } else if (name === 'validate_local_skill') {
        text = JSON.stringify(validateLocalSkill(ROOT,args));
      } else if (name === 'list_skill_candidates') {
        text = JSON.stringify(listSkillCandidates(ROOT));
      } else if (name === 'workflow_create') {
        text = JSON.stringify(createWorkflow(ROOT,args.spec));
      } else if (name === 'workflow_status') {
        text = JSON.stringify(workflowStatus(ROOT,args.workflowId));
      } else if (name === 'workflow_cancel') {
        text = JSON.stringify(cancelWorkflow(ROOT,args.workflowId));
      } else if (name === 'workflow_templates') {
        text = JSON.stringify(workflowTemplates(ROOT));
      } else if (name === 'list_packs') {
        const { packs, errors } = scanPacks(ROOT);
        text = JSON.stringify({ packs: packs.map((p) => ({ type: p.type, name: p.name, displayName: p.displayName, description:p.description, aliases:p.aliases, keywords:p.keywords,
          ...(p.type === 'role' ? { nameZh: p.nameZh, professionZh: p.professionZh } : {}), version: p.version, status: p.status })), errors });
      } else if (name === 'check_update') {
        text = flowCheck(ROOT, { runningVersion: VERSION }).summary;
      } else if (name === 'upgrade') {
        text = flowUpgrade(ROOT, { force: !!args.force }).summary;
      } else if (name === 'generate_panorama') {
        if (!args.offline) await syncCandidates(ROOT);
        text = flowPanorama(ROOT, { view: args.view || 'local', catalogRef: args.catalogRef }).summary;
      } else if (name === 'find_skill') {
        text = JSON.stringify(findSkills(ROOT, args.query || ''));
      } else if (name === 'register_skill') {
        text = JSON.stringify(registerLocalSkill(ROOT, args.path));
      } else if (name === 'list_assets') {
        text=JSON.stringify(listAssets(ROOT,args));
      } else if (name === 'recommend_assets') {
        text=JSON.stringify(recommendAssets(ROOT,args.query||''));
      } else if (name === 'report_asset_use') {
        text=JSON.stringify(recordAssetUse(ROOT,args));
      } else if (name === 'propose_asset') {
        text=JSON.stringify(proposeAsset(ROOT,args));
      } else if (['task_begin','load_asset','task_closeout'].includes(name)) {
        const deploymentFile = deploymentFileFor(ROOT);
        const result=({task_begin:beginTask,load_asset:loadAsset,task_closeout:closeTask})[name](ROOT,args,deploymentFile);
        if(name==='load_asset')noteDeliveredAsset(ROOT,result,args);
        text = JSON.stringify(result);
      } else if (name === 'submit_log') {
        const r = validateLog(args.log);
        if (!r.valid) throw new Error(`日志校验未通过: ${r.errors.join('; ')}`);
        const ts = new Date().toISOString().replace(/[:.]/g, '-');
        const dir = join(stateRootFor(ROOT), 'runtime', 'logs');
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `usage-${ts}.json`), JSON.stringify(args.log, null, 2) + '\n', 'utf8');
        text = `日志已校验通过并暂存。${flowSync(ROOT).summary}`;
      } else {
        throw new Error(`unknown tool: ${name}`);
      }
      respond(id, { content: [{ type: 'text', text }] });
    } catch (e) {
      respondError(id, -32603, e.message);
    } finally { release?.(); }
  }
}
