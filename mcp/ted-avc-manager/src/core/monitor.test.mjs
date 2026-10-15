import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,readdirSync,symlinkSync,mkdirSync,realpathSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {request} from 'node:http';
import {MonitorStore} from '../monitor/store.js';
import {startMonitorServer} from '../monitor/service.js';
import {control} from '../monitor/commands.js';
import {instance,TTL,normalize,hash} from '../monitor/common.js';
import {emitMonitor,inventoryIdentity,loaderIdentity} from '../monitor/emit.js';
import {beginTask,loadAsset} from './execution.js';
import {runCodexHook} from './codex-hooks.js';
import {parseTedCommand,runTedCommand} from './ted-commands.js';
for(const key of ['AVC_GENERATION','AVC_DEPLOYMENT_FILE','AVC_CATALOG_ROOT','AVC_PROJECT_ROOT'])delete process.env[key];
function fixture(t){const root=realpathSync(mkdtempSync(join(tmpdir(),'ted-monitor-')));t.after(()=>rmSync(root,{recursive:true,force:true}));return root;}
const asset={id:'demo',name:'示例',type:'skill',version:'1.0.0',sha256:'a'.repeat(64),stage:'formal',status:'stable'};
const event=(extra={})=>({kind:'summary',asset,sessionId:'session-a',turnId:'turn-a',...extra});
async function connect(service){const current=instance(service.store.dir.replace(/\/runtime\/monitor$/,''));const opened=await control(current,'open');const bootstrap=new URLSearchParams(new URL(opened.url).hash.slice(1)).get('bootstrap');const auth=await fetch(service.base+'/api/auth',{method:'POST',headers:{Origin:service.base,'Content-Type':'application/json'},body:JSON.stringify({bootstrap})});assert.equal(auth.status,200);const cookie=auth.headers.get('set-cookie').split(';')[0];const controller=new AbortController();const stream=await fetch(service.base+'/api/stream?pageId=example-page-id',{headers:{Cookie:cookie},signal:controller.signal});assert.equal(stream.status,200);return {current,bootstrap,cookie,controller,stream};}
async function settle(predicate){for(let n=0;n<50;n++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}assert.ok(predicate(),'event did not arrive');}

