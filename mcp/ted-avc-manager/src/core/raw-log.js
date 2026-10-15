import { appendFileSync, readdirSync, lstatSync } from 'node:fs';
import { join } from 'node:path';
import locks from './raw-lock.cjs';
// All managed JSONL writers and compaction share this short, non-stealable lock.
// Failure is an auxiliary collection failure, never permission to stop business.
export const {withRawLogLock,claimRawLogLock,recoverRawLogLock}=locks;
export function appendRawLog(file,record) {
 return withRawLogLock(file,()=>appendFileSync(file,JSON.stringify(record)+'\n',{mode:0o600}),{waitMs:500});
}
export function recoverExitedThreadLocks(root,deadThreadId) {
 const scan=dir=>{for(const name of readdirSync(dir)){const file=join(dir,name),st=lstatSync(file);if(st.isSymbolicLink())continue;if(st.isDirectory())scan(file);else if(name.endsWith('.lock')){try{recoverRawLogLock(file,{deadThreadId});}catch{}}}};
 scan(root);
}
