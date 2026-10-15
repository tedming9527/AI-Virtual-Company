import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,realpathSync,rmSync} from 'node:fs';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseTedCommand,runTedCommand} from './ted-commands.js';
// This test process never participates in a real installed client's lease.
for(const key of ['AVC_GENERATION','AVC_DEPLOYMENT_FILE','AVC_CATALOG_ROOT','AVC_PROJECT_ROOT'])delete process.env[key];
test('ted routes exact commands and refuses ambiguous or shell-bearing payloads',()=>{
 for(const prefix of ['/ted','$ted','ted'])assert.equal(parseTedCommand(prefix+' doctor'),'doctor');
 assert.equal(parseTedCommand('/ted 检查更新'),'update');assert.equal(parseTedCommand('/ted'),'help');
 for(const value of ['/ted doctor; touch other','/ted doctor\nrm -rf x','/ted ${secret}','/other doctor','please /ted repair'])assert.throws(()=>parseTedCommand(value));
});
test('repair and status work without a task or source checkout and never silently install',async t=>{
 const home=mkdtempSync(join(tmpdir(),'avc-ted-command-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const base=join(home,'ted-avc-manager');mkdirSync(base);writeFileSync(join(base,'manifest.json'),JSON.stringify({version:'1.6.1',generation:'test'}));writeFileSync(join(base,'deployment.json'),JSON.stringify({scope:'client'}));
 const before=JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home}));
 const result=await runTedCommand('/missing-source',{action:'repair'},{codexHome:home});
 assert.equal(result.applied,false);assert.equal(result.taskContinues,true);assert.equal(result.readOnly,false);
 assert.equal(JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home})),before);
 assert.ok(result.plan.every(p=>p.step!=='disable-sandbox'));
});

function bilingualFixture(t){
 const root=realpathSync(mkdtempSync(join(tmpdir(),'avc-ted-bilingual-')));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'packs/skill/demo'),description='用于检查任务来源和摘要证据，保留原文并核对版本。';mkdirSync(dir,{recursive:true});mkdirSync(join(root,'runtime'));
 const entry=join(dir,'SKILL.md'),body='# Demo\n\nKeep the source and verify its version.\n';writeFileSync(entry,body);
 writeFileSync(join(dir,'meta.json'),JSON.stringify({name:'demo',type:'skill',version:'1.0.0',status:'active',description}));
 writeFileSync(join(root,'bootstrap.json'),JSON.stringify({name:'fixture',version:'1.0.0'}));
 const asset={id:'general:skill:demo',source:'general',type:'skill',name:'demo',version:'1.0.0',entry,entrySha256:createHash('sha256').update(body).digest('hex'),description};
 writeFileSync(join(root,'runtime/asset-inventory.json'),JSON.stringify({schema:'avc.asset-inventory.v1',assets:[asset]}));
 return {root,entry,body,asset,options:{stateRoot:root,catalogRoot:root,codexHome:join(root,'client')}};
}
test('task maintenance write facts survive damaged accounting, including policy changes and paging',async t=>{
 const f=bilingualFixture(t),id='a'.repeat(64),file=join(f.root,'runtime/execution/tasks',id+'.json');mkdirSync(join(file,'..'),{recursive:true});
 writeFileSync(file,JSON.stringify({schema:'avc.execution-task.v1',taskId:id,status:'active',startedAt:new Date(Date.now()-8*86400000).toISOString(),calls:{missing:{tool:'Bash',status:'reserved'}}}));
 const key={sessionId:'tasks',turnId:'one'},dir=join(f.root,'runtime/context');mkdirSync(dir,{recursive:true});
 writeFileSync(join(dir,createHash('sha256').update(JSON.stringify([key.sessionId,''])).digest('hex')+'.json'),'{broken');
 const result=await runTedCommand(f.root,{action:'tasks',operation:'reconcile',policy:{forceCloseDays:5},...key},f.options);
 assert.equal(result.contextDelivery.status,'unverified');assert.equal(result.operationOutcome.changed,1);assert.equal(result.operationOutcome.policyApplied,true);assert.equal(result.operationOutcome.forceCloseDays,5);assert.equal(result.retryable,false);assert.ok(Buffer.byteLength(JSON.stringify(result))<=1024);
 assert.equal(JSON.parse(readFileSync(file)).status,'closed');
});

