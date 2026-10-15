import { workerData, parentPort } from 'node:worker_threads';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { acquireClientLease } from '../core/client-lease.js';
import { safeTaskPath, writeTaskState, reconcileTasks } from '../core/task-lifecycle.js';
import { cleanupTaskLogs } from './task-retention.js';
let release,reconciliation,retention;
try {
 release=acquireClientLease();const root=workerData.stateRoot,dir=safeTaskPath(root,join(root,'runtime/governance'),{directory:true}),file=join(dir,'task-maintenance.json');
 const old=existsSync(file)?JSON.parse(readFileSync(safeTaskPath(root,file),'utf8')):{};
 reconciliation=reconcileTasks(root,{apply:true,cursor:old.taskCursor||'',maxItems:100,maxMs:100});
 retention=cleanupTaskLogs(root,{apply:true,cursor:old.logCursor||'',maxItems:100});
 const state={at:new Date().toISOString(),taskCursor:reconciliation.nextCursor,logCursor:retention.nextCursor,reconciliation,retention};
 writeTaskState(root,file,state);parentPort.postMessage({status:'completed',changed:reconciliation.changed,removedEvents:retention.removedEvents});
}catch(error){parentPort.postMessage({status:'unavailable',reason:String(error.message).slice(0,160),changed:reconciliation?.changed,removedEvents:retention?.removedEvents,partial:!!reconciliation,taskContinues:true});}
finally{try{release?.();}catch(error){parentPort.postMessage({status:'unavailable',reason:'Lease cleanup: '+String(error.message).slice(0,120),changed:reconciliation?.changed,removedEvents:retention?.removedEvents,partial:true,taskContinues:true});}}
