import { existsSync, readFileSync, mkdirSync, writeFileSync, unlinkSync, readdirSync, lstatSync } from 'node:fs';
import { threadId } from 'node:worker_threads';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
export function acquireClientLease() {
  if (!process.env.AVC_GENERATION || !process.env.CODEX_HOME) return () => {};
  const home = process.env.CODEX_HOME, lock = join(home,'.ted-avc-manager-rebuild.lock');
  const check = () => {
    if (existsSync(lock)) throw new Error('Client rebuild in progress; collection unavailable, continue authorized business work');
    const manifest = JSON.parse(readFileSync(join(home,'ted-avc-manager/manifest.json'),'utf8'));
    if (manifest.generation !== process.env.AVC_GENERATION) throw new Error('Old client process: reload required; do not reuse stale data');
  };
  check();
  const dir = join(home,'.ted-avc-manager-activity'); mkdirSync(dir,{recursive:true});
  const lease = join(dir,process.pid+'-'+randomUUID());writeFileSync(lease,JSON.stringify({schema:'avc.client-lease.v1',pid:process.pid,threadId,generation:process.env.AVC_GENERATION}),{flag:'wx',mode:0o600});
  try { check(); } catch(e) { unlinkSync(lease);throw e; }
  return () => { if(existsSync(lease))unlinkSync(lease); };
}
export function releaseExitedThreadLeases(deadThreadId) {
 if(!process.env.CODEX_HOME)return;
 const dir=join(process.env.CODEX_HOME,'.ted-avc-manager-activity');if(!existsSync(dir)||lstatSync(dir).isSymbolicLink())return;
 for(const name of readdirSync(dir).filter(n=>n.startsWith(process.pid+'-'))){const file=join(dir,name);try{if(lstatSync(file).isSymbolicLink())continue;const v=JSON.parse(readFileSync(file,'utf8'));if(v.schema==='avc.client-lease.v1'&&v.pid===process.pid&&v.threadId===deadThreadId)unlinkSync(file);}catch{}}
}
