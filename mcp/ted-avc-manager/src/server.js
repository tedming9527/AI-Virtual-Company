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
import { registerCandidate, matchCandidates, recordTrial, trialStatus } from './governance/candidate-trials.js';
import { beginTask, loadAsset, closeTask, executionResponse } from './core/execution.js';
import { startTaskMaintenance } from './governance/task-maintenance.js';
import { listAssets, recommendAssets, proposeAsset, recordAssetUse, watchAssets, noteDeliveredAsset } from './core/awareness.js';
import { discoverAssets } from './core/asset-discovery.js';
import { deliverResponse,deliverContext,bytePrefix } from './core/context-budget.js';
import {randomUUID,createHash} from 'node:crypto';

// Only returned mutation facts belong in the budget-independent control path.
// Tool completion is distinct from task success, adoption, or publication.
function mutationOutcome(name,value){
 let facts;
 if(['workflow_create','workflow_cancel'].includes(name))facts={workflowId:value.spec?.id,businessStatus:value.status,specSha256:value.specSha256,cancelRequested:value.cancelRequested===true,persistence:'workflow-state-available'};
 else if(name==='candidate_register')facts={candidateId:value.candidate?.id,version:value.candidate?.version,sha256:value.sha256,businessStatus:value.candidate?.status,review:value.review,publication:value.publication,installation:value.installation,unchanged:value.unchanged===true,persistence:'candidate-record-available'};
 else if(name==='candidate_trial')facts={trialId:value.id,candidateId:value.candidateId,sha256:value.sha256,businessStatus:value.status,persistence:'trial-ledger-recorded'};
 else if(name==='propose_asset')facts={candidateId:value.id,businessStatus:value.status,publication:value.publication,installation:value.installation,persistence:'proposal-recorded'};
 else if(name==='report_asset_use')facts={eventId:value.id,businessStatus:value.kind,evidence:value.evidence,persistence:'declaration-recorded'};
 else if(name==='register_skill')facts={name:value.name,version:value.version,sha256:value.sha256,management:value.management,publication:value.publication,persistence:'local-registry-recorded'};
 else if(['upgrade','generate_panorama','submit_log'].includes(name))facts={persistence:'unknown',reportedResult:bytePrefix(String(value.text||''),96)};
 else return undefined;
 const outcome={tool:name,operationReturned:true};
 for(const [key,value]of Object.entries(facts)){
  if(value===undefined)continue;
  const field=typeof value==='string'&&Buffer.byteLength(JSON.stringify(value))>160?{[key+'Sha256']:createHash('sha256').update(value).digest('hex'),detailsOmitted:true}:{[key]:value};
  if(Buffer.byteLength(JSON.stringify({...outcome,...field}))<=640)Object.assign(outcome,field);else outcome.detailsOmitted=true;
 }
 return outcome;
}

const VERSION = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const discoveryProperties={query:{type:'string',maxLength:2048},type:{type:'string'},source:{type:'string'},cursor:{type:'string'},lookupId:{type:'string',maxLength:64},maxItems:{type:'integer',minimum:1,maximum:32},maxBytes:{type:'integer',minimum:1024,maximum:8192},sessionId:{type:'string'},turnId:{type:'string'},agentId:{type:'string'}};
const summaryBatchProperties={cursor:{type:'string'},maxItems:{type:'integer',minimum:1,maximum:16},maxOutputBytes:{type:'integer',minimum:1024,maximum:8192}};
const summaryOperationProperties={operation:{type:'string',enum:['inspect','prepare','submit']},requestId:{type:'string'},sourceSha256:{type:'string'},descriptionSha256:{type:'string'},policyVersion:{type:'string'},summaries:{type:'object',additionalProperties:false,properties:{'zh-CN':{type:'string'},en:{type:'string'}}}};
function tedProperties(action) {
  return {...(['update','repair','doctor','summary'].includes(action)?summaryBatchProperties:{}),
    ...(action==='update'?{offline:{type:'boolean'}}:{}),
    sessionId:{type:'string'},turnId:{type:'string'},agentId:{type:'string'},
    ...(action==='summary'?summaryOperationProperties:{}),...(action==='monitor'?{operation:{type:'string',enum:['open','status','stop']}}:{}),
    ...(action==='tasks'?{operation:{type:'string',enum:['inspect','reconcile','cleanup']},cursor:{type:'string'},maxItems:{type:'integer',minimum:1,maximum:100},policy:{type:'object',additionalProperties:false,properties:{forceCloseDays:{type:'integer',minimum:5,maximum:10},rawRetentionDays:{type:'integer',minimum:5,maximum:30}}}}:{})};
}

