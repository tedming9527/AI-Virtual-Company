import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { run } from './task-lifecycle.mjs';
import { supervise, status, cancel } from './supervisor-runtime.mjs';

const DAY = 86400000, NOW = Date.parse('2026-09-14T00:00:00Z');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function fixture(t) {
  const root = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'ted-lifecycle-'));
  const runs = [];
  t.after(async () => {
    for (const r of runs) { try { await cancel(r.id, {root}); } catch {} }
    await Promise.allSettled(runs.map(r => r.promise));
    fs.rmSync(root, {recursive:true,force:true});
  });
  return {
    root, call:(args, now=NOW)=>run(args,{root,now}),
    task:id=>path.join(root,'tmp/tasks',id,'task.json'),
    async launch(id, code='setTimeout(()=>{},200)') {
      const promise = supervise({id,tasks:[{id:'job',command:process.execPath,args:['-e',code]}],poll_ms:10},{root});
      runs.push({id,promise});
      for(let i=0;i<100;i++) {
        try { if ((await status(id,{root})).tasks[0]?.status==='running') return {promise,receipt:'supervision:'+id+'/job'}; } catch {}
        await sleep(10);
      }
      throw new Error('No real running evidence');
    }
  };
}
test('arbitrary receipt cannot fabricate running; actual exit gates completion', async t=>{
  const f=fixture(t);
  f.call(['create','sample']);
  assert.throws(()=>f.call(['start','sample','--receipt','invented-run']),/Unsupported/);
  const r=await f.launch('actual');
  f.call(['start','sample','--receipt',r.receipt]);
  assert.throws(()=>f.call(['close','sample','--status','completed','--reason','Too early']),/still active/);
  assert.equal(f.call(['status','sample']).execution_status,'running');
  await r.promise;
  assert.equal(f.call(['status','sample']).execution_status,'succeeded');
  f.call(['close','sample','--status','completed','--reason',' Checks passed '],NOW+1000);
  const receipt=JSON.parse(fs.readFileSync(path.join(f.root,'inbox/session-events/tmp-sample.json')));
  assert.equal(receipt.reason,'Checks passed'); assert.equal(receipt.model_verified,false); assert.equal(receipt.duration_ms,1000);
});
test('cancel must await real stop; failed execution cannot be completed',async t=>{
  const f=fixture(t); f.call(['create','cancel-me']);
  const r=await f.launch('cancel-run','setInterval(()=>{},100)');
  f.call(['start','cancel-me','--receipt',r.receipt]);
  assert.throws(()=>f.call(['block','cancel-me','--reason','Try replacing live receipt']),/still active/);
  assert.throws(()=>f.call(['close','cancel-me','--status','cancelled','--reason','Stop']),/still active/);
  await cancel('cancel-run',{root:f.root}); await r.promise;
  assert.throws(()=>f.call(['close','cancel-me','--status','completed','--reason','Wrong']),/successful/);
  assert.equal(f.call(['close','cancel-me','--status','cancelled','--reason','No longer needed']).status,'cancelled');
});
test('stale or legacy execution evidence is not presented as running',t=>{
  const f=fixture(t); f.call(['create','legacy']);
  const p=f.task('legacy'), data=JSON.parse(fs.readFileSync(p));
  fs.writeFileSync(p,JSON.stringify({...data,status:'running',external_run_id:'old-thread-id'}));
  assert.equal(f.call(['status','legacy']).status,'needs_attention');
});
test('dry run is read-only; active tasks retained and terminal tasks quarantined',t=>{
  const f=fixture(t);
  assert.deepEqual(f.call(['cleanup']),{dry_run:true,results:[]});
  assert.deepEqual(fs.readdirSync(f.root),[]);
  f.call(['create','active']); f.call(['create','done']);
  f.call(['close','done','--status','cancelled','--reason','Superseded']);
  assert.equal(f.call(['cleanup'],NOW+8*DAY).results.find(x=>x.id==='done').action,'would_quarantine');
  assert.ok(fs.existsSync(f.task('done')));
  const actual=f.call(['cleanup','--apply'],NOW+8*DAY);
  assert.equal(actual.results.find(x=>x.id==='active').action,'needs_attention');
  assert.equal(actual.results.find(x=>x.id==='done').action,'quarantined');
  assert.equal(f.call(['cleanup','--apply'],NOW+15*DAY).results.find(x=>x.id==='done').action,'purge_candidate');
  assert.equal(fs.readdirSync(path.join(f.root,'tmp/quarantine')).length,1);
});
test('blocked tasks resume only with a live supervised execution',async t=>{
  const f=fixture(t); f.call(['create','blocked']);
  f.call(['block','blocked','--reason','Awaiting dependency']);
  assert.equal(f.call(['cleanup','--apply'],NOW+8*DAY).results[0].action,'needs_attention');
  const r=await f.launch('resume'); f.call(['start','blocked','--receipt',r.receipt]);
  await r.promise;
  assert.equal(f.call(['close','blocked','--status','completed','--reason','Resumed successfully']).status,'completed');
});
test('traversal, nested symlinks and lock conflicts refuse mutation',t=>{
  const f=fixture(t);
  assert.throws(()=>f.call(['create','../escape']),/Unsafe/);
  f.call(['create','linked']); fs.symlinkSync(f.root,path.join(path.dirname(f.task('linked')),'escape'));
  assert.equal(f.call(['cleanup','--apply'],NOW+8*DAY).results[0].action,'refused');
  fs.writeFileSync(path.join(f.root,'tmp/.task-lifecycle.lock'),'another owner');
  assert.throws(()=>f.call(['create','new']),/lock conflict/);
  assert.throws(()=>f.call(['cleanup','--force']),/Unexpected/);
});
test('damaged reason, identity, or receipt failure prevents isolation',t=>{
  const f=fixture(t);
  for(const id of ['reason','identity','receipt']) {
    f.call(['create',id]); f.call(['close',id,'--status','cancelled','--reason','Not needed']);
  }
  for(const id of ['reason','identity']) {
    const p=f.task(id),data=JSON.parse(fs.readFileSync(p));
    data[id==='reason'?'reason':'id']='altered'; fs.writeFileSync(p,JSON.stringify(data));
  }
  const p=path.join(f.root,'inbox/session-events/tmp-receipt.json'); fs.unlinkSync(p); fs.mkdirSync(p);
  assert.equal(f.call(['cleanup','--apply'],NOW+8*DAY).results.filter(x=>x.action==='refused').length,3);
});
