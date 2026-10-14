import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync,symlinkSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {collectUsageWindow,collectTrialUsage} from './usage-evidence.js';
const sessionId='11111111-1111-7111-8111-111111111111',turn='22222222-2222-7222-8222-222222222222',other='33333333-3333-7333-8333-333333333333';
const at=s=>'2026-10-15T00:00:'+String(s).padStart(2,'0')+'.000Z';
const count=(input,output,cached=0,reasoning=0)=>({input_tokens:input,output_tokens:output,cached_input_tokens:cached,reasoning_output_tokens:reasoning,total_tokens:input+output});
const context=id=>({type:'turn_context',timestamp:at(0),payload:{turn_id:id,model:'reported-test-model'}});
const event=(second,total,last=total)=>({type:'event_msg',timestamp:at(second),payload:{type:'token_count',info:{total_token_usage:total,last_token_usage:last}}});
function fixture(t,rows){
 const home=mkdtempSync(join(tmpdir(),'avc-usage-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const dir=join(home,'sessions/2026/10/15');mkdirSync(dir,{recursive:true});const file=join(dir,'rollout-'+sessionId+'.jsonl');
 const save=(data=rows,id=sessionId)=>writeFileSync(file,[{type:'session_meta',payload:{id}},context(turn),...data].map(x=>JSON.stringify(x)).join('\n')+'\n');save();
 const collect=extra=>collectUsageWindow({home,sessionId,turnIds:[turn],start:at(5),end:at(15),...extra});
 return {home,file,save,collect};
}
test('cumulative deltas deduplicate host events and retain cache/reasoning as subsets',t=>{
 const f=fixture(t,[event(1,count(100,10,90,2)),event(10,count(230,30,210,5)),event(11,count(230,30,210,5)),context(other),event(12,count(250,32,220,5))]);
 const r=f.collect();assert.equal(r.status,'observed');assert.equal(r.totals.total_tokens,150);assert.equal(r.totals.cached_input_tokens,120);assert.equal(r.totals.reasoning_output_tokens,3);assert.equal(r.eventCount,1);assert.equal(r.attributedTokens,null);assert.equal(r.actualMoney,null);assert.match(r.limits,/shared work/);assert.equal(r.reportedModels[0],'reported-test-model');
});
test('first native sample can use validated last usage without treating cumulative history as one trial',t=>{
 const f=fixture(t,[event(10,count(500,50,400,10),count(30,3,20,1))]);assert.equal(f.collect().totals.total_tokens,33);
 f.save([event(10,count(50,5),count(70,7))]);assert.equal(f.collect().status,'unknown');
});
test('counter reset, unsafe numbers and impossible subsets stay unknown',t=>{
 const f=fixture(t,[event(1,count(100,10)),event(10,count(90,11))]);assert.match(f.collect().reason,/regression/);
 f.save([event(10,count(10,2,11))]);assert.equal(f.collect().status,'unknown');
 f.save([event(10,count(Number.MAX_SAFE_INTEGER,10))]);assert.equal(f.collect().status,'unknown');
});
test('native identity, ambiguity and symlink guards do not infer a source',t=>{
 const f=fixture(t,[event(10,count(10,2))]);f.save(undefined,other);assert.match(f.collect().reason,/identity mismatch/);
 f.save();const archive=join(f.home,'archived_sessions');mkdirSync(archive);writeFileSync(join(archive,'copy-'+sessionId+'.jsonl'),'{}');assert.match(f.collect().reason,/Ambiguous/);
 rmSync(archive,{recursive:true});rmSync(f.file);symlinkSync('/etc/hosts',f.file);assert.match(f.collect().reason,/symlink/);
});
test('unavailable, unbound and out-of-window counters remain unknown without throwing',t=>{
 const f=fixture(t,[event(1,count(10,2))]);assert.equal(f.collect().status,'unknown');assert.equal(f.collect({sessionId:'invented'}).status,'unknown');rmSync(f.file);assert.equal(f.collect().status,'unknown');
 assert.equal(collectTrialUsage(f.home,{taskKey:'unlinked',startedAt:at(5),completedAt:at(15)}).status,'unknown');
});
test('partial last write is ignored and full chat/tool content is not exported',t=>{
 const f=fixture(t,[event(10,count(10,2)),{type:'response_item',payload:{text:'private transcript marker'}}]);
 writeFileSync(f.file,'{"type":"event_msg","payload":{"type":"token_count"', {flag:'a'});
 const r=f.collect();assert.equal(r.status,'observed');assert.ok(!JSON.stringify(r).includes('private transcript marker'));assert.match(r.sourceReceipts.first.sha256,/^[a-f0-9]{64}$/);
});
