import { existsSync, readFileSync, readdirSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { lifecycleView } from './task-lifecycle.js';
function safe(base, target) {
  let cursor=base;
  for(const part of target.slice(base.length).split('/').filter(Boolean)) {
    if(existsSync(cursor)&&lstatSync(cursor).isSymbolicLink())throw Error('Refusing status symlink');
    cursor=join(cursor,part);
  }
  if(existsSync(cursor)&&lstatSync(cursor).isSymbolicLink())throw Error('Refusing status symlink');
}
function read(base, file, problems, fallback={}) {
  try {
    safe(base,file);const value=JSON.parse(readFileSync(file,'utf8'));
    if(!value||Array.isArray(value)||typeof value!=='object')throw Error('Invalid status record');
    return value;
  }
  catch(error) {problems.push({file:file.slice(base.length+1),reason:error.message});return fallback;}
}
function rows(base, directory, problems) {
  if (!existsSync(directory)) return [];
  try {
    safe(base,directory);
    return readdirSync(directory).filter(f=>/^[a-f0-9]{64}\.json$/.test(f))
      .map(f=>read(base,join(directory,f),problems,null)).filter(Boolean);
  } catch(error) {problems.push({file:directory.slice(base.length+1),reason:error.message});return [];}
}
export function clientStatus({ codexHome = process.env.CODEX_HOME || join(homedir(),'.codex'), sessionId, turnId } = {}) {
  const base=join(resolve(codexHome),'ted-avc-manager');
  if (!existsSync(join(base,'manifest.json'))) return { installed:false, nativeActivation:'unverified', scope:'unknown' };
  const problems=[];
  const manifest=read(base,join(base,'manifest.json'),problems);
  const deployment=read(base,join(base,'deployment.json'),problems);
  const events=rows(base,join(base,'state/runtime/mediation/events'),problems).filter(e=>(!sessionId||e.sessionId===sessionId)&&(!turnId||e.turnId===turnId));
  const turns=rows(base,join(base,'state/runtime/mediation/turns'),problems).filter(e=>(!sessionId||e.sessionId===sessionId)&&(!turnId||e.turnId===turnId));
  const current=manifest.generation?events.filter(e=>e.generation===manifest.generation):[];
  const outcomes=rows(base,join(base,'state/runtime/hooks/outcomes'),problems).filter(o=>current.some(e=>e.captureId===o.collection?.captureId));
  const routed=rows(base,join(base,'state/runtime/execution/tasks'),problems).filter(t=>(!sessionId||t.sessionId===sessionId)&&(!turnId||t.turnId===turnId));
  const sessionActivity=new Map(),rank={inactive:0,unknown:1,active:2};
  for(const task of routed){const state=lifecycleView(task).activity;if(task.sessionId&&rank[state]>=(rank[sessionActivity.get(task.sessionId)]??-1))sessionActivity.set(task.sessionId,state);}
  const sessionCounts={active:0,inactive:0,unknown:0};for(const state of sessionActivity.values())sessionCounts[state]++;
  const maintenanceFile=join(base,'state/runtime/governance/task-maintenance.json'),failureFile=join(base,'state/runtime/governance/task-maintenance-failure.json');
  const maintenance=existsSync(maintenanceFile)?read(base,maintenanceFile,problems):null,failure=existsSync(failureFile)?read(base,failureFile,problems):null;
  const maintenanceStatus=failure&&(!maintenance||Date.parse(failure.at)>=Date.parse(maintenance.at))?{status:'unavailable',at:failure.at,reason:failure.reason,taskContinues:true}:maintenance?{status:'observed',at:maintenance.at,changed:maintenance.reconciliation?.changed,removedEvents:maintenance.retention?.removedEvents,partial:!!maintenance.reconciliation?.issues?.length||!!maintenance.retention?.issues?.length}:{status:'not-observed'};
  const footer=outcomes.filter(o=>o.collection?.footerStatus!=='not-checked'&&o.collection?.footerStatus).sort((a,b)=>b.at-a.at)[0];
  return { installed:true, version:manifest.version, generation:manifest.generation, scope:deployment.scope??(problems.some(p=>p.file==='deployment.json')?'unknown':'legacy-project'),
    nativeActivation:current.length?'native-events-observed':problems.length?'unverified':deployment.scope!=='client'?'upgrade-required-for-client-ingress':'pending-host-reload-and-event',
    problems, observedEvents:events.length, eventsCaptured:current.length, turnsAttached:turns.length, contextReturned:outcomes.some(o=>o.collection?.contextReturned), footerStatus:footer?.collection.footerStatus??'not-observed',
    pendingTaskEvents:outcomes.filter(o=>o.collection?.captured===true&&o.collection?.taskStatus==='pending'&&o.collection?.taskVerified===false).length,
    sessionChains:[...new Set(current.map(e=>e.sessionId).filter(Boolean))].map(id=>({sessionChainId:id,turns:turns.filter(t=>t.sessionId===id).length,taskContracts:routed.filter(t=>t.sessionId===id).length})),
    taskContracts:routed.length, taskActivity:routed.reduce((c,t)=>{const v=lifecycleView(t);c[v.activity]++;if(v.lifecycle==='closed')c.closed++;return c;},{active:0,inactive:0,unknown:0,closed:0}),taskStatuses:routed.map(t=>({sessionId:t.sessionId,turnId:t.turnId,status:t.status,lifecycle:lifecycleView(t),taskId:t.taskId,
      pendingCalls:Object.entries(t.calls||{}).filter(([,c])=>c.status==='reserved').map(([toolUseId,c])=>({toolUseId,tool:c.tool,status:c.status})),
      observedCalls:Object.values(t.calls||{}).filter(c=>c.status==='observed').length,
      unknownCalls:Object.values(t.calls||{}).filter(c=>c.status==='unknown').length,
      violations:t.violations?.length||0,toolRegistration:t.toolRegistration||'fixed native contract; historical warnings retained'})),
    sessionActivity:sessionCounts,taskMaintenance:maintenanceStatus,evidence:'adapter-observed native events; not proof of model semantic compliance or all historical conversations',
  };
}
