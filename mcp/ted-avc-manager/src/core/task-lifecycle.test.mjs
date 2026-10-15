import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import os from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {taskPolicy,noteTaskEvent,lifecycleView,settleInactive,reconcileTasks,noteSessionLifecycle,syncSessionLifecycle,configureTaskPolicy,sweepTaskLifecycle} from './task-lifecycle.js';
import {cleanupTaskLogs,collectedSignalSummary} from '../governance/task-retention.js';
import {withRawLogLock} from './raw-log.js';
import {startTaskMaintenance} from '../governance/task-maintenance.js';
import {clientStatus} from './client-status.js';
import {spawnSync} from 'node:child_process';
const DAY=86400000,now=Date.parse('2026-10-15T00:00:00Z'),at=n=>new Date(now-n*DAY).toISOString(),sha=v=>createHash('sha256').update(v).digest('hex');
function task(days=8){return {schema:'avc.execution-task.v1',taskId:'a'.repeat(64),status:'active',startedAt:at(days),calls:{missing:{tool:'Bash',status:'reserved',admittedAt:at(days)}},assets:[]};}
function fixture(t){const root=fs.realpathSync(fs.mkdtempSync(join(os.tmpdir(),'ted-task-life-')));t.after(()=>fs.rmSync(root,{recursive:true,force:true}));return root;}
function save(file,v){fs.mkdirSync(join(file,'..'),{recursive:true});fs.writeFileSync(file,JSON.stringify(v));}
test('seven-day hard close preserves reserved facts and unknown outcome, with five-to-ten-day policy',()=>{
 const t=task();assert.equal(settleInactive(t,{now}),true);const v=lifecycleView(t,{now});
 assert.equal(v.lifecycle,'closed');assert.equal(v.closeReason,'deadline');assert.equal(v.settlement,'incomplete');assert.equal(v.activity,'unknown');assert.equal(v.outcome,'unknown');assert.equal(t.calls.missing.status,'reserved');
 assert.equal(settleInactive(t,{now}),false);assert.equal(settleInactive(task(6),{now}),false);
 assert.equal(settleInactive(task(6),{now,policy:{forceCloseDays:5}}),true);assert.equal(settleInactive(task(8),{now,policy:{forceCloseDays:10}}),false);
 assert.throws(()=>taskPolicy({forceCloseDays:4}));assert.throws(()=>taskPolicy({forceCloseDays:11}));
});
test('fresh native activity, liveness and clock rollback protect long-running work',()=>{
 const t=task();noteTaskEvent(t,{hook_event_name:'PreToolUse'},{at:at(0),captureId:'fresh'});assert.equal(settleInactive(t,{now}),false);
 const long=task();long.calls.missing.executionState='running';long.calls.missing.livenessAt=at(0);assert.equal(settleInactive(long,{now}),false);
 assert.equal(settleInactive(task(-1),{now}),false);
});
test('terminal and archive close immediately only without unresolved operations; late event reopens without clearing budgets',()=>{
 const t=task(1);t.calls={};t.contract={maxToolCalls:3};t.budgetReference='same-ledger';
 noteTaskEvent(t,{hook_event_name:'SessionArchived'},{at:at(0),captureId:'archive'});assert.equal(settleInactive(t,{now}),true);assert.equal(t.lifecycle.closeReason,'archived');
 const prior=t.lifecycle.transitionDigest;noteTaskEvent(t,{hook_event_name:'PreToolUse'},{at:at(0),captureId:'continued'});
 assert.equal(lifecycleView(t,{now}).lifecycle,'open');assert.equal(t.lifecycle.lastTransition.previousDigest,prior);assert.equal(t.budgetReference,'same-ledger');assert.equal(t.contract.maxToolCalls,3);
 const unresolved=task(1);noteTaskEvent(unresolved,{hook_event_name:'Stop'},{at:at(0)});assert.equal(settleInactive(unresolved,{now}),false);
});
test('bounded reconciliation is dry-run by default, isolates corrupt and busy records and never follows symlinks',t=>{
 const root=fixture(t),dir=join(root,'runtime/execution/tasks'),file=join(dir,'a'.repeat(64)+'.json');save(file,task());
 const before=fs.readFileSync(file,'utf8');assert.equal(reconcileTasks(root,{now}).wouldChange,1);assert.equal(reconcileTasks(root,{now}).changed,0);assert.equal(fs.readFileSync(file,'utf8'),before);
 fs.mkdirSync(file.replace('.json','.lock'));assert.equal(reconcileTasks(root,{now,apply:true}).issues[0].reason,'busy');fs.rmdirSync(file.replace('.json','.lock'));
 const other=join(dir,'b'.repeat(64)+'.json');fs.symlinkSync(file,other);
 const result=reconcileTasks(root,{now,apply:true,maxItems:1});assert.ok(result.nextCursor);assert.equal(result.changed,1);
 assert.equal(reconcileTasks(root,{now,apply:true,cursor:result.nextCursor}).issues.length,1);
});
test('expired unknown raw logs compact only after durable fact checkpoint; collected counts survive repeated cleanup',t=>{
 const root=fixture(t),file=join(root,'runtime/asset-events.jsonl');fs.mkdirSync(join(root,'runtime'),{recursive:true});
 const old={schema:'avc.asset-event.v1',id:'old',at:at(12),kind:'model-reported',assetId:'general:skill:demo',source:'general',type:'skill',sha256:'b'.repeat(64)};
 const fresh={...old,id:'fresh',at:at(0),kind:'read-completed'};fs.writeFileSync(file,[old,fresh].map(JSON.stringify).join('\n')+'\n');
 const before=collectedSignalSummary(root);assert.equal(before.counts['model-reported'],1);
 assert.equal(cleanupTaskLogs(root,{now}).compactedLogs,1);assert.equal(fs.readFileSync(file,'utf8').split('\n').filter(Boolean).length,2);
 assert.equal(cleanupTaskLogs(root,{now,apply:true}).compactedLogs,1);assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(fresh)+'\n');
 assert.deepEqual(collectedSignalSummary(root).counts,before.counts);assert.equal(cleanupTaskLogs(root,{now,apply:true}).compactedLogs,0);
 assert.equal(collectedSignalSummary(root).counts.success,undefined);
});
test('raw native event and large cached context expire even with an unresolved task; task and context budget remain intact',t=>{
 const root=fixture(t),id='c'.repeat(64),event=join(root,'runtime/mediation/events',id+'.json'),handled=join(root,'runtime/mediation/handling',id+'.json');
 save(event,{schema:'avc.native-event.v1',captureId:id,event:'PreToolUse',at:at(12),sessionId:'s',turnId:'t'});save(handled,{schema:'avc.native-handling.v1',captureId:id,result:{context:'old context'.repeat(1000)}});
 const file=join(root,'runtime/execution/tasks','a'.repeat(64)+'.json');save(file,task(12));const bytes=fs.readFileSync(file);
 const budget=join(root,'runtime/context-budget/ledger.json');save(budget,{spent:1000});
 const result=cleanupTaskLogs(root,{now,apply:true});assert.equal(result.removedFiles,2);assert.equal(fs.existsSync(event),false);assert.equal(fs.existsSync(handled),false);
 assert.deepEqual(fs.readFileSync(file),bytes);assert.equal(JSON.parse(fs.readFileSync(budget)).spent,1000);assert.equal(collectedSignalSummary(root).counts.PreToolUse,1);
});
test('checkpoint failure, symlinks and active log locks preserve originals without allowing cleanup to erase evidence',t=>{
 const root=fixture(t),file=join(root,'runtime/asset-events.jsonl');fs.mkdirSync(join(root,'runtime'),{recursive:true});fs.writeFileSync(file,JSON.stringify({at:at(12),kind:'read-completed'})+'\n');
 fs.mkdirSync(file+'.writer.lock');assert.equal(cleanupTaskLogs(root,{now,apply:true}).compactedLogs,0);assert.ok(fs.readFileSync(file,'utf8'));fs.rmdirSync(file+'.writer.lock');
 fs.mkdirSync(join(root,'runtime/governance'),{recursive:true});fs.symlinkSync(join(root,'runtime'),join(root,'runtime/governance/retention'));
 assert.equal(cleanupTaskLogs(root,{now,apply:true}).compactedLogs,0);assert.ok(fs.readFileSync(file,'utf8'));
});
test('session-only archive and child completion reconcile paged tasks without treating a live child as stopped',t=>{
 const root=fixture(t),a=task(1);a.sessionId='s';a.calls={};noteTaskEvent(a,{hook_event_name:'Stop'},{at:at(0)});
 noteSessionLifecycle(root,{session_id:'s',hook_event_name:'SubagentStart',agent_id:'child'},{captured:true,captureId:'child-start'},{now});
 syncSessionLifecycle(root,a);assert.equal(settleInactive(a,{now}),false);
 noteSessionLifecycle(root,{session_id:'s',hook_event_name:'SubagentStop',agent_id:'child'},{captured:true,captureId:'child-stop'},{now});
 noteSessionLifecycle(root,{session_id:'s',hook_event_name:'SessionArchived'},{captured:true,captureId:'archive'},{now});
 syncSessionLifecycle(root,a);assert.equal(settleInactive(a,{now}),true);assert.equal(a.lifecycle.closeReason,'archived');
});
test('persisted five-to-ten-day policy applies to scheduled reconciliation and sweep cursor advances',t=>{
 const root=fixture(t);configureTaskPolicy(root,{forceCloseDays:5});
 for(let i=1;i<=20;i++){const a=task(6);a.taskId=i.toString(16).padStart(64,'0');save(join(root,'runtime/execution/tasks',a.taskId+'.json'),a);}
 const first=sweepTaskLifecycle(root,{now});assert.ok(first.changed>0&&first.changed<=16);assert.ok(first.nextCursor);
 assert.equal(sweepTaskLifecycle(root,{now:now+1000}).status,'coalesced');
 let total=first.changed;for(let n=1;n<20&&total<20;n++)total+=sweepTaskLifecycle(root,{now:now+n*300000}).changed;assert.equal(total,20);
});
test('read-only diagnostics cannot renew a stale task deadline',()=>{
 const a=task();a.calls.inspect={tool:'mcp__ted_avc_manager__ted_status',status:'observed',admittedAt:at(0),completedAt:at(0)};
 assert.equal(settleInactive(a,{now}),true);assert.equal(a.lifecycle.closeReason,'deadline');assert.equal(a.calls.inspect.status,'observed');
});
test('dead writer lock is reclaimable but a live or unverifiable owner cannot be stolen',t=>{
 const root=fixture(t),file=join(root,'events.jsonl'),lock=file+'.writer.lock',dead=spawnSync(process.execPath,['-e','process.exit(0)']).pid;
 save(lock,{schema:'avc.writer-lock.v1',pid:dead,threadId:0,nonce:'dead'});
 withRawLogLock(file,()=>fs.writeFileSync(file,'observed'));assert.equal(fs.readFileSync(file,'utf8'),'observed');assert.equal(fs.existsSync(lock),false);
 save(lock,{schema:'avc.writer-lock.v1',pid:process.pid,threadId:0,nonce:'live'});assert.throws(()=>withRawLogLock(file,()=>fs.writeFileSync(file,'bad')));assert.equal(fs.readFileSync(file,'utf8'),'observed');
});
test('published ownership survives temporary-file cleanup failure and remains releasable',t=>{
 const root=fixture(t),file=join(root,'raw'),original=fs.unlinkSync;let failed=false;
 try{fs.unlinkSync=(path,...args)=>{if(!failed&&String(path).endsWith('.tmp')){failed=true;throw Object.assign(Error('fixture EACCES'),{code:'EACCES'});}return original(path,...args);};syncBuiltinESMExports();withRawLogLock(file,()=>fs.writeFileSync(file,'committed'));}finally{fs.unlinkSync=original;syncBuiltinESMExports();}
 assert.equal(failed,true);assert.equal(fs.existsSync(file+'.writer.lock'),false);withRawLogLock(file,()=>fs.appendFileSync(file,' again'));assert.equal(fs.readFileSync(file,'utf8'),'committed again');
});
test('replayed capture and outcome are counted once even after raw expiry changes observation time',t=>{
 const root=fixture(t),id='d'.repeat(64),file=join(root,'runtime/mediation/events',id+'.json');
 const original={schema:'avc.native-event.v1',captureId:id,at:at(12),event:'PostToolUse'};save(file,original);
 assert.equal(collectedSignalSummary(root).counts.PostToolUse,1);assert.equal(cleanupTaskLogs(root,{now,apply:true}).removedEvents,1);
 save(file,{...original,at:at(0)});assert.equal(collectedSignalSummary(root).counts.PostToolUse,1);
 const outcome=join(root,'runtime/hooks/outcomes',id+'.json'),first={invocationKey:id,at:now-12*DAY,status:'captured',collection:{captured:true,captureId:id}};
 save(outcome,first);cleanupTaskLogs(root,{now,apply:true});save(outcome,{...first,at:now});assert.equal(collectedSignalSummary(root).counts.captured,1);
});
test('one corrupt checkpoint or raw row does not suppress other collected observations',t=>{
 const root=fixture(t),id='e'.repeat(64),file=join(root,'runtime/mediation/events',id+'.json');save(file,{schema:'avc.native-event.v1',captureId:id,at:at(12),event:'PreToolUse'});
 cleanupTaskLogs(root,{now,apply:true});save(join(root,'runtime/governance/retention','f'.repeat(64)+'.json'),{schema:'broken'});
 fs.writeFileSync(join(root,'runtime/asset-events.jsonl'),'{bad\n'+JSON.stringify({schema:'avc.asset-event.v1',id:'read',at:at(0),kind:'read-completed'})+'\n');
 const result=collectedSignalSummary(root);assert.equal(result.partial,true);assert.equal(result.counts.PreToolUse,1);assert.equal(result.counts['read-completed'],1);assert.ok(result.issues.length>=2);
});
test('a malformed JSONL row is retained without pinning valid expired rows forever',t=>{
 const root=fixture(t),file=join(root,'runtime/asset-events.jsonl');fs.mkdirSync(join(root,'runtime'),{recursive:true});
 fs.writeFileSync(file,'{broken\n'+JSON.stringify({schema:'avc.asset-event.v1',id:'valid',at:at(12),kind:'read-completed'})+'\n');
 const r=cleanupTaskLogs(root,{now,apply:true});assert.equal(r.removedEvents,1);assert.ok(r.issues.length);assert.equal(fs.readFileSync(file,'utf8'),'{broken\n');assert.equal(collectedSignalSummary(root).counts['read-completed'],1);
});
test('different asset/document deliveries are not collapsed into one execution observation',t=>{
 const root=fixture(t),file=join(root,'runtime/execution/events.jsonl');fs.mkdirSync(join(file,'..'),{recursive:true});
 const rows=['a','b'].map(name=>({at:at(12),taskId:'a'.repeat(64),event:'asset_context_returned',name}));
 fs.writeFileSync(file,rows.map(JSON.stringify).join('\n')+'\n');assert.equal(collectedSignalSummary(root).counts.asset_context_returned,2);
 cleanupTaskLogs(root,{now,apply:true});assert.equal(collectedSignalSummary(root).counts.asset_context_returned,2);
});
test('retired asset families do not re-enter the active asset projection through raw or retained signals',t=>{
 const root=fixture(t);save(join(root,'observation-retirement.json'),{suppressedAssetKeys:['general:skill/demo@1.0.0#'+'a'.repeat(64)]});
 fs.mkdirSync(join(root,'runtime'),{recursive:true});fs.writeFileSync(join(root,'runtime/asset-events.jsonl'),JSON.stringify({schema:'avc.asset-event.v1',id:'old',at:at(12),assetId:'general:skill:demo',kind:'model-reported',source:'general',type:'skill',sha256:'b'.repeat(64)})+'\n');
 assert.deepEqual(collectedSignalSummary(root).assets,{});assert.equal(collectedSignalSummary(root).unattributed['model-reported'],1);
 cleanupTaskLogs(root,{now,apply:true});assert.deepEqual(collectedSignalSummary(root).assets,{});assert.equal(collectedSignalSummary(root).unattributed['model-reported'],1);
});
test('failed commit reports no applied change and keeps the original task',t=>{
 const root=fixture(t),a=task(),file=join(root,'runtime/execution/tasks',a.taskId+'.json');save(file,a);const original=fs.renameSync;
 let result;try{fs.renameSync=(from,to)=>{if(to===file)throw Object.assign(Error('fixture ENOSPC'),{code:'ENOSPC'});return original(from,to);};syncBuiltinESMExports();result=reconcileTasks(root,{now,apply:true});}finally{fs.renameSync=original;syncBuiltinESMExports();}
 assert.equal(result.changed,0);assert.equal(result.wouldChange,1);assert.ok(result.issues.length);assert.equal(JSON.parse(fs.readFileSync(file)).status,'active');
});
test('synchronous worker creation failure remains a visible auxiliary error',async t=>{
 const root=fixture(t);let service;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Missing diagnostic')),1000);service=startTaskMaintenance(root,{intervalMs:10,workerFactory:()=>{throw Error('fixture worker creation failed');},onDiagnostic:value=>{service.dispose();clearTimeout(timer);assert.equal(value.taskContinues,true);resolve();}});});
 assert.match(JSON.parse(fs.readFileSync(join(root,'runtime/governance/task-maintenance-failure.json'))).reason,/creation failed/);
});
test('competing dead-owner recoverers cannot remove or overlap a successor live writer',async t=>{
 const {Worker}=await import('node:worker_threads'),root=fixture(t),file=join(root,'raw'),dead=spawnSync(process.execPath,['-e','process.exit(0)']).pid;
 save(file+'.writer.lock',{schema:'avc.writer-lock.v1',pid:dead,threadId:0,nonce:'old-dead-owner'});const shared=new SharedArrayBuffer(8),modulePath=new URL('./raw-lock.cjs',import.meta.url).pathname;
 const code="const {workerData}=require('node:worker_threads'),{withRawLogLock}=require(workerData.modulePath);const n=new Int32Array(workerData.shared);for(let i=0;i<30;i++)withRawLogLock(workerData.file,()=>{if(Atomics.add(n,0,1)!==0)throw Error('overlapping writers');Atomics.wait(n,1,0,1);Atomics.add(n,0,-1);Atomics.add(n,1,1);},{waitMs:2000});";
 await Promise.all([1,2,3].map(()=>new Promise((resolve,reject)=>{const w=new Worker(code,{eval:true,workerData:{file,modulePath,shared}});w.on('error',reject);w.on('exit',n=>n?reject(Error('Contention worker failed')):resolve());})));
 assert.equal(new Int32Array(shared)[1],90);assert.equal(fs.existsSync(file+'.writer.lock'),false);
});
test('an outcome producer lock protects its new result from concurrent expiry',t=>{
 const root=fixture(t),id='1'.repeat(64),file=join(root,'runtime/hooks/outcomes',id+'.json');save(file,{invocationKey:id,at:now-12*DAY,status:'captured'});
 withRawLogLock(file,()=>{const result=cleanupTaskLogs(root,{now,apply:true});assert.equal(result.removedFiles,0);assert.ok(result.issues.length);save(file,{invocationKey:id,at:now,status:'captured'});});
 assert.equal(JSON.parse(fs.readFileSync(file)).at,now);assert.equal(collectedSignalSummary(root).counts.captured,1);
});
test('partial deletion returns completed facts, retains failed raw data and never double counts on retry',t=>{
 const root=fixture(t),one=join(root,'runtime/mediation/events','1'.repeat(64)+'.json'),two=join(root,'runtime/mediation/events','2'.repeat(64)+'.json');
 save(one,{schema:'avc.native-event.v1',captureId:'1'.repeat(64),at:at(12),event:'PostToolUse'});save(two,{schema:'avc.native-event.v1',captureId:'2'.repeat(64),at:at(12),event:'PostToolUse'});
 const original=fs.rmSync;let result;
 try{fs.rmSync=(file,...args)=>{if(file===two)throw Error('fixture permission denied');return original(file,...args);};syncBuiltinESMExports();result=cleanupTaskLogs(root,{now,apply:true});}finally{fs.rmSync=original;syncBuiltinESMExports();}
 assert.equal(result.removedFiles,1);assert.equal(result.removedEvents,1);assert.ok(result.issues.length);assert.equal(fs.existsSync(one),false);assert.equal(fs.existsSync(two),true);
 assert.equal(collectedSignalSummary(root).counts.PostToolUse,2);assert.equal(cleanupTaskLogs(root,{now,apply:true}).removedEvents,1);assert.equal(collectedSignalSummary(root).counts.PostToolUse,2);
});
test('background failure is persisted and visible through client status while other tasks remain usable',async t=>{
 const home=fixture(t),root=join(home,'ted-avc-manager/state');fs.mkdirSync(root,{recursive:true});save(join(home,'ted-avc-manager/manifest.json'),{version:'fixture',generation:'fixture'});save(join(home,'ted-avc-manager/deployment.json'),{scope:'client'});
 save(join(root,'runtime/execution/lifecycle-policy.json'),{forceCloseDays:99});
 let service;await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No background diagnostic')),2000);service=startTaskMaintenance(root,{intervalMs:10,onDiagnostic:value=>{clearTimeout(timer);service.dispose();assert.equal(value.taskContinues,true);resolve();}});});
 while(service.running())await new Promise(r=>setTimeout(r,5));
 const status=clientStatus({codexHome:home});assert.equal(status.taskMaintenance.status,'unavailable');assert.match(status.taskMaintenance.reason,/policy/);
});
test('large JSONL is reclaimed in bounded parse batches without losing the retained tail or double counting',t=>{
 const root=fixture(t),file=join(root,'runtime/asset-events.jsonl');fs.mkdirSync(join(root,'runtime'),{recursive:true});
 const records=Array.from({length:40},(_,i)=>({schema:'avc.asset-event.v1',id:String(i),at:at(i<39?12:0),kind:i<39?'model-reported':'read-completed'}));
 fs.writeFileSync(file,records.map(JSON.stringify).join('\n')+'\n');
 const before=collectedSignalSummary(root).counts;
 for(let i=0;i<20;i++){const r=cleanupTaskLogs(root,{apply:true,now,maxLogBytes:1024});if(!r.moreLogs)break;}
 assert.equal(fs.readFileSync(file,'utf8'),JSON.stringify(records.at(-1))+'\n');assert.deepEqual(collectedSignalSummary(root).counts,before);
});
test('background maintenance worker persists closure and retention without a model or invented results',async t=>{
 const {Worker}=await import('node:worker_threads'),root=fixture(t),a=task(12);save(join(root,'runtime/execution/tasks',a.taskId+'.json'),a);
 const result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('../governance/task-maintenance-worker.js',import.meta.url),{workerData:{stateRoot:root}});let message;worker.on('message',v=>{message=v;});worker.on('error',reject);worker.on('exit',code=>code?reject(Error('Worker failed')):resolve(message));});
 assert.equal(result.status,'completed');const after=JSON.parse(fs.readFileSync(join(root,'runtime/execution/tasks',a.taskId+'.json')));
 assert.equal(after.status,'closed');assert.equal(after.lifecycle.closeReason,'deadline');assert.equal(after.calls.missing.status,'reserved');
});