test('monitor excludes unknown assets and strips bodies, paths, queries and raw outcomes',t=>{
 const root=fixture(t),store=new MonitorStore(root);assert.throws(()=>store.append(event({asset:{...asset,stage:'draft'}})),/invalid/);
 const record=store.append(event({body:'SECRET',query:'PRIVATE',tool_input:{cmd:'credentials'},bytes:24}));assert.equal(record.bytes,24);assert.equal(JSON.stringify(store.query()).includes('SECRET'),false);assert.equal(JSON.stringify(store.query()).includes('credentials'),false);
 assert.equal(inventoryIdentity(root,{source:'local-custom',management:'discovered-unregistered',...asset}),null);
 assert.equal(loaderIdentity(root,{source:'general',...asset},{status:'candidate'}),null);
 assert.equal(emitMonitor(root,{},event()).status,'unavailable');
});
test('24-hour TTL survives restart and filters, exact boundary expires; source and unknown files untouched',async t=>{
 const root=fixture(t);let now=1000;const clock=()=>now,store=new MonitorStore(root,{clock});const source=join(root,'source.md');writeFileSync(source,'persistent user source');store.append(event());now+=TTL-1;assert.equal(store.query().total,1);const restored=new MonitorStore(root,{clock});await restored.restore();assert.equal(restored.query().total,1);now++;assert.equal(restored.query().total,0);assert.equal(readFileSync(source,'utf8'),'persistent user source');
 const unknown={...normalize(event(),now),unexpectedBody:'must never expose'};writeFileSync(join(restored.records,hash(JSON.stringify(unknown))+'.json'),JSON.stringify(unknown));
 writeFileSync(join(restored.records,'unknown.json'),'leave me');const third=new MonitorStore(root,{clock});await third.restore();assert.equal(third.health.unknownFiles,2);assert.equal(readFileSync(join(restored.records,'unknown.json'),'utf8'),'leave me');assert.equal(third.append(event()),null);
});
test('capacity is bounded; type/session/time filters and chart counts use same records',t=>{
 const root=fixture(t);let now=10;const store=new MonitorStore(root,{clock:()=>now,maxRecords:3});store.append(event());now++;store.append(event({asset:{...asset,id:'candidate-demo',type:'knowledge',stage:'candidate'}}));store.append(event({sessionId:'session-b',kind:'chunk'}));store.append(event({sessionId:'session-b',kind:'deduplicated'}));assert.equal(store.query().total,3);assert.equal(readdirSync(store.records).length,3);assert.equal(store.health.capacityEvictions,1);
 const result=store.query({type:'knowledge',session:'session-a',from:11,to:12});assert.equal(result.total,1);assert.deepEqual(result.counts.summary,{candidate:1,formal:0});assert.equal(result.typeCounts.knowledge,1);
});
test('symlinked cache and changed owned records cannot delete external/unknown material',t=>{
 const root=fixture(t),store=new MonitorStore(root);const record=store.append(event()),filename=hash(JSON.stringify(record))+'.json',external=join(root,'outside.json');writeFileSync(external,'keep');rmSync(join(store.records,filename));symlinkSync(external,join(store.records,filename));store.clock=()=>record.recordedAt+TTL;assert.equal(store.query().total,0);assert.ok(store.health.cleanupFailures);assert.equal(readFileSync(external,'utf8'),'keep');
 const other=fixture(t);mkdirSync(join(other,'runtime'),{recursive:true});symlinkSync(root,join(other,'runtime','monitor'));assert.throws(()=>new MonitorStore(other),/unsafe/);
});
test('HTTP auth is one-use, Host/Origin protected; captures only with live page, failures stay auxiliary',async t=>{
 const root=fixture(t),service=await startMonitorServer(root,{tickMs:20,leaseMs:1000});t.after(()=>service.close());
 assert.equal((await fetch(service.base+'/api/events')).status,401);assert.equal(await new Promise(resolve=>{const req=request(service.base+'/api/status',{headers:{Host:'evil.example'}},res=>{res.resume();resolve(res.statusCode);});req.end();}),403);
 const {cookie,current,bootstrap,controller}=await connect(service);t.after(()=>controller.abort());
 assert.equal((await fetch(service.base+'/api/auth',{method:'POST',headers:{Origin:service.base},body:JSON.stringify({bootstrap})})).status,401);
 assert.equal((await fetch(service.base+'/internal/event',{method:'POST',headers:{Origin:'https://evil.example','X-Ted-Control':current.secret},body:JSON.stringify(event())})).status,403);
 assert.equal(emitMonitor(root,{},event({asset:{...asset,name:'<script>alert(1)</script>'}})).status,'queued');await settle(()=>service.store.query().total===1);
 const response=await fetch(service.base+'/api/events?type=skill',{headers:{Cookie:cookie}});assert.equal((await response.json()).total,1);
 controller.abort();await settle(()=>instance(root).captureUntil===0);assert.equal(emitMonitor(root,{},event()).status,'inactive');assert.equal(service.store.query().total,1);
 await control(current,'stop');assert.equal(service.status().mode,'cleanup-only');assert.equal((await fetch(service.base+'/api/events',{headers:{Cookie:cookie}})).status,503);
 assert.equal(parseTedCommand('/ted 监控'),'monitor');const status=await runTedCommand(root,{action:'monitor',operation:'status'});assert.equal(status.mode,'cleanup-only');
});
test('actual bound loader emits summary then dedup; monitor corruption cannot prevent source delivery',async t=>{
 const root=fixture(t),version=JSON.parse(readFileSync(new URL('../../package.json',import.meta.url))).version;writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'demo',version}));
 for(const [type,name,entry]of [['role','ai-engineer','PROFILE.md'],['skill','demo','SKILL.md']]){const dir=join(root,'packs',type,name);mkdirSync(dir,{recursive:true});writeFileSync(join(dir,'meta.json'),JSON.stringify({type,name,version:'1.0.0',status:'stable',nameZh:'示例',professionZh:'工程师',displayName:'示例·工程师'}));writeFileSync(join(dir,entry),'# Source\n\nReal bounded content.\n');}
 const deployment=join(root,'deployment.json');writeFileSync(deployment,JSON.stringify({organization:'demo',projects:[{root,roles:['ai-engineer'],execution:{enabled:true,mode:'monitor',maxToolCalls:10,bootstrapTools:[]}}]}));
 runCodexHook({cwd:root,session_id:'session-a',turn_id:'turn-a',hook_event_name:'UserPromptSubmit'},deployment);const receipt=JSON.parse(readFileSync(join(root,'runtime/hooks/sessions',hash('session-a')+'.json'))).turns['turn-a'].receipt;
 const key={sessionId:'session-a',turnId:'turn-a',receipt};beginTask(root,{...key,role:'ai-engineer',goal:'verify real monitor',allowedTools:['Bash'],maxToolCalls:10},deployment);
 const files={};for(const [type,name,entry]of [['role','ai-engineer','PROFILE.md'],['skill','demo','SKILL.md']])for(const file of [entry,'meta.json']){const rel='packs/'+type+'/'+name+'/'+file;files[rel]=hash(readFileSync(join(root,rel)));}writeFileSync(join(root,'.distribution.json'),JSON.stringify({schema:'avc.distribution.v1',owner:'central',files}));
 const service=await startMonitorServer(root);t.after(()=>service.close());const page=await connect(service);t.after(()=>page.controller.abort());
 const input={...key,source:'general',type:'skill',name:'demo'},first=loadAsset(root,input,deployment),second=loadAsset(root,input,deployment);assert.equal(first.contextDelivery,'delivered');assert.equal(second.contextDelivery,'already-delivered');await settle(()=>service.store.query().total===2);assert.deepEqual(new Set(service.store.query().events.map(e=>e.kind)),new Set(['summary','deduplicated']));

 const catalogFile=join(root,'packs/knowledge/catalog.json');mkdirSync(join(root,'packs/knowledge'),{recursive:true});const candidates={schema:'avc.knowledge-catalog.v1',entries:['first-entry','second-entry'].map(id=>({id,status:'candidate',detail:'packs/skill/demo/SKILL.md',sha256:hash(readFileSync(join(root,'packs/skill/demo/SKILL.md')))}))};writeFileSync(catalogFile,JSON.stringify(candidates));const manifest=JSON.parse(readFileSync(join(root,'.distribution.json')));manifest.files['packs/knowledge/catalog.json']=hash(readFileSync(catalogFile));writeFileSync(join(root,'.distribution.json'),JSON.stringify(manifest));
 const candidateLoad=loadAsset(root,{...input,mode:'chunk'},deployment);assert.equal(candidateLoad.contextDelivery,'delivered');await settle(()=>service.store.query().total===3);assert.equal(service.store.query({type:'knowledge'}).total,1,'several catalog entries must not multiply one document delivery');assert.equal(service.store.query({type:'knowledge'}).events[0].asset.stage,'candidate');
 const snapshot=()=>{const result={};const walk=(dir,prefix='')=>{for(const entry of readdirSync(dir,{withFileTypes:true})){if(!prefix&&entry.name==='monitor')continue;const rel=prefix+entry.name;if(entry.isDirectory())walk(join(dir,entry.name),rel+'/');else result[rel]=hash(readFileSync(join(dir,entry.name)));}};walk(join(root,'runtime'));return result;};
 const before=snapshot();for(const path of ['/api/events','/api/sessions','/api/assets','/api/status'])assert.equal((await fetch(service.base+path,{headers:{Cookie:page.cookie}})).status,200);await control(page.current,'status');assert.deepEqual(snapshot(),before,'viewing must not change any non-monitor runtime counters or context ledgers');
 const originalClock=service.store.clock;service.store.clock=()=>Date.now()+TTL+1;assert.equal(service.store.query().total,0);assert.deepEqual(snapshot(),before,'monitor TTL must not touch original events, task facts or budgets');service.store.clock=originalClock;
 writeFileSync(join(root,'packs/skill/demo/SKILL.md'),'# Unpublished draft revision\n');const changed=loadAsset(root,{...input,mode:'chunk'},deployment);assert.equal(changed.contextDelivery,'delivered');await new Promise(r=>setTimeout(r,120));assert.equal(service.store.query().total,0,'unpublished central edits must not be labeled formal');
 writeFileSync(join(service.store.dir,'instance.json'),'broken');const next=loadAsset(root,{...input,mode:'summary'},deployment);assert.equal(next.contextDelivery,'delivered');assert.ok(next.content);assert.equal(service.store.query().total,0);
});

