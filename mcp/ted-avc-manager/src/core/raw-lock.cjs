const fs=require('node:fs'),{randomUUID}=require('node:crypto'),{threadId}=require('node:worker_threads');
let warned=false;function cleanupWarning(){if(!warned){warned=true;try{process.stderr.write('Ted writer temporary cleanup unverified; published ownership retained\n');}catch{}}}
function owner(file){const st=fs.lstatSync(file);if(!st.isFile()||st.isSymbolicLink())throw Error('Unverifiable log lock');const v=JSON.parse(fs.readFileSync(file,'utf8'));if(v.schema!=='avc.writer-lock.v1'||!Number.isInteger(v.pid)||v.pid<1||!Number.isInteger(v.threadId)||typeof v.nonce!=='string')throw Error('Unverifiable log lock');return {v,st};}
function same(a,b){return a.st.dev===b.st.dev&&a.st.ino===b.st.ino&&a.v.nonce===b.v.nonce;}
function dead(pid){try{process.kill(pid,0);return false;}catch(e){if(e.code==='ESRCH')return true;return false;}}
function publishOwner(file,value){const tmp=file+'.'+randomUUID()+'.tmp';try{fs.writeFileSync(tmp,JSON.stringify(value),{flag:'wx',mode:0o600});fs.linkSync(tmp,file);}finally{try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')cleanupWarning();}}}
// Immutable, nonce-specific recovery ownership. Never unlink/reuse these gates:
// a paused second reaper must not acquire a gate after the first installs a successor.
// A crashed reaper is taken over via its own immutable child gate, not by unlinking it.
function recoveryGate(file,requester,proof,depth=0){
 if(depth>32)throw Error('Writer recovery chain requires review');
 try{publishOwner(file,requester);return file;}catch(e){if(e.code!=='EEXIST')throw e;}
 const previous=owner(file);let completed=false;try{const done=owner(file+'.finished');completed=done.v.nonce===previous.v.nonce;}catch{}
 const exited=completed||dead(previous.v.pid)||(proof.deadThreadId!==undefined&&previous.v.pid===process.pid&&previous.v.threadId===proof.deadThreadId);
 if(!exited)return false;
 return recoveryGate(file+'.'+previous.v.nonce,requester,proof,depth+1);
}
function recover(file,{deadThreadId}={}){
 if(!fs.existsSync(file))return false;
 const before=owner(file),proven=dead(before.v.pid)||(deadThreadId!==undefined&&before.v.pid===process.pid&&before.v.threadId===deadThreadId);
 if(!proven)return false;
 const reaper={schema:'avc.writer-lock.v1',pid:process.pid,threadId,nonce:randomUUID(),at:new Date().toISOString()};
 const gate=recoveryGate(file+'.recovered.'+before.v.nonce,reaper,{deadThreadId});if(!gate)return false;
 try{if(!fs.existsSync(file))return true;const after=owner(file);if(!same(before,after))return false;fs.unlinkSync(file);return true;}
 finally{publishOwner(gate+'.finished',reaper);}
}
function claimRawLogLock(file,{lockFile=file+'.writer.lock',waitMs=0}={}){
 const value={schema:'avc.writer-lock.v1',pid:process.pid,threadId,nonce:randomUUID(),at:new Date().toISOString()},tmp=lockFile+'.'+value.nonce+'.tmp',deadline=Date.now()+waitMs;
 fs.writeFileSync(tmp,JSON.stringify(value),{flag:'wx',mode:0o600});
 try{
  while(true){try{fs.linkSync(tmp,lockFile);break;}catch(e){if(e.code!=='EEXIST')throw e;
   try{if(recover(lockFile))continue;}catch{}
   if(Date.now()>=deadline)throw Error('Raw log writer busy or owner unverifiable');Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,10);
  }}
 }finally{try{fs.unlinkSync(tmp);}catch(e){if(e.code!=='ENOENT')cleanupWarning();}}
 return ()=>{try{const current=owner(lockFile);if(current.v.nonce!==value.nonce)throw Error('Writer lock ownership changed');fs.unlinkSync(lockFile);}catch(e){if(e.code!=='ENOENT')throw e;}};
}
function withRawLogLock(file,fn,options){const release=claimRawLogLock(file,options);try{return fn();}finally{release();}}
module.exports={claimRawLogLock,withRawLogLock,recoverRawLogLock:recover};
