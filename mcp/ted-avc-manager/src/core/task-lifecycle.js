// Execution liveness, audit closure and outcome are independent. No model calls.
import { existsSync, readFileSync, writeFileSync, renameSync, rmSync, mkdirSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve, relative, sep } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { withRawLogLock, claimRawLogLock } from './raw-log.js';
const DAY=86400000, sha=value=>createHash('sha256').update(value).digest('hex');
export const TASK_POLICY={version:1,idleMinutes:30,idleCloseHours:24,forceCloseDays:7,rawRetentionDays:10};
export const isTaskProgress=tool=>typeof tool!=='string'||!/__?(?:ted_(?:status|doctor|scores|summary|tasks|help)|client_status|check_update)$/.test(tool);
export function taskPolicy(input={}) {
 const p={...TASK_POLICY,...input};
 for(const k of Object.keys(input))if(!Object.hasOwn(TASK_POLICY,k))throw Error('Unknown task lifecycle policy');
 if(p.version!==1||!Number.isInteger(p.forceCloseDays)||p.forceCloseDays<5||p.forceCloseDays>10||p.idleMinutes!==30||p.idleCloseHours!==24||!Number.isInteger(p.rawRetentionDays)||p.rawRetentionDays<p.forceCloseDays||p.rawRetentionDays>30)throw Error('Invalid task lifecycle policy');
 return p;
}
export function storedTaskPolicy(root) {
 const file=safeTaskPath(root,join(root,'runtime/execution/lifecycle-policy.json'));
 return taskPolicy(existsSync(file)?JSON.parse(readFileSync(file,'utf8')):{});
}
export function configureTaskPolicy(root,input) {
 const policy=taskPolicy(input),dir=safeTaskPath(root,join(root,'runtime/execution'),{directory:true});
 writeTaskState(root,join(dir,'lifecycle-policy.json'),policy);return policy;
}
export function taskLastActivity(task) {
 const times=[task.startedAt,task.lifecycle?.lastActivityAt,...Object.values(task.calls||{}).filter(c=>isTaskProgress(c.tool)).flatMap(c=>[c.admittedAt,c.completedAt])].map(Date.parse).filter(Number.isFinite);
 return times.length?Math.max(...times):null;
}
export function lifecycleView(task,{now=Date.now(),policy={}}={}) {
 const p=taskPolicy(policy),last=taskLastActivity(task),age=last===null?null:now-last,lc=task.lifecycle||{};
 const unresolved=Object.entries(task.calls||{}).filter(([,c])=>c.status==='reserved').map(([id])=>id);
 const protectedOperation=Object.values(task.calls||{}).some(c=>c.executionState==='running'&&Number.isFinite(Date.parse(c.livenessAt))&&now-Date.parse(c.livenessAt)>=0&&now-Date.parse(c.livenessAt)<p.idleMinutes*60000)||!!lcFreshChildren(task,now,p);
 const host=lc.host||{},freshHost=Number.isFinite(Date.parse(host.at))&&now-Date.parse(host.at)>=0&&now-Date.parse(host.at)<p.idleMinutes*60000;
 const active=protectedOperation||freshHost&&['running','waiting'].includes(host.state);
 return {schema:'avc.task-lifecycle.v1',revision:lc.revision||0,activity:active?'active':(task.status==='closed'||lc.closedAt)&&lc.closeReason!=='deadline'?'inactive':'unknown',
  lifecycle:task.status==='closed'||lc.closedAt?'closed':'open',settlement:lc.settlement||(task.status==='closed'?'reconciled':'pending'),outcome:'unknown',
  closeReason:lc.closeReason,closedAt:lc.closedAt||task.closedAt,lastActivityAt:last===null?null:new Date(last).toISOString(),idleCandidate:age!==null&&age>=p.idleMinutes*60000,
  forceDue:age!==null&&age>=p.forceCloseDays*DAY,protectedOperation,pendingChildren:lc.pendingChildren||0,pendingOperations:Object.values(task.calls||{}).filter(c=>c.executionState==='running').length,hostState:host.state||'unknown',unresolvedCalls:unresolved.length};
}
function lcFreshChildren(task,now,p){return task.lifecycle?.childLatestAt&&now-Date.parse(task.lifecycle.childLatestAt)>=0&&now-Date.parse(task.lifecycle.childLatestAt)<p.idleMinutes*60000;}
function transition(task,reason,at,extra={}) {
 const lc=task.lifecycle||{},record={revision:(lc.revision||0)+1,reason,at,...extra,previousDigest:lc.transitionDigest||null};
 task.lifecycle={...lc,...extra,revision:record.revision,lastTransition:record,transitionDigest:sha(JSON.stringify(record))};
}
export function noteTaskEvent(task,input,{at=new Date().toISOString(),captureId}={}) {
 const event=input.hook_event_name,terminal=['Stop','Interrupt','SessionEnd','SubagentStop','SessionArchived'].includes(event);
 const lc=task.lifecycle||{};
 if(captureId&&lc.lastCaptureId===captureId)return false;
 if(!terminal&&!['UserPromptSubmit','PreToolUse','PostToolUse'].includes(event))return false;
 if(event==='PostToolUse'&&lc.closedAt){transition(task,'late-result',at,{settlement:'incomplete'});return true;}
 if(!terminal&&lc.closedAt&&task.closeMode==='automatic'){
  task.status='active';delete task.closedAt;delete task.closeMode;
  transition(task,'resumed',at,{closedAt:null,closeReason:null,settlement:'pending'});
 }
 task.lifecycle={...task.lifecycle,lastActivityAt:at,lastCaptureId:captureId||null,
  host:{state:terminal?(event==='SessionArchived'?'archived':'ended'):'running',at,evidence:captureId||'native-hook'}};
 if(terminal&&typeof input.last_assistant_message==='string')task.lifecycle.answerSha256=sha(input.last_assistant_message);
 return true;
}
export function settleInactive(task,{now=Date.now(),policy={}}={}) {
 const p=taskPolicy(policy),v=lifecycleView(task,{now,policy:p});
 if(v.lifecycle==='closed'||v.protectedOperation||v.lastActivityAt===null||Date.parse(v.lastActivityAt)>now)return false;
 const ended=['ended','archived'].includes(v.hostState),fresh=v.activity==='active';
 // A missing Post is unknown, never proof that its tool is still executing.
 if(fresh||!v.forceDue&&!(ended&&v.unresolvedCalls===0&&v.pendingChildren===0&&v.pendingOperations===0))return false;
 const reason=v.forceDue?'deadline':v.hostState==='archived'?'archived':'host-ended';
 transition(task,reason,new Date(now).toISOString(),{closedAt:new Date(now).toISOString(),closeReason:reason,settlement:v.unresolvedCalls?'incomplete':'reconciled',policy:p});
 task.status='closed';task.closedAt=new Date(now).toISOString();task.closeMode='automatic';
 return true;
}
export function explicitlySettled(task,at) {
 transition(task,'explicit',at,{closedAt:at,closeReason:'explicit',settlement:'reconciled'});
}
export function noteSessionLifecycle(root,input,collection,{now=Date.now()}={}) {
 if(!input.session_id||!collection?.captured||!['SubagentStart','SubagentStop','SessionEnd','SessionArchived','UserPromptSubmit'].includes(input.hook_event_name))return;
 const dir=safeTaskPath(root,join(root,'runtime/execution/activity'),{directory:true}),file=join(dir,sha(input.session_id)+'.json');
 return withRawLogLock(file,()=>{
  const state=existsSync(file)?JSON.parse(readFileSync(safeTaskPath(root,file),'utf8')):{schema:'avc.session-activity.v1',children:{}};
  const at=new Date(now).toISOString(),id=input.agent_id||input.subagent_id;
  if(['SubagentStart','SubagentStop'].includes(input.hook_event_name)){
   if(id)state.children[sha(String(id))]={state:input.hook_event_name==='SubagentStart'?'running':'ended',at};
   else state.unknownChildEvent={state:input.hook_event_name==='SubagentStart'?'running':'ended',at};
  }else state.host={state:input.hook_event_name==='UserPromptSubmit'?'running':input.hook_event_name==='SessionArchived'?'archived':'ended',at,captureId:collection.captureId};
  writeTaskState(root,file,state);
 });
}
export function syncSessionLifecycle(root,task) {
 if(!task.sessionId)return;
 const file=safeTaskPath(root,join(root,'runtime/execution/activity',sha(task.sessionId)+'.json'));if(!existsSync(file))return;
 const state=JSON.parse(readFileSync(file,'utf8')),lc=task.lifecycle||{},children=[...Object.values(state.children||{}),state.unknownChildEvent].filter(c=>c?.state==='running');
 task.lifecycle={...lc,pendingChildren:children.length,childLatestAt:children.length?children.map(c=>c.at).sort().at(-1):null};
 if(state.host&&['archived','ended'].includes(state.host.state)&&Date.parse(state.host.at)>=(taskLastActivity(task)||0))task.lifecycle.host=state.host;
}
export function safeTaskPath(root,file,{directory=false}={}) {
 const base=realpathSync(root),declared=resolve(root),requested=resolve(file),target=requested===declared||requested.startsWith(declared+sep)?resolve(base,relative(declared,requested)):requested;
 if(target!==base&&!target.startsWith(base+sep))throw Error('Lifecycle path escapes state root');
 let cursor=base;
 for(const part of relative(base,target).split(sep).filter(Boolean)) {
  cursor=join(cursor,part);
  try{if(lstatSync(cursor).isSymbolicLink())throw Error('Refusing lifecycle symlink');}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 if(directory)mkdirSync(target,{recursive:true,mode:0o700});
 return target;
}
export function writeTaskState(root,file,data) {
 return writeTaskBytes(root,file,JSON.stringify(data,null,2)+'\n');
}
export function writeTaskBytes(root,file,data) {
 safeTaskPath(root,file);const temp=file+'.'+randomUUID()+'.tmp';
 let committed=false;try{writeFileSync(temp,data,{flag:'wx',mode:0o600});renameSync(temp,file);committed=true;}finally{try{rmSync(temp,{force:true});}catch(error){if(!committed)throw error;process.stderr.write('Ted temporary cleanup unverified; committed state retained\n');}}
}
export function taskPage(root,{cursor='',maxItems=100}={}) {
 if(!Number.isInteger(maxItems)||maxItems<1||maxItems>100||cursor&&!/^[a-f0-9]{64}\.json$/.test(cursor))throw Error('Invalid lifecycle page');
 const directory=safeTaskPath(root,join(root,'runtime/execution/tasks'));
 if(!existsSync(directory))return {directory,names:[],more:false};
 const names=readdirSync(directory).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)&&n>cursor).sort();
 return {directory,names:names.slice(0,maxItems),more:names.length>maxItems};
}
export function reconcileTasks(root,{apply=false,cursor='',maxItems=100,maxMs=100,now=Date.now(),policy}={}) {
 const p=policy?taskPolicy(policy):storedTaskPolicy(root);if(!Number.isInteger(maxMs)||maxMs<1||maxMs>1000)throw Error('Invalid lifecycle time budget');
 const page=taskPage(root,{cursor,maxItems}),start=performance.now(),counts={active:0,inactive:0,unknown:0,closed:0,unresolvedCalls:0},issues=[];
 let scanned=0,changed=0,wouldChange=0,last=cursor;
 for(const name of page.names) {
  if(scanned&&performance.now()-start>=maxMs)break;
  let file,lock,release;
  try{
   file=safeTaskPath(root,join(page.directory,name));lock=safeTaskPath(root,file.replace(/\.json$/,'.lock'));
   if(apply){try{release=claimRawLogLock(file,{lockFile:lock});}catch(e){issues.push({taskId:name.slice(0,-5),reason:'busy'});continue;}}
   const data=JSON.parse(readFileSync(file,'utf8'));if(data.taskId!==name.slice(0,-5)||data.schema!=='avc.execution-task.v1')throw Error('Unknown task identity/schema');
   syncSessionLifecycle(root,data);
   if(settleInactive(data,{now,policy:p})){wouldChange++;if(apply){writeTaskState(root,file,data);changed++;}}
   const v=lifecycleView(data,{now,policy:p});counts[v.activity]++;if(v.lifecycle==='closed')counts.closed++;counts.unresolvedCalls+=v.unresolvedCalls;
  }catch(error){issues.push({taskId:name.slice(0,-5),reason:String(error.message).slice(0,160)});}
  finally{try{release?.();}catch(error){issues.push({taskId:name.slice(0,-5),reason:String(error.message).slice(0,160)});}scanned++;last=name;}
 }
 return {schema:'avc.task-reconciliation.v1',apply,policy:p,scanned,changed,wouldChange,counts,issues:issues.slice(0,8),omittedIssues:Math.max(0,issues.length-8),nextCursor:page.more||scanned<page.names.length?last:null,taskContinues:true};
}
export function sweepTaskLifecycle(root,{now=Date.now()}={}) {
 const dir=safeTaskPath(root,join(root,'runtime/execution'),{directory:true}),file=join(dir,'lifecycle-sweep.json');
 return withRawLogLock(file,()=>{
  const previous=existsSync(file)?JSON.parse(readFileSync(safeTaskPath(root,file),'utf8')):{};
  if(previous.at&&now-previous.at>=0&&now-previous.at<300000)return {status:'coalesced'};
  const result=reconcileTasks(root,{apply:true,cursor:previous.cursor||'',maxItems:16,maxMs:20,now});
  writeTaskState(root,file,{at:now,cursor:result.nextCursor});return result;
 });
}