const TOOLS = [
  ...TED_COMMANDS.map(c=>({name:'ted_'+c.action,description:c.description,annotations:{readOnlyHint:!['panorama','update','repair','summary','monitor'].includes(c.action),destructiveHint:false,openWorldHint:c.action==='update'},inputSchema:{type:'object',additionalProperties:false,properties:tedProperties(c.action)}})),
  {name:'ted_command',description:'Ted 便捷命令；repair/update 分批登记双语摘要请求；summary 默认只读，submit 写缓存；安装修复仅返回计划',annotations:{readOnlyHint:false,destructiveHint:false},inputSchema:{type:'object',additionalProperties:false,properties:{command:{type:'string'},action:{type:'string',enum:TED_COMMANDS.map(c=>c.action)},offline:{type:'boolean'},sessionId:{type:'string'},turnId:{type:'string'},agentId:{type:'string'},...summaryBatchProperties,...summaryOperationProperties,operation:{type:'string',enum:['inspect','prepare','submit','open','status','stop']}}}},
  { name: 'client_status', description: '只读核对当前安装、真实事件、会话接入和任务路由；旧 MCP 进程也可诊断，不宣称模型语义遵从', annotations: {readOnlyHint:true}, inputSchema:{type:'object',properties:{sessionId:{type:'string'},turnId:{type:'string'}}} },
  {name:'discover_capabilities', description:'向 GitHub 发送明确的中英文公开能力查询，合并仓库候选；不读取私有文件、不下载或安装', inputSchema:{type:'object',properties:{zhQuery:{type:'string'},enQuery:{type:'string'},owners:{type:'array',items:{type:'string'}}},required:['zhQuery','enQuery']}},
  {name:'validate_local_skill', description:'验证已登记本地技能结构并保存绑定完整包哈希的证据；不代替行为验收', inputSchema:{type:'object',properties:{assetId:{type:'string'}},required:['assetId']}},
  {name:'list_skill_candidates', description:'查看本地技能候选及验证是否仍有效', inputSchema:{type:'object',properties:{}}},
  ...['workflow_create', 'workflow_status', 'workflow_cancel', 'workflow_templates'].map(name => ({name, description: ({workflow_create:'固定任务级多技能组合与流程节点；不启动执行',workflow_status:'查询任务依赖、节点状态与实际证据',workflow_cancel:'请求停止后续节点；活动执行需真实停止后才能记取消',workflow_templates:'列出公共流程模板，模板不是授权或运行事实'})[name], inputSchema: {type:'object', properties:{spec:{type:'object'},workflowId:{type:'string'}}}})),
  { name: 'list_packs', description: '按页发现技能包，使用 nextCursor 继续；不加载正文', inputSchema: { type: 'object', properties: discoveryProperties } },
  { name: 'check_update', description: '比较已安装客户端与本地中央仓库声明版本，区分 MCP 运行版本；不查询远端发布', inputSchema: { type: 'object', properties: {} } },
  { name: 'upgrade', description: '仅更新仓库版本账本（major 需 force）；不安装或升级客户端', inputSchema: { type: 'object', properties: { force: { type: 'boolean' } } } },
  { name: 'generate_panorama', description: '生成本地全景图（默认 runtime/panorama）或通用公开目录（public）', inputSchema: { type: 'object', properties: { view: { type: 'string', enum: ['local', 'public'] }, catalogRef: { type: 'string' }, offline: { type: 'boolean' } } } },
  { name: 'find_skill', description: '按页检索中央、本地及本机技能，使用已验双语和有界近期先验；不自动激活', inputSchema: { type: 'object', properties: discoveryProperties } },
  { name: 'register_skill', description: '登记 personal/custom 内原创技能，绑定版本与正文/元数据哈希；外部先导入复核', inputSchema: { type: 'object', properties: { path: { type: 'string' } }, required: ['path'] } },
  ...['list_assets','recommend_assets','report_asset_use','propose_asset'].map(name=>({name,description:({list_assets:'按页发现包、包内文档及中央规则；覆盖与资格分开报告',recommend_assets:'按相关性与有界近期先验分页推荐，不自动激活',report_asset_use:'记录模型采用声明；跨回合传同一logicalTaskId去重，不等于已验证执行',propose_asset:'将技能/插件建议写入个人待复核候选；不自动安装或发布'})[name],inputSchema:{type:'object',properties:{...discoveryProperties,logicalTaskId:{type:'string'},assetId:{type:'string'},name:{type:'string'},origin:{type:'string'},purpose:{type:'string'},validationId:{type:'string'},sources:{type:'array',items:{type:'object'}}}}})),
  ...['task_begin', 'load_asset', 'task_closeout'].map(name => ({ name, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false }, description: ({task_begin:'在本地登记当前回合任务、角色和工具范围并写入审计记录；不执行目标中描述的操作，不授予后续工具权限，不联网',load_asset:'默认返回有界摘录和章节索引；mode=chunk 按摘要绑定游标分段读取，记录累计预算和完整性；不安装、不执行资产内容，不联网',task_closeout:'读取本地产物计算 SHA，写入任务关闭与审计记录；不执行或发布产物，不联网'})[name], inputSchema: { type: 'object', properties: { sessionId: {type:'string'},turnId:{type:'string'},receipt:{type:'string'},agentId:{type:'string'},workflowId:{type:'string'},nodeId:{type:'string'},role:{type:'string'},goal:{type:'string'},candidateTaskKey:{type:'string'},allowedTools:{type:'array',items:{type:'string'}},maxToolCalls:{type:'integer'},requiredAssets:{type:'array',items:{type:'string'}},source:{type:'string'},type:{type:'string'},name:{type:'string'},entry:{type:'string'},mode:{type:'string',enum:['summary','chunk']},maxBytes:{type:'integer',minimum:256,maximum:8192},cursor:{type:'object',properties:{sha256:{type:'string'},offset:{type:'integer',minimum:0}},required:['sha256','offset'],additionalProperties:false},artifacts:{type:'array',items:{type:'object'}},unknownCalls:{type:'array',items:{type:'object'}} } } })),
  {name:'candidate_register',description:'创建现有类型的私有待验证候选，可由模型在当前授权任务内提炼；不安装、执行或发布',inputSchema:{type:'object',additionalProperties:false,properties:{candidate:{type:'object'}},required:['candidate']}},
  {name:'candidate_match',description:'按当前任务匹配候选，返回一次可选试用建议；未评分与低分分开，不自动采用',annotations:{readOnlyHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{taskKey:{type:'string'},query:{type:'string'},retryReason:{type:'string'}},required:['taskKey','query']}},
  {name:'candidate_trial',description:'记录实际提示、明确用户选择、试用开始、效果/成本/产物或取消；声明不证明用户身份或因果收益，不自动晋升',inputSchema:{type:'object',additionalProperties:false,properties:{input:{type:'object'}},required:['input']}},
  {name:'candidate_trial_status',description:'只读查看候选试用、反馈及未知项',annotations:{readOnlyHint:true},inputSchema:{type:'object',additionalProperties:false,properties:{taskKey:{type:'string'}}}},
  { name: 'submit_log', description: '校验并暂存使用日志（免审合并前提：过 schema 校验门）', inputSchema: { type: 'object', properties: { log: { type: 'object' } } } },
];
for(const tool of TOOLS)Object.assign(tool.inputSchema.properties,{sessionId:{type:'string'},turnId:{type:'string'},agentId:{type:'string'}});
TOOLS.find(t=>t.name==='task_begin').inputSchema.properties.toolCapabilities={type:'array',items:{type:'string',enum:['shell','edit','delegation']}};
Object.assign(TOOLS.find(t=>t.name==='load_asset').inputSchema.properties,{documentId:{type:'string'},sourceSha256:{type:'string'}});
TOOLS.find(t=>t.name==='task_closeout').inputSchema.properties.evidenceKind={type:'string',enum:['conversation']};
Object.assign(TOOLS.find(t=>t.name==='ted_command').inputSchema.properties,{operation:{type:'string',enum:['inspect','prepare','submit','open','status','stop','reconcile','cleanup']},policy:tedProperties('tasks').policy});
TOOLS.find(t=>t.name==='ted_tasks').annotations.readOnlyHint=false;