test('multiple pages keep sampling until last closes; crashed-page lease expires without deleting retained data',async t=>{
 const root=fixture(t);let now=Date.now();const service=await startMonitorServer(root,{clock:()=>now,tickMs:10,leaseMs:100});t.after(()=>service.close());const first=await connect(service);t.after(()=>first.controller.abort());
 const secondController=new AbortController();t.after(()=>secondController.abort());const second=await fetch(service.base+'/api/stream?pageId=second-page-id',{headers:{Cookie:first.cookie},signal:secondController.signal});assert.equal(second.status,200);assert.equal(service.status().activePages,2);
 first.controller.abort();await settle(()=>service.status().activePages===1);assert.ok(instance(root).captureUntil>now);service.store.append(event());now+=101;await settle(()=>service.status().activePages===0);assert.equal(instance(root).captureUntil,0);assert.equal(service.store.query().total,1);
});
test('signed pagination binds filters and fact watermark; concurrent arrivals do not duplicate or skip original records',async t=>{
 const root=fixture(t),service=await startMonitorServer(root);t.after(()=>service.close());const page=await connect(service);t.after(()=>page.controller.abort());for(let n=0;n<5;n++)service.store.append(event({asset:{...asset,name:'asset '+n}}));
 const headers={Cookie:page.cookie},query=new URLSearchParams({from:'0',to:String(Date.now()+10000),type:'skill',limit:'2'}),url=service.base+'/api/events?';const first=await(await fetch(url+query,{headers})).json();assert.ok(first.nextCursor);service.store.append(event({asset:{...asset,name:'later arrival'}}));let cursor=first.nextCursor,ids=new Set(first.events.map(e=>e.id));
 while(cursor){query.set('cursor',cursor);const next=await(await fetch(url+query,{headers})).json();assert.equal(next.total,5);for(const e of next.events){assert.equal(ids.has(e.id),false);ids.add(e.id);}cursor=next.nextCursor;}assert.equal(ids.size,5);
 query.set('cursor',first.nextCursor);query.set('type','knowledge');assert.equal((await fetch(url+query,{headers})).status,409);
 query.set('cursor','forged.payload');assert.equal((await fetch(url+query,{headers})).status,409);
});
