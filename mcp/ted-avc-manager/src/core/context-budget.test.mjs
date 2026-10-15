import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync, readFileSync, writeFileSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { deliverContext, contextStatus, documentView, CONTEXT_LIMITS } from './context-budget.js';
function fixture(t) { const root=mkdtempSync(join(tmpdir(),'avc-budget-'));t.after(()=>rmSync(root,{recursive:true,force:true}));return root; }
const key={sessionId:'session',turnId:'turn'};
test('session total persists across turns, repeat delivery charges once, agents are isolated',t=>{
 const root=fixture(t);
 const first=deliverContext(root,key,'same','中文😀');
 assert.equal(first.budget.turnBytes,10);assert.equal(deliverContext(root,key,'same','中文😀').status,'already-delivered');
 assert.equal(deliverContext(root,{...key,turnId:'next'},'same','中文😀').budget.sessionBytes,20);
 assert.equal(contextStatus(root,{...key,agentId:'child'}).sessionBytes,0);
 for(let turn=0;turn<6;turn++)for(let part=0;part<8;part++)deliverContext(root,{...key,turnId:'fill'+turn},'part'+part,'x'.repeat(8000));
 assert.ok(contextStatus(root,key).sessionBytes<=CONTEXT_LIMITS.sessionBytes);
 assert.equal(deliverContext(root,{...key,turnId:'last'},'extra','x'.repeat(8192)).status,'budget-exhausted');
});
test('UTF-8 chunks reconstruct source, stale/interior cursors fail, headings and preview stay bounded',()=>{
 const text='# 章节\n'+'😀中文\n'.repeat(3000), preview=documentView(text);
 assert.equal(preview.complete,false);assert.equal(preview.previewOnly,true);assert.ok(Buffer.byteLength(preview.content)<=2048);
 let cursor=preview.nextCursor,result='';do{const part=documentView(text,{mode:'chunk',cursor,maxBytes:257});result+=part.content;cursor=part.nextCursor;}while(cursor);
 assert.equal(result,text);assert.throws(()=>documentView(text+'x',{mode:'chunk',cursor:preview.nextCursor}),/Stale/);
 assert.throws(()=>documentView(text,{mode:'chunk',cursor:{...preview.nextCursor,offset:3}}),/UTF-8/);
 assert.throws(()=>documentView(text,{mode:'chunk',maxBytes:999999}),/maxBytes/);
});
test('concurrent writers share a single persistent delivery and do not lose byte charges',async t=>{
 const root=fixture(t),module=fileURLToPath(new URL('./context-budget.js',import.meta.url));
 const run=id=>new Promise((resolve,reject)=>{
  const script=`import {deliverContext} from ${JSON.stringify('file://'+module)}; console.log(JSON.stringify(deliverContext(process.argv[1],${JSON.stringify(key)},process.argv[2],'evidence')));`;
  const child=spawn(process.execPath,['--input-type=module','-e',script,root,id]);let out='',err='';
  child.stdout.on('data',s=>out+=s);child.stderr.on('data',s=>err+=s);child.on('error',reject);child.on('close',code=>code?reject(Error(err)):resolve(JSON.parse(out)));
 });
 const results=await Promise.all([run('same'),run('same'),run('other')]);
 assert.equal(results.filter(r=>r.status==='delivered').length,2);assert.equal(contextStatus(root,key).turnBytes,16);
 const ledger=join(root,'runtime/context',readdirSync(join(root,'runtime/context'))[0]);
 assert.ok(!readFileSync(ledger,'utf8').includes('evidence'));
 writeFileSync(ledger,'corrupt');assert.throws(()=>deliverContext(root,key,'x','body'));
});
