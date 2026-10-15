import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {spawn} from 'node:child_process';
import {createInterface} from 'node:readline';
test('stdio handshake serves management tools and malformed resource URI does not terminate connection',async t=>{
 mkdirSync('runtime/cache',{recursive:true});const root=mkdtempSync(resolve('runtime/cache/server-'));mkdirSync(join(root,'runtime'));mkdirSync(join(root,'packs'));writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'probe',version:'1.2.0'}));
 const home=join(root,'client');mkdirSync(join(home,'ted-avc-manager/package'),{recursive:true});writeFileSync(join(home,'ted-avc-manager/manifest.json'),JSON.stringify({schema:'avc.client-installation.v1',owner:'ted-avc-manager',version:'1.0.0',generation:'test',downstream:{central:root}}));writeFileSync(join(home,'ted-avc-manager/package/package.json'),JSON.stringify({version:'1.0.0'}));
 const p=spawn(process.execPath,[fileURLToPath(new URL('../cli.js',import.meta.url)),'server'],{cwd:root,env:{...process.env,CODEX_HOME:home,AVC_GENERATION:'',AVC_PROJECT_ROOT:root,AVC_DEPLOYMENT_FILE:'',AVC_CATALOG_ROOT:''},stdio:['pipe','pipe','pipe']});t.after(()=>{p.kill();rmSync(root,{recursive:true,force:true});});
 let seq=0;const pending=new Map();createInterface({input:p.stdout}).on('line',line=>{const msg=JSON.parse(line);pending.get(msg.id)?.(msg);});
 const rpc=(method,params={})=>new Promise((res,rej)=>{const id=++seq,timer=setTimeout(()=>rej(new Error('MCP response timeout')),5000);pending.set(id,msg=>{clearTimeout(timer);pending.delete(id);res(msg);});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 const hello=await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'probe',version:'1'}});assert.equal(hello.result.serverInfo.name,'ted-avc-manager');
 p.stdin.write(JSON.stringify({jsonrpc:'2.0',method:'notifications/initialized'})+'\n');
 const tools=(await rpc('tools/list')).result.tools;assert.ok(tools.some(t=>t.name==='task_begin'));assert.ok(tools.some(t=>t.name==='find_skill'));
 for (const name of ['workflow_create','workflow_status','workflow_cancel','workflow_templates','discover_capabilities','validate_local_skill','list_skill_candidates','candidate_register','candidate_match','candidate_trial','candidate_trial_status']) assert.ok(tools.some(t=>t.name===name));
 assert.ok(tools.find(t=>t.name==='task_begin').inputSchema.properties.workflowId);
 for (const name of ['task_begin','load_asset','task_closeout']) {
  assert.deepEqual(tools.find(t=>t.name===name).annotations,{readOnlyHint:false,destructiveHint:false,openWorldHint:false});
 }
 assert.equal(tools.find(t=>t.name==='upgrade').annotations,undefined);
 assert.ok(tools.find(t=>t.name==='task_begin').inputSchema.properties.toolCapabilities);
 assert.ok(tools.find(t=>t.name==='find_skill').inputSchema.properties.cursor);
 assert.ok(tools.find(t=>t.name==='load_asset').inputSchema.properties.documentId);
 for(const name of ['ted_help','ted_scores','ted_doctor','ted_status'])assert.equal(tools.find(t=>t.name===name).annotations.readOnlyHint,true);
 for(const name of ['ted_panorama','ted_update','ted_repair','ted_summary'])assert.equal(tools.find(t=>t.name===name).annotations.readOnlyHint,false);
 assert.equal(tools.some(t=>t.name==='ted_language'),false);
 assert.deepEqual((await rpc('prompts/list')).result.prompts.map(p=>p.name),['ted']);
 const prompt=await rpc('prompts/get',{name:'ted',arguments:{action:'doctor'}});assert.match(prompt.result.messages[0].content.text,/ted_doctor/);
 assert.equal((await rpc('prompts/get',{name:'ted',arguments:{action:'doctor;install'}})).error.code,-32602);
 // A stale engine must still serve read-only diagnosis; fixed doctor cannot be
 // redirected to panorama by an extra action argument in a raw protocol call.
 const doctor=await rpc('tools/call',{name:'ted_doctor',arguments:{action:'panorama'}});assert.equal(JSON.parse(doctor.result.content[0].text).action,'doctor');
 const summary=await rpc('tools/call',{name:'ted_summary',arguments:{sessionId:'probe',turnId:'probe'}});
 const optimized=JSON.parse(summary.result.content[0].text);assert.equal(optimized.action,'summary');assert.equal(optimized.applied,false);
 assert.equal(optimized.readOnly,true);assert.ok(optimized.bilingual);
 const failedSubmit=await rpc('tools/call',{name:'ted_summary',arguments:{operation:'submit',requestId:'a'.repeat(64)}});
 assert.equal(failedSubmit.result.isError,true);assert.equal(JSON.parse(failedSubmit.result.content[0].text).taskContinues,true);
 assert.ok(tools.find(t=>t.name==='load_asset').inputSchema.properties.cursor);
 const repair=await rpc('tools/call',{name:'ted_repair',arguments:{}});assert.equal(JSON.parse(repair.result.content[0].text).applied,false);
 const telemetry=join(root,'packs/skill/telemetry');mkdirSync(telemetry,{recursive:true});
 const body='# Satellite telemetry\n',description='Inspect satellite telemetry and preserve source evidence before maintenance.';
 writeFileSync(join(telemetry,'SKILL.md'),body);writeFileSync(join(telemetry,'meta.json'),JSON.stringify({type:'skill',name:'telemetry',version:'1.0.0',status:'active',description,rubric:['source']}));
 writeFileSync(join(root,'runtime/asset-inventory.json'),JSON.stringify({schema:'avc.asset-inventory.v1',assets:[{id:'general:'+telemetry,source:'general',entry:join(telemetry,'SKILL.md'),entrySha256:(await import('node:crypto')).createHash('sha256').update(body).digest('hex'),description,version:'1.0.0'}]}));
 const objectCall=async(name,args)=>{const r=await rpc('tools/call',{name,arguments:args});assert.equal(r.error,undefined,JSON.stringify(r.error));return JSON.parse(r.result.content[0].text);};
 const queue=await objectCall('ted_repair',{}),requestId=queue.bilingual.items[0].requestId;
 const prepared=(await objectCall('ted_summary',{operation:'prepare',requestId})).bilingual;
 const done=await objectCall('ted_summary',{...prepared,operation:'submit',requestId,summaries:{'zh-CN':'检查卫星遥测数据，维护前核对来源并保留原始证据。'}});assert.equal(done.bilingual.pairComplete,true);
 mkdirSync(join(root,'rules'));writeFileSync(join(root,'rules/source.md'),'# 来源规则\n\n必须保留原始证据。');
 const resource=await rpc('resources/read',{uri:'tedavc://asset/'+encodeURIComponent('general:document:rules/source.md')});
 const metadata=JSON.parse(resource.result.contents[0].text);assert.equal(metadata.load.documentId,'general:document:rules/source.md');assert.match(metadata.sourceSha256,/^[a-f0-9]{64}$/);assert.equal(metadata.searchText,undefined);
 for(const name of ['find_skill','list_assets','recommend_assets']){
  const page=await objectCall(name,{query:'卫星遥测',sessionId:'mcp-search',turnId:'one',agentId:name});assert.equal(page[({find_skill:'skills',list_assets:'assets',recommend_assets:'recommendations'})[name]][0].name,'telemetry');assert.equal(page.contextDelivery.accounted,true);assert.ok(Buffer.byteLength(JSON.stringify(page))<=4096);
 }
 const update=await rpc('tools/call',{name:'check_update',arguments:{}});assert.match(update.result.content[0].text,/已安装客户端 v1.0.0/);assert.match(update.result.content[0].text,/中央仓库声明 v1.2.0/);assert.match(update.result.content[0].text,/可升级/);assert.match(update.result.content[0].text,/当前 MCP 进程/);
 const templates=await rpc('tools/call',{name:'workflow_templates',arguments:{}});assert.deepEqual(JSON.parse(templates.result.content[0].text),[]);
 const invalid=await rpc('tools/call',{name:'discover_capabilities',arguments:{zhQuery:'only English',enQuery:'skills'}});assert.match(invalid.error.message,/Chinese/);
 const candidate={id:'mcp-trial',type:'framework',version:'1.0.0',title:'Browser review',hypothesis:'May reduce defects',triggers:['frontend review'],exclude:['payment'],scope:'One local fixture',validation:'Compare found issues',expectedCost:'Up to five minutes',sources:[{kind:'research',url:'https://example.com/study/v1',revision:'v1'}],components:[],target:{kind:'pack',paths:['packs/framework/browser-review']},eligibility:'reversible',status:'candidate'};
 const call=async(name,arguments_)=>{const response=await rpc('tools/call',{name,arguments:arguments_});assert.equal(response.error,undefined,JSON.stringify(response.error));return JSON.parse(response.result.content[0].text);};
 const saved=await call('candidate_register',{candidate});assert.equal(saved.publication,'none');
 const taskKey='stdio-task',context={taskKey,query:'frontend review'};
 assert.equal((await call('candidate_match',context)).recommendations[0].candidateId,candidate.id);
 const input={taskKey,candidateId:candidate.id,sha256:saved.sha256};
 await call('candidate_trial',{input:{...input,action:'offer',...context,prompt:'Try this unverified checker?',reason:'Reviewing a frontend fixture'}});
 await call('candidate_trial',{input:{...input,action:'decide',choice:'declined',responseSource:'user',userResponse:'Skip this trial'}});
 assert.equal((await call('candidate_match',context)).recommendations.length,0);
 assert.equal((await call('candidate_trial_status',{taskKey})).trials[0].status,'declined');
 // This response belongs to a synthetic user fixture, never a real user's
 // consent or feedback. Exercise the full public protocol against real bytes.
 const acceptedKey='stdio-accepted-fixture',accepted={...input,taskKey:acceptedKey};
 const offered=await call('candidate_trial',{input:{...accepted,action:'offer',query:'frontend review',prompt:'Try an unverified browser-review checklist on this isolated fixture? Budget five minutes; record findings and costs.',reason:'Matches the fixture review'}});
 assert.match(offered.prompt,/unverified/);
 const premature=await rpc('tools/call',{name:'candidate_trial',arguments:{input:{...accepted,action:'start'}}});assert.match(premature.error.message,/explicit acceptance/);
 await call('candidate_trial',{input:{...accepted,action:'decide',choice:'accepted',responseSource:'user',userResponse:'Synthetic user fixture: try this local checklist'}});
 await call('candidate_trial',{input:{...accepted,action:'start'}});
 const started=performance.now(),fixtureFile=join(root,'review.html');writeFileSync(fixtureFile,'<button>Save</button>');
 const before=readFileSync(fixtureFile,'utf8').includes('<button>'),after=readFileSync(fixtureFile,'utf8').includes('<button>');
 const artifact=join(root,'trial-result.json');writeFileSync(artifact,JSON.stringify({synthetic:true,baseline:before,checklist:after,changed:before!==after}));
 const elapsed=(performance.now()-started)/60000;
 const completed=await call('candidate_trial',{input:{...accepted,action:'result',effect:'no-change',comparison:'baseline',summary:'Synthetic fixture: both inspections found the same button; no improvement measured.',artifacts:[{path:artifact}],costs:{timeMinutes:{value:elapsed,basis:'observed'},tokens:{value:null,basis:'unknown'},money:{value:null,basis:'unknown'},reworkMinutes:{value:null,basis:'unknown'}}}});
 assert.equal(completed.status,'completed');assert.equal(completed.result.effect,'no-change');assert.equal(completed.result.costs.timeMinutes.value,elapsed);assert.equal(completed.result.costs.tokens.value,null);assert.equal(completed.result.feedback.choice,'unknown');assert.equal(completed.result.review,'pending');assert.match(completed.result.artifacts[0].sha256,/^[a-f0-9]{64}$/);
 const queried=(await call('candidate_trial_status',{taskKey:acceptedKey})).trials[0];assert.deepEqual(queried.result,completed.result);
 assert.equal((await call('candidate_match',{taskKey:acceptedKey,query:'frontend review'})).recommendations.length,0);
 assert.equal((await call('candidate_match',{taskKey:'unrelated',query:'payment frontend review'})).recommendations.length,0);
 assert.equal((await rpc('resources/read',{uri:'tedavc://asset/%INVALID'})).error.code,-32602);
 assert.ok((await rpc('resources/list')).result.resources);
});
test('MCP mutation outcomes survive exhausted, damaged and oversized context delivery without claiming task success',async t=>{
 mkdirSync('runtime/cache',{recursive:true});const root=mkdtempSync(resolve('runtime/cache/server-mutation-'));
 mkdirSync(join(root,'packs/role/ai-engineer'),{recursive:true});writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'probe',version:'1.0.0'}));
 writeFileSync(join(root,'packs/role/ai-engineer/meta.json'),JSON.stringify({type:'role',name:'ai-engineer',version:'1.0.0'}));writeFileSync(join(root,'packs/role/ai-engineer/PROFILE.md'),'# Fixture role');
 const {deliverContext}=await import('./context-budget.js'),{createHash}=await import('node:crypto');
 const key={sessionId:'exhausted',turnId:'t'};for(let i=0;i<8;i++)deliverContext(root,key,'fill'+i,'x'.repeat(8192));
 const broken={sessionId:'broken',turnId:'t'};deliverContext(root,broken,'seed','seed');
 writeFileSync(join(root,'runtime/context',createHash('sha256').update(JSON.stringify(['broken',''])).digest('hex')+'.json'),'{broken');
 const p=spawn(process.execPath,[fileURLToPath(new URL('../cli.js',import.meta.url)),'server'],{cwd:root,env:{...process.env,CODEX_HOME:join(root,'home'),AVC_GENERATION:'',AVC_PROJECT_ROOT:root,AVC_DEPLOYMENT_FILE:'',AVC_CATALOG_ROOT:''},stdio:['pipe','pipe','pipe']});t.after(()=>{p.kill();rmSync(root,{recursive:true,force:true});});
 let seq=0;const pending=new Map();createInterface({input:p.stdout}).on('line',line=>{const msg=JSON.parse(line);pending.get(msg.id)?.(msg);});
 const rpc=(method,params={})=>new Promise((res,rej)=>{const id=++seq,timer=setTimeout(()=>rej(Error('MCP response timeout')),5000);pending.set(id,msg=>{clearTimeout(timer);pending.delete(id);res(msg);});p.stdin.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});
 await rpc('initialize',{protocolVersion:'2024-11-05',capabilities:{},clientInfo:{name:'fixture',version:'1'}});
 for(const [id,binding,count,status]of [['exhausted-flow',key,1,'budget-exhausted'],['damaged-flow',broken,1,'unverified'],['large-flow',{},32,'response-too-large']]){
  const spec={schema:'avc.workflow.v1',id,title:'Fixture',goal:'Prepare fixture only',owner:'ai-engineer',assets:[],maxParallel:1,maxAttemptsTotal:count,nodes:Array.from({length:count},(_,i)=>({id:'step'+i,title:'Fixture step',role:'ai-engineer',assets:[],dependsOn:[],maxAttempts:1,executor:{kind:'native',allowedTools:['Bash'],maxToolCalls:1},outputs:['result'+i+'.txt'],acceptance:'A real output exists. '.repeat(20)}))};
  const response=await rpc('tools/call',{name:'workflow_create',arguments:{...binding,spec}});assert.equal(response.error,undefined);
  const raw=response.result.content[0].text,value=JSON.parse(raw),persisted=JSON.parse(readFileSync(join(root,'runtime/workflows',id,'state.json')));
  assert.equal(value.status,status);assert.ok(Buffer.byteLength(raw)<=1024);assert.equal(value.taskContinues,true);
  assert.equal(value.operationOutcome.workflowId,persisted.spec.id);assert.equal(value.operationOutcome.businessStatus,persisted.status);
  assert.equal(value.operationOutcome.operationReturned,true);assert.equal(value.operationOutcome.persistence,'workflow-state-available');
  assert.equal(value.operationOutcome.success,undefined);assert.equal(value.contextDelivery.accounted,false);
 }
 const declined=await rpc('tools/call',{name:'workflow_create',arguments:{...key,spec:{id:'invalid'}}});assert.ok(declined.error);assert.equal(declined.result,undefined);
});