test('Ted inspect stays read-only; repair, prepare and submit produce a consumed source-bound pair',async t=>{
 const f=bilingualFixture(t),call=input=>runTedCommand(f.root,input,f.options);
 const initial=await call({action:'summary'});assert.equal(initial.readOnly,true);assert.equal(existsSync(join(f.root,'runtime/summary-language')),false);
 const doctor=await call({action:'doctor'});assert.equal(doctor.readOnly,true);assert.equal(existsSync(join(f.root,'runtime/summary-language')),false);
 const repair=await call({action:'repair'});assert.equal(repair.applied,false);assert.equal(repair.readOnly,false);
 const requestId=repair.bilingual.items[0].requestId;assert.equal(repair.bilingual.items[0].pairComplete,false);
 const prepared=await call({action:'summary',operation:'prepare',requestId});assert.equal(prepared.error,undefined);assert.equal(prepared.readOnly,true);
 assert.equal(prepared.bilingual.originalDescription,f.asset.description);
 const p=prepared.bilingual;
 const submit=await call({action:'summary',operation:'submit',requestId,sourceSha256:p.sourceSha256,descriptionSha256:p.descriptionSha256,policyVersion:p.policyVersion,summaries:{en:'Check task sources and summary evidence, preserve the original text, and verify the version.'}});
 assert.equal(submit.error,undefined);assert.equal(submit.readOnly,false);assert.equal(submit.bilingual.pairComplete,true);
 const result=await call({action:'summary'});assert.equal(result.bilingual.items[0].summaries['zh-CN'],f.asset.description);
 assert.match(result.bilingual.items[0].summaries.en,/preserve/);assert.equal(result.bilingual.items[0].semanticReview,'model-declared-unverified');
 assert.equal(readFileSync(f.entry,'utf8'),f.body);assert.equal(existsSync(join(f.options.codexHome,'ted-avc-manager/state/preferences.json')),false);
 assert.throws(()=>parseTedCommand('/ted language en'));
});

test('summary maintenance and stale-generation failures do not hide update or repair results',async t=>{
 const f=bilingualFixture(t),oldHome=process.env.CODEX_HOME;process.env.CODEX_HOME=f.options.codexHome;process.env.AVC_GENERATION='stale';
 t.after(()=>{delete process.env.AVC_GENERATION;if(oldHome===undefined)delete process.env.CODEX_HOME;else process.env.CODEX_HOME=oldHome;});
 mkdirSync(join(f.options.codexHome,'.ted-avc-manager-rebuild.lock'),{recursive:true});
 const update=await runTedCommand(f.root,{action:'update',offline:true},f.options);
 assert.equal(update.remote.status,'offline');assert.ok(update.local);assert.equal(update.bilingual.status,'unavailable');assert.equal(update.bilingual.taskContinues,true);
 const repair=await runTedCommand(f.root,{action:'repair'},f.options);assert.equal(repair.applied,false);assert.ok(repair.plan.length);assert.equal(repair.bilingual.applied,false);
 const failed=await runTedCommand(f.root,{action:'summary',operation:'submit',requestId:'a'.repeat(64)},f.options);
 assert.ok(failed.error);assert.equal(failed.taskContinues,true);
});

test('CLI summary JSON input is bounded, cannot change the action, and reports failed submissions',t=>{
 const f=bilingualFixture(t),input=join(f.root,'input.json'),cli=fileURLToPath(new URL('../cli.js',import.meta.url));
 const run=()=>spawnSync(process.execPath,[cli,'ted','summary','--input',input],{cwd:f.root,env:{...process.env,AVC_GENERATION:'',AVC_PROJECT_ROOT:f.root,AVC_DEPLOYMENT_FILE:'',AVC_CATALOG_ROOT:'',CODEX_HOME:f.options.codexHome},encoding:'utf8'});
 writeFileSync(input,JSON.stringify({operation:'submit',requestId:'a'.repeat(64)}));let result=run();assert.equal(result.status,1);assert.ok(JSON.parse(result.stdout).error);
 writeFileSync(input,JSON.stringify({action:'panorama'}));result=run();assert.equal(result.status,1);assert.match(result.stderr,/without action or command/);
 writeFileSync(input,' '.repeat(16385));result=run();assert.equal(result.status,1);assert.match(result.stderr,/16384/);
});