export function start() {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: false });
  let ready=false, changedBeforeReady=false;
  const watcher = watchAssets((process.env.AVC_PROJECT_ROOT || process.cwd()), { onChange: result => {
    if (result.changes.length && ready) process.stdout.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/resources/list_changed'})+'\n');
    else if(result.changes.length)changedBeforeReady=true;
  }});
  let maintenance;
  try{if(process.env.AVC_GENERATION&&process.env.CODEX_HOME)maintenance=startTaskMaintenance(stateRootFor(process.env.AVC_PROJECT_ROOT||process.cwd()));}catch{}
  rl.on('close',()=>{watcher.dispose();maintenance?.dispose();});

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
        respond(msg.id,{description:'Ted 确定性便捷命令',messages:[{role:'user',content:{type:'text',text:`调用 ted_${action}，如实展示返回证据；安装修复仍为方案。双语摘要的 pending、已配对和语义未验证分别报告。`}}]});
      }catch(error){respondError(msg.id,-32602,error.message);}return;
    }
    if (msg.method === 'resources/list') {
      const root=process.env.AVC_PROJECT_ROOT||process.cwd(),page=discoverAssets(root,{cursor:msg.params?.cursor,maxBytes:4096,maxItems:4});
      respond(msg.id,{resources:(page.assets||[]).map(a=>({uri:'tedavc://asset/'+encodeURIComponent(a.id),name:bytePrefix(a.name,160),description:`${a.type} · ${a.source}; body via bound load_asset`,mimeType:'application/json'})),nextCursor:page.nextCursor,coverage:page.coverage});return;
    }
    if (msg.method === 'resources/read') {
      let id;
      try { if (!String(msg.params?.uri||'').startsWith('tedavc://asset/')) throw new Error(); id=decodeURIComponent(msg.params.uri.slice('tedavc://asset/'.length)); } catch {respondError(msg.id,-32602,'Invalid asset resource URI');return;}
      const asset=discoverAssets(process.env.AVC_PROJECT_ROOT||process.cwd(),{assetId:id,maxItems:1,maxBytes:4096}).assets?.[0];
      if(!asset){respondError(msg.id,-32602,'Unknown asset resource');return;}
      respond(msg.id,{contents:[{uri:msg.params.uri,mimeType:'application/json',text:JSON.stringify(deliverResponse(stateRootFor(process.env.AVC_PROJECT_ROOT||process.cwd()),{}, {...asset,bodyAccess:'Metadata only; use bound load_asset before use'},{maxBytes:4096}))}]});return;
    }
    if (msg.method === 'tools/call') { handleCall(msg.id, msg.params || {}); return; }
    if (msg.method) respondError(msg.id, -32601, `unknown method: ${msg.method}`);
  });

  function respond(id, result) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, result }) + '\n');
  }
  function respondError(id, code, message) {
    process.stdout.write(JSON.stringify({ jsonrpc: '2.0', id, error: { code, message:bytePrefix(String(message),512) } }) + '\n');
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
      let text,toolError=false;
      if(shortcut){
        const input=Object.fromEntries(Object.keys(tedProperties(shortcut.action)).filter(key=>args[key]!==undefined).map(key=>[key,args[key]]));
        const result=await runTedCommand(ROOT,{...input,action:shortcut.action},{runningVersion:VERSION});
        text=JSON.stringify(result);toolError=!!result.error;
      }
      else if(name==='ted_command'){const result=await runTedCommand(ROOT,args,{runningVersion:VERSION});text=JSON.stringify(result);toolError=!!result.error;}
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
        text=JSON.stringify(discoverAssets(ROOT,{...args,kind:'packs'},{collection:'packs'}));
      } else if (name === 'check_update') {
        text = flowCheck(ROOT, { runningVersion: VERSION }).summary;
      } else if (name === 'upgrade') {
        text = flowUpgrade(ROOT, { force: !!args.force }).summary;
      } else if (name === 'generate_panorama') {
        if (!args.offline) await syncCandidates(ROOT);
        text = flowPanorama(ROOT, { view: args.view || 'local', catalogRef: args.catalogRef }).summary;
      } else if (name === 'find_skill') {
        text = JSON.stringify(discoverAssets(ROOT,{...args,kind:'skills'},{collection:'skills'}));
      } else if (name === 'register_skill') {
        text = JSON.stringify(registerLocalSkill(ROOT, args.path));
      } else if (name === 'list_assets') {
        text=JSON.stringify(discoverAssets(ROOT,args));
      } else if (name === 'recommend_assets') {
        text=JSON.stringify(discoverAssets(ROOT,args,{collection:'recommendations'}));
      } else if (name === 'report_asset_use') {
        text=JSON.stringify(recordAssetUse(ROOT,args));
      } else if (name === 'propose_asset') {
        text=JSON.stringify(proposeAsset(ROOT,args));
      } else if (['task_begin','load_asset','task_closeout'].includes(name)) {
        const deploymentFile = deploymentFileFor(ROOT);
        const result=({task_begin:beginTask,load_asset:loadAsset,task_closeout:closeTask})[name](ROOT,args,deploymentFile,{deferDelivery:name==='task_begin'});
        if(name==='load_asset' && result.contextDelivery==='delivered')try{noteDeliveredAsset(ROOT,result,args);}catch(error){result.collectionWarning=error.message;result.taskContinues=true;}
        const view=name==='load_asset'?result:executionResponse(ROOT,args,result);
        text = JSON.stringify(view);
      } else if (name === 'candidate_register') {
        text=JSON.stringify(registerCandidate(ROOT,args));
      } else if (name === 'candidate_match') {
        text=JSON.stringify(matchCandidates(ROOT,args));
      } else if (name === 'candidate_trial') {
        text=JSON.stringify(recordTrial(ROOT,{...args.input,sessionId:args.sessionId||args.input.sessionId,turnId:args.turnId||args.input.turnId,agentId:args.agentId||args.input.agentId}));
      } else if (name === 'candidate_trial_status') {
        text=JSON.stringify(trialStatus(ROOT,args.taskKey));
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
      if(!shortcut&&name!=='ted_command'&&!['find_skill','list_assets','recommend_assets','list_packs','load_asset','task_begin','task_closeout'].includes(name)){
        let value;try{value=JSON.parse(text);}catch{value={text};}
        if(Array.isArray(value)){
          if(Buffer.byteLength(text)>8192)text=JSON.stringify({status:'response-too-large',taskContinues:true,detailsOmitted:true});
          else if(args.sessionId&&args.turnId){try{const sent=deliverContext(stateRootFor(ROOT),args,'array:'+randomUUID(),text);if(sent.status!=='delivered')text=JSON.stringify({status:sent.status,taskContinues:true,detailsOmitted:true});}catch{text=JSON.stringify({status:'unverified',taskContinues:true,detailsOmitted:true});}}
        }else text=JSON.stringify(deliverResponse(stateRootFor(ROOT),args,value,{operationOutcome:mutationOutcome(name,value)}));
      }
      respond(id, { content: [{ type: 'text', text }],...(toolError?{isError:true}:{}) });
    } catch (e) {
      respondError(id, -32603, e.message);
    } finally { release?.(); }
  }
}
