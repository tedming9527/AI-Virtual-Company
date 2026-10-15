// Raw collection has a finite lifetime even when the audit outcome is unknown.
// Canonical task/call/asset facts and context/dedup ledgers are never deleted here.
import { existsSync, readFileSync, lstatSync, readdirSync, rmSync, openSync, closeSync, readSync, writeSync, renameSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { taskPolicy, storedTaskPolicy, safeTaskPath, writeTaskState, writeTaskBytes } from '../core/task-lifecycle.js';
import { withRawLogLock, claimRawLogLock } from '../core/raw-log.js';
const sha=v=>createHash('sha256').update(v).digest('hex'),DAY=86400000;
function factId(row) {
 if(row.schema==='avc.native-event.v1'&&row.captureId)return 'native:'+row.captureId;
 if(row.invocationKey)return 'outcome:'+row.invocationKey+':'+sha(JSON.stringify([row.status,row.collection?.captured,row.collection?.captureId,row.collection?.footerStatus,row.collection?.taskStatus,row.collection?.taskVerified]));
 if(row.schema==='avc.asset-event.v1'&&row.id)return 'asset:'+row.id;
 if(row.taskId&&row.event&&row.toolUseId)return 'execution:'+sha(JSON.stringify([row.taskId,row.event,row.toolUseId,row.reason,row.inputSha256]));
 if(row.sessionId&&row.event&&row.status)return 'hook:'+sha(JSON.stringify([row.sessionId,row.turnId,row.event,row.status]));
 return 'record:'+sha(JSON.stringify(row));
}
function replacePrefix(root,file,before,prefixLength,head) {
 const temp=safeTaskPath(root,file+'.'+randomUUID()+'.tmp');let input,output;
 try{
  input=openSync(file,'r');output=openSync(temp,'wx',0o600);const bytes=Buffer.from(head);let written=0;
  while(written<bytes.length)written+=writeSync(output,bytes,written,bytes.length-written);
  const buffer=Buffer.alloc(262144);let offset=prefixLength;
  while(offset<before.size){const n=readSync(input,buffer,0,Math.min(buffer.length,before.size-offset),offset);if(!n)throw Error('Raw tail shortened');let w=0;while(w<n)w+=writeSync(output,buffer,w,n-w);offset+=n;}
  closeSync(input);input=undefined;closeSync(output);output=undefined;
  const after=lstatSync(file);if(after.ino!==before.ino||after.dev!==before.dev||after.size!==before.size||after.mtimeMs!==before.mtimeMs)throw Error('Raw source changed during compaction');
  renameSync(temp,file);
 }finally{if(input!==undefined)closeSync(input);if(output!==undefined)closeSync(output);rmSync(temp,{force:true});}
}
function summary(rows) {
 const counts={},assets={};
 const unique=new Map(rows.map(row=>[factId(row),row]));
 for(const row of unique.values()) {
  const kind=row.event||row.kind||row.status||'unknown';counts[kind]=(counts[kind]||0)+1;
  if(row.assetId){const key=sha(JSON.stringify([row.source,row.type,row.assetId,row.sha256]));
   const a=assets[key]??={source:row.source,type:row.type,id:row.assetId,sha256:row.sha256,signals:{}};a.signals[kind]=(a.signals[kind]||0)+1;}
 }
 return {events:unique.size,rawRows:rows.length,counts,assets,outcome:'unknown',evidence:'Observed signals remain separate; no outcome/adoption inferred from closure'};
}
function checkpoint(root,sources,rows,now) {
 const dir=safeTaskPath(root,join(root,'runtime/governance/retention'),{directory:true}),id=sha(JSON.stringify(sources)),file=join(dir,id+'.json');
 const facts=rows.map(row=>({id:factId(row),at:row.at,kind:row.event||row.kind||row.status||'unknown',taskId:row.taskId,assetId:row.assetId,source:row.source,type:row.type,sha256:row.sha256,version:row.version,bundleSha256:row.bundleSha256}));
 const value={schema:'avc.raw-retention-checkpoint.v1',id,at:new Date(now).toISOString(),sources,facts,summary:summary(rows),rawRemoved:false};
 value.integritySha256=sha(JSON.stringify({sources:value.sources,facts:value.facts,summary:value.summary}));
 if(existsSync(file)){
  const saved=JSON.parse(readFileSync(safeTaskPath(root,file),'utf8'));
  if(saved.id!==id||JSON.stringify(saved.sources)!==JSON.stringify(sources)||saved.integritySha256!==sha(JSON.stringify({sources:saved.sources,facts:saved.facts,summary:saved.summary})))throw Error('Retention checkpoint mismatch');
  return {file,value:saved};
 }
 writeTaskState(root,file,value);if(sha(readFileSync(file))!==sha(JSON.stringify(value,null,2)+'\n'))throw Error('Checkpoint verification failed');
 return {file,value};
}
export function cleanupTaskLogs(root,{apply=false,cursor='',maxItems=100,now=Date.now(),policy,maxLogBytes=16*1024*1024}={}) {
 root=realpathSync(root);
 const p=policy?taskPolicy(policy):storedTaskPolicy(root),cutoff=now-p.rawRetentionDays*DAY,result={apply,policy:p,checked:0,removedFiles:0,removedEvents:0,compactedLogs:0,issues:[],nextCursor:null,taskContinues:true};
 if(!Number.isInteger(maxItems)||maxItems<1||maxItems>100||!Number.isInteger(maxLogBytes)||maxLogBytes<1024||maxLogBytes>64*1024*1024||cursor&&!/^(events|outcomes):[a-f0-9]{64}\.json$/.test(cursor))throw Error('Invalid retention page');
 const candidates=[];
 for(const [kind,rel]of [['events','mediation/events'],['outcomes','hooks/outcomes']]){
  const dir=safeTaskPath(root,join(root,'runtime',rel));if(!existsSync(dir))continue;
  for(const name of readdirSync(dir))if(/^[a-f0-9]{64}\.json$/.test(name)&&kind+':'+name>cursor)candidates.push({key:kind+':'+name,kind,file:join(dir,name)});
 }
 candidates.sort((a,b)=>a.key.localeCompare(b.key,'en'));
 const sources=[],rows=[],deletions=[],leases=[];
 for(const c of candidates.slice(0,maxItems)){
  result.checked++;result.nextCursor=c.key;
  const held=[];let keep=false;
  try{
   if(apply)held.push(claimRawLogLock(c.file));
   safeTaskPath(root,c.file);if(!lstatSync(c.file).isFile())throw Error('Not regular raw event');
   const bytes=readFileSync(c.file),row=JSON.parse(bytes),time=typeof row.at==='number'?row.at:Date.parse(row.at);
   if(!Number.isFinite(time)||time>=cutoff)continue;
   if(c.kind==='events'&&row.schema!=='avc.native-event.v1'||c.kind==='outcomes'&&typeof row.invocationKey!=='string')throw Error('Unknown raw record schema');
   // A bounded investigation hold needs explicit renewal, never an active flag.
   if(row.investigationHoldUntil&&Date.parse(row.investigationHoldUntil)>now)continue;
   let cached;
   if(c.kind==='events'){
    const handled=safeTaskPath(root,join(root,'runtime/mediation/handling',c.key.slice(7)));
    if(existsSync(handled.replace(/\.json$/,'.lock')))throw Error('Native handler still owns event');
    if(existsSync(handled)){
     if(apply)held.push(claimRawLogLock(handled));
     const data=readFileSync(handled),record=JSON.parse(data);if(record.captureId!==row.captureId)throw Error('Cached handler identity mismatch');cached={file:handled,sha256:sha(data)};
    }
   }
   sources.push({file:c.file.slice(root.length+1),sha256:sha(bytes)});deletions.push({file:c.file,sha256:sha(bytes),event:true});rows.push(row);
   if(cached){sources.push({file:cached.file.slice(root.length+1),sha256:cached.sha256});deletions.push(cached);}
   keep=true;leases.push(...held);
  }catch(error){result.issues.push({record:c.key,reason:String(error.message).slice(0,120)});}
  finally{if(!keep)for(const release of held.reverse())release();}
 }
 if(candidates.length<=maxItems)result.nextCursor=null;
 try{if(rows.length){
  if(apply){const proof=checkpoint(root,sources,rows,now);let complete=true;
   for(const item of deletions){try{safeTaskPath(root,item.file);if(!existsSync(item.file))continue;if(sha(readFileSync(item.file))!==item.sha256)throw Error('Raw source changed; retained');rmSync(item.file);result.removedFiles++;if(item.event)result.removedEvents++;}catch(error){complete=false;result.issues.push({record:item.file.slice(root.length+1),reason:String(error.message).slice(0,120)});}}
   proof.value.rawRemoved=complete;writeTaskState(root,proof.file,proof.value);
  }else {result.removedFiles=deletions.length;result.removedEvents=rows.length;}
 }}catch(error){result.issues.push({record:'native-checkpoint',reason:String(error.message).slice(0,160)});}
 finally{for(const release of leases.reverse())try{release();}catch(error){result.issues.push({record:'native-lock',reason:String(error.message).slice(0,120)});}}
 // Fixed, owned raw logs only. No arbitrary files or user documents.
 for(const rel of ['asset-events.jsonl','execution/events.jsonl','hooks/events.jsonl']){
  const file=safeTaskPath(root,join(root,'runtime',rel));if(!existsSync(file))continue;
  try{
   const compact=()=>{
    const stat=lstatSync(file);if(!stat.isFile())throw Error('Not regular raw log');
    const fd=openSync(file,'r');let bytes;
    try{const buffer=Buffer.alloc(Math.min(stat.size,maxLogBytes));const n=readSync(fd,buffer,0,buffer.length,0);bytes=buffer.subarray(0,n);}finally{closeSync(fd);}
    const last=bytes.lastIndexOf(10);if(bytes.length&&last<0)throw Error('Raw record exceeds bounded batch');
    bytes=bytes.subarray(0,last+1);const lines=bytes.toString('utf8').split('\n').filter(Boolean),retained=[],expired=[];
    if(bytes.length<stat.size)result.moreLogs=true;
    for(const line of lines){try{const row=JSON.parse(line),time=Date.parse(row.at);if(!Number.isFinite(time))throw Error('Unknown raw event time; retained');
     if(rel==='asset-events.jsonl'&&row.schema!=='avc.asset-event.v1'||rel==='execution/events.jsonl'&&(!/^[a-f0-9]{64}$/.test(row.taskId||'')||typeof row.event!=='string')||rel==='hooks/events.jsonl'&&(typeof row.status!=='string'||typeof row.sessionId!=='string'||typeof row.version!=='string'))throw Error('Unknown raw event provenance; retained');
     if(time<cutoff&&!(row.investigationHoldUntil&&Date.parse(row.investigationHoldUntil)>now))expired.push(row);else retained.push(line);
    }catch(error){retained.push(line);result.issues.push({record:rel,reason:String(error.message).slice(0,120)});}}
    if(!expired.length)return;
    if(apply){const proof=checkpoint(root,[{file:rel,start:0,end:bytes.length,sha256:sha(bytes)}],expired,now);
     // The source lock prevents writers between checkpoint and atomic replacement.
     replacePrefix(root,file,stat,bytes.length,retained.length?retained.join('\n')+'\n':'');
     result.removedEvents+=expired.length;result.compactedLogs++;
     proof.value.rawRemoved=true;writeTaskState(root,proof.file,proof.value);
    }
    if(!apply){result.removedEvents+=expired.length;result.compactedLogs++;}
   };
   if(apply)withRawLogLock(file,compact);else compact();
  }catch(error){result.issues.push({record:rel,reason:String(error.message).slice(0,160)});}
 }
 result.omittedIssues=Math.max(0,result.issues.length-8);result.issues=result.issues.slice(0,8);return result;
}
export function retentionFacts(root) {
 root=realpathSync(root);
 const facts=new Map(),issues=[];let dir;
 try{dir=safeTaskPath(root,join(root,'runtime/governance/retention'));}catch(error){return {facts:[],issues:[{record:'retention',reason:String(error.message).slice(0,120)}]};}
 if(!existsSync(dir))return {facts:[],issues:[]};
 let names;try{names=readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n));}catch(error){return {facts:[],issues:[{record:'retention',reason:String(error.message).slice(0,120)}]};}
 for(const name of names){
  try{
  const record=JSON.parse(readFileSync(safeTaskPath(root,join(dir,name)),'utf8'));
  if(record.schema!=='avc.raw-retention-checkpoint.v1'||record.id!==name.slice(0,-5)||record.id!==sha(JSON.stringify(record.sources))||record.integritySha256!==sha(JSON.stringify({sources:record.sources,facts:record.facts,summary:record.summary})))throw Error('Unknown or changed retention checkpoint');
  for(const fact of record.facts||[])facts.set(fact.id,fact);
  }catch(error){issues.push({record:name,reason:String(error.message).slice(0,120)});}
 }
 return {facts:[...facts.values()],issues};
}
export function collectedSignalSummary(root) {
 root=realpathSync(root);
 const retained=retentionFacts(root),facts=new Map(retained.facts.map(f=>[f.id,f])),issues=[...retained.issues];
 const add=row=>{const id=factId(row);facts.set(id,{id,kind:row.event||row.kind||row.status||'unknown',assetId:row.assetId,source:row.source,type:row.type,sha256:row.sha256,version:row.version,bundleSha256:row.bundleSha256});};
 for(const rel of ['asset-events.jsonl','execution/events.jsonl','hooks/events.jsonl']){
  try{const file=safeTaskPath(root,join(root,'runtime',rel));if(existsSync(file))for(const line of readFileSync(file,'utf8').split('\n').filter(Boolean)){try{add(JSON.parse(line));}catch{issues.push({record:rel,reason:'Malformed raw record retained'});}}}catch(error){issues.push({record:rel,reason:String(error.message).slice(0,120)});}
 }
 for(const rel of ['mediation/events','hooks/outcomes']){
  try{const dir=safeTaskPath(root,join(root,'runtime',rel));if(existsSync(dir))for(const name of readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){try{add(JSON.parse(readFileSync(safeTaskPath(root,join(dir,name)),'utf8')));}catch(error){issues.push({record:rel+'/'+name,reason:String(error.message).slice(0,120)});}}}catch(error){issues.push({record:rel,reason:String(error.message).slice(0,120)});}
 }
 const counts={},assets={},unattributed={},retiredSignals={};
 const retirementFile=safeTaskPath(root,join(root,'observation-retirement.json'));let suppression=[];
 try{if(existsSync(retirementFile)){const r=JSON.parse(readFileSync(retirementFile,'utf8'));suppression=r.suppressedAssetKeys||r.retiredAssetKeys||[];}}catch(error){issues.push({record:'observation-retirement',reason:String(error.message).slice(0,120)});}
 const retiredFamilies=new Set(suppression.map(key=>/^([^:]+):([^/]+)\/([^@]+)@/.exec(key)).filter(Boolean).map(m=>m[1]+':'+m[2]+':'+m[3]));
 for(const fact of facts.values()){
  const family=[...retiredFamilies].find(id=>fact.assetId===id||fact.assetId?.startsWith(id+':'));
  if(family){
   const [source,type,name]=family.split(':');const key=fact.version&&fact.bundleSha256?source+':'+type+'/'+name+'@'+fact.version+'#'+fact.bundleSha256:null;
   if(!key){unattributed[fact.kind]=(unattributed[fact.kind]||0)+1;continue;}
   if(suppression.includes(key)){retiredSignals[fact.kind]=(retiredSignals[fact.kind]||0)+1;continue;}
  }
  counts[fact.kind]=(counts[fact.kind]||0)+1;
  if(fact.assetId){const key=sha(JSON.stringify([fact.source,fact.type,fact.assetId,fact.sha256]));const a=assets[key]??={id:fact.assetId,source:fact.source,type:fact.type,sha256:fact.sha256,signals:{}};a.signals[fact.kind]=(a.signals[fact.kind]||0)+1;}
 }
 return {events:facts.size,counts,assets,unattributed,retiredSignals,partial:issues.length>0,issues:issues.slice(0,8),omittedIssues:Math.max(0,issues.length-8),evidence:'Raw and retained observations deduplicated; declarations, reads and outcomes are not interchangeable'};
}