test('summary optimization routes aliases and reports limits without resetting budgets or claiming host compaction',async t=>{
 const root=mkdtempSync(join(tmpdir(),'avc-summary-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 assert.equal(parseTedCommand('/ted 摘要优化'),'summary');assert.equal(parseTedCommand('/ted summary'),'summary');
 const {deliverContext,contextStatus}=await import('./context-budget.js');const key={sessionId:'s',turnId:'t'};
 deliverContext(root,key,'example','body');
 const result=await runTedCommand(root,{action:'summary',...key});
 assert.equal(result.applied,false);assert.equal(result.readOnly,true);assert.equal(result.usage.turnBytes,4);assert.equal(result.snapshot.status,'no-task-observed');
 assert.equal(contextStatus(root,key).turnBytes,4+Buffer.byteLength(JSON.stringify(result)));assert.match(result.limitations,/cannot erase/);
});

test('complete Ted responses share the cumulative budget; exhaustion and broken accounting keep business work available',async t=>{
 const f=bilingualFixture(t),key={sessionId:'budget-session',turnId:'budget-turn'};
 const {deliverContext,contextStatus,CONTEXT_LIMITS}=await import('./context-budget.js');
 const first=await runTedCommand(f.root,{action:'summary',...key},f.options),second=await runTedCommand(f.root,{action:'summary',...key},f.options);
 for(const response of [first,second]){assert.equal(response.contextDelivery.status,'delivered');assert.equal(response.contextDelivery.responseBytes,Buffer.byteLength(JSON.stringify(response)));}
 assert.equal(contextStatus(f.root,key).turnBytes,Buffer.byteLength(JSON.stringify(first))+Buffer.byteLength(JSON.stringify(second)));
 let remaining=CONTEXT_LIMITS.turnBytes-contextStatus(f.root,key).turnBytes,index=0;
 while(remaining>0){const size=Math.min(8192,remaining);assert.equal(deliverContext(f.root,key,'fill-'+index++,'x'.repeat(size)).status,'delivered');remaining-=size;}
 const exhausted=await runTedCommand(f.root,{action:'update',offline:true,...key},f.options);
 assert.equal(exhausted.contextDelivery.status,'budget-exhausted');assert.equal(exhausted.contextDelivery.accounted,false);assert.equal(exhausted.taskContinues,true);assert.equal(exhausted.remote.status,'offline');assert.ok(exhausted.local);assert.equal(exhausted.bilingual.items,undefined);assert.equal(exhausted.bilingual.appliedCount,1);
 writeFileSync(join(f.root,'bootstrap.json'),JSON.stringify({name:'fixture',version:'诊断\\\n'.repeat(10000)}));
 const large=await runTedCommand(f.root,{action:'update',offline:true,...key},f.options);assert.equal(large.contextDelivery.status,'budget-exhausted');assert.ok(Buffer.byteLength(JSON.stringify(large))<=1024);assert.equal(large.local?.summary,undefined);assert.equal(large.personal,undefined);assert.equal(large.status,undefined);
 const ledger=join(f.root,'runtime/context',createHash('sha256').update(JSON.stringify([key.sessionId,''])).digest('hex')+'.json');writeFileSync(ledger,'broken');
 const broken=await runTedCommand(f.root,{action:'summary',...key},f.options);assert.equal(broken.contextDelivery.status,'unverified');assert.equal(broken.taskContinues,true);assert.equal(broken.bilingual.items,undefined);assert.ok(Buffer.byteLength(JSON.stringify(broken))<=1024);
 const unbound=await runTedCommand(f.root,{action:'summary'},f.options);assert.equal(unbound.contextDelivery.status,'unbound');assert.ok(Buffer.byteLength(JSON.stringify(unbound))<=8192);
});

test('small budget-failure controls retain partial writes and subsequent successful recovery facts',async t=>{
 const f=bilingualFixture(t),key={sessionId:'partial-session',turnId:'partial-turn'},call=input=>runTedCommand(f.root,input,f.options);
 const queued=await call({action:'repair'}),requestId=queued.bilingual.items[0].requestId;
 const p=(await call({action:'summary',operation:'prepare',requestId})).bilingual;
 rmSync(join(f.root,'runtime/summary-language/derived',requestId+'.zh-CN.json'));
 const {deliverContext}=await import('./context-budget.js');for(let i=0;i<8;i++)assert.equal(deliverContext(f.root,key,'fill-'+i,'x'.repeat(8192)).status,'delivered');
 const input={action:'summary',operation:'submit',requestId,sourceSha256:p.sourceSha256,descriptionSha256:p.descriptionSha256,policyVersion:p.policyVersion,...key};
 const original=fs.linkSync,mock=t.mock.method(fs,'linkSync',(source,target)=>{if(target.endsWith('.en.json'))throw Object.assign(Error('second language write denied'),{code:'EACCES'});return original(source,target);});syncBuiltinESMExports();
 try {
  const result=await call({...input,summaries:{'zh-CN':f.asset.description,en:'Preserve the source text and verify its version before using this summary.'}});
  assert.ok(result.error);assert.equal(result.contextDelivery.status,'budget-exhausted');assert.equal(result.bilingual.partialWrite,true);assert.equal(result.bilingual.writesApplied,1);assert.deepEqual(result.bilingual.writtenLanguages,['zh-CN']);assert.ok(Buffer.byteLength(JSON.stringify(result))<=1024);
 }finally{mock.mock.restore();syncBuiltinESMExports();}
 const ledger=join(f.root,'runtime/context',createHash('sha256').update(JSON.stringify([key.sessionId,''])).digest('hex')+'.json');writeFileSync(ledger,'broken');
 const remove=fs.rmSync,cleanup=t.mock.method(fs,'rmSync',(path,options)=>{if(String(path).endsWith('.tmp'))throw Object.assign(Error('temporary cleanup denied'),{code:'EACCES'});return remove(path,options);});syncBuiltinESMExports();
 try {
  const recovered=await call({...input,summaries:{en:'Preserve the source text and verify its version before using this summary.'}});
  assert.equal(recovered.error,undefined);assert.equal(recovered.contextDelivery.status,'unverified');assert.equal(recovered.bilingual.pairComplete,true);assert.equal(recovered.bilingual.writesApplied,1);assert.deepEqual(recovered.bilingual.writtenLanguages,['en']);assert.equal(recovered.bilingual.cleanupWarning,'temporary-record-cleanup-failed');assert.ok(Buffer.byteLength(JSON.stringify(recovered))<=1024);
 }finally{cleanup.mock.restore();syncBuiltinESMExports();}
});

test('exhausted repair controls aggregate nested partial writes and deferred maintenance facts',async t=>{
 const f=bilingualFixture(t),key={sessionId:'repair-partial-session',turnId:'repair-partial-turn'},derived=join(f.root,'runtime/summary-language/derived');
 const {deliverContext}=await import('./context-budget.js');for(let i=0;i<8;i++)assert.equal(deliverContext(f.root,key,'fill-'+i,'x'.repeat(8192)).status,'delivered');
 mkdirSync(derived,{recursive:true});fs.chmodSync(derived,0o500);
 try {
  const result=await runTedCommand(f.root,{action:'repair',...key},f.options);
  assert.equal(result.contextDelivery.status,'budget-exhausted');assert.equal(result.bilingual.appliedCount,1);assert.equal(result.bilingual.partialWrite,true);assert.equal(result.bilingual.writesApplied,1);assert.equal(result.bilingual.counts.deferred,1);assert.equal(result.bilingual.incomplete,true);assert.equal(result.applied,false);
  assert.ok(Buffer.byteLength(JSON.stringify(result))<=1024);assert.equal(fs.readdirSync(join(f.root,'runtime/summary-language/requests')).length,1);assert.equal(fs.readdirSync(derived).length,0);
 }finally{fs.chmodSync(derived,0o700);}
});

test('summary emits bounded handoff with contiguous unread cursor and no fabricated decisions',async t=>{
 const root=mkdtempSync(join(tmpdir(),'avc-handoff-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'runtime/execution/tasks');mkdirSync(dir,{recursive:true});
 const asset={source:'general',type:'skill',name:'demo',entry:'SKILL.md',sha256:'b'.repeat(64),complete:false,deliveries:[{mode:'chunk',startByte:0,endByte:256},{mode:'chunk',startByte:512,endByte:768}]};
 writeFileSync(join(dir,'a'.repeat(64)+'.json'),JSON.stringify({sessionId:'s',turnId:'t',contract:{goal:'Continue review'},role:{id:'ai-engineer'},status:'active',assets:Array(20).fill(asset),calls:{one:{status:'reserved'}}}));
 const result=await runTedCommand(root,{action:'summary',sessionId:'s',turnId:'t'});
 assert.equal(result.snapshot.goal,'Continue review');assert.equal(result.snapshot.assets.length,8);assert.equal(result.snapshot.omittedAssets,12);
 assert.equal(result.snapshot.assets[0].nextCursor.offset,256);assert.equal(result.snapshot.pendingCalls,1);assert.match(result.snapshot.decisions,/unknown/);
 assert.ok(Buffer.byteLength(JSON.stringify(result))<8192);
 const child=await runTedCommand(root,{action:'summary',sessionId:'s',turnId:'t',agentId:'child'});
 assert.equal(child.snapshot.status,'no-task-observed');assert.equal(child.usage.agentTurnBytes,0);assert.ok(child.usage.turnBytes>0);
});
