import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {parseTedCommand,runTedCommand} from './ted-commands.js';
test('ted routes exact commands and refuses ambiguous or shell-bearing payloads',()=>{
 for(const prefix of ['/ted','$ted','ted'])assert.equal(parseTedCommand(prefix+' doctor'),'doctor');
 assert.equal(parseTedCommand('/ted 检查更新'),'update');assert.equal(parseTedCommand('/ted'),'help');
 for(const value of ['/ted doctor; touch other','/ted doctor\nrm -rf x','/ted ${secret}','/other doctor','please /ted repair'])assert.throws(()=>parseTedCommand(value));
});
test('repair and status work without a task or source checkout and never silently install',async t=>{
 const home=mkdtempSync(join(tmpdir(),'avc-ted-command-'));t.after(()=>rmSync(home,{recursive:true,force:true}));
 const base=join(home,'ted-avc-manager');mkdirSync(base);writeFileSync(join(base,'manifest.json'),JSON.stringify({version:'1.6.1',generation:'test'}));writeFileSync(join(base,'deployment.json'),JSON.stringify({scope:'client'}));
 const before=JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home}));
 const result=await runTedCommand('/missing-source',{action:'repair'},{codexHome:home});
 assert.equal(result.applied,false);assert.equal(result.taskContinues,true);assert.equal(result.readOnly,true);
 assert.equal(JSON.stringify(await runTedCommand('/missing-source',{action:'status'},{codexHome:home})),before);
 assert.ok(result.plan.every(p=>p.step!=='disable-sandbox'));
});

test('summary optimization routes aliases and reports limits without resetting budgets or claiming host compaction',async t=>{
 const root=mkdtempSync(join(tmpdir(),'avc-summary-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 assert.equal(parseTedCommand('/ted 摘要优化'),'summary');assert.equal(parseTedCommand('/ted summary'),'summary');
 const {deliverContext,contextStatus}=await import('./context-budget.js');const key={sessionId:'s',turnId:'t'};
 deliverContext(root,key,'example','body');
 const result=await runTedCommand(root,{action:'summary',...key});
 assert.equal(result.applied,false);assert.equal(result.readOnly,true);assert.equal(result.usage.turnBytes,4);assert.equal(result.snapshot.status,'no-task-observed');
 assert.equal(contextStatus(root,key).turnBytes,4);assert.match(result.limitations,/cannot erase/);
});

test('summary emits bounded handoff with contiguous unread cursor and no fabricated decisions',async t=>{
 const root=mkdtempSync(join(tmpdir(),'avc-handoff-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const dir=join(root,'runtime/execution/tasks');mkdirSync(dir,{recursive:true});
 const asset={source:'general',type:'skill',name:'demo',entry:'SKILL.md',sha256:'b'.repeat(64),complete:false,deliveries:[{mode:'chunk',startByte:0,endByte:256},{mode:'chunk',startByte:512,endByte:768}]};
 writeFileSync(join(dir,'a'.repeat(64)+'.json'),JSON.stringify({sessionId:'s',turnId:'t',contract:{goal:'Continue review'},role:{id:'ai-engineer'},status:'active',assets:Array(20).fill(asset),calls:{one:{status:'reserved'}}}));
 const result=await runTedCommand(root,{action:'summary',sessionId:'s',turnId:'t'});
 assert.equal(result.snapshot.goal,'Continue review');assert.equal(result.snapshot.assets.length,8);assert.equal(result.snapshot.omittedAssets,12);
 assert.equal(result.snapshot.assets[0].nextCursor.offset,256);assert.equal(result.snapshot.pendingCalls,1);assert.match(result.snapshot.decisions,/unknown/);
 assert.ok(Buffer.byteLength(JSON.stringify(result))<8192);
});
