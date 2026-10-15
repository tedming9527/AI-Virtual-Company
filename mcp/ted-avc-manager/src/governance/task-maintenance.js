import { Worker } from 'node:worker_threads';
import { join } from 'node:path';
import { acquireClientLease, releaseExitedThreadLeases } from '../core/client-lease.js';
import { safeTaskPath, writeTaskState } from '../core/task-lifecycle.js';
import { recoverExitedThreadLocks } from '../core/raw-log.js';
// Reuse the existing MCP lifetime. No OS scheduler, model request or host control.
// Heavy raw-log I/O stays off both the Hook and MCP request threads.
export function startTaskMaintenance(stateRoot,{intervalMs=300000,onDiagnostic=value=>process.stderr.write('Ted task maintenance: '+JSON.stringify(value)+'\n'),workerFactory=(url,options)=>new Worker(url,options)}={}) {
 let worker,closed=false;
 const diagnostic=value=>{
  let release;try{release=acquireClientLease();const dir=safeTaskPath(stateRoot,join(stateRoot,'runtime/governance'),{directory:true});writeTaskState(stateRoot,join(dir,'task-maintenance-failure.json'),{...value,at:new Date().toISOString()});}catch{}finally{try{release?.();}catch(error){value={...value,cleanupWarning:String(error.message).slice(0,120)};}}
  try{onDiagnostic(value);}catch{}
 };
 const tick=()=>{
  if(worker||closed)return;
  try{worker=workerFactory(new URL('./task-maintenance-worker.js',import.meta.url),{workerData:{stateRoot}});}catch(error){diagnostic({status:'unavailable',reason:String(error.message).slice(0,160),taskContinues:true});return;}
  const id=worker.threadId;
  worker.on('message',value=>{if(value.status==='unavailable')diagnostic(value);});
  worker.on('error',error=>diagnostic({status:'unavailable',reason:String(error.message).slice(0,160),taskContinues:true}));
  worker.once('exit',code=>{if(code!==0){try{recoverExitedThreadLocks(stateRoot,id);releaseExitedThreadLeases(id);}catch{}diagnostic({status:'unavailable',reason:'Maintenance worker exited '+code,taskContinues:true});}worker=undefined;});
 };
 const timer=setInterval(tick,intervalMs);timer.unref();
 return {dispose(){closed=true;clearInterval(timer);},running:()=>!!worker};
}
